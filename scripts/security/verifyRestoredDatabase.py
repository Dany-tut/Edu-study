#!/usr/bin/env python3
"""Check actual pg_dump COPY row counts/FKs in a network-isolated Docker database."""
import argparse
import json
from pathlib import Path
import re
import subprocess


def psql(container, sql):
    result = subprocess.run(['docker','exec','-i',container,'psql','-X','-U',
        'supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1','-At'],
        input=sql,text=True,capture_output=True,timeout=180)
    if result.returncode:
        raise RuntimeError('Isolated restore validation query failed')
    return result.stdout.strip()


def validate(container, dumps):
    configuration = json.loads(subprocess.check_output(['docker','inspect',container]))[0]
    if not container.startswith('iskra-restore-') or configuration['HostConfig']['NetworkMode'] != 'none' or configuration['HostConfig'].get('PortBindings'):
        raise RuntimeError('Restore verification requires an isolated container without ports')
    from pgDumpRows import summarize
    counts, _ = summarize(dumps)
    queries=["select json_build_object('table', '"+table.replace("'","''")+"', 'rows', count(*)) record from "+table for table in counts]
    restored=json.loads(psql(container,'select json_agg(record) from ('+' union all '.join(queries)+') q;'))
    mismatch=[e['table'] for e in restored if counts[e['table']]!=e['rows']]
    if mismatch:raise RuntimeError('Restore row counts differ: '+','.join(mismatch))
    constraints=json.loads(psql(container,"""
select coalesce(json_agg(json_build_object('table',format('%I.%I',sn.nspname,s.relname),
 'target',format('%I.%I',tn.nspname,t.relname),'name',c.conname,'match',c.confmatchtype,
 'source_columns',(select json_agg(a.attname order by k.ord) from unnest(c.conkey) with ordinality k(num,ord) join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.num),
 'target_columns',(select json_agg(a.attname order by k.ord) from unnest(c.confkey) with ordinality k(num,ord) join pg_attribute a on a.attrelid=c.confrelid and a.attnum=k.num))), '[]'::json)
from pg_constraint c join pg_class s on s.oid=c.conrelid join pg_namespace sn on sn.oid=s.relnamespace
join pg_class t on t.oid=c.confrelid join pg_namespace tn on tn.oid=t.relnamespace
where c.contype='f' and sn.nspname not like 'pg_%';
"""))
    quote=lambda value:'"'+value.replace('"','""')+'"'
    fk_queries=[]
    for number,fk in enumerate(constraints):
        nonnull=' and '.join('s.'+quote(c)+' is not null' for c in fk['source_columns'])
        comparison=' and '.join('t.'+quote(t)+'=s.'+quote(s) for s,t in zip(fk['source_columns'],fk['target_columns']))
        predicate='('+nonnull+' and not exists(select 1 from '+fk['target']+' t where '+comparison+'))'
        if fk['match']=='f':
            some_null=' or '.join('s.'+quote(c)+' is null' for c in fk['source_columns'])
            some_nonnull=' or '.join('s.'+quote(c)+' is not null' for c in fk['source_columns'])
            predicate+=' or (('+some_null+') and ('+some_nonnull+'))'
        fk_queries.append("select json_build_object('index',"+str(number)+",'orphans',count(*)) record from "+fk['table']+' s where '+predicate)
    violations=json.loads(psql(container,'select json_agg(record) from ('+' union all '.join(fk_queries)+') q;')) if fk_queries else []
    bad=[constraints[v['index']]['name'] for v in violations if v['orphans']]
    if bad:raise RuntimeError('Foreign key orphan rows: '+','.join(bad))
    return {'tables':len(counts),'rows':sum(counts.values()),'foreign_keys_checked':len(constraints),
        'foreign_key_orphans':0,'network':'none','published_ports':False}


if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--container',required=True)
    parser.add_argument('dumps',nargs='+')
    args=parser.parse_args()
    print(json.dumps(validate(args.container,args.dumps)))
