#!/usr/bin/env python3
"""Start only an isolated local Supabase, with bounded containers and a safety guard.

Requires an initialized, unlinked workdir; never invokes db push or remote reset.
Logs may contain LOCAL generated credentials and stay in the private workdir.
"""
import argparse
import json
import os
from pathlib import Path
import re
import shutil
import signal
import subprocess
import time

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--workdir', default='/tmp/iskra-local-security')
args = parser.parse_args()
root = Path(args.workdir).resolve()
config = root / 'supabase/config.toml'
if not config.exists():
    raise SystemExit('Initialize the isolated local workdir with supabase init first.')
if (root / 'supabase/.temp/project-ref').exists():
    raise SystemExit('Refusing a linked workdir. Use a new local-only directory.')
if shutil.disk_usage(root).free < 12 * 1024**3:
    raise SystemExit('Need at least 12 GiB free before a new start; guard stops at 8 GiB.')
text = config.read_text()
project = re.search(r'^project_id\s*=\s*"([a-zA-Z0-9_-]+)"', text, re.M)
if not project or not project.group(1).startswith('iskra-local-'):
    raise SystemExit('project_id must start with iskra-local- to isolate guard actions.')
project = project.group(1)
# The named Docker network must have loopback as its default published-port address.
network = 'iskra-security-local'
network_info = json.loads(subprocess.check_output(['docker','network','inspect',network]))[0]
if network_info.get('Options',{}).get('com.docker.network.bridge.host_binding_ipv4') != '127.0.0.1':
    raise SystemExit('Local network must bind published ports to 127.0.0.1.')
log_path = root / 'start.log'
with log_path.open('w') as log:
    os.chmod(log_path, 0o600)
    process = subprocess.Popen([
        'supabase','start','--workdir',str(root),'--network-id',network,
        '--exclude','studio,postgres-meta,logflare,vector,supavisor,imgproxy',
    ], stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
    limited = set()
    low_samples = 0
    reason = None
    try:
        with (root / 'resources.jsonl').open('a') as evidence:
            while process.poll() is None:
                output = subprocess.check_output(['memory_pressure','-Q'], text=True)
                free_percent = int(re.search(r'free percentage: (\d+)',output).group(1))
                free_gib = shutil.disk_usage(root).free / 1024**3
                names = subprocess.check_output(['docker','ps','--format','{{.Names}}'], text=True).splitlines()
                ours = [name for name in names if name.startswith('supabase_') and name.endswith('_'+project)]
                for name in ours:
                    if name not in limited:
                        memory = '1536m' if name.startswith('supabase_db_') else '512m'
                        updated = subprocess.run(['docker','update','--cpus','1','--memory',memory,'--memory-swap',memory,name], capture_output=True)
                        if updated.returncode == 0: limited.add(name)
                stats = []
                if ours:
                    sampled = subprocess.run(['docker','stats','--no-stream','--format','{{json .}}',*ours],text=True,capture_output=True)
                    stats = [json.loads(line) for line in sampled.stdout.splitlines() if line.startswith('{')]
                evidence.write(json.dumps({'time':time.time(),'memory_free_pct':free_percent,
                    'disk_free_gib':round(free_gib,2),'containers':ours,'stats':stats})+'\n')
                evidence.flush()
                low_samples = low_samples + 1 if free_percent < 12 else 0
                if free_gib < 8 or low_samples >= 3:
                    reason = 'disk below 8 GiB' if free_gib < 8 else 'memory free below 12% for 3 samples'
                    break
                time.sleep(5)
    except (KeyboardInterrupt, Exception) as error:
        reason = f'guard interrupted: {type(error).__name__}'
    finally:
        if reason:
            if process.poll() is None:
                os.killpg(process.pid,signal.SIGTERM)
                try: process.wait(timeout=15)
                except subprocess.TimeoutExpired: os.killpg(process.pid,signal.SIGKILL)
            # Touch only this disposable project, never unrelated Docker containers.
            names = subprocess.check_output(['docker','ps','--format','{{.Names}}'],text=True).splitlines()
            ours = [n for n in names if n.startswith('supabase_') and n.endswith('_'+project)]
            if ours: subprocess.run(['docker','stop','--time','5',*ours],capture_output=True)
    code = process.wait()
print(json.dumps({'exit':code,'safety_stop':reason,'private_log':str(log_path)}))
raise SystemExit(code if not reason else 2)
