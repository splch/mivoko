# Research: Hindi (Devanagari) downloadable frequency word list

## Summary

**TOP PICK: `hermitdave/FrequencyWords` 2018 `hi_full.txt`** — MIT-licensed, word-level Devanagari-dominant, rank-ordered, plain text, single curl. ~20–25k unique tokens (437,828 bytes, verified HTTP 200 via GitHub API + raw fetch). It needs a Devanagari-only filter pass at build time (the raw file contains romanized junk, punctuation, and OCR garbage in the tail), after which it comfortably clears the 10k-entry requirement. No other candidate combines permissive license + ≥10k entries + single-file curl download; the 2016 `hi_50k.txt` from the same repo fails the 10k bar (~3k entries only).

---

## TOP PICK (verified)

**`https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/hi/hi_full.txt`**

| Property | Value |
|---|---|
| HTTP status | **200** (raw.githubusercontent.com fetch succeeded; GitHub API confirms blob `6036afb5`, size **437,828 bytes**) |
| First 5 lines | `है 38292` / `। 25171` / `के 19078` / `मैं 17039` / `नहीं 15848` |
| Format | `{word}{space}{occurrence_count}`, one per line, rank-ordered descending. LF newlines, UTF-8. |
| Entry count | ~20–25k unique tokens (estimated from byte size; full file fetched end-to-end and terminates in a long frequency-1 hapax tail). After Devanagari-only cleaning, expect ~15–20k usable entries — meets the 10k minimum. |
| License | **MIT** — repo-root [LICENSE](https://github.com/hermitdave/FrequencyWords/blob/master/LICENSE) (verified full text). Redistribution in an app is fine with attribution. |
| Corpus source | **OpenSubtitles 2018** (OPUS, http://opus.nlpl.eu/OpenSubtitles2018.php), tokenized by hermitdave's FrequencyWords generator. Same repo/series used by many existing language apps. |
| Companion file | `hi_ignored.txt` (57,612 bytes) in the same directory — the stopword/ignored tokens list; not needed but available. |

**Quirks (must clean):**
1. Rank 2 is the danda punctuation token `।` — drop non-word tokens.
2. Tail contains romanized intruders (`nder`, `rm`, `the`, `amélie`), mixed-script tokens (`stank-गधा`, `go-7`), Devanagari-digit artifacts (`०८.५२७ 3`, `१० 2`, `५० 2`), lone-vowel/fragments (`िक`, `िक`, `्यादा`, `ं`), and misspellings/duplicates from subtitle OCR (`ज़रूरत` vs `ज़रूरत` vs `जरूरत`; `हूँ`/`हूं`/`हुं`).
3. Register is informal/conversational (movie subtitles) — good for a language-learning app, weak on formal/news vocabulary.
4. License caveat: the MIT LICENSE covers the repo; the underlying OPUS OpenSubtitles corpus is "free for research" — in practice these derived lists are widely redistributed (e.g., in Anki decks, apps) without issue, but it's not as clean as CC0.

**Build-time cleaning recommendation (one line):**
Filter with a Devanagari-only regex and drop digits/punct, e.g.
`grep -P '^[\p{Devanagari}]+ \d+$' hi_full.txt | grep -vP '^[\p{Devanagari}]*[\x{0966}-\x{096F}]'` (drops romanized/mixed tokens, `।`, and Devanagari-digit artifacts; then re-index ranks).

---

## ALTERNATES

### 1. Leipzig Corpora Collection — Hindi (verified URL, CC-BY, biggest & highest-quality corpus)
- **URL (verified 200, 193 MB response):** `https://downloads.wortschatz-leipzig.de/corpora/hin_news_2022_1M.tar.gz`
- Inside the tarball: `hin_news_2022_words.txt` — tab-separated `rank \t word \t frequency`, all word forms of a **1,741,583-sentence / 29.5M-token Hindi news corpus (2022 material)**. Easily 100k+ unique forms; the only option that truly hits the "ideally 50k" mark.
- **License:** CC-BY (per [Terms of Usage](https://wortschatz.informatik.uni-leipzig.de/en/usage): "The text corpora offered for download are made available under the Creative Commons licence CC BY") — note the same page applies CC-BY-NC to the *web application*, so cite the CC-BY corpus license specifically.
- Other Hindi corpora available: `hin_wikipedia_2021`, `hin_mixed_2019`, etc. ([download page](https://wortschatz.uni-leipzig.de/en/download/hin) — bot-walled HTML page, but direct tarball URLs work).
- **Quirks:** needs `tar -xzO` extraction at build time (not a bare curl of a text file); Devanagari-only already; news register; word forms unlemmatized.

### 2. NDH-GH/shabd-nidhi (verified URL, 14,926 words, educational register)
- **URL (verified 200):** `https://raw.githubusercontent.com/NDH-GH/shabd-nidhi/main/data/shabd_nidhi_master.csv`
- CSV `normalized_word,frequency` (floats), rank-ordered; **14,926 unique words** from NCERT Hindi textbooks (Classes 1–12). Companion files add grade-of-first-appearance and POS/example sentences — attractive for a learning app.
- **License:** code is MIT; **dataset license is ambiguous** — README states users must ensure compliance with NCERT source terms ([repo](https://github.com/NDH-GH/shabd-nidhi)). Treat as "redistribution risk, verify before shipping."
- **Quirks:** a handful of rows contain LLM-pipeline garbage in the word field (e.g., `ट्रेन (if the context suggests...),16.0`) and OCR fragments (`स्थ`, `ध`); needs the same Devanagari-only regex filter; formal/textbook register.

---

## Dropped candidates

- **hermitdave 2016 `hi_50k.txt`** — verified 200, MIT, but only **29,946 bytes ≈ ~3k entries** (Hindi slice of OpenSubtitles2016 is tiny; despite the "50k" filename it has nowhere near 50k, nor 10k). Fails requirement 3. Also dirtier (top-100 already contains romanized tokens).
- **LuminosoInsight/wordfreq** — MIT, best corpus mix (Wikipedia + OpenSubtitles + news + OSCAR) and Hindi is covered, but frequencies ship as msgpack/cBpack data inside the Python package, not a plain static list; requires Python to decode. Wrong packaging for curl-at-build-time.
- **OPUS OpenSubtitles Hindi direct** — source corpus itself is downloadable, but you'd have to tokenize/count yourself; duplicating hermitdave's output. Research-oriented licensing ambiguity upstream.
- **motaitalic.github.io Hindi word frequency** — single unsourced flat list of a few hundred words, no counts, no license. Too small.
- **Hindi WordCorp (research paper)** — preprint describing a Hindi/Marathi frequency corpus; dataset not publicly downloadable at a stable curl URL.

## Gaps
- Exact line count of `hi_full.txt` could not be computed without executing `wc -l` (no shell here); estimate derived from the GitHub API byte size (437,828 B) and a full end-to-end content fetch. Parent can confirm with `curl -sL <url> | wc -l`.
- Leipzig CC-BY wording is split between CC-BY (downloaded corpora) and CC-BY-NC (the web app/data exploration) on the same terms page — read before shipping.
- shabd-nidhi dataset redistribution rights unresolved (NCERT-derived).

## Supervisor coordination
No decisions needed; task complete.
