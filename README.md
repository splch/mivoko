# mivoko 🗣️

A frequency-first language tutor that runs entirely in your browser. No backend, no
database, no build step — bring your own LLM API key, your own frequency list, and
your own tutor personas.

**Live: [splch.github.io/mivoko](https://splch.github.io/mivoko/)**

## What it does

- **Frequency lists** — six built-in top-10k lists (English, Mandarin, Hindi,
  Spanish, Arabic, French) load in one click; sources and licenses in
  [`lists/SOURCES.md`](lists/SOURCES.md) (Mandarin ships with tone-mark pinyin +
  English glosses from SUBTLEX-CH). You can also import any word list (paste,
  CSV/TSV, or plain text; most frequent first, optional translation after a
  comma/tab). Words are introduced in frequency order at a configurable daily
  cap. More lists: [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords).
- **Placement test** — a ~2-minute binary search over the frequency list (4 words
  per round, ~8 rounds) estimates your vocabulary frontier; words below it are
  marked known and skipped, and you can nudge the estimate before applying.
- **FSRS-7 scheduling** — reviews are scheduled by the 35-parameter Free Spaced
  Repetition Scheduler (`js/fsrs7.js`, a dependency-free port of the reference
  `fsrs_v7.py`). It targets your chosen retention rate (default 90%), shows the
  computed interval on each Again/Hard/Good/Easy button, and supports custom weights.
- **Retrieval-first reviews** — cards prompt with the meaning and ask you to *produce*
  the word; you self-grade. Optional AI-generated example sentences, cached per card.
- **AI personas** — six built-in tutors, one per bundled language, each a composite
  "median life" (a suburban American mom of two, an urban Chinese father on a six-day week, a village Indian
  mother, an urban Mexican family anchor, a young Egyptian between school and providing, a Lyon
  municipal administrator); selecting one syncs the target language. You can also
  define your own tutors as free-text persona descriptions. The chat system prompt
  combines the persona with deck context (words closest to being forgotten, recently
  learned, upcoming) and a lightly held, research-grounded teaching policy — natural
  conversation first, with retrieval-first use of due words, in-conversation recycling
  of new words, ~95% comprehensible speech, and at most one focused prompt-style
  correction per turn riding on top (prompts beat recasts; drills you dread are
  worse than conversation you enjoy).
- **Your keys, your browser** — settings, cards, chats, and personas live in
  `localStorage`; LLM calls go straight from the browser to the provider. Export/import
  JSON backups in Settings.
- **Optional cloud sync** — magic-code email sign-in (InstantDB) syncs deck, chats,
  and settings across devices; last-write-wins per account. The LLM API key is never
  synced. Off by default: nothing is fetched until you sign in.

## Run it

It's a static SPA — no build. Either open `index.html` directly, or serve the folder:

```sh
python3 -m http.server 8080   # then http://localhost:8080
```

## Setup

1. **Words** → load the Spanish sample or import your own frequency list.
2. **Settings** → choose a provider and paste an API key:
   - *OpenAI-compatible* — works with OpenAI, OpenRouter, Groq, Together, or a local
     server (Ollama/LM Studio) by changing the base URL.
   - *Anthropic* — direct browser calls via `anthropic-dangerous-direct-browser-access`.
3. **Review** daily; **Chat** for output practice with corrective feedback.

## Design rationale

Grounded in the SLA evidence review in `research/` (18 sources): spaced *retrieval*
practice over rereading; production-direction cards because practice transfers
skill-specifically; prompt-style (eliciting) correction over recasts; high-frequency
vocabulary first because per-exposure incidental yields are small. FSRS-7 details:
<https://github.com/open-spaced-repetition/srs-benchmark/pull/290>.

## Cloud sync (optional)

Sync uses [InstantDB](https://www.instantdb.com) with a public app id embedded in the
app. Access control is a dashboard permission rule (already configured on the default
app):

```json
{ "states": { "allow": {
  "view": "auth.id == data.owner", "create": "auth.id == data.owner",
  "update": "auth.id == data.owner", "delete": "false" } } }
```

To sync your own devices: Settings → Cloud sync → enter your email → enter the
6-digit code. First sign-in uploads your local state; on a fresh device it downloads
it. Edits push automatically (3s debounce); a newer state from another device prompts
before replacing local data. The admin token is **not** part of the app and must never
be committed — it was used once to set the rule above.

To run your own backend instead: create an InstantDB app, set the same rule, and point
Settings → `syncAppId` at it. InstantDB is open source and self-hostable.

## Files

```
index.html      SPA markup + inline Tailwind component styles (Play CDN @apply)
js/fsrs7.js     FSRS-7 scheduler port (35 params, bisection interval inversion)
js/data.js      content: persona briefs, seed version, built-in list metadata
js/app.js       Alpine component: storage, reviews, chat, personas, import/export
lists/          bundled top-10k frequency lists (en, zh, hi, es, ar, fr) + SOURCES.md
research/       SLA evidence review + per-language list research briefs
test/fsrs7.test.js   node smoke test — node test/fsrs7.test.js
```

## Privacy note

Your API key is stored in browser localStorage and sent only to the configured provider
endpoint. Backups include the key — treat exported files as secrets.
