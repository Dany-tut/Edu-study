#!/usr/bin/env python3
"""Restore a verified snapshot into a NEW Docker database with no network/ports.

Never accepts a database URL. Keeps the container for inspection unless explicitly
removed by the operator; production cannot be a destination of this script.
"""
import argparse
import sys
sys.dont_write_bytecode=True
import gzip
import json
from pathlib import Path
import secrets
import shutil
import subprocess
import tempfile
import time
import backupProductData
from verifyRestoredDatabase import validate

IMAGE='public.ecr.aws/supabase/postgres:17.11.0.011'


def sql(container,statement,role='supabase_admin'):
    result=subprocess.run(['docker','exec','-i',container,'psql','-X','-U',role,
        '-d','postgres','-v','ON_ERROR_STOP=1','-At'],input=statement,text=True,
        capture_output=True,timeout=180)
    if result.returncode:
        errors=[line for line in result.stderr.splitlines() if line.startswith('ERROR:')]
        raise RuntimeError('Restore SQL failed: '+'; '.join(errors))
    return result.stdout.strip()


def restore(root,container,resume_empty=False):
    root=Path(root).resolve();manifest=backupProductData.verify(root)
    if manifest['format']!=4:raise RuntimeError('Restore proof requires SQL format 4')
    if not container.startswith('iskra-restore-'):raise RuntimeError('Invalid isolated container name')
    found=subprocess.run(['docker','inspect',container],capture_output=True)
    if found.returncode==0 and not resume_empty:raise RuntimeError('Refusing to replace an existing container')
    if resume_empty:
        if found.returncode:raise RuntimeError('No empty container to resume')
        configuration=json.loads(found.stdout)[0]['HostConfig']
        if configuration['NetworkMode']!='none' or configuration.get('PortBindings'):
            raise RuntimeError('Refusing a container with network access')
    metadata=json.loads((root/'database-metadata.json').read_text())
    if not resume_empty:
        with tempfile.TemporaryDirectory(prefix='iskra-restore-') as temporary:
            env=Path(temporary)/'postgres.env'
            env.write_text('POSTGRES_PASSWORD='+secrets.token_urlsafe(32)+'\nPOSTGRES_DB=postgres\n');env.chmod(0o600)
            subprocess.run(['docker','run','-d','--pull=never','--name',container,
                '--network','none','--cpus=0.5','--memory=512m','--pids-limit=128',
                '--env-file',str(env),IMAGE],check=True,capture_output=True,timeout=60)
    for attempt in range(45):
        ready=subprocess.run(['docker','exec',container,'pg_isready','-U','postgres'],capture_output=True)
        # pg_isready also accepts the temporary server used by image init scripts.
        # Wait until entrypoint has exec'd the final postmaster before any DDL.
        main=subprocess.run(['docker','exec',container,'cat','/proc/1/comm'],capture_output=True,text=True)
        if ready.returncode==0 and main.stdout.strip() in ('postgres','.postgres-wrapp'):break
        time.sleep(2)
    else:raise RuntimeError('Isolated PostgreSQL did not become ready')
    if resume_empty:
        tables=json.loads(sql(container,"SELECT coalesce(json_agg(format('%I.%I',schemaname,tablename)),'[]'::json) FROM pg_tables WHERE schemaname not like 'pg_%' AND schemaname NOT IN ('information_schema','extensions','vault','cron','net','realtime','graphql','graphql_public');"))
        for table in tables:
            if sql(container,'SELECT EXISTS(SELECT 1 FROM '+table+' LIMIT 1);')=='t':
                raise RuntimeError('Refusing to reset a container that contains application rows')
    sql(container,'DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS auth CASCADE; DROP SCHEMA IF EXISTS storage CASCADE; CREATE SCHEMA public;')
    quote=lambda name:'"'+name.replace('"','""')+'"'
    for role in metadata['roles']:
        name=role['name'];literal="'"+name.replace("'","''")+"'"
        if sql(container,'SELECT 1 FROM pg_roles WHERE rolname='+literal+';')!='1':
            sql(container,'CREATE ROLE '+quote(name)+' NOLOGIN;')
    for extension in metadata['extensions']:
        if extension['name']=='plpgsql':continue
        schema=quote(extension['schema'])
        if extension['schema']!='pg_catalog':sql(container,'CREATE SCHEMA IF NOT EXISTS '+schema+';')
        sql(container,'CREATE EXTENSION IF NOT EXISTS '+quote(extension['name'])+' WITH SCHEMA '+schema+';')
    sql(container,(root/'schema.sql').read_text())
    with tempfile.TemporaryFile() as log:
        process=subprocess.Popen(['docker','exec','-i',container,'psql','-X','-U',
            'supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1','--single-transaction'],
            stdin=subprocess.PIPE,stdout=log,stderr=log)
        try:
            process.stdin.write(b'SET session_replication_role=replica;\n')
            for name in manifest['data_files']:
                opener=gzip.open if name.endswith('.gz') else open
                with opener(root/name,'rb') as source:shutil.copyfileobj(source,process.stdin)
            process.stdin.close()
        except BrokenPipeError:pass
        code=process.wait(timeout=300)
        if code:
            log.seek(0)
            errors=[line.decode('utf-8',errors='replace').strip() for line in log if line.startswith(b'ERROR:')]
            raise RuntimeError('COPY restore failed: '+'; '.join(errors))
    for trigger in metadata.get('event_triggers') or []:
        if trigger['enabled']!='O':raise RuntimeError('Restore recipe requires review for non-origin event triggers')
        sql(container,trigger['ddl'],role='postgres')
    return validate(container,[root/name for name in manifest['data_files']])


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('snapshot')
    parser.add_argument('--container',required=True)
    parser.add_argument('--resume-empty',action='store_true',help='Resume a failed bootstrap only after checking every application table is empty')
    args=parser.parse_args()
    print(json.dumps(restore(args.snapshot,args.container,args.resume_empty)))
