#!/usr/bin/env python3
"""Read-only logical product snapshot via the authenticated Supabase CLI.

No model calls, no new credentials, no automatic pruning, no production restore.
Each table is captured in one statement. Cross-table consistency is NOT claimed;
row history records intervening writes. Storage binaries are copied individually.
Output contains personal data: keep outside git, mode 0700/0600.
"""
import argparse
import concurrent.futures
import datetime
import gzip
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import time

PROJECT = 'igsdwvwiqnozgwczzycx'


def query(cli, sql):
    for attempt in range(3):
        result = subprocess.run([cli, 'db', 'query', '--linked', '--project-ref', PROJECT,
                                 '--output', 'json', sql], capture_output=True, text=True,
                                timeout=180)
        if result.returncode == 0:
            data = json.loads(result.stdout)
            # CLI returns an array under launchd and an envelope inside Codex.
            return data if isinstance(data, list) else data['rows']
        if attempt < 2:
            time.sleep(2 ** attempt)
    # No SQL, rows or credentials in launchd logs. Retries are bounded.
    raise RuntimeError('Supabase backup query failed; no complete manifest published')



def verify(root):
    root = Path(root)
    manifest = json.loads((root / 'manifest.json').read_text())
    for entry in manifest['tables']:
        blob = (root / entry['file']).read_bytes()
        if hashlib.sha256(blob).hexdigest() != entry['sha256']:
            raise RuntimeError('Backup checksum mismatch: ' + entry['table'])
        snapshot = json.loads(gzip.decompress(blob) if entry['file'].endswith('.gz') else blob)
        if len(snapshot['rows']) != snapshot['row_count'] or snapshot['row_count'] != entry['rows']:
            raise RuntimeError('Backup row count mismatch: ' + entry['table'])
    for entry in manifest.get('storage', []):
        blob = (root / entry['file']).read_bytes()
        if len(blob) != entry['bytes'] or hashlib.sha256(blob).hexdigest() != entry['sha256']:
            raise RuntimeError('Storage backup integrity mismatch')
    return manifest


def backup(cli, destination):
    os.umask(0o077)
    root = Path(destination) / datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    root.mkdir(parents=True, mode=0o700, exist_ok=False)
    tables = [(r['table_name'], r['schema_name'], r['relation_name']) for r in query(cli,
        "select p.table_name, n.nspname schema_name, c.relname relation_name from iskra_history.protected_tables p join pg_class c on c.oid=to_regclass(p.table_name) join pg_namespace n on n.oid=c.relnamespace where not c.relispartition order by p.table_name")]
    extras = ['iskra_history.row_versions', 'iskra_history.protected_tables',
               'storage.buckets', 'storage.objects', 'auth.users', 'auth.identities',
               'supabase_migrations.schema_migrations']
    tables += [(table, *table.split('.')) for table in extras]

    def capture(descriptor):
        table, schema, name = descriptor
        # Identifiers come from pg_catalog; quote them as SQL identifiers, never paths.
        identifier = lambda value: '"' + value.replace('"', '""') + '"'
        literal = "'" + table.replace("'", "''") + "'"
        sql = ("select jsonb_build_object('table', " + literal + ", 'captured_at', statement_timestamp(), "
               "'row_count', count(*), 'rows', coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)) snapshot "
               'from ' + identifier(schema) + '.' + identifier(name) + ' t')
        snapshot = query(cli, sql)[0]['snapshot']
        if snapshot['row_count'] != len(snapshot['rows']):
            raise RuntimeError('Incomplete table response: ' + table)
        raw = (json.dumps(snapshot, ensure_ascii=False, separators=(',', ':')) + '\n').encode()
        blob = gzip.compress(raw, mtime=0)
        filename = ((table if re.fullmatch(r'[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*', table)
                     else 'table-' + hashlib.sha256(table.encode()).hexdigest()) + '.json.gz')
        (root / filename).write_bytes(blob)
        return {'table': table, 'file': filename, 'rows': snapshot['row_count'],
                'sha256': hashlib.sha256(blob).hexdigest()}

    # CLI initializes a database login for each command. Serialize SQL reads to
    # avoid concurrent login initialization; Storage downloads remain bounded.
    entries = [capture(table) for table in tables]
    storage_meta = json.loads(gzip.decompress((root / 'storage.objects.json.gz').read_bytes()))['rows']

    def capture_object(obj):
        bucket, name = obj['bucket_id'], obj['name']
        key = PurePosixPath(name)
        if not re.fullmatch(r'[a-zA-Z0-9_-]+', bucket) or key.is_absolute() or '..' in key.parts or '\\' in name:
            raise RuntimeError('Unsafe Storage backup path')
        destination = root / 'storage' / bucket / name
        destination.parent.mkdir(parents=True, mode=0o700, exist_ok=True)
        result = subprocess.run([cli, 'storage', 'cp', '--experimental', '--linked',
                                 '--project-ref', PROJECT, 'ss:///' + bucket + '/' + name,
                                 str(destination)], capture_output=True, text=True, timeout=600)
        if result.returncode or not destination.is_file():
            raise RuntimeError('Storage download failed; snapshot incomplete')
        blob = destination.read_bytes()
        expected = (obj.get('metadata') or {}).get('size')
        if expected is not None and len(blob) != int(expected):
            raise RuntimeError('Storage object changed during backup')
        return {'file': str(destination.relative_to(root)), 'bytes': len(blob),
                'sha256': hashlib.sha256(blob).hexdigest(), 'bucket': bucket, 'name': name}

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        objects = list(executor.map(capture_object, storage_meta))
    manifest = {'project': PROJECT, 'format': 3, 'tables': entries, 'storage': objects,
                'scope': 'Product rows, row history, auth users/identities, Storage metadata and binaries, migration history. No schema dump.',
                'consistency': 'One statement per table; cross-table writes retained in row history.'}
    (root / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    verify(root)
    return root, manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--destination', default=str(Path.home() / '.codex/iskra-backups'))
    parser.add_argument('--verify', help='Verify an existing snapshot without network access')
    parser.add_argument('--cli', default=shutil.which('supabase'))
    args = parser.parse_args()
    try:
        if args.verify:
            manifest = verify(args.verify)
            print('PASS: backup checksums and row counts;', len(manifest['tables']), 'tables;', len(manifest.get('storage', [])), 'objects')
        else:
            if not args.cli:
                raise RuntimeError('Supabase CLI is unavailable')
            root, manifest = backup(args.cli, args.destination)
            print('PASS:', root, len(manifest['tables']), 'tables;', sum(x['rows'] for x in manifest['tables']), 'rows')
    except Exception as error:
        print('FAIL: backup incomplete;', type(error).__name__)
        raise SystemExit(1)
