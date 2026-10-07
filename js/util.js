/* Hilfsfunktionen: IDs, Datum, Links, Schnellerfassung */
(function () {
  'use strict';
  const U = {};

  U.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9);

  /* ---------- Datum (immer lokale Zeit, Format YYYY-MM-DD) ---------- */
  const pad = n => String(n).padStart(2, '0');
  U.iso = (y, m, d) => {
    const dt = new Date(y, m - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
    return `${y}-${pad(m)}-${pad(d)}`;
  };
  U.todayISO = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  U.addDays = (iso, n) => {
    const [y, m, d] = iso.split('-').map(Number);
    return U.todayISO(new Date(y, m - 1, d + n));
  };
  const WD_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  U.fmtDate = iso => {
    if (!iso) return '';
    const t = U.todayISO();
    if (iso === t) return 'Heute';
    if (iso === U.addDays(t, 1)) return 'Morgen';
    if (iso === U.addDays(t, -1)) return 'Gestern';
    const [y, m, d] = iso.split('-').map(Number);
    const wd = WD_SHORT[new Date(y, m - 1, d).getDay()];
    return y === new Date().getFullYear() ? `${wd} ${d}.${m}.` : `${wd} ${d}.${m}.${y}`;
  };
  U.fmtDateLong = iso => {
    if (!iso) return '–';
    const [y, m, d] = iso.split('-').map(Number);
    return `${pad(d)}.${pad(m)}.${y}`;
  };
  U.fmtDateTime = ts => {
    if (!ts) return '';
    return new Date(ts).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  U.fmtTime = ts => (ts ? new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '');

  const WEEKDAYS = { so: 0, sonntag: 0, mo: 1, montag: 1, di: 2, dienstag: 2, mi: 3, mittwoch: 3, do: 4, donnerstag: 4, fr: 5, freitag: 5, sa: 6, samstag: 6 };

  /* Versteht: heute, morgen, übermorgen, mo…so, nw (nächster Montag), +3, +2w, 14.10., 14.10.2026, 2026-10-14 */
  U.parseDateWord = word => {
    const w = String(word || '').toLowerCase().trim();
    const t = U.todayISO();
    if (!w) return null;
    if (w === 'heute') return t;
    if (w === 'morgen') return U.addDays(t, 1);
    if (w === 'übermorgen' || w === 'uebermorgen') return U.addDays(t, 2);
    if (w === 'nw' || w === 'nächstewoche' || w === 'naechstewoche') {
      const diff = (1 - new Date().getDay() + 7) % 7 || 7;
      return U.addDays(t, diff);
    }
    let m = w.match(/^\+(\d{1,3})([tdw])?$/);
    if (m) return U.addDays(t, Number(m[1]) * (m[2] === 'w' ? 7 : 1));
    if (w in WEEKDAYS) {
      const diff = (WEEKDAYS[w] - new Date().getDay() + 7) % 7;
      return U.addDays(t, diff);
    }
    m = w.match(/^(\d{1,2})\.(\d{1,2})\.?(\d{2,4})?$/);
    if (m) {
      const d = Number(m[1]), mon = Number(m[2]);
      let y = m[3] ? Number(m[3]) : new Date().getFullYear();
      if (y < 100) y += 2000;
      let iso = U.iso(y, mon, d);
      if (iso && !m[3] && iso < t) iso = U.iso(y + 1, mon, d);
      return iso;
    }
    m = w.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return U.iso(Number(m[1]), Number(m[2]), Number(m[3]));
    return null;
  };

  /* ---------- Text ---------- */
  U.norm = s => String(s || '').toLowerCase().replace(/ß/g, 'ss').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');
  U.short = (s, n = 48) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  U.escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /* Text sicher als HTML ausgeben, URLs werden klickbar */
  U.linkify = s => U.escape(s).replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');

  /* ---------- Links ---------- */
  U.LINK_KINDS = [
    { id: 'url', label: 'Web' },
    { id: 'path', label: 'Netzwerkpfad' },
    { id: 'repo', label: 'Repo' },
    { id: 'ticket', label: 'Ticket' },
    { id: 'server', label: 'Server' },
    { id: 'doc', label: 'Doku' },
    { id: 'other', label: 'Sonstiges' }
  ];
  U.kindLabel = id => (U.LINK_KINDS.find(k => k.id === id) || U.LINK_KINDS[6]).label;

  U.detectKind = target => {
    const t = String(target || '').trim();
    if (/^\\\\/.test(t) || /^[a-z]:\\/i.test(t) || /^(smb|file|afp):\/\//i.test(t)) return 'path';
    if (/github\.com|gitlab|gitea|bitbucket/i.test(t)) return 'repo';
    if (/zammad|#ticket\/|\/ticket\//i.test(t)) return 'ticket';
    if (/^(https?:\/\/)?(\d{1,3}\.){3}\d{1,3}(:\d+)?(\/|$)/.test(t) || /^(https?:\/\/)?localhost(:\d+)?/.test(t)) return 'server';
    if (/docs\.|\/docs?\/|wiki|confluence|notion\.so|\.pdf$/i.test(t)) return 'doc';
    if (/^https?:\/\//i.test(t) || /^www\./i.test(t)) return 'url';
    return 'other';
  };

  /* Ziel, das der Browser öffnen kann – Netzwerkpfade nicht (Browser blockieren file:// und \\server) */
  U.linkHref = link => {
    const t = String(link.target || '').trim();
    if (!t || link.kind === 'path') return null;
    if (/^https?:\/\//i.test(t)) return t;
    if (/^www\./i.test(t)) return 'https://' + t;
    if (/^(\d{1,3}\.){3}\d{1,3}(:\d+)?/.test(t) || /^localhost/.test(t)) return 'http://' + t;
    if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$)/i.test(t)) return 'https://' + t;
    return null;
  };

  U.linkShort = link => {
    const t = String(link.target || '');
    try {
      if (/^https?:\/\//i.test(t)) {
        const u = new URL(t);
        const p = (u.pathname + u.search).replace(/\/$/, '');
        return U.short(u.host.replace(/^www\./, '') + p, 56);
      }
    } catch (e) { /* ignorieren */ }
    return U.short(t, 56);
  };

  U.makeLink = (target, label) => ({ id: U.uid(), kind: U.detectKind(target), label: label || '', target: String(target).trim() });

  /* URLs und Netzwerkpfade aus freiem Text holen */
  U.extractLinks = text => {
    const out = [];
    const seen = new Set();
    String(text || '').replace(/(https?:\/\/[^\s<>"]+|\\\\[^\s<>"]+)/g, m => {
      const clean = m.replace(/[.,;:!?)\]]+$/, '');
      if (!seen.has(clean)) { seen.add(clean); out.push(U.makeLink(clean)); }
      return m;
    });
    return out;
  };

  /* ---------- Schnellerfassung ----------
     "Bot-Schutz prüfen #preise/preisspion !1 @morgen +scraper https://…" */
  U.parseQuick = (text, findArea) => {
    const out = { title: '', areaId: null, areaToken: null, priority: null, due: null, tags: [], links: [] };
    let s = ' ' + String(text || '') + ' ';
    s = s.replace(/(https?:\/\/\S+|\\\\\S+)/g, m => { out.links.push(U.makeLink(m)); return ' '; });
    s = s.replace(/\s#([^\s#!@+]+)/g, (m, tok) => {
      const id = findArea(tok);
      if (id) { out.areaId = id; return ' '; }
      out.areaToken = tok;
      return m;
    });
    s = s.replace(/\s!([1-4])(?=\s)/g, (m, p) => { out.priority = Number(p); return ' '; });
    s = s.replace(/\s@(\S+)/g, (m, w) => {
      const d = U.parseDateWord(w);
      if (d) { out.due = d; return ' '; }
      return m;
    });
    s = s.replace(/\s\+([\p{L}\p{N}_-]+)/gu, (m, tg) => {
      const tag = tg.toLowerCase();
      if (!out.tags.includes(tag)) out.tags.push(tag);
      return ' ';
    });
    out.title = s.replace(/\s+/g, ' ').trim();
    if (!out.title && out.links.length) out.title = U.linkShort(out.links[0]);
    return out;
  };

  /* ---------- Sonstiges ---------- */
  U.debounce = (fn, ms) => {
    let t = null;
    const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
    d.flush = (...a) => { clearTimeout(t); fn(...a); };
    return d;
  };

  U.copy = async text => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      ta.remove();
      return ok;
    }
  };

  U.download = (filename, text) => {
    const blob = new Blob([text], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  U.readFile = file => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });

  window.U = U;
})();
