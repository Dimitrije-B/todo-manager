/* Optionaler Sync über Supabase (REST, ohne SDK).
   Ohne Eintrag in js/config.js bleibt alles lokal im Browser.
   Prinzip: jede Entität (Bereich, Task, Status, Einstellungen) ist eine Zeile in todo_entities.
   Neuere Änderung gewinnt (updatedAt), geholt wird alles seit dem letzten Abgleich (synced_at). */
(function () {
  'use strict';
  const S = window.S;
  const cfg = window.TODO_CONFIG || {};
  const base = String(cfg.supabaseUrl || '').trim().replace(/\/+$/, '');
  const key = String(cfg.supabaseAnonKey || '').trim();
  const TABLE = cfg.table || 'todo_entities';
  const PAGE = 500;

  const Y = {};
  Y.configured = !!(base && key);
  Y.state = Vue.reactive({ busy: false, error: null });

  const MESSAGES = [
    [/invalid login credentials/i, 'E-Mail oder Passwort stimmt nicht.'],
    [/user already registered/i, 'Für diese E-Mail gibt es schon ein Konto. Bitte anmelden.'],
    [/email not confirmed/i, 'Die E-Mail ist noch nicht bestätigt. Link in der Bestätigungs-Mail öffnen oder in Supabase „Confirm email“ ausschalten.'],
    [/password should be at least/i, 'Das Passwort braucht mindestens 6 Zeichen.'],
    [/failed to fetch|networkerror|load failed/i, 'Keine Verbindung. Änderungen bleiben gespeichert und werden später übertragen.'],
    [/relation .* does not exist|could not find the table/i, 'Die Tabelle fehlt in Supabase. Bitte supabase/schema.sql im SQL-Editor ausführen.'],
    [/jwt expired|invalid jwt|refresh token/i, 'Die Anmeldung ist abgelaufen. Bitte neu anmelden.']
  ];
  const translate = msg => {
    const m = String(msg || 'Unbekannter Fehler');
    const hit = MESSAGES.find(([re]) => re.test(m));
    return hit ? hit[1] : m;
  };

  async function authCall(path, body, token) {
    const headers = { apikey: key, 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    const res = await fetch(base + '/auth/v1/' + path, { method: 'POST', headers, body: JSON.stringify(body || {}) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(translate(data.error_description || data.msg || data.message || data.error || ('HTTP ' + res.status)));
      err.status = res.status;
      throw err;
    }
    return data;
  }

  function setSession(d) {
    S.meta.session = {
      access_token: d.access_token,
      refresh_token: d.refresh_token,
      expires_at: d.expires_at ? d.expires_at * 1000 : Date.now() + (d.expires_in || 3600) * 1000,
      user: { id: d.user.id, email: d.user.email }
    };
    S.persist();
  }

  async function token() {
    const s = S.meta.session;
    if (!s) throw new Error('Nicht angemeldet.');
    if (Date.now() > s.expires_at - 60000) {
      try {
        setSession(await authCall('token?grant_type=refresh_token', { refresh_token: s.refresh_token }));
      } catch (e) {
        if (e.status === 400 || e.status === 401) { S.meta.session = null; S.persist(); }
        throw new Error(e.status ? 'Die Anmeldung ist abgelaufen. Bitte neu anmelden.' : e.message);
      }
    }
    return S.meta.session.access_token;
  }

  async function rest(method, path, body, extra) {
    const tk = await token();
    const headers = Object.assign({ apikey: key, Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' }, extra || {});
    const res = await fetch(base + '/rest/v1/' + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(translate(d.message || d.error || ('HTTP ' + res.status)));
    }
    const txt = await res.text();
    return txt ? JSON.parse(txt) : null;
  }

  async function pull() {
    let cursor = S.meta.cursor;
    let n = 0;
    for (let page = 0; page < 200; page++) {
      let q = TABLE + '?select=id,kind,payload,deleted,synced_at&order=synced_at.asc&limit=' + PAGE;
      if (cursor) q += '&synced_at=gt.' + encodeURIComponent(cursor);
      const rows = (await rest('GET', q)) || [];
      rows.forEach(r => { if (S.applyRemote(r.kind, r.payload, r.deleted)) n++; });
      if (rows.length) cursor = rows[rows.length - 1].synced_at;
      if (rows.length < PAGE) break;
    }
    S.meta.cursor = cursor;
    return n;
  }

  async function push() {
    const uid = S.meta.session.user.id;
    const snapshot = {};
    const rows = [];
    Object.entries(S.meta.dirty).forEach(([id, kind]) => {
      const ent = S.entity(kind, id);
      if (!ent) { delete S.meta.dirty[id]; return; }
      snapshot[id] = ent.updatedAt;
      rows.push({
        user_id: uid, id, kind,
        payload: JSON.parse(JSON.stringify(ent)),
        deleted: !!ent.deleted,
        updated_at: new Date(ent.updatedAt || Date.now()).toISOString()
      });
    });
    for (let i = 0; i < rows.length; i += 200) {
      await rest('POST', TABLE + '?on_conflict=user_id,id', rows.slice(i, i + 200), { Prefer: 'resolution=merge-duplicates,return=minimal' });
    }
    /* nur zurücksetzen, was sich während der Übertragung nicht erneut geändert hat */
    Object.keys(snapshot).forEach(id => {
      const kind = S.meta.dirty[id];
      const ent = kind && S.entity(kind, id);
      if (ent && ent.updatedAt === snapshot[id]) delete S.meta.dirty[id];
    });
    return rows.length;
  }

  let running = null;
  Y.sync = () => {
    if (!Y.configured || !S.meta.session) return Promise.resolve();
    if (running) return running;
    Y.state.busy = true;
    running = (async () => {
      try {
        await pull();
        await push();
        S.meta.lastSync = Date.now();
        Y.state.error = null;
      } catch (e) {
        Y.state.error = translate(e.message);
      } finally {
        Y.state.busy = false;
        running = null;
        S.persist();
      }
    })();
    return running;
  };

  Y.signIn = async (email, password) => {
    setSession(await authCall('token?grant_type=password', { email: String(email).trim(), password }));
    S.meta.cursor = null;
    S.markAllDirty();
    await Y.sync();
  };

  /* gibt 'ok' zurück oder 'confirm', wenn Supabase erst eine Bestätigungs-Mail schickt */
  Y.signUp = async (email, password) => {
    const d = await authCall('signup', { email: String(email).trim(), password });
    if (d.access_token) {
      setSession(d);
      S.meta.cursor = null;
      S.markAllDirty();
      await Y.sync();
      return 'ok';
    }
    return 'confirm';
  };

  Y.signOut = async () => {
    const s = S.meta.session;
    S.meta.session = null;
    S.meta.cursor = null;
    S.persist();
    if (s) { try { await authCall('logout', {}, s.access_token); } catch (e) { /* egal */ } }
  };

  /* automatisch: kurz nach Änderungen, jede Minute, beim Zurückkehren in die App */
  let timer = null;
  S.onChange(() => {
    if (!Y.configured || !S.meta.session) return;
    clearTimeout(timer);
    timer = setTimeout(Y.sync, 1500);
  });
  setInterval(() => { if (document.visibilityState === 'visible') Y.sync(); }, 60000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') Y.sync(); });
  addEventListener('online', () => Y.sync());

  window.Y = Y;
})();
