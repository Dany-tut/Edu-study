import json
from pathlib import Path
root=Path(__file__).parent
summary={}
for name in ['before','before-warm','after','after-warm','after-mobile']:
    runs=json.loads((root/(name+'.json')).read_text()); rows=[]
    for r in runs:
        idx=int(r['clicks'][0]['id'])-1; fs=r['frames']; start=r['clicks'][0]['t']
        deltas=[abs(b['tabs'][idx]['w']-a['tabs'][idx]['w']) for a,b in zip(fs,fs[1:])]
        changes=[d for d in deltas if d>.005]
        overlap=any(b['x']<a['x']+a['w']-.5 for f in fs for a,b in zip(f['tabs'],f['tabs'][1:]))
        wrong_data=any(any('Модуль '+next(t['id'] for t in f['tabs'] if t['pressed']=='true')+' ' not in (l['label'] or '') for l in f['lessons']) for f in fs)
        tail=[max(abs(b['tabs'][j]['x']-a['tabs'][j]['x']) for j in range(4)) for a,b in zip(fs,fs[1:]) if b['t']-start>280]
        rows.append(dict(target=idx+1,frames=len(fs),pre_click=sum(f['t']<start for f in fs),last_width_step=changes[-1] if changes else 0,max_step_after_280ms=max(tail,default=0),max_frame_interval=max(b['t']-a['t'] for a,b in zip(fs,fs[1:])),overlap=overlap,wrong_data=wrong_data))
        if name.startswith('after'):
            assert not overlap and not wrong_data, (name,rows[-1])
            assert rows[-1]['last_width_step']<=.05, (name,rows[-1])
    summary[name]=rows
assert any(r['last_width_step']>.1 for r in summary['before']), 'Baseline must reveal the fault'
(root/'summary.json').write_text(json.dumps(summary,indent=2))
print(json.dumps(summary,indent=2))
