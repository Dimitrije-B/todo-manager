/* Oberfläche (Vue 3, ohne Build-Schritt) */
(function () {
  'use strict';
  const { createApp, reactive, computed, ref, watch, nextTick } = Vue;
  const S = window.S, U = window.U, Y = window.Y;

  /* ---------- Icons ---------- */
  const ICONS = {
    menu: 'M4 6h16M4 12h16M4 18h16',
    search: 'M4 11a7 7 0 1 0 14 0a7 7 0 1 0-14 0M20 20l-3.5-3.5',
    plus: 'M12 5v14M5 12h14',
    inbox: 'M4 13l2.5-7h11L20 13v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM4 13h4.5l1.5 2.5h4l1.5-2.5H20',
    sun: 'M8 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4',
    star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z',
    list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
    board: 'M3.5 4h4.5v16H3.5zM9.75 4h4.5v11h-4.5zM16 4h4.5v7H16z',
    layers: 'M12 4l8 4-8 4-8-4zM4 12l8 4 8-4M4 16l8 4 8-4',
    trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
    settings: 'M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M13 6a2 2 0 1 0 4 0a2 2 0 1 0-4 0M7 12a2 2 0 1 0 4 0a2 2 0 1 0-4 0M15 18a2 2 0 1 0 4 0a2 2 0 1 0-4 0',
    link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
    note: 'M6 3h9l4 4v14H6zM15 3v4h4M9 12h7M9 16h5',
    check: 'M5 12.5l4.5 4.5L19 7',
    x: 'M6 6l12 12M18 6L6 18',
    'chev-right': 'M9 6l6 6-6 6',
    'chev-down': 'M6 9l6 6 6-6',
    up: 'M6 15l6-6 6 6',
    down: 'M6 9l6 6 6-6',
    calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
    bell: 'M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0',
    checklist: 'M4 6l1.5 1.5L8 5M4 12l1.5 1.5L8 11M4 18l1.5 1.5L8 17M11 6h9M11 12h9M11 18h9',
    subtask: 'M6 4v9a3 3 0 0 0 3 3h10M15 12l4 4-4 4',
    copy: 'M9 9h11v11H9zM5 15V4h11',
    edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
    cloud: 'M7 18a4.5 4.5 0 0 1-.4-9A6 6 0 0 1 18 9.6a4.2 4.2 0 0 1-.5 8.4z',
    more: 'M5 12h.01M12 12h.01M19 12h.01',
    archive: 'M4 5h16v4H4zM5 9v10h14V9M10 13h4',
    restore: 'M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4',
    pin: 'M9 4h6l-1 6 3 3H7l3-3zM12 13v7',
    back: 'M15 6l-6 6 6 6',
    download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
    upload: 'M12 16V5M7 10l5-5 5 5M5 20h14'
  };
  const Icon = {
    props: { name: String, size: { type: [Number, String], default: 16 } },
    computed: { d() { return ICONS[this.name] || ''; } },
    template: `<svg class="ico" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="name === 'more' ? 3.2 : 1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path :d="d"/></svg>`
  };

  /* Textfelder wachsen mit dem Inhalt */
  const autosize = {
    mounted(el) {
      const fit = () => { el.style.height = 'auto'; el.style.height = (el.scrollHeight + 2) + 'px'; };
      el._fit = fit;
      el.addEventListener('input', fit);
      requestAnimationFrame(fit);
    },
    updated(el) { if (el._fit) requestAnimationFrame(el._fit); }
  };

  /* ---------- UI-Zustand ---------- */
  const UI_KEY = 'tm_ui_v1';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(UI_KEY) || '{}') || {}; } catch (e) { saved = {}; }
  let savedTheme = 'system';
  try { savedTheme = localStorage.getItem('tm_theme') || 'system'; } catch (e) { /* egal */ }

  const ui = reactive({
    view: saved.view || 'today',
    areaId: saved.areaId || null,
    selectedTaskId: null,
    layout: saved.layout === 'board' ? 'board' : 'list',
    groupBy: saved.groupBy || 'status',
    includeSub: saved.includeSub !== false,
    showClosed: !!saved.showClosed,
    prio: 0,
    tag: '',
    search: '',
    sidebarOpen: false,
    collapsed: saved.collapsed || {},
    theme: savedTheme,
    menu: null,
    prompt: null,
    areaDialog: null,
    toast: null
  });
  if (ui.view === 'area' && !S.area(ui.areaId)) { ui.view = 'today'; ui.areaId = null; }
  if (!['today', 'area', 'open', 'flagged', 'trash', 'settings'].includes(ui.view)) ui.view = 'today';

  watch(() => JSON.stringify([ui.view, ui.areaId, ui.layout, ui.groupBy, ui.includeSub, ui.showClosed, ui.collapsed]), () => {
    if (ui.view === 'search') return;
    try {
      localStorage.setItem(UI_KEY, JSON.stringify({ view: ui.view, areaId: ui.areaId, layout: ui.layout, groupBy: ui.groupBy, includeSub: ui.includeSub, showClosed: ui.showClosed, collapsed: ui.collapsed }));
    } catch (e) { /* egal */ }
  });

  const darkQuery = matchMedia('(prefers-color-scheme: dark)');
  function applyTheme() {
    const dark = ui.theme === 'dark' || (ui.theme === 'system' && darkQuery.matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }
  watch(() => ui.theme, v => { try { localStorage.setItem('tm_theme', v); } catch (e) { /* egal */ } applyTheme(); });
  if (darkQuery.addEventListener) darkQuery.addEventListener('change', applyTheme);
  applyTheme();

  /* ---------- Navigation ---------- */
  let beforeSearch = null;
  function go(view, areaId) {
    ui.view = view;
    ui.areaId = view === 'area' ? (areaId || 'inbox') : null;
    ui.selectedTaskId = null;
    ui.sidebarOpen = false;
    ui.prio = 0;
    ui.tag = '';
    ui.menu = null;
    if (view !== 'search') { ui.search = ''; beforeSearch = null; }
    nextTick(() => { const m = document.querySelector('.main'); if (m) m.scrollTop = 0; });
  }
  function selectTask(id) { ui.selectedTaskId = id; }

  let toastTimer = null;
  function toast(text, action) {
    ui.toast = { text, action: action || null };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { ui.toast = null; }, action ? 6000 : 3000);
  }

  /* Statuswechsel, bei Pflichtangabe erst nachfragen */
  function requestStatus(task, statusId) {
    const st = S.status(statusId);
    if (!task || task.statusId === st.id) return;
    if (st.require) {
      const t0 = U.todayISO();
      ui.prompt = {
        taskId: task.id, statusId: st.id, note: '',
        followUp: st.require === 'waiting' ? (task.followUp && task.followUp > t0 ? task.followUp : U.addDays(t0, 3)) : null
      };
      return;
    }
    const prev = task.statusId;
    S.setStatus(task.id, st.id);
    if (st.category === 'closed') toast(`${st.name}: ${U.short(task.title, 40)}`, { label: 'Rückgängig', fn: () => S.setStatus(task.id, prev) });
  }
  function toggleDone(task) {
    if (S.isClosed(task)) S.setStatus(task.id, S.openStatusId());
    else requestStatus(task, S.doneStatusId());
  }

  /* ---------- Abgeleitete Daten ---------- */
  const today = ref(U.todayISO());
  setInterval(() => { const t = U.todayISO(); if (t !== today.value) today.value = t; }, 60000);
  const prioCmp = (a, b) => (a.priority || 9) - (b.priority || 9) ||
    String(a.due || '9999').localeCompare(String(b.due || '9999')) || (a.createdAt - b.createdAt);

  const activeTasks = computed(() => S.activeTasks());
  const openTasks = computed(() => activeTasks.value.filter(t => !S.isClosed(t)));
  const subMap = computed(() => {
    const m = {};
    S.taskList().forEach(t => { if (t.parentId) (m[t.parentId] = m[t.parentId] || []).push(t); });
    return m;
  });
  const areaStats = computed(() => {
    const m = {};
    openTasks.value.forEach(t => {
      if (t.parentId) return;
      const doing = S.category(t) === 'active';
      let a = S.area(t.areaId);
      let guard = 0;
      while (a && guard++ < 50) {
        const s = m[a.id] || (m[a.id] = { open: 0, doing: 0 });
        s.open++;
        if (doing) s.doing++;
        a = a.parentId ? S.area(a.parentId) : null;
      }
    });
    return m;
  });
  const todayData = computed(() => {
    const t0 = today.value, week = U.addDays(t0, 7);
    const seen = new Set();
    const take = arr => arr.filter(t => !seen.has(t.id) && seen.add(t.id));
    const open = openTasks.value;
    const byDue = (a, b) => String(a.due).localeCompare(String(b.due)) || prioCmp(a, b);
    const overdue = take(open.filter(t => t.due && t.due < t0).sort(byDue));
    const due = take(open.filter(t => t.due === t0).sort(prioCmp));
    const follow = take(open.filter(t => t.followUp && t.followUp <= t0).sort((a, b) => a.followUp.localeCompare(b.followUp)));
    const doing = take(open.filter(t => S.category(t) === 'active').sort(prioCmp));
    const soon = take(open.filter(t => t.due && t.due > t0 && t.due <= week).sort(byDue));
    return {
      sections: [
        { key: 'overdue', label: 'Überfällig', tasks: overdue, tone: 'danger' },
        { key: 'today', label: 'Heute fällig', tasks: due },
        { key: 'follow', label: 'Wiedervorlage fällig', tasks: follow },
        { key: 'doing', label: 'In Arbeit', tasks: doing },
        { key: 'soon', label: 'Nächste 7 Tage', tasks: soon }
      ],
      total: overdue.length + due.length + follow.length + doing.length
    };
  });
  const counts = computed(() => ({
    today: todayData.value.total,
    inbox: (areaStats.value.inbox || {}).open || 0,
    flagged: openTasks.value.filter(t => t.flagged).length,
    open: openTasks.value.filter(t => !t.parentId).length,
    trash: S.trashList().length
  }));
  const doingColor = computed(() => (S.firstOfCategory('active') || { color: '#E39B2D' }).color);

  /* ---------- Ziehen und Ablegen ---------- */
  const drag = reactive({ type: null, id: null });
  function startDrag(e, type, id) {
    drag.type = type;
    drag.id = id;
    try { e.dataTransfer.setData('text/plain', id); e.dataTransfer.effectAllowed = 'move'; } catch (err) { /* egal */ }
  }
  function endDrag() { drag.type = null; drag.id = null; }
  function onDropArea(areaId) {
    const d = { type: drag.type, id: drag.id };
    endDrag();
    if (d.type === 'task') {
      const t = S.task(d.id);
      if (!t || !areaId || t.areaId === areaId) return;
      S.moveTask(t.id, areaId);
      toast(`Verschoben nach ${S.pathLabel(areaId)}`);
    } else if (d.type === 'area') {
      if (d.id === areaId) return;
      if (areaId === 'inbox') { toast('Bereiche lassen sich nicht in den Eingang legen.'); return; }
      const name = (S.area(d.id) || {}).name;
      if (S.moveArea(d.id, areaId)) {
        if (areaId) delete ui.collapsed[areaId];
        toast(areaId ? `„${name}“ liegt jetzt in ${S.pathLabel(areaId)}` : `„${name}“ liegt jetzt auf oberster Ebene`);
      } else toast('Ein Bereich kann nicht in seinem eigenen Unterbereich liegen.');
    }
  }

  /* ---------- Komponenten ---------- */
  const TreeNode = {
    name: 'TreeNode',
    props: { area: Object, depth: Number },
    data() { return { over: false }; },
    computed: {
      kids() { return S.children(this.area.id); },
      collapsed() { return !!ui.collapsed[this.area.id]; },
      active() { return ui.view === 'area' && ui.areaId === this.area.id; },
      stat() { return areaStats.value[this.area.id] || { open: 0, doing: 0 }; },
      doingColor() { return doingColor.value; }
    },
    methods: {
      open() { go('area', this.area.id); },
      toggle() { if (this.collapsed) delete ui.collapsed[this.area.id]; else ui.collapsed[this.area.id] = true; },
      onDragStart(e) { startDrag(e, 'area', this.area.id); },
      onOver(e) {
        if (!drag.type || (drag.type === 'area' && drag.id === this.area.id)) return;
        e.preventDefault();
        this.over = true;
      },
      onDrop() { this.over = false; onDropArea(this.area.id); }
    },
    template: `
<li role="none">
  <div :class="['tree-row', { active, drop: over }]" :style="{ paddingLeft: (6 + depth * 16) + 'px' }" draggable="true"
    @dragstart.stop="onDragStart" @dragend="endDrag" @dragover="onOver" @dragleave="over = false" @drop.prevent="onDrop"
    @click="open" @keydown.enter="open" role="treeitem" tabindex="0" :aria-expanded="kids.length ? String(!collapsed) : null">
    <button v-if="kids.length" class="chev" @click.stop="toggle" :aria-label="collapsed ? 'Aufklappen' : 'Zuklappen'"><icon :name="collapsed ? 'chev-right' : 'chev-down'" :size="14"/></button>
    <span v-else class="chev-space"></span>
    <span class="area-dot" :style="{ background: area.color || 'var(--faint)' }"></span>
    <span class="tree-name">{{ area.name }}</span>
    <span v-if="stat.doing" class="led sm" :style="{ '--c': doingColor }" :title="stat.doing + ' in Arbeit'"></span>
    <span class="count">{{ stat.open || '' }}</span>
  </div>
  <ul v-if="kids.length && !collapsed" role="group"><tree-node v-for="k in kids" :key="k.id" :area="k" :depth="depth + 1"/></ul>
</li>`
  };

  const TaskRow = {
    props: { task: Object, variant: { type: String, default: 'row' }, showArea: Boolean, showStatus: { type: Boolean, default: true }, hideParent: Boolean },
    computed: {
      status() { return S.status(this.task.statusId); },
      closed() { return this.status.category === 'closed'; },
      selected() { return ui.selectedTaskId === this.task.id; },
      parent() { return this.task.parentId ? S.task(this.task.parentId) : null; },
      subs() { return subMap.value[this.task.id] || []; },
      subsDone() { return this.subs.filter(s => S.isClosed(s)).length; },
      checksDone() { return this.task.checklist.filter(c => c.done).length; },
      area() { return S.area(this.task.areaId); },
      areaLabel() { return U.short(S.pathLabel(this.task.areaId), 44); },
      dueCls() {
        const d = this.task.due;
        if (!d || this.closed) return '';
        return d < today.value ? 'overdue' : d === today.value ? 'today' : '';
      },
      followCls() { return this.task.followUp && this.task.followUp <= today.value ? 'today' : ''; }
    },
    methods: {
      select() { selectTask(this.task.id); },
      onDrag(e) { startDrag(e, 'task', this.task.id); },
      flag() { S.updateTask(this.task.id, { flagged: !this.task.flagged }); }
    },
    template: `
<div :class="['task-' + variant, { selected, closed }]" :data-id="task.id" draggable="true" tabindex="0"
  @dragstart="onDrag" @dragend="endDrag" @click="select" @keydown.enter.self="select">
  <button class="check" :class="{ done: closed }" :style="{ '--c': status.color }" @click.stop="toggleDone(task)"
    :title="closed ? 'Wieder öffnen' : 'Als erledigt markieren'" :aria-label="closed ? 'Wieder öffnen' : 'Als erledigt markieren'"><icon v-if="closed" name="check" :size="12"/></button>
  <div class="task-main">
    <div class="task-title">{{ task.title || 'Ohne Titel' }}</div>
    <div class="task-meta">
      <span v-if="showStatus" class="status-tag"><span class="led" :style="{ '--c': status.color }"></span>{{ status.name }}</span>
      <span v-if="task.priority" :class="['prio', 'p' + task.priority]">P{{ task.priority }}</span>
      <span v-if="parent && !hideParent" class="meta-parent">↳ {{ U.short(parent.title, 32) }}</span>
      <span v-if="showArea" class="meta-area"><span class="area-dot" :style="{ background: (area && area.color) || 'var(--faint)' }"></span>{{ areaLabel }}</span>
      <span v-if="task.due" :class="['meta-date', dueCls]" title="Fällig"><icon name="calendar" :size="13"/>{{ U.fmtDate(task.due) }}</span>
      <span v-if="task.followUp && !closed" :class="['meta-date', followCls]" title="Wiedervorlage"><icon name="bell" :size="13"/>{{ U.fmtDate(task.followUp) }}</span>
      <span v-if="task.links.length" class="meta-ico" title="Links"><icon name="link" :size="13"/>{{ task.links.length }}</span>
      <span v-if="task.notes.length" class="meta-ico" title="Vermerke"><icon name="note" :size="13"/>{{ task.notes.length }}</span>
      <span v-if="task.checklist.length" class="meta-ico" title="Checkliste"><icon name="checklist" :size="13"/>{{ checksDone }}/{{ task.checklist.length }}</span>
      <span v-if="subs.length" class="meta-ico" title="Unteraufgaben"><icon name="subtask" :size="13"/>{{ subsDone }}/{{ subs.length }}</span>
      <span v-for="tg in task.tags" :key="tg" class="tag">+{{ tg }}</span>
    </div>
  </div>
  <button :class="['star', { on: task.flagged }]" @click.stop="flag" :title="task.flagged ? 'Markierung entfernen' : 'Markieren'" :aria-label="task.flagged ? 'Markierung entfernen' : 'Markieren'"><icon name="star"/></button>
</div>`
  };

  const TaskList = {
    props: { tasks: Array, groupBy: { type: String, default: 'none' }, showArea: Boolean, empty: String },
    computed: {
      groups() {
        const tasks = [...this.tasks].sort(prioCmp);
        if (this.groupBy === 'status') {
          return S.statusList().map(st => ({ key: st.id, label: st.name, color: st.color, tasks: tasks.filter(t => S.status(t.statusId).id === st.id) }))
            .filter(g => g.tasks.length);
        }
        if (this.groupBy === 'area') {
          const m = new Map();
          tasks.forEach(t => { if (!m.has(t.areaId)) m.set(t.areaId, []); m.get(t.areaId).push(t); });
          return [...m.entries()].map(([id, ts]) => ({ key: id, label: S.pathLabel(id), color: (S.area(id) || {}).color || '', tasks: ts, area: true }))
            .sort((a, b) => a.label.localeCompare(b.label, 'de'));
        }
        return [{ key: 'all', label: '', tasks }];
      }
    },
    template: `
<div class="task-list">
  <div v-if="!tasks.length" class="empty"><p>{{ empty || 'Keine Aufgaben.' }}</p></div>
  <section v-else v-for="g in groups" :key="g.key" class="group">
    <div v-if="g.label" class="group-head">
      <span v-if="g.area" class="area-dot" :style="{ background: g.color || 'var(--faint)' }"></span>
      <span v-else class="led" :style="{ '--c': g.color }"></span>
      {{ g.label }}<span class="n">{{ g.tasks.length }}</span>
    </div>
    <div class="rows"><task-row v-for="t in g.tasks" :key="t.id" :task="t" :show-area="showArea && groupBy !== 'area'" :show-status="groupBy !== 'status'"/></div>
  </section>
</div>`
  };

  const BoardView = {
    props: { tasks: Array, showArea: Boolean },
    data() { return { over: null }; },
    computed: {
      columns() {
        return S.statusList().filter(s => ui.showClosed || s.category !== 'closed')
          .map(st => ({ st, tasks: this.tasks.filter(t => S.status(t.statusId).id === st.id).sort(prioCmp) }));
      }
    },
    methods: {
      onOver(e, id) { if (drag.type !== 'task') return; e.preventDefault(); this.over = id; },
      drop(st) {
        this.over = null;
        if (drag.type !== 'task') return;
        const t = S.task(drag.id);
        endDrag();
        if (t) requestStatus(t, st.id);
      }
    },
    template: `
<div class="board">
  <div v-for="c in columns" :key="c.st.id" :class="['col', { drop: over === c.st.id }]"
    @dragover="onOver($event, c.st.id)" @dragleave="over = null" @drop.prevent="drop(c.st)">
    <div class="col-head"><span class="led" :style="{ '--c': c.st.color }"></span>{{ c.st.name }}<span class="n">{{ c.tasks.length }}</span></div>
    <task-row v-for="t in c.tasks" :key="t.id" :task="t" variant="card" :show-area="showArea" :show-status="false"/>
    <div v-if="!c.tasks.length" class="col-empty">leer</div>
  </div>
</div>`
  };

  const QuickAdd = {
    data() { return { text: '', focus: false }; },
    computed: {
      defaultArea() { return ui.view === 'area' && S.area(ui.areaId) ? ui.areaId : 'inbox'; },
      parsed() { return this.text.trim() ? U.parseQuick(this.text, S.findArea) : null; },
      targetArea() { return (this.parsed && this.parsed.areaId) || this.defaultArea; },
      targetColor() { return (S.area(this.targetArea) || {}).color || 'var(--faint)'; },
      implicitDue() { return ui.view === 'today' && this.parsed && !this.parsed.due ? today.value : null; }
    },
    methods: {
      submit() {
        const p = this.parsed;
        if (!p || !p.title) return;
        const t = S.createTask({
          title: p.title, areaId: this.targetArea, priority: p.priority, due: p.due || this.implicitDue,
          tags: p.tags, links: p.links, flagged: ui.view === 'flagged'
        });
        this.text = '';
        const here = ui.view !== 'area' || [ui.areaId].concat(ui.includeSub ? S.descendants(ui.areaId) : []).includes(t.areaId);
        toast(here ? 'Aufgabe angelegt' : `Angelegt in ${S.pathLabel(t.areaId)}`, {
          label: 'Öffnen',
          fn: () => { if (!here) go('area', t.areaId); selectTask(t.id); }
        });
      }
    },
    template: `
<div class="quick-wrap">
  <form class="quick" @submit.prevent="submit">
    <icon name="plus" class="quick-ico"/>
    <input id="quick-input" v-model="text" @focus="focus = true" @blur="focus = false" placeholder="Neue Aufgabe" autocomplete="off" enterkeyhint="done" aria-label="Neue Aufgabe">
    <button class="btn primary sm" :disabled="!parsed || !parsed.title">Anlegen</button>
  </form>
  <div v-if="parsed" class="preview">
    <span class="chip"><span class="area-dot" :style="{ background: targetColor }"></span>{{ S.pathLabel(targetArea) }}</span>
    <span v-if="parsed.areaToken && !parsed.areaId" class="chip warn">#{{ parsed.areaToken }} nicht gefunden</span>
    <span v-if="parsed.priority" class="chip"><span :class="['prio', 'p' + parsed.priority]">P{{ parsed.priority }}</span></span>
    <span v-if="parsed.due || implicitDue" class="chip"><icon name="calendar" :size="13"/>{{ U.fmtDate(parsed.due || implicitDue) }}</span>
    <span v-for="tg in parsed.tags" :key="tg" class="chip tag">+{{ tg }}</span>
    <span v-for="l in parsed.links" :key="l.id" class="chip"><icon name="link" :size="13"/>{{ U.linkShort(l) }}</span>
  </div>
  <div v-else-if="focus" class="quick-hint">
    <span><code>#bereich</code> zuordnen</span>
    <span><code>!1</code> bis <code>!4</code> Priorität</span>
    <span><code>@morgen</code> <code>@fr</code> <code>@14.10.</code> fällig</span>
    <span><code>+tag</code> Tag</span>
    <span>URL oder Netzwerkpfad wird zum Link</span>
  </div>
</div>`
  };

  const LinksEditor = {
    props: { owner: Object, kind: String },
    data() { return { form: null }; },
    methods: {
      href(l) { return U.linkHref(l); },
      startAdd() {
        this.form = { id: null, target: '', label: '', kind: 'url', auto: true };
        nextTick(() => this.$refs.target && this.$refs.target.focus());
      },
      edit(l) {
        this.form = { id: l.id, target: l.target, label: l.label, kind: l.kind, auto: false };
        nextTick(() => this.$refs.target && this.$refs.target.focus());
      },
      onTarget() { if (this.form.auto) this.form.kind = U.detectKind(this.form.target); },
      save() {
        const f = this.form;
        if (!f.target.trim()) return;
        if (f.id) S.updateLink(this.kind, this.owner.id, f.id, { target: f.target.trim(), label: f.label.trim(), kind: f.kind });
        else S.addLink(this.kind, this.owner.id, f);
        this.form = null;
      },
      remove(l) {
        S.removeLink(this.kind, this.owner.id, l.id);
        toast('Link entfernt', { label: 'Rückgängig', fn: () => S.addLink(this.kind, this.owner.id, l) });
      },
      async copy(l) { toast((await U.copy(l.target)) ? 'Kopiert: ' + U.short(l.target, 44) : 'Kopieren nicht möglich'); }
    },
    template: `
<div class="links-ed">
  <div class="sec-head"><h4>Links</h4><button v-if="!form" class="btn ghost sm" @click="startAdd"><icon name="plus" :size="14"/>Link</button></div>
  <ul v-if="owner.links.length" class="link-list">
    <li v-for="l in owner.links" :key="l.id" class="link-item">
      <span :class="['kind', 'k-' + l.kind]">{{ U.kindLabel(l.kind) }}</span>
      <div class="link-body">
        <a v-if="href(l)" :href="href(l)" target="_blank" rel="noopener" class="link-label">{{ l.label || U.linkShort(l) }}</a>
        <button v-else class="link-label as-text" @click="copy(l)" title="Kopieren">{{ l.label || l.target }}</button>
        <span v-if="l.label" class="link-target">{{ l.target }}</span>
      </div>
      <button class="icon-btn sm" @click="copy(l)" title="Kopieren" aria-label="Kopieren"><icon name="copy" :size="14"/></button>
      <button class="icon-btn sm" @click="edit(l)" title="Bearbeiten" aria-label="Bearbeiten"><icon name="edit" :size="14"/></button>
      <button class="icon-btn sm" @click="remove(l)" title="Entfernen" aria-label="Entfernen"><icon name="x" :size="14"/></button>
    </li>
  </ul>
  <p v-else-if="!form" class="empty-line">Noch keine Links. Webseiten, Netzwerkpfade, Repos, Tickets oder Server-Adressen.</p>
  <form v-if="form" class="link-form" @submit.prevent="save">
    <input ref="target" class="input" v-model="form.target" @input="onTarget" placeholder="https://…, \\\\server\\ordner oder server:port" required aria-label="Ziel">
    <div class="link-form-row">
      <input class="input" v-model="form.label" placeholder="Bezeichnung (optional)" aria-label="Bezeichnung">
      <select class="input" v-model="form.kind" @change="form.auto = false" aria-label="Typ"><option v-for="k in U.LINK_KINDS" :key="k.id" :value="k.id">{{ k.label }}</option></select>
    </div>
    <div class="form-actions"><button type="button" class="btn ghost sm" @click="form = null">Abbrechen</button><button class="btn primary sm">{{ form.id ? 'Speichern' : 'Link hinzufügen' }}</button></div>
  </form>
</div>`
  };

  const NotesEditor = {
    props: { owner: Object, kind: String },
    data() { return { draft: '', editId: null, editText: '' }; },
    computed: {
      sorted() { return [...this.owner.notes].sort((a, b) => (Number(!!b.pinned) - Number(!!a.pinned)) || (b.createdAt - a.createdAt)); }
    },
    methods: {
      add() { if (S.addNote(this.kind, this.owner.id, this.draft)) this.draft = ''; },
      pin(n) { S.updateNote(this.kind, this.owner.id, n.id, { pinned: !n.pinned }); },
      startEdit(n) { this.editId = n.id; this.editText = n.text; },
      saveEdit(n) {
        const v = this.editText.trim();
        if (v && v !== n.text) S.updateNote(this.kind, this.owner.id, n.id, { text: v, editedAt: Date.now() });
        this.editId = null;
      },
      remove(n) {
        const r = S.removeNote(this.kind, this.owner.id, n.id);
        toast('Vermerk gelöscht', { label: 'Rückgängig', fn: () => S.restoreNote(this.kind, this.owner.id, r) });
      }
    },
    template: `
<div class="notes-ed">
  <div class="sec-head"><h4>Vermerke</h4><span v-if="owner.notes.length" class="muted small">{{ owner.notes.length }}</span></div>
  <div class="note-add">
    <textarea v-autosize class="input" rows="2" v-model="draft" placeholder="Neuer Vermerk, z. B. Telefonat, Zwischenstand, Entscheidung" @keydown.ctrl.enter.prevent="add" @keydown.meta.enter.prevent="add" aria-label="Neuer Vermerk"></textarea>
    <div class="form-actions"><span class="muted small hide-sm">Strg + Enter speichert</span><button class="btn sm" :disabled="!draft.trim()" @click="add">Vermerk speichern</button></div>
  </div>
  <ul v-if="sorted.length" class="note-list">
    <li v-for="n in sorted" :key="n.id" :class="['note', { pinned: n.pinned, system: n.system }]">
      <div class="note-meta">
        <span>{{ U.fmtDateTime(n.createdAt) }}</span>
        <span v-if="n.system" class="badge">automatisch</span>
        <span v-if="n.pinned" class="badge pin">angeheftet</span>
        <span class="spacer"></span>
        <button class="icon-btn sm" @click="pin(n)" :title="n.pinned ? 'Lösen' : 'Anheften'" :aria-label="n.pinned ? 'Lösen' : 'Anheften'"><icon name="pin" :size="14"/></button>
        <button class="icon-btn sm" @click="startEdit(n)" title="Bearbeiten" aria-label="Bearbeiten"><icon name="edit" :size="14"/></button>
        <button class="icon-btn sm" @click="remove(n)" title="Löschen" aria-label="Löschen"><icon name="trash" :size="14"/></button>
      </div>
      <div v-if="editId === n.id" class="note-edit">
        <textarea v-autosize class="input" v-model="editText" @keydown.ctrl.enter.prevent="saveEdit(n)" @keydown.meta.enter.prevent="saveEdit(n)" aria-label="Vermerk bearbeiten"></textarea>
        <div class="form-actions"><button class="btn ghost sm" @click="editId = null">Abbrechen</button><button class="btn primary sm" @click="saveEdit(n)">Speichern</button></div>
      </div>
      <div v-else class="note-text" v-html="U.linkify(n.text)"></div>
    </li>
  </ul>
</div>`
  };

  const AreaBrief = {
    props: { area: Object },
    data() { return { name: '', desc: '' }; },
    watch: {
      'area.id': { immediate: true, handler() { this.name = this.area.name; this.desc = this.area.description || ''; } },
      'area.name'(v) { if (document.activeElement !== this.$refs.name) this.name = v; },
      'area.description'(v) { if (document.activeElement !== this.$refs.desc) this.desc = v || ''; }
    },
    computed: {
      isInbox() { return this.area.id === 'inbox'; },
      crumbs() { return S.path(this.area.id).slice(0, -1); },
      kids() { return S.children(this.area.id); },
      pinned() { return this.area.notes.filter(n => n.pinned); },
      menuOpen() { return ui.menu === 'area'; },
      parentOptions() {
        return S.areaTree().filter(o => o.id !== 'inbox')
          .map(o => ({ id: o.id, label: '   '.repeat(o.depth) + o.name, disabled: !S.canMoveArea(this.area.id, o.id) }));
      }
    },
    methods: {
      commitName() {
        const v = this.name.trim();
        if (v && v !== this.area.name) S.updateArea(this.area.id, { name: v });
        else this.name = this.area.name;
      },
      commitDesc() { if (this.desc !== (this.area.description || '')) S.updateArea(this.area.id, { description: this.desc }); },
      setColor(c) { S.updateArea(this.area.id, { color: c }); },
      moveTo(pid) {
        if (S.moveArea(this.area.id, pid || null)) toast(pid ? `Liegt jetzt in ${S.pathLabel(pid)}` : 'Liegt jetzt auf oberster Ebene');
        else toast('Ein Bereich kann nicht in seinem eigenen Unterbereich liegen.');
      },
      addSub() { ui.menu = null; ui.areaDialog = { name: '', parentId: this.isInbox ? null : this.area.id }; },
      archive() {
        ui.menu = null;
        const a = !this.area.archived;
        S.updateArea(this.area.id, { archived: a });
        if (a) { toast('Archiviert. Wiederherstellen unter Einstellungen.'); go('today'); } else toast('Bereich wiederhergestellt');
      },
      remove() {
        ui.menu = null;
        const u = S.areaUsage(this.area.id);
        if (u.tasks || u.children) {
          alert(`„${this.area.name}“ enthält noch ${u.tasks} Aufgaben und ${u.children} Unterbereiche. Verschiebe sie zuerst oder archiviere den Bereich.`);
          return;
        }
        if (!confirm(`Bereich „${this.area.name}“ löschen?`)) return;
        const parent = this.area.parentId;
        S.deleteArea(this.area.id);
        if (parent) go('area', parent); else go('today');
        toast('Bereich gelöscht');
      },
      openLink(l) {
        const h = U.linkHref(l);
        if (h) window.open(h, '_blank', 'noopener');
        else U.copy(l.target).then(ok => toast(ok ? 'Kopiert: ' + U.short(l.target, 44) : 'Kopieren nicht möglich'));
      },
      stat(id) { return (areaStats.value[id] || {}).open || 0; }
    },
    template: `
<section class="brief">
  <nav v-if="crumbs.length" class="crumb-line" aria-label="Pfad"><a v-for="c in crumbs" :key="c.id" href="#" @click.prevent="go('area', c.id)">{{ c.name }}</a></nav>
  <div v-if="area.archived" class="banner">Dieser Bereich ist archiviert. <button class="btn sm" @click="archive">Wiederherstellen</button></div>
  <div class="brief-head">
    <span class="area-swatch" :style="{ background: area.color || 'var(--faint)' }"></span>
    <h1 v-if="isInbox" class="brief-title">Eingang</h1>
    <input v-else ref="name" class="brief-title" v-model="name" @blur="commitName" @keydown.enter="$event.target.blur()" aria-label="Name des Bereichs">
    <div class="menu-anchor">
      <button class="icon-btn" @click.stop="ui.menu = menuOpen ? null : 'area'" title="Bereich bearbeiten" aria-label="Bereich bearbeiten"><icon name="more"/></button>
      <div v-if="menuOpen" class="menu" @click.stop>
        <template v-if="!isInbox">
          <div class="menu-label">Farbe</div>
          <div class="swatches">
            <button v-for="c in S.AREA_COLORS" :key="c" :class="['swatch', { on: area.color === c }]" :style="{ background: c }" @click="setColor(c)" :aria-label="'Farbe ' + c"></button>
            <button :class="['swatch', 'none', { on: !area.color }]" @click="setColor('')" aria-label="Keine Farbe"></button>
          </div>
          <label class="menu-field">Liegt in
            <select class="input" :value="area.parentId || ''" @change="moveTo($event.target.value)">
              <option value="">Oberste Ebene</option>
              <option v-for="o in parentOptions" :key="o.id" :value="o.id" :disabled="o.disabled">{{ o.label }}</option>
            </select>
          </label>
        </template>
        <button class="menu-item" @click="addSub"><icon name="plus"/>{{ isInbox ? 'Neuer Bereich' : 'Unterbereich anlegen' }}</button>
        <template v-if="!isInbox">
          <button class="menu-item" @click="archive"><icon name="archive"/>{{ area.archived ? 'Wiederherstellen' : 'Archivieren' }}</button>
          <button class="menu-item danger" @click="remove"><icon name="trash"/>Löschen</button>
        </template>
      </div>
    </div>
  </div>
  <textarea ref="desc" v-autosize class="brief-desc" rows="1" v-model="desc" @blur="commitDesc" aria-label="Beschreibung des Bereichs"
    :placeholder="isInbox ? 'Hier landet alles, was noch keinen Bereich hat.' : 'Wofür ist dieser Bereich da? Ziel, Ansprechpartner, Besonderheiten'"></textarea>
  <div v-if="pinned.length" class="pinned-notes"><div v-for="n in pinned" :key="n.id" class="pin-card" v-html="U.linkify(n.text)"></div></div>
  <div v-if="area.links.length" class="brief-row">
    <button v-for="l in area.links" :key="l.id" class="chip link-chip" @click="openLink(l)" :title="l.target">
      <span :class="['kind', 'k-' + l.kind]">{{ U.kindLabel(l.kind) }}</span><span class="ellipsis">{{ l.label || U.linkShort(l) }}</span>
    </button>
  </div>
  <div v-if="!isInbox" class="brief-row">
    <button v-for="k in kids" :key="k.id" class="chip" @click="go('area', k.id)"><span class="area-dot" :style="{ background: k.color || 'var(--faint)' }"></span>{{ k.name }}<span v-if="stat(k.id)" class="count">{{ stat(k.id) }}</span></button>
    <button class="chip ghost" @click="addSub"><icon name="plus" :size="13"/>Unterbereich</button>
  </div>
  <details class="brief-more">
    <summary><icon name="chev-right" :size="14" class="sum-chev"/>Steckbrief bearbeiten<span class="muted">{{ area.links.length }} {{ area.links.length === 1 ? 'Link' : 'Links' }}, {{ area.notes.length }} {{ area.notes.length === 1 ? 'Vermerk' : 'Vermerke' }}</span></summary>
    <div class="inner"><links-editor kind="area" :owner="area"/><notes-editor kind="area" :owner="area"/></div>
  </details>
</section>`
  };

  const TaskDetail = {
    props: { task: Object },
    data() { return { title: '', desc: '', newCheck: '', newSub: '', tagInput: '', showHistory: false }; },
    watch: {
      'task.id': {
        immediate: true,
        handler(id, oldId) {
          if (oldId) { clearTimeout(this._descTimer); this.commitTitle(oldId); this.commitDesc(oldId); }
          this.title = this.task.title;
          this.desc = this.task.description || '';
          this.newCheck = ''; this.newSub = ''; this.tagInput = ''; this.showHistory = false;
        }
      },
      'task.title'(v) { if (document.activeElement !== this.$refs.title) this.title = v; },
      'task.description'(v) { if (document.activeElement !== this.$refs.desc) this.desc = v || ''; }
    },
    beforeUnmount() { clearTimeout(this._descTimer); this.commitTitle(); this.commitDesc(); },
    computed: {
      status() { return S.status(this.task.statusId); },
      statuses() { return S.statusList(); },
      areaOptions() { return S.areaTree().map(o => ({ id: o.id, label: '   '.repeat(o.depth) + o.name })); },
      crumbs() { return S.path(this.task.areaId); },
      parent() { return this.task.parentId ? S.task(this.task.parentId) : null; },
      subs() { return (subMap.value[this.task.id] || []).slice().sort((a, b) => a.createdAt - b.createdAt); },
      subsDone() { return this.subs.filter(s => S.isClosed(s)).length; },
      checksDone() { return this.task.checklist.filter(c => c.done).length; },
      history() { return [...this.task.history].reverse(); },
      tagSuggestions() { return S.allTags().filter(t => !this.task.tags.includes(t)); },
      menuOpen() { return ui.menu === 'task'; }
    },
    methods: {
      commitTitle(id) {
        const tid = id || this.task.id;
        const t = S.task(tid);
        if (!t) return;
        const v = this.title.trim();
        if (v && v !== t.title) S.updateTask(tid, { title: v });
        else if (!v && tid === this.task.id) this.title = t.title;
      },
      commitDesc(id) {
        const tid = id || this.task.id;
        const t = S.task(tid);
        if (t && this.desc !== (t.description || '')) S.updateTask(tid, { description: this.desc });
      },
      onDescInput() {
        const tid = this.task.id;
        clearTimeout(this._descTimer);
        this._descTimer = setTimeout(() => this.commitDesc(tid), 800);
      },
      setPrio(p) { S.updateTask(this.task.id, { priority: this.task.priority === p ? null : p }); },
      setDate(field, v) { S.updateTask(this.task.id, { [field]: v || null }); },
      quickDate(field, n) { S.updateTask(this.task.id, { [field]: U.addDays(U.todayISO(), n) }); },
      moveTo(areaId) { if (S.moveTask(this.task.id, areaId)) toast('Verschoben nach ' + S.pathLabel(areaId)); },
      addTag() {
        const v = this.tagInput.trim().replace(/^\+/, '').toLowerCase().replace(/\s+/g, '-');
        if (v && !this.task.tags.includes(v)) S.updateTask(this.task.id, { tags: [...this.task.tags, v] });
        this.tagInput = '';
      },
      removeTag(tg) { S.updateTask(this.task.id, { tags: this.task.tags.filter(x => x !== tg) }); },
      addCheck() { S.addCheck(this.task.id, this.newCheck); this.newCheck = ''; },
      addSub() {
        const v = this.newSub.trim();
        if (!v) return;
        S.createTask({ title: v, areaId: this.task.areaId, parentId: this.task.id });
        this.newSub = '';
      },
      flag() { S.updateTask(this.task.id, { flagged: !this.task.flagged }); },
      trash() {
        ui.menu = null;
        const id = this.task.id;
        const ids = S.trashTask(id);
        ui.selectedTaskId = null;
        toast(ids.length > 1 ? `In den Papierkorb, mit ${ids.length - 1} Unteraufgaben` : 'In den Papierkorb verschoben', { label: 'Rückgängig', fn: () => S.restoreTask(id) });
      },
      restore() { S.restoreTask(this.task.id); toast('Wiederhergestellt'); },
      duplicate() {
        ui.menu = null;
        const c = S.duplicateTask(this.task.id);
        if (c) { ui.selectedTaskId = c.id; toast('Kopie angelegt'); }
      },
      close() { ui.selectedTaskId = null; },
      openCrumb(id) { const keep = this.task.id; go('area', id); ui.selectedTaskId = keep; },
      fieldLabel(f) { return ({ status: 'Status', areaId: 'Bereich', due: 'Fälligkeit', followUp: 'Wiedervorlage', priority: 'Priorität', parentId: 'Übergeordnete Aufgabe' })[f] || f; }
    },
    template: `
<aside class="detail" aria-label="Aufgabe">
  <header class="detail-head">
    <button class="icon-btn" @click="close" title="Schließen (Esc)" aria-label="Schließen"><icon name="back" class="only-mobile"/><icon name="x" class="only-desktop"/></button>
    <nav class="detail-path" aria-label="Bereich"><a v-for="c in crumbs" :key="c.id" href="#" @click.prevent="openCrumb(c.id)">{{ c.name }}</a></nav>
    <button :class="['icon-btn', 'star', { on: task.flagged }]" @click="flag" :title="task.flagged ? 'Markierung entfernen' : 'Markieren'" :aria-label="task.flagged ? 'Markierung entfernen' : 'Markieren'"><icon name="star"/></button>
    <div class="menu-anchor">
      <button class="icon-btn" @click.stop="ui.menu = menuOpen ? null : 'task'" title="Weitere Aktionen" aria-label="Weitere Aktionen"><icon name="more"/></button>
      <div v-if="menuOpen" class="menu" @click.stop>
        <button class="menu-item" @click="duplicate"><icon name="copy"/>Duplizieren</button>
        <button class="menu-item danger" @click="trash"><icon name="trash"/>In den Papierkorb</button>
      </div>
    </div>
  </header>
  <div v-if="task.trashedAt" class="banner">Liegt seit {{ U.fmtDateTime(task.trashedAt) }} im Papierkorb. <button class="btn sm" @click="restore">Wiederherstellen</button></div>
  <div class="detail-body">
    <div v-if="parent" class="parent-line"><icon name="subtask" :size="13"/>Unteraufgabe von <a href="#" @click.prevent="ui.selectedTaskId = parent.id">{{ parent.title }}</a></div>
    <textarea ref="title" v-autosize class="detail-title" rows="1" v-model="title" @blur="commitTitle()" @keydown.enter.prevent="$event.target.blur()" aria-label="Titel"></textarea>
    <div class="status-pills" role="radiogroup" aria-label="Status">
      <button v-for="s in statuses" :key="s.id" :class="['pill', { on: s.id === status.id }]" :style="{ '--c': s.color }" role="radio" :aria-checked="String(s.id === status.id)" @click="requestStatus(task, s.id)"><span class="led" :style="{ '--c': s.color }"></span>{{ s.name }}</button>
    </div>
    <div class="fields">
      <span class="lbl">Bereich</span>
      <select class="input" :value="task.areaId" @change="moveTo($event.target.value)" aria-label="Bereich"><option v-for="o in areaOptions" :key="o.id" :value="o.id">{{ o.label }}</option></select>
      <span class="lbl">Priorität</span>
      <div class="seg prio-seg" role="group" aria-label="Priorität"><button v-for="p in [1, 2, 3, 4]" :key="p" :class="{ on: task.priority === p }" @click="setPrio(p)">P{{ p }}</button></div>
      <span class="lbl">Fällig</span>
      <div class="date-row">
        <input type="date" class="input" :value="task.due || ''" @change="setDate('due', $event.target.value)" aria-label="Fällig am">
        <button class="btn ghost sm" @click="quickDate('due', 0)">Heute</button>
        <button class="btn ghost sm" @click="quickDate('due', 1)">Morgen</button>
        <button v-if="task.due" class="icon-btn sm" @click="setDate('due', null)" title="Entfernen" aria-label="Fälligkeit entfernen"><icon name="x" :size="14"/></button>
      </div>
      <span class="lbl">Wiedervorlage</span>
      <div class="date-row">
        <input type="date" class="input" :value="task.followUp || ''" @change="setDate('followUp', $event.target.value)" aria-label="Wiedervorlage am">
        <button class="btn ghost sm" @click="quickDate('followUp', 3)">+3 Tage</button>
        <button class="btn ghost sm" @click="quickDate('followUp', 7)">+1 Woche</button>
        <button v-if="task.followUp" class="icon-btn sm" @click="setDate('followUp', null)" title="Entfernen" aria-label="Wiedervorlage entfernen"><icon name="x" :size="14"/></button>
      </div>
      <span class="lbl">Tags</span>
      <div class="tag-edit">
        <span v-for="tg in task.tags" :key="tg" class="chip">+{{ tg }}<button class="chip-x" @click="removeTag(tg)" :aria-label="'Tag ' + tg + ' entfernen'"><icon name="x" :size="12"/></button></span>
        <input class="tag-input" v-model="tagInput" list="tag-suggestions" placeholder="Tag hinzufügen" @keydown.enter.prevent="addTag" @blur="addTag" aria-label="Tag hinzufügen">
        <datalist id="tag-suggestions"><option v-for="t in tagSuggestions" :key="t" :value="t"></option></datalist>
      </div>
    </div>
    <div>
      <div class="sec-head"><h4>Beschreibung</h4></div>
      <textarea ref="desc" v-autosize class="desc-box" v-model="desc" @input="onDescInput" @blur="commitDesc()" placeholder="Was ist zu tun? Aktueller Stand, Vorgehen, Kontext" aria-label="Beschreibung"></textarea>
    </div>
    <div>
      <div class="sec-head"><h4>Checkliste</h4><span v-if="task.checklist.length" class="muted small">{{ checksDone }}/{{ task.checklist.length }}</span></div>
      <ul v-if="task.checklist.length" class="check-list">
        <li v-for="c in task.checklist" :key="c.id" :class="['check-item', { done: c.done }]">
          <input type="checkbox" :checked="c.done" @change="S.updateCheck(task.id, c.id, { done: $event.target.checked })" :aria-label="c.text">
          <input class="txt" :value="c.text" @change="S.updateCheck(task.id, c.id, { text: $event.target.value })" aria-label="Punkt">
          <button class="icon-btn sm" @click="S.removeCheck(task.id, c.id)" title="Entfernen" aria-label="Punkt entfernen"><icon name="x" :size="14"/></button>
        </li>
      </ul>
      <form class="add-line" @submit.prevent="addCheck"><input class="input" v-model="newCheck" placeholder="Punkt hinzufügen" aria-label="Punkt hinzufügen"><button class="btn sm" :disabled="!newCheck.trim()">Hinzufügen</button></form>
    </div>
    <div>
      <div class="sec-head"><h4>Unteraufgaben</h4><span v-if="subs.length" class="muted small">{{ subsDone }}/{{ subs.length }}</span></div>
      <div v-if="subs.length" class="rows"><task-row v-for="s in subs" :key="s.id" :task="s" hide-parent/></div>
      <form class="add-line" @submit.prevent="addSub"><input class="input" v-model="newSub" placeholder="Unteraufgabe anlegen" aria-label="Unteraufgabe anlegen"><button class="btn sm" :disabled="!newSub.trim()">Anlegen</button></form>
    </div>
    <links-editor kind="task" :owner="task"/>
    <notes-editor kind="task" :owner="task"/>
    <div class="history-box">
      <button class="btn ghost sm" @click="showHistory = !showHistory" :aria-expanded="String(showHistory)"><icon :name="showHistory ? 'chev-down' : 'chev-right'" :size="14"/>Verlauf ({{ task.history.length }})</button>
      <ul v-if="showHistory" class="history">
        <li v-for="(h, i) in history" :key="i"><span class="h-at">{{ U.fmtDateTime(h.at) }}</span>
          <template v-if="h.field === 'created'">Angelegt: {{ h.to }}</template>
          <template v-else>{{ fieldLabel(h.field) }}: {{ h.from }} → {{ h.to }}</template>
        </li>
      </ul>
    </div>
    <p class="detail-foot">Angelegt {{ U.fmtDateTime(task.createdAt) }}<template v-if="task.completedAt">, abgeschlossen {{ U.fmtDateTime(task.completedAt) }}</template></p>
  </div>
</aside>`
  };

  const StatusPrompt = {
    computed: {
      p() { return ui.prompt; },
      st() { return S.status(ui.prompt.statusId); },
      task() { return S.task(ui.prompt.taskId); },
      waiting() { return this.st.require === 'waiting'; },
      valid() { return this.p.note.trim().length > 0 && (!this.waiting || !!this.p.followUp); }
    },
    mounted() { nextTick(() => this.$refs.note && this.$refs.note.focus()); },
    methods: {
      ok() {
        if (!this.valid || !this.task) return;
        S.setStatus(this.task.id, this.st.id, { note: this.p.note, followUp: this.waiting ? this.p.followUp : undefined });
        ui.prompt = null;
      },
      cancel() { ui.prompt = null; }
    },
    template: `
<div class="modal-back" @click.self="cancel">
  <form class="modal" role="dialog" aria-modal="true" aria-labelledby="prompt-title" @submit.prevent="ok">
    <h3 id="prompt-title"><span class="led" :style="{ '--c': st.color }"></span>{{ waiting ? 'Worauf oder auf wen wartest du?' : 'Grund für „' + st.name + '“' }}</h3>
    <p class="muted modal-sub">{{ task ? task.title : '' }}</p>
    <textarea ref="note" v-autosize class="input" rows="3" v-model="p.note" @keydown.ctrl.enter.prevent="ok" @keydown.meta.enter.prevent="ok" aria-label="Grund"
      :placeholder="waiting ? 'z. B. Rückmeldung vom Lieferanten zur Preisliste' : 'z. B. API-Zugang fehlt noch'"></textarea>
    <label v-if="waiting" class="field"><span>Wiedervorlage am</span><input type="date" class="input" v-model="p.followUp" required></label>
    <p class="hint">Wird als Vermerk an der Aufgabe gespeichert.</p>
    <div class="modal-actions"><button type="button" class="btn ghost" @click="cancel">Abbrechen</button><button class="btn primary" :disabled="!valid">Status setzen</button></div>
  </form>
</div>`
  };

  const AreaDialog = {
    computed: {
      d() { return ui.areaDialog; },
      options() { return S.areaTree().filter(o => o.id !== 'inbox').map(o => ({ id: o.id, label: '   '.repeat(o.depth) + o.name })); }
    },
    mounted() { nextTick(() => this.$refs.name && this.$refs.name.focus()); },
    methods: {
      ok() {
        const name = this.d.name.trim();
        if (!name) return;
        const a = S.createArea({ name, parentId: this.d.parentId || null });
        ui.areaDialog = null;
        if (a.parentId) delete ui.collapsed[a.parentId];
        go('area', a.id);
      },
      cancel() { ui.areaDialog = null; }
    },
    template: `
<div class="modal-back" @click.self="cancel">
  <form class="modal" role="dialog" aria-modal="true" aria-labelledby="area-dialog-title" @submit.prevent="ok">
    <h3 id="area-dialog-title">{{ d.parentId ? 'Neuer Unterbereich' : 'Neuer Bereich' }}</h3>
    <label class="field"><span>Name</span><input ref="name" class="input" v-model="d.name" placeholder="z. B. Preisspion" required></label>
    <label class="field"><span>Liegt in</span>
      <select class="input" v-model="d.parentId"><option :value="null">Oberste Ebene</option><option v-for="o in options" :key="o.id" :value="o.id">{{ o.label }}</option></select>
    </label>
    <div class="modal-actions"><button type="button" class="btn ghost" @click="cancel">Abbrechen</button><button class="btn primary" :disabled="!d.name.trim()">Bereich anlegen</button></div>
  </form>
</div>`
  };

  const TodayView = {
    computed: {
      data() { return todayData.value; },
      anything() { return this.data.sections.some(s => s.tasks.length); }
    },
    template: `
<div>
  <div v-if="!anything" class="empty">
    <h3>Für heute steht nichts an.</h3>
    <p>Hier erscheinen überfällige und heute fällige Aufgaben, fällige Wiedervorlagen und alles, was in Arbeit ist. Was du oben einträgst, ist für heute fällig.</p>
  </div>
  <section v-for="s in data.sections" :key="s.key" v-show="s.tasks.length" class="group">
    <div :class="['group-head', s.tone]">{{ s.label }}<span class="n">{{ s.tasks.length }}</span></div>
    <div class="rows"><task-row v-for="t in s.tasks" :key="t.id" :task="t" show-area/></div>
  </section>
</div>`
  };

  const SearchView = {
    computed: {
      q() { return ui.search.trim(); },
      areas() { return this.q ? S.searchAreas(this.q) : []; },
      tasks() { return this.q ? S.searchTasks(this.q).sort(prioCmp) : []; }
    },
    template: `
<div>
  <div v-if="!q" class="empty"><p>Durchsucht Titel, Beschreibungen, Vermerke, Checklisten, Tags sowie Bezeichnung und Ziel von Links. Eine IP oder ein Repo-Name findet die Aufgabe, an der er hängt.</p></div>
  <template v-else>
    <section v-if="areas.length" class="group">
      <div class="group-head">Bereiche<span class="n">{{ areas.length }}</span></div>
      <div class="brief-row"><button v-for="a in areas" :key="a.id" class="chip" @click="go('area', a.id)"><span class="area-dot" :style="{ background: a.color || 'var(--faint)' }"></span>{{ S.pathLabel(a.id) }}</button></div>
    </section>
    <section class="group">
      <div class="group-head">Aufgaben<span class="n">{{ tasks.length }}</span></div>
      <div v-if="tasks.length" class="rows"><task-row v-for="t in tasks" :key="t.id" :task="t" show-area/></div>
      <p v-else class="empty-line">Keine Aufgabe enthält „{{ q }}“.</p>
    </section>
  </template>
</div>`
  };

  const TrashView = {
    computed: { list() { return S.trashList(); } },
    methods: {
      restore(t) { S.restoreTask(t.id); toast('Wiederhergestellt'); },
      purge(t) { if (confirm(`„${U.short(t.title, 60)}“ endgültig löschen?`)) S.purgeTask(t.id); },
      empty() { if (confirm(`${this.list.length} Aufgaben endgültig löschen?`)) toast(`${S.emptyTrash()} Aufgaben gelöscht`); }
    },
    template: `
<div>
  <p class="hint">Gelöschte Aufgaben bleiben {{ S.TRASH_DAYS }} Tage hier und werden danach automatisch entfernt.</p>
  <div v-if="!list.length" class="empty"><h3>Der Papierkorb ist leer.</h3></div>
  <template v-else>
    <div class="toolbar"><button class="btn danger sm" @click="empty"><icon name="trash" :size="14"/>Papierkorb leeren</button></div>
    <div class="rows">
      <div v-for="t in list" :key="t.id" class="trash-row">
        <div class="task-main">
          <div class="task-title">{{ t.title || 'Ohne Titel' }}</div>
          <div class="task-meta"><span>{{ S.pathLabel(t.areaId) }}</span><span>gelöscht {{ U.fmtDateTime(t.trashedAt) }}</span></div>
        </div>
        <button class="btn sm" @click="restore(t)"><icon name="restore" :size="14"/>Wiederherstellen</button>
        <button class="icon-btn sm" @click="purge(t)" title="Endgültig löschen" aria-label="Endgültig löschen"><icon name="x" :size="14"/></button>
      </div>
    </div>
  </template>
</div>`
  };

  const SettingsView = {
    data() { return { email: '', password: '', authMsg: '', authBusy: false, del: null }; },
    computed: {
      statuses() { return S.statusList(); },
      archived() { return S.areaList().filter(a => a.archived); },
      session() { return S.meta.session; },
      dirty() { return S.dirtyCount(); },
      settings() { return S.settings(); },
      themes() { return [{ id: 'system', label: 'Wie System' }, { id: 'light', label: 'Hell' }, { id: 'dark', label: 'Dunkel' }]; }
    },
    methods: {
      async auth(mode) {
        this.authMsg = '';
        this.authBusy = true;
        try {
          if (mode === 'in') {
            await Y.signIn(this.email, this.password);
            this.password = '';
            toast(Y.state.error ? 'Angemeldet, Abgleich fehlgeschlagen' : 'Angemeldet und abgeglichen');
          } else {
            const r = await Y.signUp(this.email, this.password);
            this.password = '';
            if (r === 'confirm') this.authMsg = 'Konto angelegt. Bitte den Link in der Bestätigungs-Mail öffnen und dich danach anmelden.';
            else toast('Konto angelegt und angemeldet');
          }
        } catch (e) {
          this.authMsg = e.message;
        } finally {
          this.authBusy = false;
        }
      },
      async signOut() {
        if (!confirm('Abmelden? Die Daten bleiben in diesem Browser, werden aber nicht mehr abgeglichen.')) return;
        await Y.signOut();
        toast('Abgemeldet');
      },
      syncNow() { Y.sync().then(() => { if (!Y.state.error) toast('Abgeglichen'); }); },
      upd(s, patch) { S.updateStatus(s.id, patch); },
      askDelete(s) {
        if (this.statuses.length <= 1) { toast('Mindestens ein Status muss bleiben.'); return; }
        const others = this.statuses.filter(x => x.id !== s.id);
        const rep = others.find(x => x.category === s.category) || others[0];
        this.del = { id: s.id, count: S.statusUsage(s.id), rep: rep.id };
      },
      confirmDelete() {
        const s = S.status(this.del.id);
        S.deleteStatus(this.del.id, this.del.rep);
        this.del = null;
        toast(`Status „${s.name}“ gelöscht`);
      },
      exportNow() { U.download(`todo-manager-${U.todayISO()}.json`, JSON.stringify(S.exportData(), null, 2)); },
      async importFile(e, mode) {
        const f = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!f) return;
        try {
          const data = JSON.parse(await U.readFile(f));
          if (mode === 'google') {
            const r = S.importGoogle(data);
            toast(`${r.tasks} Aufgaben importiert` + (r.areas ? `, ${r.areas} neue Bereiche` : ''));
          } else {
            if (mode === 'replace' && !confirm('Alle vorhandenen Bereiche und Aufgaben werden durch die Sicherung ersetzt. Fortfahren?')) return;
            const r = S.importData(data, mode);
            toast(`${r.tasks} Aufgaben eingespielt` + (r.areas ? `, ${r.areas} neue Bereiche` : ''));
          }
        } catch (err) {
          alert('Import fehlgeschlagen: ' + err.message);
        }
      },
      example() { const n = S.createExampleTree(); toast(n ? `${n} Bereiche angelegt` : 'Die Beispielstruktur ist schon vorhanden'); },
      restoreArea(a) { S.updateArea(a.id, { archived: false }); toast('Bereich wiederhergestellt'); }
    },
    template: `
<div class="settings">
  <section class="panel">
    <h2>Synchronisation</h2>
    <p v-if="!Y.configured" class="hint">Sync ist nicht eingerichtet, alle Daten liegen nur in diesem Browser. Für Desktop und Handy gemeinsam: Supabase-Projekt anlegen, <code>supabase/schema.sql</code> ausführen und URL und Anon-Key in <code>js/config.js</code> eintragen. Die README beschreibt jeden Schritt.</p>
    <template v-else-if="!session">
      <p class="hint">Melde dich an, um Bereiche und Aufgaben zwischen deinen Geräten abzugleichen. Was schon in diesem Browser liegt, wird dabei übertragen.</p>
      <form class="form-grid" @submit.prevent="auth('in')">
        <label class="field"><span>E-Mail</span><input class="input" type="email" v-model="email" autocomplete="username" required></label>
        <label class="field"><span>Passwort</span><input class="input" type="password" v-model="password" autocomplete="current-password" minlength="6" required></label>
        <div class="form-actions start">
          <button class="btn primary" :disabled="authBusy">Anmelden</button>
          <button type="button" class="btn" :disabled="authBusy || !email || password.length < 6" @click="auth('up')">Konto anlegen</button>
        </div>
        <p v-if="authMsg" class="msg">{{ authMsg }}</p>
      </form>
    </template>
    <template v-else>
      <p class="hint">Angemeldet als <strong>{{ session.user.email }}</strong>.</p>
      <p class="sync-state">
        <template v-if="Y.state.busy">Gleiche ab …</template>
        <span v-else-if="Y.state.error" class="err">{{ Y.state.error }}</span>
        <template v-else-if="S.meta.lastSync">Zuletzt abgeglichen {{ U.fmtDateTime(S.meta.lastSync) }}</template>
        <template v-if="dirty"> · {{ dirty }} Änderungen warten auf Übertragung</template>
      </p>
      <div class="form-actions start">
        <button class="btn" @click="syncNow" :disabled="Y.state.busy"><icon name="cloud" :size="14"/>Jetzt abgleichen</button>
        <button class="btn ghost" @click="signOut">Abmelden</button>
      </div>
    </template>
  </section>

  <section class="panel">
    <h2>Stati</h2>
    <p class="hint">Die Kategorie steuert Zähler und Ansichten: offen, aktiv und pausiert zählen als offen. Mit Pflichtangabe fragt die App beim Setzen nach einem Grund, bei „Grund und Wiedervorlage“ zusätzlich nach einem Datum.</p>
    <div class="status-edit head"><span></span><span>Name</span><span>Kategorie</span><span>Pflichtangabe</span><span></span></div>
    <div v-for="(s, i) in statuses" :key="s.id" class="status-edit">
      <input type="color" class="color-in" :value="s.color" @change="upd(s, { color: $event.target.value })" :aria-label="'Farbe für ' + s.name">
      <input class="input" :value="s.name" @change="upd(s, { name: $event.target.value.trim() || s.name })" aria-label="Name">
      <select class="input se-cat" :value="s.category" @change="upd(s, { category: $event.target.value })" aria-label="Kategorie"><option v-for="c in S.CATEGORIES" :key="c.id" :value="c.id">{{ c.label }}</option></select>
      <select class="input se-req" :value="s.require || ''" @change="upd(s, { require: $event.target.value || null })" aria-label="Pflichtangabe">
        <option value="">keine</option><option value="reason">Grund</option><option value="waiting">Grund und Wiedervorlage</option>
      </select>
      <div class="se-actions">
        <button class="icon-btn sm" :disabled="i === 0" @click="S.moveStatus(s.id, -1)" title="Nach oben" aria-label="Nach oben"><icon name="up" :size="14"/></button>
        <button class="icon-btn sm" :disabled="i === statuses.length - 1" @click="S.moveStatus(s.id, 1)" title="Nach unten" aria-label="Nach unten"><icon name="down" :size="14"/></button>
        <button class="icon-btn sm" @click="askDelete(s)" title="Löschen" aria-label="Löschen"><icon name="trash" :size="14"/></button>
      </div>
      <div v-if="del && del.id === s.id" class="se-delete">
        <template v-if="del.count">
          <span>{{ del.count }} {{ del.count === 1 ? 'Aufgabe hat' : 'Aufgaben haben' }} diesen Status und {{ del.count === 1 ? 'wechselt' : 'wechseln' }} zu</span>
          <select class="input" v-model="del.rep"><option v-for="o in statuses.filter(x => x.id !== s.id)" :key="o.id" :value="o.id">{{ o.name }}</option></select>
        </template>
        <span v-else>Status „{{ s.name }}“ löschen?</span>
        <button class="btn danger sm" @click="confirmDelete">Löschen</button>
        <button class="btn ghost sm" @click="del = null">Abbrechen</button>
      </div>
    </div>
    <div class="form-actions start wrap">
      <button class="btn sm" @click="S.createStatus()"><icon name="plus" :size="14"/>Status hinzufügen</button>
      <label class="field inline"><span>Neue Aufgaben starten mit</span>
        <select class="input" :value="settings.defaultStatus" @change="S.updateSettings({ defaultStatus: $event.target.value })"><option v-for="s in statuses.filter(x => x.category !== 'closed')" :key="s.id" :value="s.id">{{ s.name }}</option></select>
      </label>
    </div>
  </section>

  <section class="panel">
    <h2>Daten</h2>
    <p class="hint">Sicherungen sind JSON-Dateien mit allen Bereichen, Aufgaben und Stati.</p>
    <div class="data-actions">
      <div class="data-item"><div><strong>Sicherung herunterladen</strong><p>Speichert alles als Datei.</p></div><button class="btn" @click="exportNow"><icon name="download" :size="14"/>Herunterladen</button></div>
      <div class="data-item"><div><strong>Sicherung einspielen</strong><p>Ergänzt die vorhandenen Daten, gleiche Einträge werden überschrieben.</p></div><label class="btn"><icon name="upload" :size="14"/>Datei wählen<input type="file" accept=".json,application/json" hidden @change="importFile($event, 'merge')"></label></div>
      <div class="data-item"><div><strong>Alles durch Sicherung ersetzen</strong><p>Entfernt vorher alle Bereiche und Aufgaben.</p></div><label class="btn danger"><icon name="upload" :size="14"/>Datei wählen<input type="file" accept=".json,application/json" hidden @change="importFile($event, 'replace')"></label></div>
      <div class="data-item"><div><strong>Google Tasks importieren</strong><p>Auf takeout.google.com nur „Tasks“ auswählen, exportieren, das ZIP entpacken und <code>Tasks.json</code> wählen. Jede Liste wird ein Bereich, gleichnamige Bereiche werden weiterverwendet.</p></div><label class="btn"><icon name="upload" :size="14"/>Tasks.json wählen<input type="file" accept=".json,application/json" hidden @change="importFile($event, 'google')"></label></div>
      <div class="data-item"><div><strong>Beispielstruktur anlegen</strong><p>Preise, Shop, Daten &amp; Automation, Warenwirtschaft, Verwaltung und Sonstige mit Unterbereichen. Vorhandene Bereiche bleiben.</p></div><button class="btn" @click="example">Anlegen</button></div>
    </div>
  </section>

  <section class="panel">
    <h2>Darstellung</h2>
    <div class="seg" role="group" aria-label="Farbschema"><button v-for="o in themes" :key="o.id" :class="{ on: ui.theme === o.id }" @click="ui.theme = o.id">{{ o.label }}</button></div>
  </section>

  <section v-if="archived.length" class="panel">
    <h2>Archivierte Bereiche</h2>
    <ul class="plain-list">
      <li v-for="a in archived" :key="a.id"><span>{{ S.pathLabel(a.id) }}</span><span class="spacer"></span><button class="btn ghost sm" @click="go('area', a.id)">Ansehen</button><button class="btn sm" @click="restoreArea(a)">Wiederherstellen</button></li>
    </ul>
  </section>

  <section class="panel">
    <h2>Tastenkürzel</h2>
    <ul class="kbd-list">
      <li><kbd>N</kbd> neue Aufgabe</li>
      <li><kbd>/</kbd> suchen</li>
      <li><kbd>J</kbd> <kbd>K</kbd> nächste und vorige Aufgabe</li>
      <li><kbd>E</kbd> erledigt oder wieder offen</li>
      <li><kbd>F</kbd> markieren</li>
      <li><kbd>Esc</kbd> Details schließen</li>
    </ul>
  </section>
</div>`
  };

  /* ---------- Hauptkomponente ---------- */
  const App = {
    setup() {
      const dropTarget = ref(null);
      const selectedTask = computed(() => (ui.selectedTaskId ? S.task(ui.selectedTaskId) : null));
      const currentArea = computed(() => (ui.view === 'area' ? S.area(ui.areaId) : null));
      const rootAreas = computed(() => S.children(null));
      const listLike = computed(() => ['area', 'open', 'flagged'].includes(ui.view));
      const hasSubareas = computed(() => !!(currentArea.value && S.children(currentArea.value.id).length));
      const showQuick = computed(() => ['today', 'open', 'flagged'].includes(ui.view) || (ui.view === 'area' && currentArea.value && !S.isAreaArchived(currentArea.value.id)));
      const showAreaInRows = computed(() => ui.view !== 'area' || (ui.includeSub && hasSubareas.value));
      const tags = computed(() => S.allTags());

      const scopeTasks = computed(() => {
        let list = [];
        if (ui.view === 'area' && currentArea.value) {
          const archived = S.isAreaArchived(currentArea.value.id);
          const ids = new Set([ui.areaId].concat(ui.includeSub ? S.descendants(ui.areaId) : []));
          list = (archived ? S.taskList() : activeTasks.value).filter(t => ids.has(t.areaId) && !t.parentId);
        } else if (ui.view === 'open') list = activeTasks.value.filter(t => !t.parentId);
        else if (ui.view === 'flagged') list = activeTasks.value.filter(t => t.flagged);
        if (!ui.showClosed) list = list.filter(t => !S.isClosed(t));
        if (ui.prio) list = list.filter(t => t.priority === ui.prio);
        if (ui.tag) list = list.filter(t => t.tags.includes(ui.tag));
        return list;
      });

      const title = computed(() => {
        switch (ui.view) {
          case 'today': return 'Heute';
          case 'open': return 'Alle offenen';
          case 'flagged': return 'Markiert';
          case 'search': return 'Suche';
          case 'trash': return 'Papierkorb';
          case 'settings': return 'Einstellungen';
          case 'area': return currentArea.value ? S.pathLabel(currentArea.value.id) : '';
          default: return '';
        }
      });
      const pageHead = computed(() => {
        switch (ui.view) {
          case 'today': return { title: 'Heute', sub: new Date(today.value + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }) };
          case 'open': return { title: 'Alle offenen', sub: 'Offene Aufgaben aus allen Bereichen' };
          case 'flagged': return { title: 'Markiert', sub: 'Aufgaben mit Stern, über alle Bereiche' };
          case 'search': return { title: 'Suche', sub: ui.search.trim() ? `Treffer für „${ui.search.trim()}“` : '' };
          case 'trash': return { title: 'Papierkorb', sub: '' };
          case 'settings': return { title: 'Einstellungen', sub: '' };
          default: return null;
        }
      });
      const emptyText = computed(() => {
        if (ui.prio || ui.tag) return 'Kein Treffer für diesen Filter.';
        if (ui.view === 'flagged') return 'Nichts markiert. Der Stern an einer Aufgabe hebt sie hier hervor.';
        if (ui.view === 'open') return 'Keine offenen Aufgaben.';
        if (ui.areaId === 'inbox') return 'Der Eingang ist leer. Neue Aufgaben ohne Bereich landen hier.';
        return 'Keine offenen Aufgaben in diesem Bereich. Lege oben eine an.';
      });

      const syncLabel = computed(() => {
        if (!S.meta.session) return 'Sync: nicht angemeldet';
        if (Y.state.busy) return 'Gleiche ab …';
        if (Y.state.error) return 'Sync-Fehler, Details in Einstellungen';
        const n = S.dirtyCount();
        if (n) return `${n} Änderungen warten`;
        return S.meta.lastSync ? 'Abgeglichen ' + U.fmtTime(S.meta.lastSync) : 'Sync bereit';
      });
      const syncColor = computed(() => {
        if (!S.meta.session) return 'var(--faint)';
        if (Y.state.error) return '#E0524D';
        if (Y.state.busy || S.dirtyCount()) return '#E39B2D';
        return '#36A15A';
      });

      function onSearch() {
        if (ui.search.trim()) {
          if (ui.view !== 'search') { beforeSearch = { view: ui.view, areaId: ui.areaId }; ui.view = 'search'; ui.selectedTaskId = null; }
        } else if (ui.view === 'search') {
          const b = beforeSearch || { view: 'today' };
          go(b.view, b.areaId);
        }
      }
      function clearSearch(e) { ui.search = ''; onSearch(); e.target.blur(); }
      function newArea(parentId) { ui.areaDialog = { name: '', parentId: parentId || null }; }
      function example() { const n = S.createExampleTree(); toast(n ? `${n} Bereiche angelegt` : 'Die Beispielstruktur ist schon vorhanden'); }
      function runToast() { const a = ui.toast && ui.toast.action; ui.toast = null; if (a) a.fn(); }
      function onRootOver(e) { if (drag.type === 'area') { e.preventDefault(); dropTarget.value = 'root'; } }
      function onInboxOver(e) { if (drag.type === 'task') { e.preventDefault(); dropTarget.value = 'inbox'; } }
      function drop(areaId) { dropTarget.value = null; onDropArea(areaId); }

      return {
        ui, S, Y, counts, dropTarget, selectedTask, currentArea, rootAreas, listLike, hasSubareas, showQuick,
        showAreaInRows, tags, scopeTasks, title, pageHead, emptyText, syncLabel, syncColor,
        onSearch, clearSearch, newArea, example, runToast, onRootOver, onInboxOver, drop
      };
    },
    template: `
<div :class="['app', { 'has-detail': !!selectedTask, 'sidebar-open': ui.sidebarOpen }]" @click="ui.menu = null">
  <aside class="sidebar" aria-label="Navigation">
    <div class="brand"><span class="brand-mark" aria-hidden="true"></span>ToDo-Manager</div>
    <label class="side-search"><icon name="search"/>
      <input id="search-input" type="search" v-model="ui.search" @input="onSearch" @keydown.esc.stop="clearSearch" placeholder="Suchen" aria-label="Suchen" autocomplete="off">
    </label>
    <nav class="side-nav">
      <button :class="['nav-item', { active: ui.view === 'today' }]" @click="go('today')"><icon name="sun"/>Heute<span class="count">{{ counts.today || '' }}</span></button>
      <button :class="['nav-item', { active: ui.view === 'area' && ui.areaId === 'inbox', drop: dropTarget === 'inbox' }]" @click="go('area', 'inbox')"
        @dragover="onInboxOver" @dragleave="dropTarget = null" @drop.prevent="drop('inbox')"><icon name="inbox"/>Eingang<span class="count">{{ counts.inbox || '' }}</span></button>
      <button :class="['nav-item', { active: ui.view === 'flagged' }]" @click="go('flagged')"><icon name="star"/>Markiert<span class="count">{{ counts.flagged || '' }}</span></button>
      <button :class="['nav-item', { active: ui.view === 'open' }]" @click="go('open')"><icon name="layers"/>Alle offenen<span class="count">{{ counts.open || '' }}</span></button>
    </nav>
    <div :class="['side-head', { drop: dropTarget === 'root' }]" @dragover="onRootOver" @dragleave="dropTarget = null" @drop.prevent="drop(null)">
      <span>Bereiche</span>
      <button class="icon-btn sm" @click.stop="newArea(null)" title="Neuer Bereich" aria-label="Neuer Bereich"><icon name="plus"/></button>
    </div>
    <ul v-if="rootAreas.length" class="tree" role="tree" aria-label="Bereiche"><tree-node v-for="a in rootAreas" :key="a.id" :area="a" :depth="0"/></ul>
    <div v-else class="side-empty">
      <p>Noch keine Bereiche. Lege deinen ersten an oder übernimm die Struktur aus dem Konzept.</p>
      <button class="btn sm" @click="newArea(null)"><icon name="plus" :size="14"/>Bereich anlegen</button>
      <button class="btn ghost sm" @click="example">Beispielstruktur übernehmen</button>
    </div>
    <div class="side-foot">
      <button :class="['nav-item', { active: ui.view === 'trash' }]" @click="go('trash')"><icon name="trash"/>Papierkorb<span class="count">{{ counts.trash || '' }}</span></button>
      <button :class="['nav-item', { active: ui.view === 'settings' }]" @click="go('settings')"><icon name="settings"/>Einstellungen</button>
      <button v-if="Y.configured" class="sync-line" @click="go('settings')"><span class="led sm" :style="{ '--c': syncColor }"></span>{{ syncLabel }}</button>
      <div v-if="S.state.saveError" class="sync-line err">{{ S.state.saveError }}</div>
    </div>
  </aside>
  <div class="scrim" @click="ui.sidebarOpen = false"></div>
  <main class="main">
    <header class="topbar">
      <button class="icon-btn only-mobile" @click.stop="ui.sidebarOpen = true" aria-label="Menü öffnen"><icon name="menu"/></button>
      <div class="view-title">{{ title }}</div>
      <span class="spacer"></span>
      <div v-if="listLike" class="seg" role="group" aria-label="Ansicht">
        <button :class="{ on: ui.layout === 'list' }" @click="ui.layout = 'list'" title="Liste" :aria-pressed="String(ui.layout === 'list')"><icon name="list" :size="15"/><span class="hide-sm">Liste</span></button>
        <button :class="{ on: ui.layout === 'board' }" @click="ui.layout = 'board'" title="Kanban" :aria-pressed="String(ui.layout === 'board')"><icon name="board" :size="15"/><span class="hide-sm">Kanban</span></button>
      </div>
    </header>
    <div :class="['content', { wide: listLike && ui.layout === 'board' }]">
      <area-brief v-if="ui.view === 'area' && currentArea" :area="currentArea"/>
      <header v-else-if="pageHead" class="page-head"><h1>{{ pageHead.title }}</h1><p v-if="pageHead.sub">{{ pageHead.sub }}</p></header>
      <quick-add v-if="showQuick"/>
      <div v-if="listLike" class="toolbar">
        <label v-if="ui.layout === 'list'" class="toolbar-field">Gruppieren
          <select class="select-sm" v-model="ui.groupBy"><option value="status">nach Status</option><option value="area">nach Bereich</option><option value="none">nicht</option></select>
        </label>
        <label v-if="ui.view === 'area' && hasSubareas" class="toggle"><input type="checkbox" v-model="ui.includeSub">Unterbereiche einbeziehen</label>
        <label class="toggle"><input type="checkbox" v-model="ui.showClosed">Abgeschlossene zeigen</label>
        <label class="toolbar-field">Priorität
          <select class="select-sm" v-model.number="ui.prio"><option :value="0">alle</option><option v-for="p in [1, 2, 3, 4]" :key="p" :value="p">P{{ p }}</option></select>
        </label>
        <label v-if="tags.length" class="toolbar-field">Tag
          <select class="select-sm" v-model="ui.tag"><option value="">alle</option><option v-for="t in tags" :key="t" :value="t">+{{ t }}</option></select>
        </label>
      </div>
      <today-view v-if="ui.view === 'today'"/>
      <template v-else-if="listLike">
        <board-view v-if="ui.layout === 'board'" :tasks="scopeTasks" :show-area="showAreaInRows"/>
        <task-list v-else :tasks="scopeTasks" :group-by="ui.groupBy" :show-area="showAreaInRows" :empty="emptyText"/>
      </template>
      <search-view v-else-if="ui.view === 'search'"/>
      <trash-view v-else-if="ui.view === 'trash'"/>
      <settings-view v-else-if="ui.view === 'settings'"/>
    </div>
  </main>
  <task-detail v-if="selectedTask" :task="selectedTask"/>
  <status-prompt v-if="ui.prompt"/>
  <area-dialog v-if="ui.areaDialog"/>
  <div v-if="ui.toast" class="toast" role="status"><span>{{ ui.toast.text }}</span><button v-if="ui.toast.action" @click.stop="runToast">{{ ui.toast.action.label }}</button></div>
</div>`
  };

  /* ---------- Teilen-Ziel (Android: „Teilen“ → ToDo) ---------- */
  (function handleShare() {
    const p = new URLSearchParams(location.search);
    if (!p.has('share_title') && !p.has('share_text') && !p.has('share_url')) return;
    const title = (p.get('share_title') || '').trim();
    const text = (p.get('share_text') || '').trim();
    const url = (p.get('share_url') || '').trim();
    const links = U.extractLinks(text);
    if (url && !links.some(l => l.target === url)) links.unshift(U.makeLink(url));
    const desc = text.replace(/https?:\/\/\S+/g, '').trim();
    const t = S.createTask({
      title: title || U.short(desc, 90) || (links[0] ? U.linkShort(links[0]) : 'Geteilt'),
      description: desc && desc !== title ? desc : '',
      links, areaId: 'inbox', createdVia: 'Über Teilen'
    });
    history.replaceState(null, '', location.pathname + '#/area/inbox?t=' + t.id);
    setTimeout(() => toast('Im Eingang gespeichert'), 300);
  })();

  /* ---------- Adresszeile: Zurück-Taste schließt Details ---------- */
  function hashFor() {
    let h = '#/' + ui.view;
    if (ui.view === 'area') h += '/' + encodeURIComponent(ui.areaId);
    if (ui.selectedTaskId) h += '?t=' + encodeURIComponent(ui.selectedTaskId);
    return h;
  }
  function applyHash() {
    const m = location.hash.match(/^#\/([a-z]+)(?:\/([^?]+))?(?:\?t=([^&]+))?/);
    if (!m) return;
    const view = m[1], arg = m[2] ? decodeURIComponent(m[2]) : null, t = m[3] ? decodeURIComponent(m[3]) : null;
    if (['today', 'flagged', 'open', 'trash', 'settings'].includes(view)) { ui.view = view; ui.areaId = null; }
    else if (view === 'area' && S.area(arg)) { ui.view = 'area'; ui.areaId = arg; }
    ui.selectedTaskId = t && S.task(t) ? t : null;
  }
  let applying = false;
  if (location.hash) applyHash();
  history.replaceState(null, '', location.pathname + hashFor());
  watch(hashFor, h => {
    if (applying || ui.view === 'search') return;
    if (location.hash !== h) history.pushState(null, '', h);
  });
  addEventListener('popstate', () => {
    applying = true;
    applyHash();
    nextTick(() => { applying = false; });
  });

  /* ---------- Tastatur ---------- */
  document.addEventListener('keydown', e => {
    const tag = (e.target && e.target.tagName || '').toLowerCase();
    const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || (e.target && e.target.isContentEditable);
    if (e.key === 'Escape') {
      if (ui.prompt) ui.prompt = null;
      else if (ui.areaDialog) ui.areaDialog = null;
      else if (ui.menu) ui.menu = null;
      else if (typing) e.target.blur();
      else if (ui.selectedTaskId) ui.selectedTaskId = null;
      else if (ui.sidebarOpen) ui.sidebarOpen = false;
      return;
    }
    if (typing || e.ctrlKey || e.metaKey || e.altKey || ui.prompt || ui.areaDialog) return;
    const k = e.key.toLowerCase();
    const sel = ui.selectedTaskId ? S.task(ui.selectedTaskId) : null;
    if (k === 'n') {
      const q = document.getElementById('quick-input');
      if (q) { e.preventDefault(); q.focus(); }
    } else if (k === '/') {
      e.preventDefault();
      if (innerWidth <= 900) ui.sidebarOpen = true;
      nextTick(() => { const s = document.getElementById('search-input'); if (s) s.focus(); });
    } else if (k === 'j' || k === 'k' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const rows = [...document.querySelectorAll('.content [data-id]')];
      if (!rows.length) return;
      e.preventDefault();
      const ids = rows.map(r => r.dataset.id);
      let i = ids.indexOf(ui.selectedTaskId);
      i = (k === 'j' || e.key === 'ArrowDown') ? Math.min(ids.length - 1, i + 1) : Math.max(0, i - 1);
      ui.selectedTaskId = ids[i];
      nextTick(() => { if (rows[i]) rows[i].scrollIntoView({ block: 'nearest' }); });
    } else if (k === 'e' && sel) {
      e.preventDefault();
      toggleDone(sel);
    } else if (k === 'f' && sel) {
      e.preventDefault();
      S.updateTask(sel.id, { flagged: !sel.flagged });
    }
  });

  /* ---------- Start ---------- */
  const app = createApp(App);
  Object.assign(app.config.globalProperties, { S, U, Y, ui, go, toggleDone, requestStatus, endDrag, selectTask });
  app.directive('autosize', autosize);
  app.component('icon', Icon);
  app.component('tree-node', TreeNode);
  app.component('task-row', TaskRow);
  app.component('task-list', TaskList);
  app.component('board-view', BoardView);
  app.component('quick-add', QuickAdd);
  app.component('links-editor', LinksEditor);
  app.component('notes-editor', NotesEditor);
  app.component('area-brief', AreaBrief);
  app.component('task-detail', TaskDetail);
  app.component('status-prompt', StatusPrompt);
  app.component('area-dialog', AreaDialog);
  app.component('today-view', TodayView);
  app.component('search-view', SearchView);
  app.component('trash-view', TrashView);
  app.component('settings-view', SettingsView);
  app.mount('#app');

  if (Y.configured && S.meta.session) Y.sync();
  window.__tm = { ui, go };
})();
