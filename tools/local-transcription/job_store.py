"""Private, atomic checkpoints. Raw media is removed once a job finishes."""
import json
import os
from pathlib import Path


def save(folder, job):
    folder.mkdir(mode=0o700, parents=True, exist_ok=True)
    dest = folder / 'job.json'
    tmp = folder / 'job.json.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        os.chmod(tmp, 0o600)
        json.dump(job, f, ensure_ascii=False)
        f.flush()
        os.fsync(f.fileno())
    tmp.replace(dest)


def load(root):
    jobs = {}
    for path in sorted(root.glob('*/job.json')):
        try:
            job = json.loads(path.read_text())
            if job['id'] == path.parent.name and len(job['owner']) == 64:
                jobs[job['id']] = job
        except (ValueError, KeyError, OSError):
            continue
    return jobs
