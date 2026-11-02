import subprocess,time,json,re,shutil
from pathlib import Path
root=Path('/tmp/iskra-local-security');low=0
with (root/'resources-active.jsonl').open('a') as f:
 for tick in range(180):
  if (root/'monitor.stop').exists():break
  mem=subprocess.check_output(['memory_pressure','-Q'],text=True);pct=int(re.search(r'free percentage: (\d+)',mem).group(1));free=shutil.disk_usage(root).free/1024**3
  names=subprocess.check_output(['docker','ps','--filter','name=iskra-local-security','--format','{{.Names}}'],text=True).splitlines()
  r=subprocess.run(['docker','stats','--no-stream','--format','{{json .}}',*names],capture_output=True,text=True) if names else None
  row={'time':time.time(),'memory_free_pct':pct,'disk_free_gib':round(free,2),'stats':[json.loads(l) for l in r.stdout.splitlines() if l.startswith('{')]} if r else {'time':time.time(),'memory_free_pct':pct,'disk_free_gib':round(free,2)}
  f.write(json.dumps(row)+'\n');f.flush();low=low+1 if pct<12 else 0
  if free<8 or low>=3:
   if names:subprocess.run(['docker','stop','--timeout','5',*names],capture_output=True)
   print('SAFETY STOP');break
  time.sleep(8)
names=subprocess.check_output(['docker','ps','--filter','name=iskra-local-security','--format','{{.Names}}'],text=True).splitlines()
if names:subprocess.run(['docker','stop','--timeout','5',*names],capture_output=True)
print('Resource watch ended; local project stopped')
