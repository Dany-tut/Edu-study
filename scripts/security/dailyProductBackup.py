#!/usr/bin/env python3
"""One bounded daily backup and offsite copy. No model and no retention deletion."""
import sys
sys.dont_write_bytecode = True
from pathlib import Path
import backupProductData
import replicateProductBackup
import captureDatabaseSchema
import backupDatabaseDump
import argparse

if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--replicate-existing', help='Retry only a completed local snapshot; never reread production')
    args=parser.parse_args()
    try:
        if args.replicate_existing:
            root=Path(args.replicate_existing)
            manifest=backupProductData.verify(root)
        else:
            root, manifest = backupDatabaseDump.backup('/opt/homebrew/bin/supabase',
                Path.home()/'.codex/iskra-backups')
        receipt = replicateProductBackup.replicate(root,
            Path.home()/'.codex/iskra-backup-runtime/offsite.json')
        print('PASS: local and offsite verified;', root.name, len(manifest['tables']),
              'tables;', receipt['storage_files'], 'Storage files', flush=True)
    except Exception as error:
        print('FAIL: daily backup incomplete;', type(error).__name__, flush=True)
        raise SystemExit(1)
