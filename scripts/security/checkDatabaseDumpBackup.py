#!/usr/bin/env python3
"""Synthetic COPY escaping/integrity tests; never connects to production."""
import sys
sys.dont_write_bytecode=True
import gzip
import hashlib
import json
from pathlib import Path
import tempfile
import backupProductData
from pgDumpRows import summarize,decode_copy

assert decode_copy(br'\\N')==r'\N'
assert decode_copy(br'\N') is None
assert decode_copy(br'hello\tline\n\\end')=='hello\tline\n\\end'
assert decode_copy(br'\141\x62')=='ab'
with tempfile.TemporaryDirectory() as temporary:
    root=Path(temporary)
    dump=('COPY "public"."notes" ("id", "text") FROM stdin;\n'
          '1\tПривет\\nвторая строка\n\\.\n'
          'COPY "storage"."objects" ("bucket_id", "name", "metadata") FROM stdin;\n'
          'task-media\tfolder/две\\tтаб.txt\t{"size":5}\n\\.\n').encode()
    (root/'data.sql.gz').write_bytes(gzip.compress(dump))
    counts,objects=summarize([root/'data.sql.gz'])
    assert counts=={'"public"."notes"':1,'"storage"."objects"':1}
    assert objects==[{'bucket_id':'task-media','name':'folder/две\tтаб.txt','metadata':{'size':5}}]
    raw=(root/'data.sql.gz').read_bytes()
    manifest={'format':4,'tables':[{'table':t,'rows':n} for t,n in counts.items()],
        'data_files':['data.sql.gz'],'storage':[],'artifacts':[{'file':'data.sql.gz',
        'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}]}
    (root/'manifest.json').write_text(json.dumps(manifest))
    backupProductData.verify(root)
    manifest['tables'][0]['rows']=2
    (root/'manifest.json').write_text(json.dumps(manifest))
    try:backupProductData.verify(root);raise AssertionError('wrong COPY row count accepted')
    except RuntimeError:pass
    (root/'incomplete.sql').write_bytes(dump[:-3])
    try:summarize([root/'incomplete.sql']);raise AssertionError('truncated COPY accepted')
    except RuntimeError:pass
print('PASS: COPY escaping, UTF-8, Storage metadata, SQL integrity, row counts, truncation rejection')
