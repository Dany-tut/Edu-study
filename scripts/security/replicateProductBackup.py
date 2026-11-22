#!/usr/bin/env python3
"""Copy a verified snapshot over SSH; publish remotely only after verification."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shlex
import subprocess

REMOTE = r'''
import datetime,gzip,hashlib,json,os,socket,sys,tarfile,tempfile
from pathlib import Path
base=Path(sys.argv[1]); name=sys.argv[2]; expected=sys.argv[3]
os.umask(0o077); base.mkdir(parents=True,exist_ok=True,mode=0o700)
assert base.stat().st_mode & 0o077 == 0, 'Offsite base must be private'
final=base/name
assert not final.exists(), 'Refusing to replace an existing backup'
stage=Path(tempfile.mkdtemp(prefix=name+'.incomplete-',dir=base))
with tarfile.open(fileobj=sys.stdin.buffer,mode='r|gz') as archive:
    archive.extractall(stage,filter='data')
raw=(stage/'manifest.json').read_bytes()
assert hashlib.sha256(raw).hexdigest()==expected, 'Manifest changed in transit'
manifest=json.loads(raw)
def read_file(name):
    file=(stage/name).resolve()
    assert file.is_relative_to(stage.resolve()) and not (stage/name).is_symlink()
    return file.read_bytes()
for e in manifest['tables'] if manifest['format'] != 4 else []:
    data=read_file(e['file'])
    assert hashlib.sha256(data).hexdigest()==e['sha256'], 'Table checksum mismatch'
    record=json.loads(gzip.decompress(data) if e['file'].endswith('.gz') else data)
    assert len(record['rows'])==record['row_count']==e['rows'], 'Row count mismatch'
for e in manifest.get('storage',[]):
    data=read_file(e['file'])
    assert len(data)==e['bytes'] and hashlib.sha256(data).hexdigest()==e['sha256']
for e in manifest.get('artifacts',[]):
    data=read_file(e['file'])
    assert len(data)==e['bytes'] and hashlib.sha256(data).hexdigest()==e['sha256']
receipt={'verified_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'host':socket.gethostname(),'path':str(final),'manifest_sha256':expected,
 'tables':len(manifest['tables']),'storage_files':len(manifest.get('storage',[])),
 'artifacts':len(manifest.get('artifacts',[]))}
(stage/'offsite-verification.json').write_text(json.dumps(receipt)+'\n')
for file in stage.rglob('*'):file.chmod(0o700 if file.is_dir() else 0o600)
os.rename(stage,final)
print(json.dumps(receipt))
'''


def replicate(snapshot, configuration):
    import backupProductData
    root = Path(snapshot).resolve()
    backupProductData.verify(root)
    config = json.loads(Path(configuration).read_text())
    host, key, base = config['host'], config['identity_file'], config['directory']
    if not re.fullmatch(r'[A-Za-z0-9_.-]+@[A-Za-z0-9_.-]+', host):
        raise ValueError('Invalid SSH destination')
    if not re.fullmatch(r'/[A-Za-z0-9_./-]+', base) or '..' in Path(base).parts:
        raise ValueError('Invalid offsite directory')
    if not re.fullmatch(r'[A-Za-z0-9_-]+', root.name):
        raise ValueError('Invalid snapshot name')
    digest = hashlib.sha256((root / 'manifest.json').read_bytes()).hexdigest()
    command = 'python3 -I -c ' + shlex.quote(REMOTE) + ' ' + ' '.join(
        shlex.quote(value) for value in [base, root.name, digest])
    archive = subprocess.Popen(['tar', '-czf', '-', '-C', str(root), '.'],
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        result = subprocess.run(['ssh', '-i', str(Path(key).expanduser()), '-o',
            'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o',
            'ConnectTimeout=15', host, command], stdin=archive.stdout,
            capture_output=True, text=True, timeout=900)
    finally:
        archive.stdout.close()
    _, error = archive.communicate(timeout=30)
    if result.returncode or archive.returncode:
        raise RuntimeError('Offsite copy/verification failed; existing copies preserved: '+result.stderr[-1200:]+error.decode('utf-8',errors='replace')[-400:])
    receipt = json.loads(result.stdout)
    if receipt['manifest_sha256'] != digest:
        raise RuntimeError('Offsite receipt does not match this snapshot')
    (root / 'offsite-receipt.json').write_text(json.dumps(receipt, indent=2)+'\n')
    return receipt


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('snapshot')
    parser.add_argument('--config', default=str(Path.home()/'.codex/iskra-backup-runtime/offsite.json'))
    args = parser.parse_args()
    print(json.dumps(replicate(args.snapshot, args.config)))
