#!/usr/bin/env python3
"""Fix pronunciation passes for en (CMU IPA), hi (translit), ko (RR).
Re-run from clean UTF-8 file after heredoc mangling suspicion."""
import json
import re
import unicodedata

REPO = "/home/spencer/Repositories/mivoko"

def load(code):
    rows = [l.split("\t") for l in open(f"{REPO}/lists/{code}.txt", encoding="utf-8").read().splitlines()]
    return rows

def save(code, rows):
    with open(f"{REPO}/lists/{code}.txt", "w", encoding="utf-8") as f:
        f.write("\n".join("\t".join(r).rstrip("\t") for r in rows) + "\n")

# ---------- English: CMUdict -> IPA (single-space format) ----------
V = {"AA": "ɑ", "AE": "æ", "AH": "ʌ", "AO": "ɔ", "AW": "aʊ", "AY": "aɪ", "EH": "ɛ", "ER": "ɝ",
     "EY": "eɪ", "IH": "ɪ", "IY": "i", "OW": "oʊ", "OY": "ɔɪ", "UH": "ʊ", "UW": "u"}
C = {"B": "b", "CH": "tʃ", "D": "d", "DH": "ð", "F": "f", "G": "ɡ", "HH": "h", "JH": "dʒ",
     "K": "k", "L": "l", "M": "m", "N": "n", "NG": "ŋ", "P": "p", "R": "r", "S": "s",
     "SH": "ʃ", "T": "t", "TH": "θ", "V": "v", "W": "w", "Y": "j", "Z": "z", "ZH": "ʒ"}

cmu = {}
for line in open("/tmp/freqbuild2/cmudict.dict", encoding="utf-8", errors="replace"):
    line = line.strip()
    if not line or line.startswith(";;;"):
        continue
    word, _, phones = line.partition(" ")
    word = re.sub(r"\(\d+\)$", "", word).lower()
    if word and phones and word not in cmu:
        cmu[word] = phones

def ipa(phones):
    out = ""
    for p in phones.split():
        m = re.match(r"([A-Z]+)([012])?$", p)
        if not m:
            continue
        ph, st = m.group(1), m.group(2)
        if ph in V:
            if st == "1": out += "ˈ"
            elif st == "2": out += "ˌ"
            if ph == "AH" and st == "0": out += "ə"
            elif ph == "ER" and st == "0": out += "ɚ"
            else: out += V[ph]
        else:
            out += C.get(ph, "")
    return "/" + out + "/"

cmu_ipa = {w: ipa(ph) for w, ph in cmu.items()}
print("cmu entries:", len(cmu_ipa), "| sample you:", cmu_ipa.get("you"), "evening:", cmu_ipa.get("evening"))

SUFX = {"s": "s", "es": "ɪz", "ed": "d", "ing": "ɪŋ", "ly": "li", "er": "ər", "est": "əst"}
def strip_cands(w):
    out = []
    for suf in ("ies", "ing", "ed", "es", "est", "er", "ly", "s"):
        if w.endswith(suf) and len(w) > len(suf) + 1:
            out.append((w[:-len(suf)], suf))
    if w.endswith("ies") and len(w) > 4:
        out.append((w[:-3] + "y", "s"))
    return out

rows = load("en")
fixed = 0
for r in rows:
    if len(r) > 2 and r[2]:
        continue
    w = r[0].lower()
    py = cmu_ipa.get(w)
    if not py:
        for base, suf in strip_cands(w):
            if base in cmu_ipa:
                py = cmu_ipa[base][:-1] + SUFX.get(suf, "") + "/"
                break
    if py:
        while len(r) < 3: r.append("")
        r[2] = py
        fixed += 1
save("en", rows)
print(f"en: +{fixed} -> {sum(1 for r in rows if len(r)>2 and r[2])}/10000")

# ---------- Hindi: Devanagari -> roman (re-run, deterministic overwrites) ----------
IV = {"अ": "a", "आ": "ā", "इ": "i", "ई": "ī", "उ": "u", "ऊ": "ū", "ऋ": "ri",
      "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au"}
CON = {"क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "n", "च": "ch", "छ": "chh",
       "ज": "j", "झ": "jh", "ञ": "ny", "ट": "ṭ", "ठ": "ṭh", "ड": "ḍ", "ढ": "ḍh",
       "ण": "ṇ", "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n", "प": "p",
       "फ": "ph", "ब": "b", "भ": "bh", "म": "m", "य": "y", "र": "r", "ल": "l",
       "व": "v", "श": "sh", "ष": "sh", "स": "s", "ह": "h",
       "क्ष": "ksh", "त्र": "tr", "ज्ञ": "gy"}
MAT = {"ा": "ā", "ि": "i", "ी": "ī", "ु": "u", "ू": "ū", "ृ": "ri",
       "े": "e", "ै": "ai", "ो": "o", "ौ": "au"}
NUK = {"क": "q", "ख": "x", "ग": "ġ", "ज": "z", "फ": "f", "ड": "ṛ", "ढ": "ṛh"}

def translit(word):
    word = unicodedata.normalize("NFC", word)
    out, i = [], 0
    while i < len(word):
        ch = word[i]
        if ch in IV:
            out.append(IV[ch])
        elif ch in MAT:
            out.append(MAT[ch])
        elif ch in ("ं", "ँ"):
            out.append("n")
        elif ch == "ः":
            out.append("h")
        elif ch in ("़", "्"):
            pass  # nukta handled w/ consonant; virama suppresses inherent a
        elif ch in CON:
            base = CON[ch]
            if i + 1 < len(word) and word[i + 1] == "़":
                base = NUK.get(ch, base)
                i += 1
            out.append(base)
            nxt = word[i + 1] if i + 1 < len(word) else ""
            if nxt not in MAT and nxt != "्":
                out.append("a")
        else:
            out.append(ch)
        i += 1
    s = "".join(out)
    if len(word) > 1 and s.endswith("a") and not word.endswith(("ा", "अ")):
        s = s[:-1]
    return s

for w, want in [("है", "hai"), ("मैं", "main"), ("नहीं", "nahīn"), ("ज़रूरत", "zarūrat"),
                ("किताब", "kitāb"), ("स्कूल", "skūl")]:
    got = translit(w)
    print(f"  hi check {w} -> {got} {'OK' if got == want else 'MISMATCH want ' + want}")

rows = load("hi")
for r in rows:
    while len(r) < 3: r.append("")
    r[2] = translit(r[0])
save("hi", rows)
print(f"hi: {sum(1 for r in rows if r[2])}/10000 transliterated (re-run)")

# ---------- Korean: hangul -> Revised Romanization (re-run) ----------
I_ = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"]
V_ = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo",
      "u", "wo", "we", "wi", "yu", "eu", "ui", "i"]
F_ = ["", "k", "k", "k", "n", "n", "n", "t", "l", "l", "l", "l", "l", "l", "l", "l",
      "m", "p", "p", "t", "t", "ng", "t", "t", "k", "t", "p", "t"]
JAMO = {"ㄱ": "g", "ㄴ": "n", "ㄷ": "d", "ㄹ": "r", "ㅁ": "m", "ㅂ": "b", "ㅅ": "s", "ㅇ": "ng",
        "ㅈ": "j", "ㅊ": "ch", "ㅋ": "k", "ㅌ": "t", "ㅍ": "p", "ㅎ": "h",
        "ㅏ": "a", "ㅑ": "ya", "ㅓ": "eo", "ㅕ": "yeo", "ㅗ": "o", "ㅛ": "yo", "ㅜ": "u",
        "ㅠ": "yu", "ㅡ": "eu", "ㅣ": "i", "ㅐ": "ae", "ㅔ": "e"}

def romanize(word):
    word = unicodedata.normalize("NFC", word)
    out, prev_fin = [], ""
    for ch in word:
        cp = ord(ch)
        if 0xAC00 <= cp <= 0xD7A3:
            n = cp - 0xAC00
            ini, med, fin = I_[n // 588], V_[(n % 588) // 28], F_[n % 28]
            # nasal/liquid assimilation against previous syllable's final
            if prev_fin == "p" and ini in ("n", "r"):
                out[-1] = out[-1][:-1] + "m"; ini = "n" if ini == "r" else ini
            elif prev_fin == "k" and ini in ("n", "r"):
                out[-1] = out[-1][:-1] + "ng"; ini = "n" if ini == "r" else ini
            elif prev_fin == "t" and ini in ("n", "r"):
                out[-1] = out[-1][:-1] + "n"; ini = "n" if ini == "r" else ini
            elif prev_fin == "l" and ini == "n":
                ini = "l"
            elif prev_fin == "n" and ini == "r":
                ini = "l"
            elif prev_fin == "l" and ini == "r":
                ini = "l"
            out.append(ini + med + fin)
            prev_fin = fin
        elif ch in JAMO:
            out.append(JAMO[ch])
            prev_fin = ""
        else:
            out.append(ch)
            prev_fin = ""
    return "".join(out)

for w, want in [("내가", "naega"), ("사랑해", "saranghae"), ("학교", "hakgyo"), ("한국", "hanguk"),
                ("감사합니다", "gamsahamnida")]:
    got = romanize(w)
    print(f"  ko check {w} -> {got} {'OK' if got == want else 'MISMATCH want ' + want}")

rows = load("ko")
for r in rows:
    while len(r) < 3: r.append("")
    r[2] = romanize(r[0])
save("ko", rows)
print(f"ko: {sum(1 for r in rows if r[2])}/10000 romanized (re-run)")
