/* Datenspeicher: Bereiche, Tasks, Stati, Einstellungen.
   Alles liegt im Browser (localStorage). Jede Änderung wird als "dirty" markiert,
   damit der optionale Sync (sync.js) sie an Supabase überträgt. */
(function () {
  'use strict';
  const { reactive } = Vue;
  const U = window.U;

  const DB_KEY = 'tm_db_v1';
  const META_KEY = 'tm_meta_v1';
  const COLL = { area: 'areas', task: 'tasks', status: 'statuses', settings: 'settings' };
  const HISTORY_MAX = 200;
  const TRASH_DAYS = 30;

  const DEFAULT_STATUSES = [
    { id: 'backlog', name: 'Backlog', category: 'open', color: '#8A94A6', require: null },
    { id: 'planned', name: 'Geplant', category: 'open', color: '#4C7BF4', require: null },
    { id: 'doing', name: 'In Arbeit', category: 'active', color: '#E39B2D', require: null },
    { id: 'test', name: 'Test', category: 'active', color: '#9B6BDF', require: null },
    { id: 'waiting', name: 'Wartet', category: 'paused', color: '#1FA2B0', require: 'waiting' },
    { id: 'blocked', name: 'Blockiert', category: 'paused', color: '#E0524D', require: 'reason' },
    { id: 'done', name: 'Erledigt', category: 'closed', color: '#36A15A', require: null },
    { id: 'dropped', name: 'Verworfen', category: 'closed', color: '#7A8494', require: 'reason' }
  ];

  const CATEGORIES = [
    { id: 'open', label: 'offen' },
    { id: 'active', label: 'aktiv' },
    { id: 'paused', label: 'pausiert' },
    { id: 'closed', label: 'abgeschlossen' }
  ];

  const AREA_COLORS = ['#4C7BF4', '#E39B2D', '#36A15A', '#9B6BDF', '#E0524D', '#1FA2B0', '#D4589B', '#7A8494'];

  /* Vorschlag aus dem Konzept: Bereichsbaum aus den bisherigen Google-Tasks-Listen */
  const EXAMPLE_TREE = [
    { name: 'Preise', color: '#E39B2D', kids: ['Preisberechnung', 'Preisspion'] },
    { name: 'Shop', color: '#4C7BF4', kids: ['Konfigurator', 'JS Hub'] },
    { name: 'Daten & Automation', color: '#9B6BDF', kids: ['Scraper', 'n8n', 'GitHub'] },
    { name: 'Warenwirtschaft', color: '#36A15A', kids: ['Wawi', 'Lager'] },
    { name: 'Verwaltung', color: '#7A8494', kids: ['Buchhaltung'] },
    { name: 'Sonstige', color: '#1FA2B0', kids: [] }
  ];

  /* ---------- Normalisierung ---------- */
  function normArea(a) {
    return Object.assign({
      id: U.uid(), name: 'Bereich', parentId: null, color: '', description: '', order: 0,
      links: [], notes: [], archived: false, system: false, createdAt: Date.now(), updatedAt: Date.now(), deleted: false
    }, a, {
      links: Array.isArray(a.links) ? a.links : [],
      notes: Array.isArray(a.notes) ? a.notes : []
    });
  }
  function normTask(t) {
    return Object.assign({
      id: U.uid(), areaId: 'inbox', parentId: null, title: '', description: '', statusId: 'planned',
      priority: null, due: null, followUp: null, tags: [], links: [], notes: [], checklist: [], history: [],
      flagged: false, createdAt: Date.now(), completedAt: null, trashedAt: null, updatedAt: Date.now(), deleted: false
    }, t, {
      tags: Array.isArray(t.tags) ? t.tags : [],
      links: Array.isArray(t.links) ? t.links : [],
      notes: Array.isArray(t.notes) ? t.notes : [],
      checklist: Array.isArray(t.checklist) ? t.checklist : [],
      history: Array.isArray(t.history) ? t.history : []
    });
  }

  function seed(db) {
    db.version = 1;
    db.areas = db.areas || {};
    db.tasks = db.tasks || {};
    db.statuses = db.statuses || {};
    db.settings = db.settings || {};
    DEFAULT_STATUSES.forEach((s, i) => {
      if (!db.statuses[s.id]) db.statuses[s.id] = Object.assign({ order: i, updatedAt: 0, deleted: false }, s);
    });
    if (!db.areas.inbox) {
      db.areas.inbox = normArea({ id: 'inbox', name: 'Eingang', system: true, order: -1, createdAt: 0, updatedAt: 0 });
    }
    if (!db.settings.settings) db.settings.settings = { id: 'settings', defaultStatus: 'planned', updatedAt: 0, deleted: false };
    return db;
  }

  /* ---------- Laden ---------- */
  let rawDb = null, rawMeta = null;
  try { rawDb = JSON.parse(localStorage.getItem(DB_KEY) || 'null'); } catch (e) { rawDb = null; }
  try { rawMeta = JSON.parse(localStorage.getItem(META_KEY) || 'null'); } catch (e) { rawMeta = null; }

  const db = reactive(seed(rawDb || {}));
  const meta = reactive(Object.assign({ dirty: {}, cursor: null, session: null, lastSync: null }, rawMeta || {}));
  const state = reactive({ saveError: null });

  const S = { db, meta, state, CATEGORIES, AREA_COLORS, EXAMPLE_TREE, TRASH_DAYS };
  const listeners = [];
  S.onChange = fn => listeners.push(fn);

  /* ---------- Speichern ---------- */
  let saveTimer = null;
  S.persist = () => {
    clearTimeout(saveTimer);
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
      localStorage.setItem(META_KEY, JSON.stringify(meta));
      state.saveError = null;
    } catch (e) {
      state.saveError = 'Speichern im Browser fehlgeschlagen: ' + e.message;
    }
  };
  const scheduleSave = () => { clearTimeout(saveTimer); saveTimer = setTimeout(S.persist, 250); };
  addEventListener('beforeunload', S.persist);
  addEventListener('pagehide', S.persist);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') S.persist(); });

  function touch(kind, ent) {
    ent.updatedAt = Date.now();
    meta.dirty[ent.id] = kind;
    scheduleSave();
    listeners.forEach(fn => { try { fn(kind, ent); } catch (e) { console.error(e); } });
  }
  S.touch = touch;

  /* ---------- Lesen ---------- */
  const alive = o => !!o && !o.deleted;
  S.entity = (kind, id) => (db[COLL[kind]] || {})[id] || null;

  S.settings = () => db.settings.settings;
  S.updateSettings = patch => { Object.assign(db.settings.settings, patch); touch('settings', db.settings.settings); };

  S.area = id => (alive(db.areas[id]) ? db.areas[id] : null);
  S.areaList = () => Object.values(db.areas).filter(alive);
  const byOrder = (a, b) => (a.order || 0) - (b.order || 0) || String(a.name).localeCompare(String(b.name), 'de');
  S.children = (parentId, withArchived) => S.areaList()
    .filter(a => a.id !== 'inbox' && (a.parentId || null) === (parentId || null) && (withArchived || !a.archived))
    .sort(byOrder);
  S.descendants = id => {
    const all = S.areaList();
    const out = [];
    const walk = pid => all.forEach(a => { if (a.parentId === pid && !out.includes(a.id)) { out.push(a.id); walk(a.id); } });
    walk(id);
    return out;
  };
  S.path = id => {
    const p = [];
    let a = S.area(id);
    let guard = 0;
    while (a && guard++ < 50) { p.unshift(a); a = a.parentId ? S.area(a.parentId) : null; }
    return p;
  };
  S.pathLabel = id => S.path(id).map(a => a.name).join(' / ') || 'Eingang';
  S.isAreaArchived = id => S.path(id).some(a => a.archived);
  /* Bereiche in Baumreihenfolge, z. B. für Auswahllisten */
  S.areaTree = (withArchived) => {
    const out = [];
    const inbox = S.area('inbox');
    if (inbox) out.push({ id: 'inbox', name: inbox.name, depth: 0, area: inbox });
    const walk = (pid, depth) => S.children(pid, withArchived).forEach(a => { out.push({ id: a.id, name: a.name, depth, area: a }); walk(a.id, depth + 1); });
    walk(null, 0);
    return out;
  };
  S.findArea = token => {
    const segs = String(token).split('/').map(U.norm).filter(Boolean);
    if (!segs.length) return null;
    const cands = S.areaList().filter(a => !a.archived);
    let best = null;
    cands.forEach(a => {
      const p = S.path(a.id).map(x => U.norm(x.name));
      if (p.length < segs.length) return;
      const tail = p.slice(-segs.length);
      if (tail.every((s, i) => s === segs[i]) && (!best || p.length < best.len)) best = { id: a.id, len: p.length };
    });
    if (best) return best.id;
    const last = segs[segs.length - 1];
    const pre = cands.filter(a => U.norm(a.name).startsWith(last));
    return pre.length === 1 ? pre[0].id : null;
  };

  S.statusList = () => Object.values(db.statuses).filter(alive).sort((a, b) => (a.order || 0) - (b.order || 0));
  S.status = id => (alive(db.statuses[id]) ? db.statuses[id] : (S.statusList()[0] || DEFAULT_STATUSES[0]));
  S.firstOfCategory = cat => S.statusList().find(s => s.category === cat) || null;
  S.doneStatusId = () => (alive(db.statuses.done) ? 'done' : ((S.firstOfCategory('closed') || {}).id || 'done'));
  S.openStatusId = () => {
    const d = S.settings().defaultStatus;
    if (alive(db.statuses[d]) && db.statuses[d].category !== 'closed') return d;
    return (S.firstOfCategory('open') || S.statusList()[0]).id;
  };
  S.category = t => S.status(t.statusId).category;
  S.isClosed = t => S.category(t) === 'closed';

  S.task = id => (alive(db.tasks[id]) ? db.tasks[id] : null);
  S.taskList = () => Object.values(db.tasks).filter(t => alive(t) && !t.trashedAt);
  S.activeTasks = () => S.taskList().filter(t => !S.isAreaArchived(t.areaId));
  S.subtasks = id => S.taskList().filter(t => t.parentId === id).sort((a, b) => a.createdAt - b.createdAt);
  S.subtaskIdsDeep = id => {
    const out = [];
    const all = Object.values(db.tasks).filter(alive);
    const walk = pid => all.forEach(t => { if (t.parentId === pid && !out.includes(t.id)) { out.push(t.id); walk(t.id); } });
    walk(id);
    return out;
  };
  S.trashList = () => Object.values(db.tasks).filter(t => alive(t) && t.trashedAt).sort((a, b) => b.trashedAt - a.trashedAt);
  S.allTags = () => {
    const set = new Set();
    S.activeTasks().forEach(t => t.tags.forEach(tg => set.add(tg)));
    return [...set].sort((a, b) => a.localeCompare(b, 'de'));
  };

  S.searchTasks = q => {
    const words = String(q).toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return S.taskList().filter(t => {
      const hay = [t.title, t.description, t.tags.join(' '), t.notes.map(n => n.text).join(' '),
        t.links.map(l => l.label + ' ' + l.target).join(' '), t.checklist.map(c => c.text).join(' ')].join(' ').toLowerCase();
      return words.every(w => hay.includes(w));
    });
  };
  S.searchAreas = q => {
    const words = String(q).toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return S.areaList().filter(a => {
      const hay = [a.name, a.description, a.notes.map(n => n.text).join(' '), a.links.map(l => l.label + ' ' + l.target).join(' ')].join(' ').toLowerCase();
      return words.every(w => hay.includes(w));
    });
  };

  /* ---------- Bereiche ändern ---------- */
  S.createArea = ({ name, parentId = null, color = '' } = {}) => {
    const siblings = S.children(parentId, true);
    const a = normArea({ name: String(name || '').trim() || 'Neuer Bereich', parentId: parentId || null, color, order: siblings.length ? Math.max(...siblings.map(s => s.order || 0)) + 1 : 0 });
    db.areas[a.id] = a;
    touch('area', db.areas[a.id]);
    return db.areas[a.id];
  };
  S.updateArea = (id, patch) => {
    const a = db.areas[id];
    if (!a) return;
    Object.assign(a, patch);
    touch('area', a);
  };
  S.canMoveArea = (id, newParentId) => {
    if (id === 'inbox' || newParentId === 'inbox') return false;
    if (!newParentId) return true;
    return newParentId !== id && !S.descendants(id).includes(newParentId);
  };
  S.moveArea = (id, newParentId) => {
    newParentId = newParentId || null;
    if (!S.canMoveArea(id, newParentId)) return false;
    const a = db.areas[id];
    if ((a.parentId || null) === newParentId) return true;
    const siblings = S.children(newParentId, true);
    a.parentId = newParentId;
    a.order = siblings.length ? Math.max(...siblings.map(s => s.order || 0)) + 1 : 0;
    touch('area', a);
    return true;
  };
  S.areaUsage = id => {
    const ids = [id, ...S.descendants(id)];
    const tasks = Object.values(db.tasks).filter(t => alive(t) && ids.includes(t.areaId)).length;
    return { tasks, children: S.children(id, true).length };
  };
  S.deleteArea = id => {
    if (id === 'inbox') return false;
    const u = S.areaUsage(id);
    if (u.tasks || u.children) return false;
    db.areas[id] = { id, deleted: true, updatedAt: Date.now() };
    touch('area', db.areas[id]);
    return true;
  };
  S.createExampleTree = () => {
    let n = 0;
    EXAMPLE_TREE.forEach(root => {
      let r = S.areaList().find(a => !a.parentId && U.norm(a.name) === U.norm(root.name));
      if (!r) { r = S.createArea({ name: root.name, color: root.color }); n++; }
      root.kids.forEach(k => {
        const exists = S.children(r.id, true).some(a => U.norm(a.name) === U.norm(k));
        if (!exists) { S.createArea({ name: k, parentId: r.id }); n++; }
      });
    });
    return n;
  };

  /* ---------- Tasks ändern ---------- */
  const FIELD_LABEL = { areaId: 'Bereich', due: 'Fälligkeit', priority: 'Priorität', followUp: 'Wiedervorlage', status: 'Status', parentId: 'Übergeordnete Aufgabe' };
  const fmtField = (k, v) => {
    if (v === null || v === undefined || v === '') return '–';
    if (k === 'areaId') return S.pathLabel(v);
    if (k === 'due' || k === 'followUp') return U.fmtDateLong(v);
    if (k === 'priority') return 'P' + v;
    if (k === 'parentId') return (db.tasks[v] && db.tasks[v].title) || '–';
    return String(v);
  };
  function log(t, field, from, to) {
    t.history.push({ at: Date.now(), field, from, to });
    if (t.history.length > HISTORY_MAX) t.history.splice(0, t.history.length - HISTORY_MAX);
  }

  S.createTask = data => {
    const now = Date.now();
    const t = normTask(Object.assign({ statusId: S.openStatusId() }, data, { id: U.uid(), createdAt: now, history: [] }));
    if (!S.area(t.areaId)) t.areaId = 'inbox';
    t.history.push({ at: now, field: 'created', from: null, to: data && data.createdVia ? data.createdVia : S.pathLabel(t.areaId) });
    delete t.createdVia;
    if (S.status(t.statusId).category === 'closed' && !t.completedAt) t.completedAt = now;
    db.tasks[t.id] = t;
    touch('task', db.tasks[t.id]);
    return db.tasks[t.id];
  };

  S.updateTask = (id, patch) => {
    const t = db.tasks[id];
    if (!t || t.deleted) return;
    let changed = false;
    Object.keys(patch).forEach(k => {
      const from = t[k], to = patch[k];
      if (JSON.stringify(from) === JSON.stringify(to)) return;
      if (FIELD_LABEL[k]) log(t, k, fmtField(k, from), fmtField(k, to));
      t[k] = to;
      changed = true;
    });
    if (changed) touch('task', t);
  };

  S.moveTask = (id, areaId) => {
    if (!S.area(areaId)) return false;
    [id, ...S.subtaskIdsDeep(id)].forEach(tid => S.updateTask(tid, { areaId }));
    return true;
  };

  S.setStatus = (id, statusId, extra = {}) => {
    const t = db.tasks[id];
    if (!t || t.deleted) return;
    const to = S.status(statusId);
    const from = S.status(t.statusId);
    if (t.statusId === to.id && !extra.note) return;
    if (t.statusId !== to.id) log(t, 'status', from.name, to.name);
    t.statusId = to.id;
    if (to.category === 'closed') { if (!t.completedAt) t.completedAt = Date.now(); } else t.completedAt = null;
    if (extra.followUp !== undefined && extra.followUp !== t.followUp) {
      log(t, 'followUp', fmtField('followUp', t.followUp), fmtField('followUp', extra.followUp));
      t.followUp = extra.followUp || null;
    }
    if (extra.note) {
      const tail = extra.followUp ? ` (Wiedervorlage ${U.fmtDateLong(extra.followUp)})` : '';
      t.notes.unshift({ id: U.uid(), text: `${to.name}: ${extra.note.trim()}${tail}`, pinned: false, system: true, createdAt: Date.now() });
    }
    touch('task', t);
  };

  S.duplicateTask = id => {
    const src = db.tasks[id];
    if (!src) return null;
    const copy = JSON.parse(JSON.stringify(src));
    return S.createTask({
      areaId: copy.areaId, parentId: copy.parentId, title: copy.title + ' (Kopie)', description: copy.description,
      priority: copy.priority, due: copy.due, tags: copy.tags,
      links: copy.links.map(l => Object.assign(l, { id: U.uid() })),
      checklist: copy.checklist.map(c => ({ id: U.uid(), text: c.text, done: false }))
    });
  };

  S.trashTask = id => {
    const ids = [id, ...S.subtaskIdsDeep(id)];
    const now = Date.now();
    ids.forEach(tid => { const t = db.tasks[tid]; if (alive(t) && !t.trashedAt) { t.trashedAt = now; touch('task', t); } });
    return ids;
  };
  S.restoreTask = id => {
    const t = db.tasks[id];
    if (!alive(t)) return;
    const stamp = t.trashedAt;
    [id, ...S.subtaskIdsDeep(id)].forEach(tid => {
      const x = db.tasks[tid];
      if (alive(x) && x.trashedAt && (tid === id || x.trashedAt === stamp)) {
        x.trashedAt = null;
        if (!S.area(x.areaId)) x.areaId = 'inbox';
        touch('task', x);
      }
    });
    if (t.parentId && (!alive(db.tasks[t.parentId]) || db.tasks[t.parentId].trashedAt)) { t.parentId = null; touch('task', t); }
  };
  S.purgeTask = id => {
    [id, ...S.subtaskIdsDeep(id)].forEach(tid => {
      if (db.tasks[tid]) { db.tasks[tid] = { id: tid, deleted: true, updatedAt: Date.now() }; touch('task', db.tasks[tid]); }
    });
  };
  S.emptyTrash = () => { const l = S.trashList(); l.forEach(t => S.purgeTask(t.id)); return l.length; };
  S.autoPurge = () => {
    const limit = Date.now() - TRASH_DAYS * 864e5;
    S.trashList().filter(t => t.trashedAt < limit).forEach(t => S.purgeTask(t.id));
  };

  /* ---------- Vermerke, Links, Checkliste ---------- */
  const owner = (kind, id) => (kind === 'area' ? db.areas[id] : db.tasks[id]);

  S.addNote = (kind, id, text) => {
    const o = owner(kind, id);
    if (!o || !String(text).trim()) return null;
    const n = { id: U.uid(), text: String(text).trim(), pinned: false, system: false, createdAt: Date.now() };
    o.notes.unshift(n);
    touch(kind, o);
    return n;
  };
  S.updateNote = (kind, id, noteId, patch) => {
    const o = owner(kind, id);
    const n = o && o.notes.find(x => x.id === noteId);
    if (!n) return;
    Object.assign(n, patch);
    touch(kind, o);
  };
  S.removeNote = (kind, id, noteId) => {
    const o = owner(kind, id);
    if (!o) return null;
    const i = o.notes.findIndex(x => x.id === noteId);
    if (i < 0) return null;
    const [n] = o.notes.splice(i, 1);
    touch(kind, o);
    return { note: n, index: i };
  };
  S.restoreNote = (kind, id, removed) => {
    const o = owner(kind, id);
    if (!o || !removed) return;
    o.notes.splice(Math.min(removed.index, o.notes.length), 0, removed.note);
    touch(kind, o);
  };

  S.addLink = (kind, id, link) => {
    const o = owner(kind, id);
    if (!o || !String(link.target || '').trim()) return null;
    const l = { id: U.uid(), kind: link.kind || U.detectKind(link.target), label: String(link.label || '').trim(), target: String(link.target).trim() };
    o.links.push(l);
    touch(kind, o);
    return l;
  };
  S.updateLink = (kind, id, linkId, patch) => {
    const o = owner(kind, id);
    const l = o && o.links.find(x => x.id === linkId);
    if (!l) return;
    Object.assign(l, patch);
    touch(kind, o);
  };
  S.removeLink = (kind, id, linkId) => {
    const o = owner(kind, id);
    if (!o) return;
    const i = o.links.findIndex(x => x.id === linkId);
    if (i >= 0) { o.links.splice(i, 1); touch(kind, o); }
  };

  S.addCheck = (taskId, text) => {
    const t = db.tasks[taskId];
    if (!t || !String(text).trim()) return;
    t.checklist.push({ id: U.uid(), text: String(text).trim(), done: false });
    touch('task', t);
  };
  S.updateCheck = (taskId, checkId, patch) => {
    const t = db.tasks[taskId];
    const c = t && t.checklist.find(x => x.id === checkId);
    if (!c) return;
    Object.assign(c, patch);
    touch('task', t);
  };
  S.removeCheck = (taskId, checkId) => {
    const t = db.tasks[taskId];
    if (!t) return;
    const i = t.checklist.findIndex(x => x.id === checkId);
    if (i >= 0) { t.checklist.splice(i, 1); touch('task', t); }
  };

  /* ---------- Stati ---------- */
  S.createStatus = () => {
    const list = S.statusList();
    const s = { id: 's' + U.uid(), name: 'Neuer Status', category: 'open', color: '#5E8BDE', require: null, order: list.length ? Math.max(...list.map(x => x.order || 0)) + 1 : 0, deleted: false };
    db.statuses[s.id] = s;
    touch('status', db.statuses[s.id]);
    return db.statuses[s.id];
  };
  S.updateStatus = (id, patch) => { const s = db.statuses[id]; if (!s) return; Object.assign(s, patch); touch('status', s); };
  S.moveStatus = (id, dir) => {
    const list = S.statusList();
    const i = list.findIndex(s => s.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    list.splice(j, 0, list.splice(i, 1)[0]);
    list.forEach((s, k) => { if (s.order !== k) { s.order = k; touch('status', s); } });
  };
  S.statusUsage = id => Object.values(db.tasks).filter(t => alive(t) && t.statusId === id).length;
  S.deleteStatus = (id, replacementId) => {
    if (S.statusList().length <= 1) return false;
    if (S.settings().defaultStatus === id) S.updateSettings({ defaultStatus: replacementId });
    Object.values(db.tasks).filter(t => alive(t) && t.statusId === id).forEach(t => S.setStatus(t.id, replacementId));
    db.statuses[id] = { id, deleted: true, updatedAt: Date.now() };
    touch('status', db.statuses[id]);
    return true;
  };

  /* ---------- Sync-Hilfen ---------- */
  S.applyRemote = (kind, payload, deleted) => {
    const coll = COLL[kind];
    if (!coll || !payload || !payload.id) return false;
    const id = payload.id;
    const local = db[coll][id];
    const remoteAt = payload.updatedAt || 0;
    if (local && (local.updatedAt || 0) >= remoteAt) return false;
    if (deleted || payload.deleted) {
      db[coll][id] = { id, deleted: true, updatedAt: remoteAt };
    } else if (kind === 'task') {
      db[coll][id] = normTask(payload);
    } else if (kind === 'area') {
      db[coll][id] = normArea(payload);
    } else {
      db[coll][id] = payload;
    }
    delete meta.dirty[id];
    scheduleSave();
    return true;
  };
  S.markAllDirty = () => {
    Object.keys(COLL).forEach(kind => Object.values(db[COLL[kind]]).forEach(e => {
      if ((e.updatedAt || 0) > 0) meta.dirty[e.id] = kind;
    }));
    scheduleSave();
  };
  S.dirtyCount = () => Object.keys(meta.dirty).length;

  /* ---------- Sicherung und Import ---------- */
  S.exportData = () => ({
    app: 'todo-manager',
    version: 1,
    exportedAt: new Date().toISOString(),
    areas: Object.values(db.areas).filter(alive),
    tasks: Object.values(db.tasks).filter(alive),
    statuses: S.statusList(),
    settings: [S.settings()]
  });

  S.importData = (data, mode = 'merge') => {
    if (!data || data.app !== 'todo-manager') throw new Error('Das ist keine Sicherung aus dem ToDo-Manager.');
    if (mode === 'replace') {
      Object.values(db.tasks).filter(alive).forEach(t => { db.tasks[t.id] = { id: t.id, deleted: true }; touch('task', db.tasks[t.id]); });
      Object.values(db.areas).filter(a => alive(a) && a.id !== 'inbox').forEach(a => { db.areas[a.id] = { id: a.id, deleted: true }; touch('area', db.areas[a.id]); });
    }
    let nA = 0, nT = 0;
    (data.statuses || []).forEach(s => { if (s && s.id) { db.statuses[s.id] = Object.assign({}, s, { deleted: false }); touch('status', db.statuses[s.id]); } });
    (data.settings || []).forEach(s => { if (s && s.id === 'settings') { db.settings.settings = Object.assign({}, s, { deleted: false }); touch('settings', db.settings.settings); } });

    /* Bereiche: Eltern vor Kindern; beim Ergänzen gleichnamige Bereiche an gleicher Stelle weiterverwenden */
    const incoming = (data.areas || []).filter(a => a && a.id);
    const byId = {};
    incoming.forEach(a => { byId[a.id] = a; });
    const ordered = [];
    const visit = (a, seen) => {
      if (ordered.includes(a) || seen.has(a.id)) return;
      seen.add(a.id);
      if (a.parentId && byId[a.parentId]) visit(byId[a.parentId], seen);
      ordered.push(a);
    };
    incoming.forEach(a => visit(a, new Set()));
    const idMap = {};
    ordered.forEach(a => {
      const parentId = a.parentId ? (idMap[a.parentId] || a.parentId) : null;
      if (mode === 'merge' && a.id !== 'inbox' && !alive(db.areas[a.id])) {
        const twin = S.areaList().find(x => x.id !== 'inbox' && U.norm(x.name) === U.norm(a.name) && (x.parentId || null) === (parentId || null));
        if (twin) { idMap[a.id] = twin.id; return; }
      }
      idMap[a.id] = a.id;
      db.areas[a.id] = normArea(Object.assign({}, a, { parentId: a.id === 'inbox' ? null : parentId, system: a.id === 'inbox', deleted: false }));
      touch('area', db.areas[a.id]);
      if (a.id !== 'inbox') nA++;
    });
    (data.tasks || []).forEach(t => {
      if (!t || !t.id) return;
      db.tasks[t.id] = normTask(Object.assign({}, t, { areaId: idMap[t.areaId] || t.areaId, deleted: false }));
      if (!S.area(db.tasks[t.id].areaId)) db.tasks[t.id].areaId = 'inbox';
      touch('task', db.tasks[t.id]);
      nT++;
    });
    seed(db);
    return { areas: nA, tasks: nT };
  };

  /* Google Tasks: Tasks.json aus Google Takeout (oder API-Antwort mit Listen) */
  S.importGoogle = json => {
    let lists = [];
    if (Array.isArray(json)) lists = json;
    else if (json && Array.isArray(json.items) && json.items.some(x => x && (x.kind === 'tasks#taskList' || Array.isArray(x.items)))) lists = json.items;
    else if (json && (json.kind === 'tasks#taskList' || Array.isArray(json.items))) lists = [json];
    if (!lists.length) throw new Error('In der Datei wurden keine Google-Tasks-Listen gefunden.');
    const byName = {};
    S.areaList().forEach(a => { const k = U.norm(a.name); if (!byName[k]) byName[k] = a.id; });
    const idMap = {}, parents = [];
    let nA = 0, nT = 0;
    const closedId = S.doneStatusId(), openId = S.openStatusId();
    lists.forEach(list => {
      const title = String(list.title || 'Google Tasks').trim();
      let areaId = byName[U.norm(title)];
      if (!areaId) { areaId = S.createArea({ name: title }).id; byName[U.norm(title)] = areaId; nA++; }
      (list.items || list.tasks || []).forEach(g => {
        if (!g || g.deleted || (!g.title && !g.notes)) return;
        const done = g.status === 'completed';
        const notes = String(g.notes || '');
        const links = U.extractLinks(notes);
        (g.links || []).forEach(l => { if (l && l.link) links.push(U.makeLink(l.link, l.description || '')); });
        const t = S.createTask({
          areaId, title: String(g.title || '').trim() || '(ohne Titel)', description: notes,
          statusId: done ? closedId : openId, due: g.due ? String(g.due).slice(0, 10) : null, links,
          createdVia: 'Import aus Google Tasks'
        });
        if (done) t.completedAt = (g.completed && Date.parse(g.completed)) || Date.now();
        idMap[g.id] = t.id;
        if (g.parent) parents.push([t.id, g.parent]);
        nT++;
      });
    });
    parents.forEach(([tid, gp]) => { if (idMap[gp]) { db.tasks[tid].parentId = idMap[gp]; touch('task', db.tasks[tid]); } });
    return { areas: nA, tasks: nT };
  };

  S.autoPurge();
  window.S = S;
})();
