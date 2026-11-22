#!/usr/bin/env python3
"""Synthetic backup/verification checks: never contacts production."""
import importlib.util
import json
from pathlib import Path
import tempfile
import sys
from types import SimpleNamespace
sys.dont_write_bytecode = True
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('backup', Path(__file__).with_name('backupProductData.py'))
backup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backup)

for stdout in ['[{"table_name":"public.lessons"}]', '{"rows":[{"table_name":"public.lessons"}]}']:
    with patch.object(backup.subprocess, 'run', return_value=SimpleNamespace(returncode=0, stdout=stdout)):
        assert backup.query('unused', 'select fixture')[0]['table_name'] == 'public.lessons'


def fixture_query(cli, sql):
    if sql.startswith('select table_name'):
        return [{'table_name': 'public.lessons'}]
    if 'from "storage"."objects"' in sql:
        return [{'snapshot': {'table': 'storage.objects', 'row_count': 0, 'rows': []}}]
    return [{'snapshot': {'table': 'fixture', 'row_count': 1,
                           'rows': [{'id': 'fixture', 'description': 'never lose this'}]}}]


with tempfile.TemporaryDirectory() as temporary:
    with patch.object(backup, 'query', fixture_query):
        root, manifest = backup.backup('unused', Path(temporary) / 'ok')
    assert len(manifest['tables']) == 8
    assert backup.verify(root)['format'] == 3
    assert (root.stat().st_mode & 0o077) == 0
    first = root / manifest['tables'][0]['file']
    first.write_bytes(b'corrupted')
    try:
        backup.verify(root)
        raise AssertionError('corruption passed verification')
    except RuntimeError:
        pass

    def unavailable(cli, sql):
        raise RuntimeError('source unavailable')

    with patch.object(backup, 'query', unavailable):
        try:
            backup.backup('unused', Path(temporary) / 'failed')
            raise AssertionError('source failure passed')
        except RuntimeError:
            pass
    assert not list((Path(temporary) / 'failed').rglob('manifest.json'))
print('PASS: compressed snapshot, checksum verification, private permissions, corruption and source failure rejection')
