# Research: Arabic frequency word list for bundling (open-source language-learning app)

## Summary
**TOP PICK: CAMeL Lab Arabic Frequency Lists — `MSA_freq_lists.tsv.zip`** (CC BY-SA 4.0): 11.4M Arabic-script-only word types, rank-ordered TSV, derived from the peer-reviewed CAMeLBERT pretraining corpora (12.6B MSA tokens: Gigaword, OSCAR, OSIAN, Wikipedia, Abu El-Khair), with diacritics and tatweel already stripped. Verified downloadable via GitHub release asset (69.1 MB, `curl -L`). Backup: hermitdave/FrequencyWords `ar_50k.txt` (CC BY-SA 4.0, raw text verified 200) is smaller and simpler but noisy (Latin junk tokens, tatweel artifacts, subtitle register).

## TOP PICK — CAMeL Arabic Frequency Lists (MSA)

- **URL (curl at build time, `-L` required — GitHub 302→S3):**
  `https://github.com/CAMeL-Lab/Camel_Arabic_Frequency_Lists/releases/download/v1.0/MSA_freq_lists.tsv.zip`
- **Verified:** GitHub API for release `v1.0` (published 2024-06-26) confirms asset `MSA_freq_lists.tsv.zip`, state `uploaded`, content-type `application/zip`, **size 69,064,867 bytes (~69 MB zip)**, 1,341 downloads. (No shell in this environment; verified via API + repo clone rather than a literal curl HEAD. A `curl -sIL` will show 302→200.)
- **First 5 lines** (TSV: `word<TAB>count`, descending frequency; from repo README — RTL terminals may *display* columns reversed):
  ```
  في	255725161
  من	205864175
  على	122591931
  و	68783652
  أن	64519408
  ```
- **Entry count:** ~**11.4M unique word types** from a 12.6B-token MSA corpus — far exceeds the 50k target; truncate to top-N at build time. Sibling files if ever wanted: `MIX_` (16.1M types/17.3B tokens, 98.6 MB), `DA_` (6.7M, 39.1 MB), `CA_` (2.4M, 11.6 MB).
- **License:** **CC BY-SA 4.0** for the lists ([LICENSE.txt](https://github.com/CAMeL-Lab/Camel_Arabic_Frequency_Lists/blob/main/LICENSE.txt), https://creativecommons.org/licenses/by-sa/4.0/), with a request to cite the CAMeLBERT paper (Inoue et al. 2021, WANLP). Attribution + ShareAlike — acceptable per requirements; ship attribution in-app/about page.
- **Corpus source / register:** **MSA only** — Arabic Gigaword 5th ed. (news), Abu El-Khair corpus, OSIAN, Arabic Wikipedia (2019 dump), unshuffled Arabic OSCAR (web). Register skews news/web/formal; not conversational. Peer-reviewed provenance ([paper](https://aclanthology.org/2021.wanlp-1.10/), NYU Abu Dhabi CAMeL Lab).
- **Quirks:**
  - **Diacritics and tatweel (kashida) already removed** at corpus preprocessing (CAMeL Tools), per paper §3.2 — a major cleanliness win over hermitdave.
  - **Arabic-script-only tokens guaranteed** — digits, punctuation, and non-Arabic tokens explicitly excluded (README). No Latin junk.
  - **Whitespace surface forms, no letter normalization**: clitics stay attached (conjunctions/prepositions like و/ف/ب/ل produce types like `فكعمرة` in the tail); alef variants (أ/إ/ا) and ى/ي are NOT folded — dedupe/normalize yourself if desired.
  - Unzip at build time; the TSV inside is large (~11.4M lines) — take `head -n 50000` after sorting check (it is already frequency-descending).

## ALTERNATE 1 — hermitdave/FrequencyWords `ar_50k.txt` (verified 200)

- **URL:** `https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2016/ar/ar_50k.txt` — fetched successfully in this run (HTTP 200, plain text; no redirect needed).
- **First 5 lines** (space-separated `word count`, descending):
  ```
  لا 2285403
  من 2229495
  في 1789391
  أن 1761748
  هذا 1624794
  ```
- **Size/entries:** ~532 KB, **50,000 entries** (2016 series). Corpus: **OpenSubtitles 2016 (OPUS)** — register is film/TV subtitle translations: conversational MSA mixed with colloquial/Egyptian forms.
- **License:** repo README states "MIT License for code; **CC BY-SA 4.0 for content**" ([README](https://github.com/hermitdave/FrequencyWords/blob/master/README.md)). (The author's older blog mentioned CC BY-SA 3.0; README is authoritative.)
- **Quirks (needs cleaning):** standalone tatweel tokens (`ـ` rank ~79 with 166,861 occurrences, `ــ`), tatweel-embedded words (`لـ`, `هـذا`, `أنـا`), Latin junk (`pos` @53k occurrences, `a`, `the`, `you`, `fnadobe`, `arabic`, `fad`), mojibake (`â`), some profanity (subtitle corpus). Mostly undiacritized.

## ALTERNATE 2 — LuminosoInsight/wordfreq (most permissive license, but not curl-friendly)

- Arabic "large" list built from 6 sources (Wikipedia, OpenSubtitles, news, books, web, Twitter) via Exquisite Corpus — best source diversity; **Apache 2.0** since v3.0 ([CHANGELOG](https://github.com/LuminosoInsight/wordfreq/blob/master/CHANGELOG.md)).
- **Dealbreaker for the stated pipeline:** no plain-text raw file — data ships as `.msgpack.gz` inside the pip package, so build-time use requires `pip download wordfreq` + msgpack decode, not a simple curl. Use only if license permissiveness outranks fetch simplicity.
- (Also noted: Leipzig Wortschatz Arabic corpora, e.g. `ara_news_2022`, ship rank-ordered `*_words.txt` under **CC BY**, but the download URL (`https://downloads.wortschatz-leipzig.de/corpora/ara_news_2022.tar.gz`) was not verified in this run and the archive is a full corpus, not just a list.)

## Cleaning recommendation (one line)

Take the top-N lines of the CAMeL MSA TSV, then (optionally) fold alef variants (أ إ آ→ا) and ى→ي and re-dedupe — tatweel/diacritics/non-Arabic tokens are already stripped at source (if using hermitdave instead: regex-keep Arabic-script-only tokens and drop any token containing tatweel `ـ`).

## Sources
- Kept: [CAMeL-Lab/Camel_Arabic_Frequency_Lists](https://github.com/CAMeL-Lab/Camel_Arabic_Frequency_Lists) — README with samples, entry counts, download links; LICENSE.txt = CC BY-SA 4.0 (read directly from repo clone).
- Kept: [GitHub API release v1.0](https://api.github.com/repos/CAMeL-Lab/Camel_Arabic_Frequency_Lists/releases/tags/v1.0) — verified asset existence, size (69,064,867 B), state, publish date.
- Kept: [Inoue et al. 2021, CAMeLBERT paper](https://aclanthology.org/2021.wanlp-1.10/) — corpus composition (Gigaword/Abu El-Khair/OSIAN/Wikipedia/OSCAR = 12.6B MSA tokens) and preprocessing (diacritics + kashida removed), read from PDF §3.1–3.2.
- Kept: [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords) + raw [ar_50k.txt](https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2016/ar/ar_50k.txt) — fetched live (200); README license note; content inspected for quirks.
- Kept: [wordfreq CHANGELOG](https://github.com/LuminosoInsight/wordfreq/blob/master/CHANGELOG.md) — Apache 2.0 relicense confirmation.
- Kept: [Leipzig terms of usage](https://wortschatz.uni-leipzig.de/en/usage) — downloadable corpora under CC BY (alternate, unverified URL).
- Dropped: a3f/arabic-wordlists (dictionary word lists, not frequency-ranked), Nouran-Khallaf/Arabic_CEFR_Classified-List (xlsx binary, small, CEFR not frequency), oprogramador/most-common-words-by-language (just re-links hermitdave), CAMeL DA/CA lists (dialectal/classical — not needed for MSA pick, but documented).

## Gaps
- Could not run literal `curl -I` (no shell tool in this environment); CAMeL URL verified via GitHub API (asset `uploaded`, exact byte size) and hermitdave via full content fetch. Both are standard GitHub URLs — `curl -L` required for the release asset (302 to S3).
- Exact line count inside `MSA_freq_lists.tsv.zip` not measured (69 MB zip not downloaded); "11.4M types" is from the repo README/paper.
- Leipzig Arabic download URL pattern noted but not verified.
