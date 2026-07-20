#!/usr/bin/env python3
"""Join a mivoko frequency list with kaikki.org (Wiktionary) glosses.
Usage: curl -s <kaikki.jsonl> | python3 kaikki_join.py <code>
Writes lists/<code>.txt as `word\tgloss` (gloss may be empty)."""
import json
import re
import sys

CODE = sys.argv[1]
LIST = f"/home/spencer/Repositories/mivoko/lists/{CODE}.txt"

targets = []
with open(LIST, encoding="utf-8") as f:
    for line in f:
        w = line.split("\t")[0].strip()
        if w:
            targets.append(w)
remaining = {w.lower(): w for w in targets}

def clean(g):
    g = re.sub(r"[\t;,]+", "/", g).strip()
    g = re.sub(r"\s+", " ", g)
    return g[:67].rsplit(" ", 1)[0] + "…" if len(g) > 70 else g

found = {}
for raw in sys.stdin.buffer:
    try:
        e = json.loads(raw)
    except Exception:
        continue
    w = e.get("word")
    if not w:
        continue
    gloss = ""
    for s in e.get("senses") or []:
        gs = [g for g in (s.get("glosses") or []) if g]
        if gs:
            gloss = clean(gs[0])
            break
    if not gloss:
        continue
    # index the headword AND its inflected forms (forms carry the lemma's gloss)
    keys = [w.lower()]
    for fo in e.get("forms") or []:
        f = fo.get("form")
        if f:
            keys.append(f.lower())
    for key in keys:
        if key in remaining and key not in found:
            found[key] = gloss

out, n = [], 0
for w in targets:
    g = found.get(w.lower(), "")
    n += bool(g)
    out.append(f"{w}\t{g}" if g else w)
with open(LIST, "w", encoding="utf-8") as f:
    f.write("\n".join(out) + "\n")
print(f"{CODE}: {n}/{len(targets)} translated ({100*n//len(targets)}%)")
