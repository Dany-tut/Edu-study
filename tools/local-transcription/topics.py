"""Lexical topic transitions plus local descriptive chapter titles."""
import json, math, re, sys
from collections import Counter
from pathlib import Path
from progress import record
from chapter_titles import checked_title
from mlx_lm import generate, load

folder=Path(sys.argv[1])
rows=json.loads((folder/'segments.json').read_text())
modelpath=next(Path.home().glob('.cache/huggingface/hub/models--mlx-community--Qwen2.5-3B-Instruct-4bit/snapshots/*/config.json')).parent
model,tok=load(str(modelpath))
stop=set('the and with your that this those from have will just also your what about some into then them been they well есть это как уже вот для или что так как эти тоже чтобы когда очень можно будет'.split())
def terms(text):
    return Counter(w for w in re.findall(r'[^\W\d_]+',text.casefold()) if len(w)>2 and w not in stop)
features=[terms(s['text']) for s in rows]
frequency=Counter()
for words in features:frequency.update(words.keys())
duration=rows[-1]['end']
min_span=min(35,max(8,duration/6))
window=min(45,max(10,duration/8))
slide_file=folder/'slides.json'
slides=json.loads(slide_file.read_text()) if slide_file.exists() else []
candidates=[]
for i in range(1,len(rows)):
    t=rows[i]['start']
    if t<min_span or duration-t<min_span:continue
    left,right=Counter(),Counter()
    j=i-1
    while j>=0 and t-rows[j]['end']<window:
        left.update(features[j]);j-=1
    j=i
    while j<len(rows) and rows[j]['start']-t<window:
        right.update(features[j]);j+=1
    for v in (left,right):
        for word in v:v[word]*=math.log1p(len(rows)/frequency[word])
    def norm(v):return math.sqrt(sum(x*x for x in v.values()))
    similarity=sum(n*right[w] for w,n in left.items())/max(1,norm(left)*norm(right))
    sentence_bonus=0.08 if rows[i-1]['text'].rstrip().endswith(('.','!','?','。','？','！')) else 0
    pause_bonus=min(0.1,max(0,t-rows[i-1]['end'])*0.05)
    # A stable new slide heading corroborates a nearby speech boundary.
    distance=min((abs(t-slide['start']) for slide in slides),default=math.inf)
    visual_bonus=0.42*max(0,1-distance/8)
    candidates.append((1-similarity+sentence_bonus+pause_bonus+visual_bonus,i))
boundaries=[0]
for score,i in sorted(candidates,reverse=True):
    if score<0.72:break
    if all(abs(rows[i]['start']-rows[j]['start'])>=min_span for j in boundaries):
        boundaries.append(i)
    if len(boundaries)>=max(1,round(duration/max(15,window*1.55))):break
boundaries.sort()
chapters=[]
for begin,end in zip(boundaries,boundaries[1:]+[len(rows)]):
    record(folder,'Собираем главы',len(chapters),len(boundaries),'chapters')
    excerpt=' '.join(s['text'] for s in rows[begin:end])
    if len(excerpt)>5200:excerpt=excerpt[:3400]+' … '+excerpt[-1600:]
    headings=[s['text'] for s in slides if rows[begin]['start']-3 <= s['start'] < rows[end-1]['end']-3]
    if headings:
        excerpt += '\nText visible on slides: '+' / '.join(headings[:8])
    messages=[{'role':'system','content':'You write short Russian chapter headings. Answer only with one Russian noun phrase summarizing the main subject of the supplied passage.'},
              {'role':'user','content':'The printer moves its nozzle across the bed, laying down layers of hot plastic.'},
              {'role':'assistant','content':'Как работает 3D-принтер'},
              {'role':'user','content':excerpt}]
    def heading(messages):
        prompt=tok.apply_chat_template(messages,tokenize=False,add_generation_prompt=True)
        raw=generate(model,tok,prompt=prompt,max_tokens=60,verbose=False).strip()
        return raw.splitlines()[0].strip(' *#«»"') if raw else ''
    title=heading(messages)
    title=checked_title(title, lambda value: heading([{'role':'system','content':'Translate the given chapter title into Russian. Respond with the Russian translation only.'},{'role':'user','content':value or excerpt[:160]}]),len(chapters)+1)
    chapters.append(dict(start=rows[begin]['start'] if begin else 0,title=title))
(folder/'chapters.json').write_text(json.dumps(chapters,ensure_ascii=False,indent=2))
