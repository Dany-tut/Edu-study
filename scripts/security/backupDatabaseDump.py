#!/usr/bin/env python3
"""Consistent logical data snapshot plus schema and Storage; never restores a DB."""
import datetime
import gzip
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import concurrent.futures
import backupProductData
import captureDatabaseSchema
from pgDumpRows import summarize


def artifact(root,name):
    raw=(root/name).read_bytes()
    return {'file':name,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}


def backup(cli,destination):
    os.umask(0o077)
    root=Path(destination)/datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    root.mkdir(parents=True,exist_ok=False,mode=0o700)
    metadata=backupProductData.query(cli,captureDatabaseSchema.METADATA_SQL)[0]['metadata']
    (root/'database-metadata.json').write_text(json.dumps(metadata,indent=2)+'\n')
    for name,flags in [('schema.sql',[]),('data.sql',['--data-only','--use-copy'])]:
        result=subprocess.run([cli,'db','dump','--linked','--project-ref',backupProductData.PROJECT,
            '--schema',','.join(metadata['schemas']),'--file',str(root/name),*flags],
            capture_output=True,text=True,timeout=900)
        if result.returncode or not (root/name).is_file() or not (root/name).stat().st_size:
            raise RuntimeError('Database dump failed; existing backups preserved')
    with (root/'data.sql').open('rb') as source, gzip.open(root/'data.sql.gz','wb',compresslevel=1) as target:
        shutil.copyfileobj(source,target)
    (root/'data.sql').unlink()  # Only this just-created temporary uncompressed copy.
    counts,objects=summarize([root/'data.sql.gz'])

    def download(obj):
        bucket,name=obj['bucket_id'],obj['name'];key=PurePosixPath(name)
        if not re.fullmatch(r'[A-Za-z0-9_-]+',bucket) or key.is_absolute() or '..' in key.parts or '\\' in name:
            raise RuntimeError('Unsafe Storage name')
        target=root/'storage'/bucket/name
        target.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
        result=subprocess.run([cli,'storage','cp','--experimental','--linked','--project-ref',
            backupProductData.PROJECT,'ss:///'+bucket+'/'+name,str(target)],
            capture_output=True,text=True,timeout=600)
        if result.returncode or not target.is_file():raise RuntimeError('Storage copy failed')
        item=artifact(root,str(target.relative_to(root)))
        expected=(obj.get('metadata') or {}).get('size')
        if expected is not None and item['bytes']!=int(expected):raise RuntimeError('Storage size mismatch')
        return dict(item,bucket=bucket,name=name)

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as workers:
        storage=list(workers.map(download,objects))
    manifest={'format':4,'project':backupProductData.PROJECT,
        'tables':[{'table':table,'rows':rows} for table,rows in counts.items()],
        'data_files':['data.sql.gz'],'storage':storage,
        'artifacts':[artifact(root,n) for n in ['schema.sql','data.sql.gz','database-metadata.json']],
        'scope':'Custom application, Auth and Storage schemas/data; metadata for roles/extensions/event triggers; Storage binaries. Provider secrets/settings, Vault decryption keys and external media are not included.',
        'consistency':'All selected table data use one pg_dump transaction. Schema is captured separately. Storage files are read afterward and checked against metadata from the data dump.'}
    (root/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    backupProductData.verify(root)
    return root,manifest
