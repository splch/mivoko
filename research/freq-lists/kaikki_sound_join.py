#!/usr/bin/env python3
"""Add pronunciations (3rd column = py) to a mivoko list from kaikki.org dumps.
Usage: curl -s <kaikki.jsonl> | python3 kaikki_sound_join.py <code> <mode>
mode 'roman': py = romanization/reading from head-template expansion (hi,ko,ja,ar)
mode 'ipa':   py = first sounds[].ipa (es,fr,de,it,pt)
Keeps existing word/gloss columns intact."""
import json
import re
import sys

CODE, MODE = sys.argv[1], sys.argv[2]
LIST = f"/home/spencer/Repositories/mivoko/lists/{CODE}.txt"

rows = []
for line in open(LIST, encoding="utf-8"):
    parts = line.rstrip("\n").split("\t")
    rows.append([parts[0], parts[1] if len(parts) > 1 else "",
                 parts[2] if len(parts) > 2 else ""])
remaining = {r[0].lower(): i for i, r in enumerate(rows) if not r[2]}

def roman_of(e):
    for ht in e.get("head_templates") or []:
        exp = ht.get("expansion") or ""
        m = re.search(r"\(([^)]+)\)", exp)
        if m:
            r = m.group(1).split(",")[0].strip()
            return re.sub(r"\s+", " ", r)
    for s in e.get("sounds") or []:
        if s.get("ipa"):
            return s["ipa"]
    return ""

def ipa_of(e):
    for s in e.get("sounds") or []:
        if s.get("ipa"):
            return s["ipa"]
    return ""

def ja_reading(e, word):
    # kana-only words are their own pronunciation
    if all(not ('一' <= c <= '鿿') for c in word):
        return ""
    for ht in e.get("head_templates") or []:
        exp = ht.get("expansion") or ""
        pre = exp.split("•")[0].split()[0] if exp.split("•")[0].split() else ""
        # first ruby pattern only: 学(がっ)校(こう) -> がっこう (later alternates are separate readings)
        groups = re.findall(r"\(([^)]+)\)", pre)
        if groups:
            return "".join(groups)
        m = re.search(r"•\s*\(([^)]+)\)", exp)  # else romaji after the bullet
        if m:
            return m.group(1).split(",")[0].strip()
    return ""

if MODE == "ja":
    # reset the py column: an earlier pass stored truncated readings
    for r in rows:
        del r[2:]
        r.append("")  # re-pad to 3 columns so rows[i][2] exists
    remaining = {r[0].lower(): i for i, r in enumerate(rows) if not r[2]}

get = {"roman": roman_of, "ipa": ipa_of, "ja": ja_reading}[MODE]
found = 0
for raw in sys.stdin.buffer:
    try:
        e = json.loads(raw)
    except Exception:
        continue
    w = e.get("word")
    if not w:
        continue
    py = ja_reading(e, w) if MODE == "ja" else get(e)
    if not py:
        continue
    keys = [w.lower()] + [f["form"].lower() for f in (e.get("forms") or []) if f.get("form")]
    if MODE == "ja":
        keys = [k for k in keys if any('一' <= c <= '鿿' for c in k)]  # kanji forms only
    for key in keys:
        i = remaining.get(key)
        if i is not None and not rows[i][2]:
            rows[i][2] = py
            found += 1

have = sum(1 for r in rows if r[2])
with open(LIST, "w", encoding="utf-8") as f:
    for r in rows:
        f.write("\t".join(r).rstrip("\t") + "\n")
print(f"{CODE}: +{found} pronunciations -> {have}/10000 ({have//100}%)")
