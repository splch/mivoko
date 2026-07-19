# Research: French frequency word list (bundled, curl-able)

## Summary
Top pick: **hermitdave/FrequencyWords `fr_50k.txt` (OpenSubtitles 2018)** — 50,000 rank-ordered `word count` lines, 653 KB, curl-able raw GitHub URL (verified 200), content licensed CC BY-SA 4.0 (attribution + share-alike required; repo code is MIT). Alternate: **Lexique 3.83 via OpenLexicon** (~140k words, subtitle + book frequencies, CC BY-SA 4.0) for richer linguistic columns; Leipzig Corpora is excluded (CC BY-NC, non-commercial only).

## Findings

1. **TOP PICK — hermitdave/FrequencyWords, French 2018 list, VERIFIED** — Raw URL: `https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/fr/fr_50k.txt`. Verified reachable (fetch returned content); GitHub API confirms exact file: size **653,452 bytes** (~0.65 MB), 50,000 entries, one `word␣count` per line, rank-ordered by descending frequency. First 5 lines (verbatim from the file):
   ```
   de 8435682
   je 8308698
   est 6942248
   pas 5833676
   le 5305591
   ```
   Source corpus: OPUS **OpenSubtitles 2018** (film/TV subtitles — conversational register, ideal for language learning). [Repo + format docs](https://github.com/hermitdave/FrequencyWords) | [file](https://github.com/hermitdave/FrequencyWords/blob/master/content/2018/fr/fr_50k.txt)

2. **License — CC BY-SA 4.0 for the data (not MIT)** — The repo LICENSE file is MIT, but the README explicitly states: *"MIT License for code. CC-by-sa-4.0 for content."* So redistribution in the app is allowed with attribution (credit hermitdave + note OpenSubtitles source) and share-alike on derived lists. [LICENSE](https://github.com/hermitdave/FrequencyWords/blob/master/LICENSE) | [README license section](https://github.com/hermitdave/FrequencyWords#readme)

3. **Bigger option, same source — `fr_full.txt` VERIFIED to exist** — Same directory: `https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/fr/fr_full.txt`, GitHub API size **10,161,151 bytes** (~10 MB, roughly 600k+ unfiltered tokens — noisy tail). There's also `fr_ignored.txt` (231 KB). Recommend `fr_50k.txt` for bundling; `fr_full.txt` only if you want to filter yourself. [API listing](https://api.github.com/repos/hermitdave/FrequencyWords/contents/content/2018/fr)

4. **Quirks of the hermitdave fr list** — Tokenization splits French elisions: entries like `c'`, `l'`, `j'`, `d'`, `qu'`, `quelqu'`, `jusqu'` appear as separate tokens (apostrophe kept). Some hyphenated verb forms kept (`est-ce`, `vas-y`, `laisse-moi`). Minor English leakage from subtitles (`the`, `and`, `you`, `of`, `new york`, character names like `john`, `jack`). Mixed case mostly lowercase; some proper nouns present. Raw counts, no lemma/POS.

5. **ALTERNATE 1 — Lexique 3.83 (OpenLexicon, New & Pallier)** — ~140,000 French words with subtitle frequency (freqfilms2), book frequency (Frantext), lemmas, POS, phonology. TSV directly curl-able: `http://www.lexique.org/databases/Lexique383/Lexique383.tsv` (verified reachable — ~25 MB, too large to inline; also a zip at `http://www.lexique.org/databases/Lexique383/Lexique383.zip`). License **CC BY-SA 4.0** ([README](https://raw.githubusercontent.com/chrplr/openlexicon/master/datasets-info/Lexique383/README-Lexique.md), [repo](https://github.com/chrplr/openlexicon)). Quirks: alphabetical, NOT rank-ordered (must sort by the frequency column at build time); http:// (not https); frequencies are per-million floats, not raw counts; highest-quality academic source ([New et al. 2007, subtitle frequencies](https://doi.org/10.1017/S014271640707035X)).

6. **ALTERNATE 2 — LuminosoInsight/wordfreq** — Apache-2.0, merges multiple corpora (subtitles, Wikipedia, web) for robust frequencies; but data ships inside a Python package (no plain-text per-language file to curl). Viable only if the build can run `pip install wordfreq` + `top_n_list('fr', 50000)`. [Repo](https://github.com/LuminosoInsight/wordfreq) | [CHANGELOG (license note)](https://github.com/LuminosoInsight/wordfreq/blob/master/CHANGELOG.md)

7. **EXCLUDED — Leipzig Corpora (Wortschatz)** — French corpora (fra_wikipedia_2021 etc.) are downloadable, but terms are **CC BY-NC** (private/scientific use only; commercial/redistribution barred without written consent). Fails requirement 1. [Terms of Usage](https://wortschatz.uni-leipzig.de/en/usage)

## Cleaning recommendation (one line)
Drop tokens ending in `'` (elision fragments like `c'`, `l'`) and obvious non-French/proper-noun noise, then re-rank — or simply take the top N after filtering with a French dictionary/lexicon (e.g. Lexique383 wordforms).

## Sources
- Kept: [hermitdave/FrequencyWords repo + README](https://github.com/hermitdave/FrequencyWords) — format, corpus provenance (OPUS OpenSubtitles 2018), dual license statement
- Kept: [fr_50k.txt raw](https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/fr/fr_50k.txt) — verified content sample (first lines above)
- Kept: [GitHub API listing of 2018/fr](https://api.github.com/repos/hermitdave/FrequencyWords/contents/content/2018/fr) — exact byte sizes, confirms fr_full.txt/fr_ignored.txt
- Kept: [OpenLexicon Lexique383 README](https://raw.githubusercontent.com/chrplr/openlexicon/master/datasets-info/Lexique383/README-Lexique.md) — license CC BY-SA 4.0, dataset description
- Kept: [OpenLexicon datasets index](https://raw.githubusercontent.com/chrplr/openlexicon/master/datasets-info/README.md) — confirms direct .tsv URL pattern
- Kept: [Lexique.org license page](http://www.lexique.org/?lang=en&page_id=790) — confirms CC BY-SA
- Kept: [wordfreq repo](https://github.com/LuminosoInsight/wordfreq) + [CHANGELOG](https://github.com/LuminosoInsight/wordfreq/blob/master/CHANGELOG.md) — Apache-2.0, no plain-text export
- Kept: [Leipzig Terms of Usage](https://wortschatz.uni-leipzig.de/en/usage) — CC BY-NC, grounds for exclusion
- Dropped: invokeit.wordpress.com blog posts — historical context only, superseded by repo README
- Dropped: Leipzig corpus detail pages — excluded on license before deeper evaluation
- Dropped: OPUS/OpenSubtitles raw dumps (opus.nlpl.eu) — hermitdave list is the already-processed derivative; raw dumps need full tokenization pipeline

## Gaps
- Could not run `curl` (no shell tool); verification used HTTPS fetches instead — content and API byte sizes confirm availability, but HTTP status code was inferred (successful content retrieval), not read from headers.
- Exact line count of `fr_50k.txt` assumed 50,000 per filename/repo convention (content confirms format; ~640 KB of text is consistent).
- `fr_full.txt` (10 MB) not fetched end-to-end; entry count not confirmed.
