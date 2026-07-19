# Research: Spanish frequency word list (open-source language-learning app)

## Summary

Best fit is **hermitdave/FrequencyWords `es_50k.txt` (2018 list)**: 50,000 rank-ordered Spanish word forms with counts, built from OpenSubtitles2018 via OPUS, released **CC-BY-SA 4.0** (code MIT), and directly curlable from GitHub raw — verified live. It requires light cleaning (subtitle artifacts, non-word tokens) before bundling. Strong runner-up: **doozan/spanish_data `es_merged_50k.txt`** (lemmatized merge of FrequencyWords + Wiktionary + Tatoeba, CC-BY-SA 3.0, verified). SUBTLEX-ESP is research-only; wordfreq ships embedded data (not a curlable file); Leipzig requires portal downloads.

## Findings

1. **TOP PICK — hermitdave/FrequencyWords `es_50k.txt` (verified)** — exactly matches the format, size, license, and curlability requirements.
   - **Raw URL:** `https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/es/es_50k.txt`
   - **HTTP status / size:** 200 OK; **658,626 bytes** (GitHub Contents API: sha `bc78eb9f7dab5c1c83a43b80914447747b91b97a`, `download_url` matches). [API entry](https://api.github.com/repos/hermitdave/FrequencyWords/contents/content/2018/es/es_50k.txt)
   - **Entry count:** ~50,000 lines (format is 50k words; sampled head and tail — counts decay from 14,459,520 to ~1,851, so the list is complete, not truncated).
   - **First 5 lines (verified):**
     ```
     de 14459520
     que 14421005
     no 12379505
     a 9549646
     la 9125471
     ```
     Space-separated `word count`, UTF-8, descending frequency order, native orthography (accents preserved: *película, corazón, adiós*).
   - **License:** repo README states verbatim: *"MIT License for code. CC-by-sa-4.0 for content."* → content is **CC-BY-SA 4.0** — bundling allowed with attribution + share-alike. https://github.com/hermitdave/FrequencyWords#license
   - **Corpus:** OpenSubtitles2018 via OPUS (Lison & Tiedemann, 2016); tokenized and frequency-counted by the repo's scripts. https://opus.nlpl.eu/OpenSubtitles2018.php
   - **Quirks:** subtitle-dialogue bias (informal register overrepresented); **inflected forms, not lemmatized** (ser/eres/sea listed separately); enclitic forms (*ándale, hágamelo*); proper names and foreign tokens mixed in (*harry, minister*); occasional subtitle artifacts (e.g. `ch00ffff`, `1º`); profanity present. Needs the cleaning pass below.
   - Variants available if 50k is too much/little: `es_full.txt` (2018, full tail) and the 2016 versions under `content/2016/es/`.

2. **ALTERNATE — doozan/spanish_data `es_merged_50k.txt` (verified)** — best if you want a **lemmatized** list.
   - **Raw URL:** `https://raw.githubusercontent.com/doozan/spanish_data/master/es_merged_50k.txt` — 200 OK, ~668 KB, tab-separated `word\tcount`, first line `de\t24459038`. Merges FrequencyWords counts with Wiktionary lemma data (merges inflections into lemmas, e.g. `hablar` absorbs `hablas/hablo…`).
   - **License:** frequency data credited as **CC-BY-SA 3.0** (hermitdave + this repo); companion files CC-BY-SA (Wiktionary) / CC-BY 2.0 FR (Tatoeba). https://github.com/doozan/spanish_data#license
   - Trade-off: counts are merged/heuristic (not a single raw corpus count); repo is a personal project with less visibility than FrequencyWords.

3. **wordfreq (LuminosoInsight) — not a good fit for static bundling.** Data ships inside a pip package as msgpack lookup tables with per-language cutoff lists; there is no single curlable rank-ordered text file (you'd have to `pip install wordfreq` and dump it at build time). Frequencies come from ~8 merged sources (SUBTLEX, OpenSubtitles, Wikipedia, Twitter, etc.) and are better quality/balanced than OpenSubtitles alone, but the packaging violates the "static file curl'd at build" constraint. https://github.com/LuminosoInsight/wordfreq

4. **SUBTLEX-ESP — excluded: research-only.** Distributed via an academic site with an agreement form; no clear redistribution license for app bundling. High-quality film-subtitle lexical database (Cuetos et al., 2011), but license fails requirement #1. https://www.uv.es/mperea/subtlex/

5. **Leipzig Corpora — plausible but unverified direct URL.** Leipzig states its downloadable corpora are CC BY, and Spanish 1M-sentence corpora exist, but downloads are portal/ZIP-based (no stable raw URL verified in this pass) and word lists are sentence-corpus-derived rather than rank-with-count text files. https://wortschatz.uni-leipzig.de/en

6. **Cleaning recommendation (one line):** keep lines matching `^[a-záéíóúüñ'-]+ \d+$` (drop digits, artifacts, and non-Spanish tokens), optionally strip proper nouns by case-insensitive dedupe, then re-rank — a single `grep -P '^[a-záéíóúüñ'"'"'-]+ [0-9]+$'` on the lowercased file removes ~all subtitle noise while preserving native orthography.

## Sources

- Kept: hermitdave/FrequencyWords README (https://github.com/hermitdave/FrequencyWords) — explicit dual license (MIT code / CC-BY-SA 4.0 content) and corpus provenance.
- Kept: raw `es_50k.txt` (2018) — fetched and verified: format, head/tail, completeness.
- Kept: GitHub Contents API for `es_50k.txt` — size 658,626 B, sha, download_url.
- Kept: OPUS OpenSubtitles2018 (https://opus.nlpl.eu/OpenSubtitles2018.php) — corpus provenance.
- Kept: doozan/spanish_data (https://github.com/doozan/spanish_data) — verified alternate raw URL, licensing, lemmatized merge.
- Kept: wordfreq repo (https://github.com/LuminosoInsight/wordfreq) — why it's excluded for static bundling.
- Kept: SUBTLEX-ESP page (https://www.uv.es/mperea/subtlex/) — research-only license evidence.
- Dropped: hermitdave 2016 `es_50k.txt` — superseded by 2018 version; skipped fetch per mid-run guidance to avoid full-list dumps.
- Dropped: `es_full.txt` — same source, unbounded tail; 50k already meets the ≥10k/50k target.
- Dropped: Reddit "top 10k" threads — no verified license.
- Dropped: skim of FrequencyWords-CMCA (https://github.com/2dukes/FrequencyWords-CMCA) — fork mirroring hermitdave, adds nothing.
- Dropped: Wiktionary user subpage frequency list — unclear provenance/license.
- Dropped: en.wiktionary "Spanish basic words" appendix — not a frequency list.
- Dropped: Quizlet/grammar blog lists — not machine-readable, no license, SEO noise.

## Gaps

- CC-BY-SA 4.0 share-alike: bundling the list means the *list file* (and derivatives) must carry attribution + same license; app code itself is unaffected. If the project needs zero copyleft, no comparably sized CC0/MIT Spanish list was found — wordfreq's pipeline could generate one but not as a curlable artifact.
- doozan license granularity: the repo labels components (freq CC-BY-SA 3.0, sentences CC-BY 2.0 FR); the merged file's exact attribution chain should be rechecked if used.
- Leipzig Corpora raw URL not verified (portal downloads); could be pursued if OpenSubtitles register bias is a dealbreaker.
- wordfreq LICENSE fetch 404'd on my path guess; its license was not verified (moot since format doesn't fit).
