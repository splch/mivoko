# Research: Downloadable Mandarin Chinese word-frequency list (word-level, redistributable)

## Summary
Top pick: **SUBTLEX-CH-WF** (Cai & Brysbaert 2010) — a word-level (ICTCLAS-segmented, multi-character words), simplified-Chinese, rank-ordered frequency list of **99,121 words** built from 33.5M words of film/TV subtitles, published under **CC-BY** (PLoS ONE copyright statement). The download ZIPs are verified HTTP 200 (`application/zip`) on both the UGent mirror and the PLoS DOI. Best single-file alternate: **hermitdave/FrequencyWords `zh_cn_50k.txt`** (raw GitHub URL, verified 200, 50k word-level entries, CC-BY-SA 4.0), but it is noisy and mixes simplified/traditional.

## Findings

1. **TOP PICK — SUBTLEX-CH (Cai & Brysbaert 2010)** — word-level, simplified Chinese, 99,121 word forms, rank-ordered by frequency. [PLoS ONE paper](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0010729) | [UGent data page](https://www.ugent.be/pp/experimentele-psychologie/en/research/documents/subtlexch)
   - **License: CC-BY.** PLoS copyright line: *"This is an open-access article distributed under the terms of the Creative Commons Attribution License, which permits unrestricted use, distribution, and reproduction in any medium, provided the original author and source are credited."* (Supporting-data files ship with the article.) Caveat: the authors' UGent page asks that you *cite* Cai & Brysbaert (2010) "if you use the frequencies"; the abstract also says "freely available for research purposes." Treat as CC-BY with a mandatory-citation norm; do not strip attribution.
   - **Corpus:** 6,243 film/TV subtitle contexts (7,148 SRT files) from two mainland-China subtitle sites (simplified Chinese), deduped + manually checked; segmented/PoS-tagged with ICTCLAS (PKU tagset); 33.5M words / 46.8M chars. Peer-reviewed and shown to predict lexical-decision RTs better than written-text counts. Highest corpus quality of any candidate.
   - **Word-level, NOT character-level:** explicitly multi-character segmented words ("99,121 different words"). A separate `SUBTLEX-CH-CHR.zip` is the character list — don't grab that one.
   - **Simplified vs traditional:** simplified (corpus sources are mainland subtitle sites).
   - **Entry count:** 99,121 words ("In total, our corpus included 99,121 different words" — paper, Methods).
   - **Verified URLs (HTTP 200, content-type `application/zip`, fetched 2025):**
     - `https://www.ugent.be/pp/experimentele-psychologie/en/research/documents/subtlexch/subtlexchwf.zip` — the plain word-frequency list (200 OK).
     - `https://www.ugent.be/pp/experimentele-psychologie/en/research/documents/subtlexch/subtlexch131210.zip` — **recommended**: combined UTF-8 file with word-form frequency + PoS frequencies + dominant PoS + **pinyin + most frequent English translations** (200 OK; ideal for a learning app).
     - `https://doi.org/10.1371/journal.pone.0010729.s002` — PLoS mirror ZIP containing all three tables (200 OK, `curl -L` follows the DOI redirect).
     - Quirk: these are ZIPs (not a single raw text file), and `subtlexchwf.zip` wraps a spreadsheet — so the build step is `curl -L | unzip`, then cut the first columns or read the UTF-8 combined file. The ZIPs could not be unpacked in-tool, so inner-file first-lines come from the paper's documentation: columns are `Word, WCount, W/million, logW, W-CD, W-CD%, logW-CD`, ordered by frequency (paper Fig. 2). HTTP status + content-type verified for all three URLs.
   - **Quirks:** subtitle register (colloquial, skews to US/EU film content); 2010 corpus (aging but still the standard); character file in the same folder is GBK-encoded (irrelevant if you use the WF file); attribution + citation required.

2. **ALTERNATE 1 — hermitdave/FrequencyWords `zh_cn_50k.txt`** — word-level, 50k entries, one plain-text file. [Repo](https://github.com/hermitdave/FrequencyWords) | [File dir](https://github.com/hermitdave/FrequencyWords/tree/master/content/2018/zh_cn)
   - **Raw URL (verified HTTP 200):** `https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/zh_cn/zh_cn_50k.txt` — **size 565,895 bytes** (GitHub API), format `{word} {count}`, rank-ordered.
   - **First 5 lines (verbatim from raw fetch):**
     ```
     的 3957141
     我 3669472
     你 3282942
     了 2141739
     是 1670639
     ```
   - **License: CC-BY-SA 4.0 for content** (repo README: "MIT License for code. CC-by-sa-4.0 for content."; the older 2016 lists were CC-BY-SA 3.0 per the author's blog). Share-alike: fine to bundle, but your derived/cleaned list should carry CC-BY-SA + attribution.
   - **Corpus:** OpenSubtitles 2018 (OPUS), tokenized — entries are genuinely word-level (我们, 什么, 知道, 一个, 为什么 …), NOT character-level.
   - **Quirks (seen in actual file):** mixes traditional + simplified (我們, 嗎, 說, 什麼 all present as separate entries); English tokens leak in (you, i, the, s, m); subtitle-font/markup junk (fn, chffffff, pos, yahei, fnsimhei, 黑体, 楷体, gbk, subhead, 字幕, 简体); OCR garbage (琌, 硂, 璶, chffffff); stray kana/Cyrillic/Arabic. Usable only after filtering. Also exists as `zh_cn_full.txt` (8.3 MB) if >50k needed. Note: the often-linked path `content/2018/zh/zh_50k.txt` does NOT exist (API 404) — the Chinese 2018 dir is `zh_cn`.

3. **ALTERNATE 2 — rejected on license / fit:**
   - **Jun Da (MTSU) lists** — word+character lists, but explicit copyright page: "provided… for research and teaching/learning purposes only. Any commercial use… prior written permission." → research-only, fails req 1. [Copyright](https://lingua.mtsu.edu/chinese-computing/copyright.html)
   - **Lancaster LCMC / Xiao 50k list** — corpus is CC BY-NC-SA 3.0 (NonCommercial) via Oxford OTA → fails req 1. [OTA record](https://ota.bodleian.ox.ac.uk/repository/xmlui/handle/20.500.12024/2474)
   - **LuminosoInsight/rspeer `wordfreq`** — good Chinese coverage (merges SUBTLEX, OpenSubtitles, Wikipedia…) but it's a Python library (needs `pip install` + `top_n_list('zh', n)` generation, not a static curl), and the repo license shows as "Other/NOASSERTION" in the GitHub API → skip for a build-time static bundle.

4. **Newer/better options searched:** THUOCL (thunlp, MIT) is a lexicon with document-frequency stats, not a rank-ordered corpus-frequency list — not a fit. `liangqi/chinese-frequency-word-list` (现代汉语常用词表, 56,008 words, 250M-char corpus) has no explicit license → skip. No post-2018 open-licensed segmented list beats SUBTLEX-CH on quality; hermitdave (2018) is the freshest of the usable set.

## Recommendation
**Cleaning (one line):** keep only rows whose headword matches `^\p{Han}+$`, drop subtitle-markup tokens (`fn*`, `*体`, 字幕/简体/gbk/pos…), and if the list mixes scripts, normalize headwords with OpenCC `t2s` (traditional→simplified) and re-merge counts.

**Build recipe:** `curl -L -O <subtlexch131210.zip URL> && unzip` → take the UTF-8 combined file (word, freq, PoS, pinyin, English) and emit your app's JSON/TSV; credit Cai & Brysbaert (2010), PLoS ONE, CC-BY in the app. If you need a single raw text file with zero unzip step, use the hermitdave `zh_cn_50k.txt` URL + the cleaning rule above + CC-BY-SA attribution.

## Sources
- Kept: [Cai & Brysbaert 2010, PLoS ONE](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0010729) — license text, corpus method, 99,121-word count, column layout.
- Kept: [UGent SUBTLEX-CH page](https://www.ugent.be/pp/experimentele-psychologie/en/research/documents/subtlexch) — canonical download URLs + citation request.
- Kept: [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords) + raw `zh_cn_50k.txt` + GitHub contents API — content license (CC-BY-SA 4.0), file size, verbatim first lines, zh dir 404.
- Kept: [Jun Da copyright](https://lingua.mtsu.edu/chinese-computing/copyright.html), [LCMC OTA](https://ota.bodleian.ox.ac.uk/repository/xmlui/handle/20.500.12024/2474), [wordfreq repo API](https://github.com/rspeer/wordfreq) — rejection evidence.
- Dropped: openlexicon.fr SUBTLEX-CH README — restates paper, no license/count info beyond it.
- Dropped: becky82/mteh, Hadar-N/lexitier-zh, alyssabedard/chinese-hsk-and-frequency-lists — derivative collections (HSK/character-level or merged CSVs), not primary frequency lists.
- Dropped: THUOCL, liangqi/chinese-frequency-word-list — lexicon / unlicensed.

## Gaps
- Could not unpack the SUBTLEX-CH ZIPs in-tool (binary); inner file names/formats are documented from the paper + UGent page, not byte-verified. Next step: one `curl | unzip -p | head` in a real shell to record exact inner filename and first 5 lines before wiring the build.
- SUBTLEX-CH "free for research purposes" phrasing vs CC-BY: bundled redistribution with attribution is consistent with the PLoS CC-BY statement, but if the app is strictly commercial, consider emailing the authors or defaulting to hermitdave (CC-BY-SA).
- hermitdave `zh_cn_full.txt` entry count not verified (>50k, 8.3 MB); fetch its contents-API entry if you want the exact line count.
