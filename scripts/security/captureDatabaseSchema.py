#!/usr/bin/env python3
"""Read-only schema/extension/event metadata capture. Never restores production."""
import hashlib
import json
from pathlib import Path
import subprocess
import backupProductData

METADATA_SQL = """
select jsonb_build_object(
 'captured_at',statement_timestamp(),
 'schemas',(select jsonb_agg(nspname order by nspname) from pg_namespace where
 nspname not like 'pg_%' and nspname not like '\\_%' and nspname not in
 ('information_schema','extensions','cron','net','graphql','graphql_public','realtime','vault','supabase_functions','pgbouncer')),
 'extensions',(select jsonb_agg(jsonb_build_object('name',e.extname,'schema',n.nspname,'version',e.extversion)) from pg_extension e join pg_namespace n on n.oid=e.extnamespace),
 'event_triggers',(select jsonb_agg(jsonb_build_object('ddl',format('CREATE EVENT TRIGGER %I ON %s %s EXECUTE FUNCTION %s();',evtname,evtevent,case when evttags is null then '' else 'WHEN TAG IN ('||(select string_agg(quote_literal(t),',') from unnest(evttags) t)||')' end,evtfoid::regproc),'enabled',evtenabled)) from pg_event_trigger where evtname like 'iskra_%'),
 'roles',(select jsonb_agg(jsonb_build_object('name',rolname,'superuser',rolsuper,'inherit',rolinherit,'create_role',rolcreaterole,'create_db',rolcreatedb,'replication',rolreplication,'bypass_rls',rolbypassrls)) from pg_roles where rolname not like 'pg_%')
) metadata
"""


def capture(cli, destination):
    root = Path(destination)
    metadata = backupProductData.query(cli, METADATA_SQL)[0]['metadata']
    (root/'database-metadata.json').write_text(json.dumps(metadata, indent=2)+'\n')
    result = subprocess.run([cli, 'db', 'dump', '--linked', '--project-ref',
        backupProductData.PROJECT, '--schema', ','.join(metadata['schemas']),
        '--file', str(root/'schema.sql')], capture_output=True, text=True, timeout=600)
    if result.returncode or not (root/'schema.sql').is_file() or (root/'schema.sql').stat().st_size == 0:
        raise RuntimeError('Schema capture failed; data snapshot is preserved')
    return attach(root)


def attach(root):
    root = Path(root)
    manifest = json.loads((root/'manifest.json').read_text())
    manifest['artifacts'] = []
    for name in ['schema.sql', 'database-metadata.json']:
        raw = (root/name).read_bytes()
        manifest['artifacts'].append({'file':name, 'bytes':len(raw),
                                      'sha256':hashlib.sha256(raw).hexdigest()})
    manifest['scope'] += ' Current custom/Auth/Storage schema and extension/role metadata included.'
    (root/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    backupProductData.verify(root)
    return manifest
