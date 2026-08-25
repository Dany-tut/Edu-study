# Вставка блока переводов в нужный языковой словарь questionRu.ts.
# Аргументы: chunk.json, tr.py (список TR), lang, якорь-следующий-язык
import io, json, sys, importlib.util
chunk, trfile, lang, anchor_next = sys.argv[1:5]
spec = importlib.util.spec_from_file_location('tr', trfile)
mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
TR = mod.TR
rows = json.load(open(chunk))
keys = [r['s'] for r in rows if 's' in r]
assert len(keys) == len(TR), f'ключей {len(keys)}, переводов {len(TR)}'
esc = lambda s: s.replace('\\', '\\\\').replace("'", "\\'")
out, i = [], 0
for r in rows:
    if 'doc' in r:
        title = r['doc'].split(' · ')[-1] or r['doc'].split(' · ')[0]
        out.append('')
        out.append(f"    // ── {title} " + '─' * max(3, 68 - len(title)))
        continue
    out.append(f"    '{esc(r['s'])}': '{esc(TR[i])}',"); i += 1
block = "\n".join(out)
p = 'src/data/questionRu.ts'; s = io.open(p, encoding='utf-8').read()
anchor = "  },\n\n" + anchor_next
assert s.count(anchor) == 1, f'якорь встречается {s.count(anchor)} раз'
io.open(p, 'w', encoding='utf-8').write(s.replace(anchor, block + "\n  },\n\n" + anchor_next))
print('вставлено:', i)
