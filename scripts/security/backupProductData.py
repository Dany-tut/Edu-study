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

PROJECT = 'igsdwvwiqnozgwczzycx'


def query(cli, sql):
    result = subprocess.run([cli, 'db', 'query', '--linked', '--project-ref', PROJECT,
                             '--output', 'json', sql], capture_output=True, text=True,
                            timeout=180)
    if result.returncode:
        # Do not print rows, SQL or credentials to a launchd log.
        raise RuntimeError('Supabase backup query failed; no complete manifest published')
    data = json.loads(result.stdout)
    # CLI JSON is an array outside an agent session, and a rows/boundary
    # envelope inside Codex. launchd must support both without credentials/env hacks.
    return data if isinstance(data, list) else data['rows']


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
    tables = [r['table_name'] for r in query(cli,
        'select table_name from iskra_history.protected_tables order by table_name')]
    tables += ['iskra_history.row_versions', 'iskra_history.protected_tables',
               'storage.buckets', 'storage.objects', 'auth.users', 'auth.identities',
               'supabase_migrations.schema_migrations']

    def capture(table):
        if not re.fullmatch(r'[a-z_]+\.[a-z_]+', table):
            raise RuntimeError('Invalid backup table identifier')
        schema, name = table.split('.')
        sql = ("select jsonb_build_object('table', '" + table + "', 'captured_at', statement_timestamp(), "
               "'row_count', count(*), 'rows', coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)) snapshot "
               'from "' + schema + '"."' + name + '" t')
        snapshot = query(cli, sql)[0]['snapshot']
        if snapshot['row_count'] != len(snapshot['rows']):
            raise RuntimeError('Incomplete table response: ' + table)
        raw = (json.dumps(snapshot, ensure_ascii=False, separators=(',', ':')) + '\n').encode()
        blob = gzip.compress(raw, mtime=0)
        filename = table + '.json.gz'
        (root / filename).write_bytes(blob)
        return {'table': table, 'file': filename, 'rows': snapshot['row_count'],
                'sha256': hashlib.sha256(blob).hexdigest()}

    # Two independent read requests at a time; no scans of telemetry or caches.
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        entries = list(executor.map(capture, tables))
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
