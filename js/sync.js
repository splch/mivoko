/* mivoko — optional cloud sync via InstantDB.
 * Magic-code email auth + one JSON blob per user (last-write-wins).
 * The InstantDB client loads lazily — nothing is fetched until sync is used.
 * Exposes syncMethods(), mixed into the Alpine component in app.js. */
'use strict';

const INSTANT_UMD = 'https://www.unpkg.com/@instantdb/core@latest/dist/standalone/index.umd.cjs';

function syncMethods() {
  return {
    syncUser: null,        // {id, email} when signed in
    syncEmail: '',
    syncCode: '',
    syncStatus: '',
    syncState: 'idle',   // idle | syncing | synced | error
    syncBusy: false,
    _db: null,
    _unsub: null,
    _pushTimer: null,
    _storePatched: false,
    _authSubscribed: false,
    _origSave: null,
    _lastPushed: 0,
    _lastApplied: 0,

    _err(e) { return (e && e.body && e.body.message) || (e && e.message) || String(e); },

    async _ensureDb() {
      if (this._db) return this._db;
      if (!window.instant) {
        this.syncStatus = 'Loading sync client…';
        await new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = INSTANT_UMD;
          s.onload = res;
          s.onerror = () => rej(new Error('could not load the InstantDB client (offline?)'));
          document.head.appendChild(s);
        });
      }
      this._db = window.instant.init({ appId: this.settings.syncAppId });
      return this._db;
    },

    // Resume a previous session on page load (called from init()),
    // and invoked after a fresh sign-in (from verifySyncCode).
    async initSync() {
      try {
        await this._ensureDb();
        if (this._authSubscribed) return;
        this._authSubscribed = true;
        this._db.subscribeAuth(auth => {
          this.syncUser = auth.user || null;
          if (auth.user) {
            this.settings.syncEmail = auth.user.email;
            store.save('settings', this.settings);
            if (this.meta.syncAt && this.syncState === 'idle') this.syncState = 'synced';
            this._patchStore();
            this._subscribeRemote();
          }
        });
      } catch (e) { this.syncStatus = 'Sync unavailable: ' + this._err(e); }
    },

    async sendSyncCode() {
      if (!this.syncEmail.trim()) { this.toast('Enter your email first'); return; }
      this.syncBusy = true;
      try {
        await (await this._ensureDb()).auth.sendMagicCode({ email: this.syncEmail.trim() });
        this.syncStatus = 'Code sent — check your email.';
      } catch (e) { this.syncStatus = 'Could not send code: ' + this._err(e); }
      finally { this.syncBusy = false; }
    },

    async verifySyncCode() {
      if (!this.syncCode.trim()) { this.toast('Enter the code from your email'); return; }
      this.syncBusy = true;
      try {
        await (await this._ensureDb()).auth.signInWithMagicCode({
          email: this.syncEmail.trim(), code: this.syncCode.trim()
        });
        this.syncCode = '';
        this.initSync(); // start the sync pipeline (no-op if already running)
      } catch (e) { this.syncStatus = 'Sign-in failed: ' + this._err(e); }
      finally { this.syncBusy = false; }
    },

    async signOutSync() {
      try { if (this._db) await this._db.auth.signOut(); } catch (e) { /* best effort */ }
      if (this._unsub) { this._unsub(); this._unsub = null; }
      this.syncUser = null;
      this.syncState = 'idle';
      this.settings.syncEmail = '';
      store.save('settings', this.settings);
      this.syncStatus = 'Signed out — local data kept on this device.';
    },

    /* ----- push: local → cloud (debounced, on every store.save) ----- */

    _patchStore() {
      if (this._storePatched) return;
      this._storePatched = true;
      this._origSave = store.save.bind(store);
      store.save = (k, v) => {
        this._origSave(k, v);
        this._schedulePush();
      };
    },

    _schedulePush() {
      if (!this.syncUser) return;
      clearTimeout(this._pushTimer);
      this._pushTimer = setTimeout(() => this.pushState(), 8000);
    },

    // Pack state as gzipped+base64 JSON (JSON state compresses ~5-10x, which is
    // what keeps pushes from timing out on slow links). Falls back to plain JSON.
    async _pack(obj) {
      const json = JSON.stringify(obj);
      if (!('CompressionStream' in window)) return { zip: false, data: json };
      const buf = await new Response(
        new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'))
      ).arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) {
        bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      }
      return { zip: true, data: btoa(bin) };
    },

    async _unpack(row) {
      if (!row.zip) return JSON.parse(row.blob);
      const bin = atob(row.blob);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const buf = await new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      return JSON.parse(await new Response(buf).text());
    },

    stateBlob() {
      const s = Object.assign({}, this.settings);
      delete s.apiKey; // LLM key stays per-device
      return {
        settings: s, cards: this.cards, chats: this.chats, personas: this.personas,
        meta: this.meta, placementMeta: this.placementMeta, updatedAt: Date.now()
      };
    },

    async pushState(manual, retried) {
      if (!this.syncUser) { this.toast('Sign in to sync first'); return; }
      try {
        this.syncState = 'syncing';
        this._lastPushed = Date.now();
        const packed = await this._pack(this.stateBlob());
        await this._db.transact(this._db.tx.states[this.syncUser.id].update({
          owner: this.syncUser.id, blob: packed.data, zip: packed.zip, updatedAt: this._lastPushed
        }));
        this.meta.syncAt = this._lastPushed;
        this.syncState = 'synced';
        this.syncStatus = 'Synced ' + new Date(this._lastPushed).toLocaleTimeString() +
          ' (' + Math.round(packed.data.length / 1024) + ' KB)';
        if (manual) this.toast('Synced ✓');
      } catch (e) {
        if (!retried) { // one silent retry before flagging failure
          this.syncStatus = 'Push failed (' + this._err(e) + ') — retrying…';
          setTimeout(() => this.pushState(manual, true), 4000);
          return;
        }
        this.syncState = 'error';
        this.syncStatus = 'Sync push failed: ' + this._err(e);
      }
    },

    /* ----- pull: cloud → local (live subscription; LWW at the blob) ----- */

    _subscribeRemote() {
      if (this._unsub || !this.syncUser) return;
      let first = true;
      this._unsub = this._db.subscribeQuery(
        { states: { $: { where: { owner: this.syncUser.id } } } },
        resp => {
          if (resp.error) { this.syncStatus = 'Sync error: ' + resp.error.message; return; }
          const row = resp.data && resp.data.states && resp.data.states[0];
          if (first) {
            first = false;
            if (!row) { this.pushState(); return; }                 // nothing in the cloud yet → upload
            if (this.cards.length === 0) { this.applyRemote(row); return; } // fresh device → download
            if (row.updatedAt > (this.meta.syncAt || 0)) { this._offerRemote(row); return; }
            this.pushState();                                       // local is newer → upload
            return;
          }
          // live update from another device (ignore our own writes)
          if (row && row.updatedAt > Math.max(this._lastPushed, this._lastApplied)) this._offerRemote(row);
        }
      );
    },

    async _offerRemote(row) {
      let what = '';
      try {
        const s = await this._unpack(row);
        const nChats = Object.values(s.chats || {}).reduce((a, c) => a + c.length, 0);
        what = (s.cards || []).length + ' words, ' + nChats + ' chat messages, ' +
               (s.personas || []).length + ' personas';
      } catch (e) { /* fall back to a bare prompt */ }
      if (confirm('Newer synced state found (' + what + ', from ' +
                  new Date(row.updatedAt).toLocaleString() +
                  '). Load it and replace this device’s data?')) {
        this.applyRemote(row);
      } else {
        this._lastApplied = row.updatedAt; // don't nag again this session
      }
    },

    async applyRemote(row) {
      try {
        const state = await this._unpack(row);
        const apiKey = this.settings.apiKey;
        this.settings = Object.assign({}, DEFAULT_SETTINGS, state.settings || {}, { apiKey: apiKey });
        this.cards = state.cards || [];
        this.chats = state.chats || {};
        this.personas = (state.personas && state.personas.length) ? state.personas : defaultPersonas();
        this.meta = state.meta || { day: todayStr(), introduced: 0 };
        this.placementMeta = state.placementMeta || null;
        this.meta.syncAt = row.updatedAt;
        this._lastApplied = row.updatedAt;
        this._fsrs = null;
        const save = this._origSave || store.save.bind(store);
        save('settings', this.settings); save('personas', this.personas);
        save('cards', this.cards); save('chats', this.chats);
        save('meta', this.meta); save('placement', this.placementMeta);
        location.reload(); // clean re-render with the new state
      } catch (e) { this.syncStatus = 'Could not apply synced state: ' + this._err(e); }
    }
  };
}
