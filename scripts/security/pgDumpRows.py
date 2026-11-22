"""Streaming COPY-text summary; no row values are logged."""
import gzip
from pathlib import Path
import re
import json


def decode_copy(value):
    if value == b'\\N':return None
    replacements={b'b':b'\b',b'f':b'\f',b'n':b'\n',b'r':b'\r',b't':b'\t',b'v':b'\v'}
    def replace(match):
        token=match[1]
        if token.startswith(b'x') and len(token)>1:return bytes([int(token[1:],16)])
        if token[:1] in b'01234567':return bytes([int(token,8)])
        return replacements.get(token,token)
    return re.sub(rb'\\(x[0-9a-fA-F]{1,2}|[0-7]{1,3}|.)',replace,value).decode('utf-8')


def summarize(paths):
    counts={};objects=[]
    for path in paths:
        path=Path(path);current=None;columns=[]
        source=gzip.open(path,'rb') if path.suffix=='.gz' else path.open('rb')
        with source:
            for line in source:
                if current:
                    if line.rstrip(b'\n')==b'\\.':current=None;continue
                    counts[current]+=1
                    if current=='"storage"."objects"':
                        values=line.rstrip(b'\n').split(b'\t')
                        row=dict(zip(columns,map(decode_copy,values)))
                        objects.append({'bucket_id':row['bucket_id'],'name':row['name'],
                            'metadata':json.loads(row['metadata']) if row.get('metadata') else None})
                else:
                    match=re.match(rb'^COPY ("(?:[^"]|"")+"\."(?:[^"]|"")+") \((.*)\) FROM stdin;',line)
                    if match:
                        current=match[1].decode('utf-8')
                        if current in counts:raise RuntimeError('Duplicate COPY table')
                        counts[current]=0
                        columns=[x.replace('""','"') for x in re.findall(r'"((?:[^"]|"")*)"',match[2].decode('utf-8'))]
            if current:raise RuntimeError('Truncated COPY data')
    if not counts:raise RuntimeError('Empty database dump')
    return counts,objects
