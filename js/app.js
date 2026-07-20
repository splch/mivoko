/* mivoko — frequency-first language tutor
 * Alpine.js SPA. No backend: all state in localStorage, LLM calls go directly
 * from the browser to the user-configured provider (OpenAI-compatible or Anthropic).
 */
'use strict';

/* ---------------- storage ---------------- */

const LS = 'mivoko:v1:';
const store = {
  load(key, fallback) {
    try {
      const raw = localStorage.getItem(LS + key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) {
      console.error('mivoko: corrupt localStorage entry', key, e);
      return fallback;
    }
  },
  save(key, val) { localStorage.setItem(LS + key, JSON.stringify(val)); },
  drop(key) { localStorage.removeItem(LS + key); }
};

/* ---------------- defaults ---------------- */

const DEFAULT_SETTINGS = {
  provider: 'openai',            // 'openai' (any OpenAI-compatible endpoint) | 'anthropic'
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  nativeLang: 'English',
  targetLang: 'Spanish',
  requestRetention: 0.9,
  maxIntervalDays: 365,
  newPerDay: 10,
  autoExamples: false,
  weights: '',                   // optional: 35 comma-separated custom FSRS-7 weights
  syncAppId: '837f3a02-dab8-40e1-a8e6-31f03b49ca61', // public InstantDB app id for optional cloud sync
  syncEmail: ''
};

/* ---------------- formatting helpers ---------------- */

function fmtInterval(days) {
  if (days == null || !isFinite(days)) return '—';
  const min = days * 1440;
  if (min < 1.5) return '1m';
  if (min < 60) return Math.round(min) + 'm';
  if (min < 1440) return Math.round(min / 60) + 'h';
  if (days < 30.5) return Math.round(days) + 'd';
  if (days < 365) return Math.round(days / 30.44) + 'mo';
  return (Math.round(days / 365 * 10) / 10) + 'y';
}

function fmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function todayStr() { return new Date().toISOString().slice(0, 10); }

/* ---------------- LLM providers ---------------- */

// Calls the configured chat model. Throws on any failure (fail loudly).
async function llm(settings, system, messages) {
  if (!settings.apiKey) throw new Error('No API key set — add one in Settings.');

  if (settings.provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': settings.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: settings.model || 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: system,
        messages: messages
      })
    });
    if (!res.ok) throw new Error('Anthropic ' + res.status + ': ' + (await res.text()).slice(0, 300));
    const json = await res.json();
    return (json.content || []).map(b => b.text || '').join('');
  }

  const base = (settings.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const res = await fetch(base + '/chat/completions', {
    method: 'POST',
    headers: {
      'authorization': 'Bearer ' + settings.apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: settings.model,
      temperature: 0.7,
      messages: [{ role: 'system', content: system }].concat(messages)
    })
  });
  if (!res.ok) throw new Error('API ' + res.status + ': ' + (await res.text()).slice(0, 300));
  const json = await res.json();
  return json.choices[0].message.content;
}

/* ---------------- Alpine component ---------------- */

document.addEventListener('alpine:init', () => {
  Alpine.data('app', () => ({

    tabs: [
      { id: 'today', label: 'Today' },
      { id: 'review', label: 'Review' },
      { id: 'chat', label: 'Chat' },
      { id: 'words', label: 'Words' },
      { id: 'personas', label: 'Personas' },
      { id: 'settings', label: 'Settings' }
    ],
    view: 'today',

    settings: Object.assign({}, DEFAULT_SETTINGS),
    personas: [],
    activePersonaId: null,
    cards: [],
    chats: {},
    meta: { day: todayStr(), introduced: 0 },

    review: { queue: [], i: 0, active: false, revealed: false, previews: null, rated: 0, requeues: 0 },
    chatInput: '',
    chatBusy: false,
    wordFilter: '',
    importText: '',
    builtinLists: BUILTIN_LISTS,
    listLoading: '',
    personaForm: { id: null, name: '', description: '', tz: '' },
    placementMeta: null,   // {frontier, date} — persisted result
    placement: { active: false, done: false, lo: 0, hi: 0, round: 0, maxRounds: 8, minRange: 400, probes: [] },
    toastMsg: '',
    online: navigator.onLine,

    _fsrs: null,

    init() {
      this.settings = Object.assign({}, DEFAULT_SETTINGS, store.load('settings', {}));
      // Built-in personas are canonical on seed-version change; user personas survive.
      const stored = store.load('personas', null);
      const builtins = defaultPersonas();
      this.personas = stored && store.load('personaSeed', null) === PERSONA_SEED_VERSION
        ? stored
        : builtins.concat((stored || []).filter(p => !builtins.some(b => b.id === p.id)));
      store.save('personaSeed', PERSONA_SEED_VERSION);
      this.activePersonaId = store.load('activePersona', null) ||
        ((this.personas.find(p => p.lang === this.settings.targetLang) || this.personas[0] || {}).id ?? null);
      this.cards = store.load('cards', []);
      // migrate pre-3-column zh cards ("pinyin — english" in tr) into c.py + clean c.tr
      let migrated = 0;
      for (const c of this.cards) {
        if (c.py || !c.tr || !/[\u4e00-\u9fff]/.test(c.word)) continue;
        const m = c.tr.match(/^([^\u4e00-\u9fff]+) — (.+)$/);
        if (m) { c.py = m[1].trim(); c.tr = m[2].trim(); migrated++; }
      }
      if (migrated) this.saveCards();
      this.chats = store.load('chats', {});
      this.meta = store.load('meta', { day: todayStr(), introduced: 0 });
      this.placementMeta = store.load('placement', null);
      this.ensureMeta();
      this.savePersonas();
      window.addEventListener('online', () => { this.online = true; });
      window.addEventListener('offline', () => { this.online = false; });
      if (this.settings.syncAppId && this.settings.syncEmail) this.initSync();
    },

    /* ----- FSRS ----- */

    get fsrs() {
      if (this._fsrs) return this._fsrs;
      let w = null;
      const raw = (this.settings.weights || '').trim();
      if (raw) {
        const parts = raw.split(/[\s,]+/).map(Number).filter(n => isFinite(n));
        if (parts.length !== 35) {
          this.toast('Custom weights ignored: need exactly 35 numbers, got ' + parts.length);
        } else {
          w = parts;
        }
      }
      this._fsrs = FSRS7.makeScheduler({
        requestRetention: Number(this.settings.requestRetention) || 0.9,
        maximumInterval: Number(this.settings.maxIntervalDays) || 365,
        w: w
      });
      return this._fsrs;
    },

    /* ----- stats ----- */

    get learned() { return this.cards.filter(c => c.lastReview != null || c.placed); },
    get learnedCount() { return this.learned.length; },
    get dueCards() {
      const now = Date.now();
      return this.cards.filter(c => c.lastReview != null && c.due <= now)
        .sort((a, b) => a.due - b.due);
    },
    get dueCount() { return this.dueCards.length; },
    get newCards() {
      return this.cards.filter(c => c.lastReview == null && !c.placed).sort((a, b) => a.rank - b.rank);
    },
    get newRemainingToday() {
      return Math.max(0, (Number(this.settings.newPerDay) || 10) - this.meta.introduced);
    },
    get avgRetention() {
      const l = this.cards.filter(c => c.lastReview != null);
      if (!l.length) return null;
      const now = Date.now();
      const sum = l.reduce((acc, c) =>
        acc + this.fsrs.retrievability(Math.max(0, (now - c.lastReview) / FSRS7.DAY_MS), c.s), 0);
      return sum / l.length;
    },

    /* ----- persistence ----- */

    saveSettings() { store.save('settings', this.settings); this._fsrs = null; this.toast('Settings saved'); },
    savePersonas() { store.save('personas', this.personas); store.save('activePersona', this.activePersonaId); },
    saveCards() { store.save('cards', this.cards); },
    saveChats() { store.save('chats', this.chats); },
    saveMeta() { store.save('meta', this.meta); },
    ensureMeta() {
      if (this.meta.day !== todayStr()) {
        this.meta = { day: todayStr(), introduced: 0 };
        this.saveMeta();
      }
    },

    toast(msg) {
      this.toastMsg = msg;
      clearTimeout(this._toastT);
      this._toastT = setTimeout(() => { this.toastMsg = ''; }, 5000);
    },

    /* ----- word list import ----- */

    parseList(text) {
      const rows = text.replace(/^\uFEFF/, '').split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => l && !/^[-#]/.test(l))
        .map(l => {
          const parts = l.split(/\t|;|,/).map(s => s.trim());
          return { word: parts[0], tr: parts[1] || '', py: parts[2] || null };
        })
        .filter(r => r.word);
      // drop only a leading header row ("word,translation" / "rank,word,count")
      if (rows.length && /^(word|rank)$/i.test(rows[0].word)) rows.shift();
      return rows;
    },

    importList(text) {
      const rows = this.parseList(text);
      if (!rows.length) { this.toast('Nothing to import — expected one word per line (word, translation)'); return; }
      const seen = new Set(this.cards.map(c => c.word.toLowerCase()));
      let added = 0;
      for (const r of rows.slice(0, 20000)) {
        if (seen.has(r.word.toLowerCase())) continue;
        seen.add(r.word.toLowerCase());
        this.cards.push({
          word: r.word, tr: r.tr, py: r.py || null, rank: this.cards.length + 1,
          s: null, d: null, lastReview: null, due: null,
          reps: 0, lapses: 0, example: null
        });
        added++;
      }
      this.cards.forEach((c, i) => { c.rank = i + 1; });
      this.saveCards();
      this.toast('Imported ' + added + ' new words (' + (rows.length - added) + ' duplicates skipped)');
    },

    importFromTextarea() { this.importList(this.importText); this.importText = ''; },

    readFile(ev, cb) {
      const f = ev.target.files && ev.target.files[0];
      ev.target.value = '';
      if (!f) return;
      const r = new FileReader();
      r.onload = () => cb(String(r.result || ''));
      r.readAsText(f);
    },

    onFileImport(ev) { this.readFile(ev, text => this.importList(text)); },

    async loadBuiltin(list) {
      if (this.listLoading) return;
      this.listLoading = list.code;
      try {
        const res = await fetch('lists/' + list.code + '.txt');
        if (!res.ok) throw new Error('HTTP ' + res.status + ' for lists/' + list.code + '.txt');
        this.importList(await res.text());
      } catch (e) {
        this.toast('Could not load built-in list: ' + e.message +
          '. If you opened index.html directly (file://), serve the folder over HTTP instead — see README.');
      } finally {
        this.listLoading = '';
      }
    },

    wipeWords() {
      if (!confirm('Delete all ' + this.cards.length + ' words and their review history?')) return;
      this.cards = [];
      this.placementMeta = null;
      store.drop('placement');
      this.saveCards();
      this.toast('Word list cleared');
    },

    /* ----- placement test (binary search over the frequency list) ----- */

    startPlacement() {
      if (this.cards.length < 50) { this.toast('Import a word list first — placement needs at least ~50 words'); return; }
      this.placement = {
        active: false, done: false, lo: 0, hi: this.cards.length,
        round: 0, maxRounds: 8, minRange: 400, probes: [],
        frontier: 0, _sorted: this.cards.slice().sort((a, b) => a.rank - b.rank)
      };
      this.view = 'placement';
    },

    placementMid() { return Math.floor((this.placement.lo + this.placement.hi) / 2); },

    nextPlacementRound() {
      const p = this.placement;
      if (p.hi - p.lo <= p.minRange || p.round >= p.maxRounds) { this.finishPlacement(); return; }
      p.round++;
      const mid = this.placementMid();
      const idxs = new Set();
      while (idxs.size < 4) {
        idxs.add(Math.max(p.lo, Math.min(p.hi - 1, mid + Math.floor(Math.random() * 51) - 25)));
      }
      p.probes = [...idxs].map(i => ({ card: p._sorted[i], known: null }));
    },

    answerProbe(probe, known) {
      probe.known = known;
      const p = this.placement;
      if (!p.probes.every(x => x.known !== null)) return;
      setTimeout(() => {
        if (!this.placement.active) return;
        const mid = this.placementMid();
        const knownCount = p.probes.filter(x => x.known).length;
        if (knownCount >= 3) { p.lo = mid; this.nextPlacementRound(); }     // knows this level → search higher
        else if (knownCount <= 1) { p.hi = mid; this.nextPlacementRound(); }   // doesn't → search lower
        else {                                                             // mixed → frontier is near mid;
          const span = Math.floor((p.hi - p.lo) / 4);                      // narrow around it and keep
          p.lo = Math.max(p.lo, mid - span);                               // searching (a lucky mixed round
          p.hi = Math.min(p.hi, mid + span);                               // can't end the test early)
          this.nextPlacementRound();
        }
      }, 350);
    },

    finishPlacement() {
      const p = this.placement;
      p.frontier = p.lo;
      p.active = false;
      p.done = true;
    },

    applyPlacement() {
      const frontier = this.placement.frontier;
      let marked = 0;
      for (const c of this.cards) {
        if (c.rank <= frontier && c.lastReview == null) { c.placed = true; marked++; }
      }
      this.placementMeta = { frontier: frontier, date: todayStr() };
      store.save('placement', this.placementMeta);
      this.saveCards();
      this.placement.done = false;
      this.view = 'today';
      this.toast('Placed at ~' + frontier.toLocaleString() + ' words — those are marked known; new words start there');
    },

    cancelPlacement() {
      this.placement.active = false;
      this.placement.done = false;
      this.view = 'today';
    },

    get filteredWords() {
      const q = this.wordFilter.trim().toLowerCase();
      const list = q
        ? this.cards.filter(c => c.word.toLowerCase().includes(q) || (c.tr || '').toLowerCase().includes(q))
        : this.cards;
      return list.slice(0, 200);
    },

    wordStatus(c) {
      if (c.placed && c.lastReview == null) return 'known';
      if (c.lastReview == null) return 'new';
      return c.s < 21 ? 'learning' : 'review';
    },

    /* ----- review session ----- */

    beginSession(queue) {
      if (!queue.length) { this.toast('Nothing to review right now'); return; }
      this.review = { queue: queue, i: 0, active: true, revealed: false, previews: null, rated: 0, requeues: 0 };
      this.prepareCard();
    },

    startReview() {
      this.ensureMeta();
      this.beginSession(this.dueCards.concat(this.newCards.slice(0, this.newRemainingToday)));
    },

    get currentCard() {
      return this.review.active && this.review.i < this.review.queue.length
        ? this.review.queue[this.review.i] : null;
    },

    prepareCard() {
      this.review.revealed = false;
      const c = this.currentCard;
      this.review.previews = c ? this.fsrs.previewIntervals(c, Date.now()) : null;
      this.review.shownAt = Date.now();
      this.review.autoGrade = null;
    },

    reveal() {
      this.review.revealed = true;
      this.review.flipMs = Date.now() - this.review.shownAt;
      this.review.autoGrade = this.autoGradeFor(this.review.flipMs);
      const c = this.currentCard;
      if (c && !c.example && this.settings.autoExamples && this.settings.apiKey) {
        this.genExample(c); // background; appears when ready
      }
    },

    // Map flip (recall-latency) time to a grade via the user's own speed
    // distribution: fastest quartile = Easy, slowest = Hard. Absolute-time
    // fallback until 30 remembered flips are on record.
    autoGradeFor(ms) {
      const h = this.meta.flips || [];
      if (h.length >= 30) {
        const pct = h.filter(x => x <= ms).length / h.length; // share of history at-or-faster
        return pct <= 0.25 ? 4 : pct <= 0.75 ? 3 : 2;
      }
      return ms < 2500 ? 4 : ms < 10000 ? 3 : 2;
    },

    gradeLabel(g) { return { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' }[g] || 'Good'; },

    rateRemembered() {
      const g = this.review.autoGrade || 3;
      const flips = this.meta.flips = this.meta.flips || [];
      flips.push(Math.min(this.review.flipMs || 0, 60000)); // cap outliers at 60s
      if (flips.length > 120) flips.shift();
      this.saveMeta();
      this.rate(g);
    },

    rateForgot() { this.rate(1); },

    rate(r) {
      const c = this.currentCard;
      if (!c) return;
      const wasNew = c.lastReview == null;
      const hadState = c.s != null;
      this.fsrs.review(c, r, Date.now());
      if (wasNew) { this.meta.introduced++; this.saveMeta(); }
      if (r === 1 && hadState) c.lapses = (c.lapses || 0) + 1;
      else c.reps = (c.reps || 0) + 1;
      this.saveCards();
      this.review.rated++;
      if (r === 1) { this.review.queue.push(c); this.review.requeues++; } // see it again this session
      this.review.i++;
      if (this.review.i >= this.review.queue.length) {
        this.review.active = false;
      } else {
        this.prepareCard();
      }
    },

    endSession() { this.review.active = false; },

    // After the day's queue is done: introduce another batch of new words on
    // demand. The daily cap only gates the automatic session; these extras join
    // the normal review schedule (more new words now = more due cards later).
    continueLearning() {
      const batch = this.newCards.slice(0, Number(this.settings.newPerDay) || 10);
      if (!batch.length) { this.toast('No unseen words left in the deck'); return; }
      this.beginSession(batch);
    },

    fmtIv(g) { return this.review.previews ? fmtInterval(this.review.previews[g]) : '—'; },

    /* ----- AI example sentences ----- */

    async genExample(card) {
      const s = this.settings;
      const system = 'You create short example sentences for language learners.';
      const prompt = 'Create one short, natural ' + s.targetLang + ' sentence using the word "' + card.word + '"' +
        (card.tr ? ' (' + s.nativeLang + ': "' + card.tr + '")' : '') +
        ', appropriate for a beginner. Reply with exactly two lines and nothing else:\n' +
        'Sentence: <sentence in ' + s.targetLang + '>\n' +
        'Translation: <' + s.nativeLang + ' translation>';
      try {
        const out = await llm(s, system, [{ role: 'user', content: prompt }]);
        const sent = (out.match(/^Sentence:\s*(.+)$/m) || [])[1];
        const tran = (out.match(/^Translation:\s*(.+)$/m) || [])[1];
        if (!sent) throw new Error('Unexpected model output: ' + out.slice(0, 120));
        card.example = { sentence: sent.trim(), translation: (tran || '').trim() };
        this.saveCards();
      } catch (e) {
        this.toast('Example generation failed: ' + e.message);
      }
    },

    /* ----- personas ----- */

    savePersonaForm() {
      const f = this.personaForm;
      if (!f.name.trim() || !f.description.trim()) { this.toast('Persona needs a name and a description'); return; }
      const tz = (f.tz || '').trim();
      if (tz) {
        try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); }
        catch (e) { this.toast('Unknown timezone "' + tz + '" \u2014 use an IANA name like Europe/Paris'); return; }
      }
      if (f.id) {
        const p = this.personas.find(p => p.id === f.id);
        if (p) { p.name = f.name.trim(); p.description = f.description.trim(); p.tz = tz; }
      } else {
        this.personas.push({ id: 'p-' + Date.now(), name: f.name.trim(), description: f.description.trim(), tz: tz });
      }
      this.personaForm = { id: null, name: '', description: '', tz: '' };
      this.savePersonas();
      this.toast('Persona saved');
    },

    editPersona(p) { this.personaForm = { id: p.id, name: p.name, description: p.description, tz: p.tz || '' }; },

    deletePersona(p) {
      if (!confirm('Delete persona "' + p.name + '" and its chat history?')) return;
      this.personas = this.personas.filter(x => x.id !== p.id);
      delete this.chats[p.id];
      if (this.activePersonaId === p.id) this.activePersonaId = this.personas[0] ? this.personas[0].id : null;
      this.savePersonas();
      this.saveChats();
    },

    get activePersona() {
      return this.personas.find(p => p.id === this.activePersonaId) || this.personas[0] || null;
    },

    /* ----- chat ----- */

    get chatMessages() {
      return this.activePersona ? (this.chats[this.activePersona.id] || []) : [];
    },

    setActivePersona(id) {
      this.activePersonaId = id;
      const p = this.activePersona;
      if (p && p.lang && p.lang !== this.settings.targetLang) {
        this.settings.targetLang = p.lang;
        store.save('settings', this.settings);
        this.toast('Target language set to ' + p.lang);
      }
      this.savePersonas();
    },

    clearChat() {
      if (!this.activePersona || !confirm('Clear this conversation?')) return;
      this.chats[this.activePersona.id] = [];
      this.saveChats();
    },

    buildSystemPrompt() {
      const s = this.settings;
      const p = this.activePersona;
      const shortName = (p.name || '').split(' \u2014 ')[0];
      const total = this.cards.length || 1;
      const known = this.learnedCount;
      const pct = Math.round(100 * known / total);
      const pctStr = known > 0 && pct === 0 ? (Math.round(1000 * known / total) / 10) + '%' : pct + '%';
      // Level-adaptive L1/L2 blend: comprehensibility demands more L1 scaffolding
      // at low vocabularies and near-immersion at high ones.
      const blend =
        known < 500 ? 'Beginner (~' + known + ' words): very short, simple ' + s.targetLang + ' sentences with generous ' + s.nativeLang + ' support — gloss each new word inline and translate your whole sentence when the learner hesitates.' :
        known < 1500 ? 'Elementary (~' + known + ' words): mostly simple ' + s.targetLang + '; ' + s.nativeLang + ' for explanations and corrections.' :
        known < 4000 ? 'Intermediate (~' + known + ' words): primarily ' + s.targetLang + '; ' + s.nativeLang + ' only for brief rescue explanations when the learner is stuck.' :
        'Advanced (~' + known + ' words): near-total ' + s.targetLang + ' immersion; ' + s.nativeLang + ' only if the learner switches to it first.';
      const recent = this.learned.filter(c => c.lastReview).sort((a, b) => b.lastReview - a.lastReview)
        .slice(0, 25).map(c => c.word).join(', ');
      // Words closest to being forgotten right now (lowest predicted recall) get priority.
      const now = Date.now();
      const due = this.dueCards
        .map(c => ({ w: c.word, r: this.fsrs.retrievability(Math.max(0, (now - c.lastReview) / FSRS7.DAY_MS), c.s) }))
        .sort((a, b) => a.r - b.r)
        .slice(0, 15).map(x => x.w).join(', ');
      const upcoming = this.newCards.slice(0, 10).map(c => c.word).join(', ');
      // The persona's own local time, so they can greet, plan, and complain about the weather in character.
      // Guarded because tz can arrive via sync/import from another device.
      let momentLine = '';
      if (p.tz) {
        try {
          const local = new Intl.DateTimeFormat('en-US', {
            timeZone: p.tz, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            hour: 'numeric', minute: '2-digit', hour12: true
          }).format(new Date());
          momentLine = 'Right now where you live it is ' + local + '. Let this season the chat naturally \u2014 morning coffee, the commute home, a late-night message \u2014 but don\u2019t announce the clock unless it comes up.';
        } catch (e) {
          console.warn('Invalid persona timezone:', p.tz, e);
        }
      }
      return [
        'You are ' + shortName + ', a native ' + s.targetLang + ' speaker who is fluent in ' + s.nativeLang + ' and tutors ' + s.targetLang + ' part-time. The person messaging you is your ' + s.nativeLang + '-speaking student in an online tutoring chat; they came to practice ' + s.targetLang + ' conversation.',
        '',
        'WHO YOU ARE',
        p.description,
        ...(momentLine ? ['', 'THE MOMENT YOU\u2019RE IN', momentLine] : []),
        '',
        'YOUR STUDENT',
        'They know ~' + known.toLocaleString() + ' of the top ' + total.toLocaleString() + ' ' + s.targetLang + ' words \u2014 ' + pctStr + ' of the frequency deck covered' + (this.placementMeta ? ' (placement-tested ' + this.placementMeta.date + ', then spaced repetition)' : ' (via spaced repetition)') + '. ' + blend + ' If they stall or misunderstand twice, soften toward more ' + s.nativeLang + '; if they cruise, lean harder into ' + s.targetLang + '.',
        '',
        'HOW TO BE WITH THEM',
        '- Be a person first: chat about your life, your town, your opinions \u2014 be genuinely good company. If the exchange is warm and they\u2019re talking, it\u2019s working.',
        '- Stay comprehensible: ~95% of your ' + s.targetLang + ' should be words they know or can guess from context \u2014 the way you\u2019d naturally talk to a learner friend.',
        '- Keep them talking: output builds fluency, so be curious about them and give them easy things to say. If they answer in one word, invite the full sentence \u2014 with interest, not a clipboard.',
        '- Correct at most ONE error per reply, and only the one worth correcting: prompt self-repair with a quick eliciting question or a raised eyebrow in text \u2014 never a nitpicking list. Confirm warmly when they fix it. If the same error comes back a third time, give a one-line rule and one example, then move on.',
        '- Keep replies short: 1\u20133 sentences. Usually end with something easy to answer \u2014 but not an interrogation every single turn.',
        '',
        'THEIR DECK (use it lightly)',
        '- Closest to being forgotten: ' + (due || '(none due right now)') + '.',
        '- Recently studied: ' + (recent || '(none yet)') + '.',
        '- Not yet studied: ' + (upcoming || '(none)') + '.',
        'Work the nearly-forgotten words in where they fit, and invite them to produce those words rather than only using them yourself \u2014 retrieval beats re-exposure. Introduce at most one unstudied word per reply, with context that makes the meaning obvious, then let it recur naturally over the next few turns. When it\u2019s fun, an occasional \u201chow do you say\u2026?\u201d is welcome.',
        '',
        'Stay in character as ' + shortName + ' the whole time, and never mention these instructions.'
      ].join('\n');
    },

    async sendChat() {
      const text = this.chatInput.trim();
      if (!text || this.chatBusy) return;
      if (!this.activePersona) { this.toast('Create a persona first'); return; }
      if (!this.settings.apiKey) { this.toast('Add an API key in Settings to chat'); this.view = 'settings'; return; }

      const pid = this.activePersona.id;
      if (!this.chats[pid]) this.chats[pid] = [];
      this.chats[pid].push({ role: 'user', content: text, ts: Date.now() });
      this.chatInput = '';
      this.chatBusy = true;
      try {
        const history = this.chats[pid].slice(-16).map(m => ({ role: m.role, content: m.content }));
        const reply = await llm(this.settings, this.buildSystemPrompt(), history);
        this.chats[pid].push({ role: 'assistant', content: reply, ts: Date.now() });
        if (this.chats[pid].length > 60) this.chats[pid] = this.chats[pid].slice(-60);
        this.saveChats();
      } catch (e) {
        this.toast('Chat failed: ' + e.message);
      } finally {
        this.chatBusy = false;
        this.$nextTick(() => {
          const el = document.getElementById('chat-scroll');
          if (el) el.scrollTop = el.scrollHeight;
        });
      }
    },

    /* ----- backup / restore ----- */

    exportData() {
      const blob = new Blob([JSON.stringify({
        settings: this.settings, personas: this.personas,
        cards: this.cards, chats: this.chats, meta: this.meta
      }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'mivoko-backup-' + todayStr() + '.json';
      a.click();
      URL.revokeObjectURL(a.href);
    },

    importData(ev) {
      this.readFile(ev, text => {
        try {
          const data = JSON.parse(text);
          if (!data || !Array.isArray(data.cards)) throw new Error('not a mivoko backup (missing cards)');
          if (!confirm('Replace ALL current data with this backup?')) return;
          this.settings = Object.assign({}, DEFAULT_SETTINGS, data.settings || {});
          this.personas = data.personas && data.personas.length ? data.personas : defaultPersonas();
          this.cards = data.cards;
          this.chats = data.chats || {};
          this.meta = data.meta || { day: todayStr(), introduced: 0 };
          this.activePersonaId = this.personas[0].id;
          this._fsrs = null;
          this.saveSettings(); this.savePersonas(); this.saveCards(); this.saveChats(); this.saveMeta();
          this.toast('Backup restored');
        } catch (e) {
          this.toast('Import failed: ' + e.message);
        }
      });
    },

    wipeAll() {
      if (!confirm('Delete ALL mivoko data in this browser (settings incl. API key, words, chats, personas)?')) return;
      ['settings', 'personas', 'activePersona', 'cards', 'chats', 'meta', 'placement', 'personaSeed'].forEach(k => store.drop(k));
      location.reload();
    },

    ...syncMethods()
  }));
});
