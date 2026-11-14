"""Atomic measured worker progress shared with the loopback HTTP service."""
import json
import time


def record(folder, step, current, total, unit, phase=None):
    tmp=folder/'progress.tmp'
    tmp.write_text(json.dumps(dict(step=step,current=current,total=total,unit=unit,
                                  phase=phase,updatedAt=time.time())))
    tmp.replace(folder/'progress.json')
