#!/usr/bin/env python3
"""Build mivoko's bundled frequency lists from the researched sources.

Outputs lists/{en,zh,hi,es,ar,fr}.txt — one entry per line,
`word` or `word<TAB>translation` (zh gets pinyin + English gloss free from SUBTLEX-CH).
Top 10k per language after cleaning.
"""
import re
import zipfile

OUT = "/home/spencer/Repositories/mivoko/lists"
TOP_N = 10_000

def write(code, rows):
    path = f"{OUT}/{code}.txt"
    with open(path, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(r + "\n")
    print(f"{code}: {len(rows)} entries -> {path}")
    for r in rows[:3]:
        print("   ", r)

def load_words_counts(path):
    with open(path, encoding="utf-8") as f:
        for line in f:
            parts = line.split()
            if len(parts) == 2 and parts[1].isdigit():
                yield parts[0]

def top_filtered(path, pattern, n, extra=None):
    rx = re.compile(pattern)
    seen, rows = set(), []
    for w in load_words_counts(path):
        if not rx.fullmatch(w):
            continue
        if extra and not extra(w):
            continue
        if w in seen:
            continue
        seen.add(w)
        rows.append(w)
        if len(rows) >= n:
            break
    return rows

# --- English / Spanish / French: hermitdave FrequencyWords 2018 (OpenSubtitles) ---
LATIN = {
    "en": re.compile(r"[a-z]+(?:'[a-z]+)?"),
    "es": re.compile(r"[a-záéíóúüñ]+(?:[-'][a-záéíóúüñ]+)*"),
    "fr": re.compile(r"[a-zàâæçéèêëîïôœùûüÿ]+(?:-[a-zàâæçéèêëîïôœùûüÿ]+)*"),
}
for code in ("en", "es", "fr"):
    rows = top_filtered(f"{code}_raw.txt", LATIN[code], TOP_N)
    write(code, rows)

# --- Hindi: hermitdave 2018 hi_full, Devanagari letters only ---
# Range \u0901-\u0979 keeps vowels/consonants/matras but excludes danda (।॥),
# Devanagari digits, and the abbreviation sign. Also drop matra-initial fragments.
# Allowed: letters, matras, nukta forms; excluded: danda U+0964-65, digits U+0966-6F, abbrev U+0970-71.
DEV = re.compile(r"[ँ-ह़-्ॐ-क़य़-ॣॲ-ॹ]+")
BAD_FIRST = set("ंः़ेैिीुूृॄेोौ्")
hi_rows = top_filtered(
    "hi_raw.txt", DEV, TOP_N,
    extra=lambda w: w[0] not in BAD_FIRST,
)
write("hi", hi_rows)

# --- Arabic: CAMeL Lab MSA frequency list (already script-only, diacritics/tatweel stripped) ---
ar_rows = []
with zipfile.ZipFile("camel_msa.zip") as z:
    inner = [n for n in z.namelist() if n.lower().endswith((".tsv", ".txt"))][0]
    with z.open(inner) as f:
        for raw in f:
            word = raw.decode("utf-8", "replace").split("\t")[0].strip()
            if word:
                ar_rows.append(word)
            if len(ar_rows) >= TOP_N:
                break
write("ar", ar_rows)

# --- Mandarin: SUBTLEX-CH combined file (word + pinyin + English translation) ---
TONE_MARKS = {"a": "āáǎà", "e": "ēéěè", "i": "īíǐì", "o": "ōóǒò", "u": "ūúǔù", "ü": "ǖǘǚǜ"}

def tone_mark(syl):
    m = re.match(r"^([a-zü:]+?)([1-5])$", syl.lower().replace("u:", "ü"))
    if not m:
        return syl
    base, tone = m.group(1), int(m.group(2))
    if tone == 5:
        return base
    for v in ("a", "e"):
        if v in base:
            idx = base.index(v)
            break
    else:
        if "ou" in base:
            idx = base.index("o")
        else:
            vowels = [i for i, c in enumerate(base) if c in "iouü"]
            if not vowels:
                return base
            idx = vowels[-1]
    return base[:idx] + TONE_MARKS[base[idx]][tone - 1] + base[idx + 1:]

def pinyin_marks(numbered):
    return " ".join(tone_mark(s) for s in numbered.split())

zh_rows = []
with zipfile.ZipFile("subtlexch.zip") as z:
    data = z.read("SUBTLEX_CH_131210_CE.utf8").decode("utf-8-sig")
header = data.splitlines()[0].split("\t")
ci = {name: i for i, name in enumerate(header)}
for line in data.splitlines()[1:]:
    cols = line.split("\t")
    if len(cols) <= ci["Eng.Tran."]:
        continue
    word, pinyin, eng = cols[ci["Word"]], cols[ci["Pinyin"]], cols[ci["Eng.Tran."]]
    pinyin = pinyin_marks(pinyin.split("/")[0])          # first reading, tone marks
    eng = eng.strip('"').split(";")[0].strip().replace(",", "/")  # first gloss; commas break the parser
    if len(eng) > 60:
        eng = eng[:57].rsplit(" ", 1)[0] + "…"
    zh_rows.append(f"{word}\t{eng}\t{pinyin}")          # word, english, pinyin (3 cols)
    if len(zh_rows) >= TOP_N:
        break
write("zh", zh_rows)

# --- Round 2: ja/ko/de/it/pt (added with the five new personas) ---
RX2 = {
  "de": re.compile(r"[a-zäöüß]+(?:-[a-zäöüß]+)*"),
  "it": re.compile(r"[a-zàèéìíîòóùú]+(?:-[a-zàèéìíîòóùú]+)*"),
  "pt": re.compile(r"[a-zàâáãçéêíóôõúü]+(?:-[a-zàâáãçéêíóôõúü]+)*"),
  "ko": re.compile(r"[가-힣ㄱ-ㅎㅏ-ㅣ]+"),
  "ja": re.compile(r"[぀-ヿ一-鿿]+"),  # kana+kanji only (drops 、。 punctuation)
}
def ja_ok(w):
    # drop single-kana fragments (あ, イ); keep single kanji (何, 私 are words)
    return not (len(w) == 1 and not ('一' <= w <= '鿿'))

for code in ("de", "it", "pt", "ko"):
    write(code, top_filtered(f"{code}_raw.txt", RX2[code], TOP_N))
write("ja", top_filtered("ja_raw.txt", RX2["ja"], TOP_N, extra=ja_ok))  # source: ja_full.txt (no ja_50k)
