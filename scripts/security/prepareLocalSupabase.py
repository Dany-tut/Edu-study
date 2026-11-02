#!/usr/bin/env python3
"""Prepare an unlinked, schema-only Supabase baseline plus forward migrations."""
import argparse
from pathlib import Path
import shutil
import subprocess

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--workdir',default='/tmp/iskra-local-security-fresh')
a=parser.parse_args()
repo=Path(__file__).resolve().parents[2]
root=Path(a.workdir).resolve()
if (root/'supabase').exists():raise SystemExit('Use a new workdir; existing projects are never overwritten.')
root.mkdir(parents=True,exist_ok=True)
subprocess.run(['supabase','init','--workdir',str(root)],check=True)
config=root/'supabase/config.toml'
s=config.read_text()
import re
s=re.sub(r'^project_id = .*$', 'project_id = "iskra-local-security"',s,flags=re.M)
for old,new in [('port = 54321','port = 55321'),('port = 54322','port = 55322'),('shadow_port = 54320','shadow_port = 55320'),('port = 54324','port = 55324'),('port = 54323','port = 55323'),('inspector_port = 8083','inspector_port = 8183'),('site_url = "http://127.0.0.1:3000"','site_url = "http://127.0.0.1:5291"'),('sql_paths = ["./seed.sql"]','sql_paths = []')]:s=s.replace(old,new)
for name in ['studio','analytics','storage.vector']:
 start=s.index('['+name+']');end=s.find('\n[',start+1);end=len(s) if end<0 else end
 s=s[:start]+s[start:end].replace('enabled = true','enabled = false')+s[end:]
config.write_text(s)
baseline=repo/'supabase/bootstrap'
sql=(baseline/'20261030_public_schema.sql').read_text()
sql='\n'.join(line for line in sql.splitlines() if not line.startswith('\\'))
sql=sql.replace('CREATE SCHEMA public;','CREATE SCHEMA IF NOT EXISTS public;')
sql='CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;\n'+sql
sql+='\nSET search_path TO public, extensions;\n'
for name in ['auth-triggers.sql','buckets.sql','private-photo-helper.sql','storage-policies.sql']:sql+='\n'+(baseline/name).read_text()
migrations=root/'supabase/migrations';migrations.mkdir(exist_ok=True)
(migrations/'20261030230000_local_schema_baseline.sql').write_text(sql)
for p in sorted((repo/'supabase/migrations').glob('*.sql')):
 if p.name>='20261031070000':shutil.copyfile(p,migrations/p.name)
for name in ['reset-student-password','reset-teacher-password','provision-student-account']:
 shutil.copytree(repo/'supabase/functions'/name,root/'supabase/functions'/name)
print('Prepared schema-only local project:',root)
print('Start with the guarded runner; verify all published ports before tests.')
