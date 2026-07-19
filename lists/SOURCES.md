# Bundled frequency lists — sources & licenses

Each file holds the top 10,000 entries of the source list after cleaning
(dropping punctuation, digits, subtitle-OCR artifacts, and non-native-script tokens).
One entry per line: `word`, or `word<TAB>translation` (zh only).

| File | Source | Corpus | License |
|---|---|---|---|
| `en.txt` | [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords) `content/2018/en/en_50k.txt` | OpenSubtitles 2018 (OPUS) | **CC BY-SA 4.0** (content) |
| `zh.txt` | [SUBTLEX-CH](https://www.ugent.be/pp/experimentele-psychologie/en/research/documents/subtlexch) `subtlexch131210.zip` (combined UTF-8 file: word, pinyin, English gloss) | 33.5M-word film/TV subtitle corpus, ICTCLAS-segmented | **CC BY** — cite Cai, Q. & Brysbaert, M. (2010). *SUBTLEX-CH: Chinese Word and Character Frequencies Based on Film Subtitles.* PLoS ONE 5(6): e10729 |
| `hi.txt` | [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords) `content/2018/hi/hi_full.txt` | OpenSubtitles 2018 (OPUS) | **CC BY-SA 4.0** (content) |
| `es.txt` | [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords) `content/2018/es/es_50k.txt` | OpenSubtitles 2018 (OPUS) | **CC BY-SA 4.0** (content) |
| `ar.txt` | [CAMeL Lab Arabic Frequency Lists](https://github.com/CAMeL-Lab/Camel_Arabic_Frequency_Lists) `MSA_freq_lists.tsv.zip` (top 10k of 11.4M types) | 12.6B-token MSA corpus (Gigaword, OSCAR, OSIAN, Wikipedia, Abu El-Khair); diacritics/tatweel pre-stripped | **CC BY-SA 4.0** — cite Inoue et al. (2021), *CAMeLBERT* (WANLP) |
| `fr.txt` | [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords) `content/2018/fr/fr_50k.txt` | OpenSubtitles 2018 (OPUS) | **CC BY-SA 4.0** (content) |
| `ja.txt` | [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords) `content/2018/ja/ja_full.txt` (kana-fragment filtered) | OpenSubtitles 2018 (OPUS) | **CC BY-SA 4.0** (content) |
| `ko.txt` | [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords) `content/2018/ko/ko_50k.txt` | OpenSubtitles 2018 (OPUS) | **CC BY-SA 4.0** (content) |
| `de.txt` | [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords) `content/2018/de/de_50k.txt` | OpenSubtitles 2018 (OPUS) | **CC BY-SA 4.0** (content) |
| `it.txt` | [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords) `content/2018/it/it_50k.txt` | OpenSubtitles 2018 (OPUS) | **CC BY-SA 4.0** (content) |
| `pt.txt` | [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords) `content/2018/pt/pt_50k.txt` | OpenSubtitles 2018 (OPUS) | **CC BY-SA 4.0** (content) |

## Notes

- **Register:** the hermitdave lists and SUBTLEX-CH derive from film/TV subtitles —
  conversational register, good for learners; the CAMeL Arabic list is MSA news/web.
- **Word forms, not lemmas** (inflections listed separately). `zh.txt` includes
  tone-mark pinyin + first English gloss as its translation field.
- Source selection + alternates documented in `research/freq-lists/` (per-language
  research briefs). Cleaning rules: `grep`-style filters per brief; build script
  used is preserved at `research/freq-lists/build_lists.py`.
- Share-alike (CC BY-SA): redistributed/derived lists must keep this attribution.
