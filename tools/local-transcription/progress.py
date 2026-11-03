"""Atomic worker progress shared with the loopback HTTP service."""
import json

def record(folder, step, current, total, unit):
    tmp=folder/'progress.tmp'
    tmp.write_text(json.dumps(dict(step=step,current=current,total=total,unit=unit)))
    tmp.replace(folder/'progress.json')
