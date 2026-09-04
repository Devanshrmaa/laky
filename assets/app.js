/* PYQ revision checklist.
 *
 * data/topics.json is the source of truth. Tiers, frequencies and the years a
 * topic was asked in are read straight from it — nothing here recomputes them.
 * The only thing this file owns is which topics have been ticked off, and that
 * lives in localStorage on the reader's own device.
 */
(() => {
  'use strict';

  const STORE_KEY = 'laky.pyq.progress.v1';
  const CYCLE = { todo: 'revising', revising: 'done', done: 'todo' };
  const STATUS_LABEL = { todo: 'Not started', revising: 'Revising', done: 'Done' };
  const TIER_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 };

  const $ = (sel, root = document) => root.querySelector(sel);
  const bind = (name) => document.querySelector(`[data-bind="${name}"]`);

  const state = {
    data: null,
    subjectId: null,
    tier: 'all',
    status: 'all',
    query: '',
    progress: loadProgress(),
    openChapters: new Set(),
    openTopics: new Set(),
  };

  /* ------------------------------------------------------------ storage */

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (err) {
      return {};
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state.progress));
    } catch (err) {
      /* private window, or storage blocked — ticks just won't survive a reload */
    }
  }

  const keyFor = (subjectId, topicId) => `${subjectId}/${topicId}`;
  const statusOf = (subjectId, topicId) =>
    state.progress[keyFor(subjectId, topicId)] || 'todo';

  /* -------------------------------------------------------------- helpers */

  const subject = () => state.data.subjects.find((s) => s.id === state.subjectId);
  const topicsOf = (subj) => subj.chapters.flatMap((ch) => ch.topics);

  function countDone(subj) {
    return topicsOf(subj).filter((t) => statusOf(subj.id, t.id) === 'done').length;
  }

  function matches(subj, topic) {
    if (state.tier !== 'all' && topic.tier !== state.tier) return false;
    if (state.status !== 'all' && statusOf(subj.id, topic.id) !== state.status) return false;
    if (state.query) {
      const hay = `${topic.name} ${topic.years.join(' ')}`.toLowerCase();
      if (!hay.includes(state.query)) return false;
    }
    return true;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  const CHECK_SVG =
    '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
    '<path d="M4 10.5l4 4 8-9" stroke="currentColor" stroke-width="2.5" ' +
    'stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const DOT_SVG =
    '<svg viewBox="0 0 20 20" aria-hidden="true">' +
    '<circle cx="10" cy="10" r="4.5" fill="currentColor"/></svg>';

  const CARET_SVG =
    '<svg class="chapter-caret" width="12" height="12" viewBox="0 0 12 12" ' +
    'aria-hidden="true"><path d="M4 2l5 4-5 4" stroke="currentColor" ' +
    'stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* -------------------------------------------------------------- rendering */

  function renderHeader() {
    const meta = state.data.meta;
    document.title = `${meta.title} — ${meta.site}`;
    bind('course').textContent = meta.course;
    bind('heading').textContent = meta.title;
    bind('tagline').textContent = meta.tagline;
    bind('source').textContent = meta.source;
    bind('tierRule').textContent = meta.tierRule;

    const notes = bind('dataNotes');
    notes.replaceChildren(...meta.dataNotes.map((n) => el('li', null, n)));
  }

  function renderOverall() {
    const all = state.data.subjects.flatMap((s) =>
      s.chapters.flatMap((ch) => ch.topics.map((t) => statusOf(s.id, t.id))));
    const done = all.filter((s) => s === 'done').length;
    const revising = all.filter((s) => s === 'revising').length;
    const pct = all.length ? Math.round((done / all.length) * 100) : 0;

    bind('overallDone').textContent = String(done);
    bind('overallTotal').textContent = String(all.length);
    bind('overallBar').style.width = `${pct}%`;
    bind('overallNote').textContent = revising
      ? `${pct}% done · ${revising} in progress`
      : `${pct}% done`;
  }

  function renderTabs() {
    const wrap = bind('subjectTabs');
    wrap.replaceChildren(...state.data.subjects.map((s) => {
      const total = topicsOf(s).length;
      const btn = el('button', 'subject-tab');
      btn.type = 'button';
      btn.dataset.subject = s.id;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(s.id === state.subjectId));
      btn.append(
        el('span', null, s.name),
        el('span', 'tab-count', `${countDone(s)}/${total}`),
      );
      return btn;
    }));
  }

  function renderSummary() {
    const subj = subject();
    const total = topicsOf(subj).length;
    const done = countDone(subj);
    const high = topicsOf(subj).filter((t) => t.tier === 'HIGH').length;
    const demands = topicsOf(subj).reduce((sum, t) => sum + t.timesAsked, 0);

    const box = bind('subjectSummary');
    box.replaceChildren();

    const stat = (value, label) => {
      const span = el('span');
      span.append(el('strong', null, String(value)), ` ${label}`);
      return span;
    };

    box.append(
      stat(`${done}/${total}`, 'topics ticked'),
      stat(high, 'high-weight topics'),
      stat(subj.papersAnalyzed, 'sittings analysed'),
      stat(demands, 'recorded appearances'),
    );

    if (subj.mustRead && subj.mustRead.length) {
      const details = el('details', 'must-read');
      details.append(el('summary', null, 'The analysis’ own “must-read” list'));
      const ul = el('ul');
      ul.replaceChildren(...subj.mustRead.map((line) => el('li', null, line)));
      details.append(ul);
      box.append(details);
    }
  }

  function renderFocus() {
    const subj = subject();
    const section = bind('focusSection');
    const list = bind('focusList');

    const next = topicsOf(subj)
      .filter((t) => statusOf(subj.id, t.id) !== 'done')
      .sort((a, b) =>
        TIER_ORDER[a.tier] - TIER_ORDER[b.tier] ||
        b.timesAsked - a.timesAsked ||
        a.name.localeCompare(b.name))
      .slice(0, 5);

    section.hidden = false;
    list.replaceChildren();

    if (!next.length) {
      const li = el('li');
      li.append(el('p', 'focus-clear', `Every ${subj.name} topic is ticked off. Go and rest.`));
      list.append(li);
      return;
    }

    list.replaceChildren(...next.map((t) => {
      const li = el('li', 'focus-item');
      const btn = el('button', null, t.name);
      btn.type = 'button';
      btn.dataset.jump = t.id;
      const meta = el('span', 'focus-meta',
        `${t.tier.toLowerCase()} · asked ${t.timesAsked}×`);
      li.append(btn, meta);
      return li;
    }));
  }

  function renderTopic(subj, topic) {
    const status = statusOf(subj.id, topic.id);
    const node = el('div', 'topic');
    node.dataset.status = status;
    node.dataset.topic = topic.id;
    node.id = `topic-${subj.id}-${topic.id}`;

    const row = el('div', 'topic-row');

    const statusBtn = el('button', 'status-btn');
    statusBtn.type = 'button';
    statusBtn.dataset.toggle = topic.id;
    statusBtn.title = `${STATUS_LABEL[status]} — click to change`;
    statusBtn.setAttribute('aria-label', `${topic.name}: ${STATUS_LABEL[status]}`);
    statusBtn.innerHTML = status === 'done' ? CHECK_SVG : status === 'revising' ? DOT_SVG : '';

    const main = el('div', 'topic-main');
    const expanded = state.openTopics.has(topic.id);

    const nameBtn = el('button', 'topic-name', topic.name);
    nameBtn.type = 'button';
    nameBtn.dataset.expand = topic.id;
    nameBtn.setAttribute('aria-expanded', String(expanded));

    const meta = el('div', 'topic-meta');
    meta.append(el('span', `tier tier-${topic.tier}`, topic.tier));
    meta.append(el('span', 'asked', `asked ${topic.timesAsked}×`));
    if (topic.hasDiagram) meta.append(el('span', 'diagram-flag', '✎ diagram'));

    const years = el('div', 'years');
    years.replaceChildren(...topic.years.map((y) => el('span', 'year', y)));
    meta.append(years);

    main.append(nameBtn, meta);
    row.append(statusBtn, main);
    node.append(row);

    if (expanded) node.append(renderTopicDetail(topic));
    return node;
  }

  function renderTopicDetail(topic) {
    const detail = el('div', 'topic-detail');
    detail.append(el('h4', null, 'How it came up'));

    const list = el('ul', 'angle-list');
    list.replaceChildren(...topic.angles.map((a) => {
      const li = el('li', 'angle');
      li.append(el('span', 'angle-year', a.year));
      li.append(el('span', 'angle-session', a.session));
      if (a.note) li.append(el('span', 'angle-note', a.note));
      if (a.marks != null) li.append(el('span', 'angle-marks', `${a.marks} marks`));
      return li;
    }));
    detail.append(list);

    const bits = [`Counted ${topic.timesAsked} times in the analysis`];
    if (topic.totalMarks) bits.push(`${topic.totalMarks} marks in total`);
    if (topic.hasDiagram) bits.push('Worth having a diagram ready');
    detail.append(el('p', 'detail-foot', bits.join(' · ')));

    return detail;
  }

  function renderChapters() {
    const subj = subject();
    const host = bind('chapters');
    host.replaceChildren();
    let shown = 0;

    subj.chapters.forEach((ch) => {
      const visible = ch.topics.filter((t) => matches(subj, t));
      const filtering = Boolean(state.query) || state.tier !== 'all' || state.status !== 'all';
      if (filtering && !visible.length) return; // nothing here matches the filters
      shown += visible.length;

      const done = ch.topics.filter((t) => statusOf(subj.id, t.id) === 'done').length;
      const pct = ch.topics.length ? Math.round((done / ch.topics.length) * 100) : 0;
      const open = filtering || state.openChapters.has(ch.id);

      const card = el('section', 'chapter');
      card.dataset.open = String(open);
      card.dataset.chapter = ch.id;

      const head = el('button', 'chapter-head');
      head.type = 'button';
      head.dataset.chapterToggle = ch.id;
      head.setAttribute('aria-expanded', String(open));
      head.innerHTML = CARET_SVG;

      const title = el('div', 'chapter-title');
      title.append(el('h3', null, ch.name));
      if (ch.blurb) title.append(el('p', null, ch.blurb));

      const prog = el('div', 'chapter-progress');
      prog.append(el('span', null, ch.topics.length ? `${done}/${ch.topics.length}` : '—'));
      if (ch.topics.length) {
        const meter = el('div', 'meter');
        const fill = el('span', 'meter-fill');
        fill.style.width = `${pct}%`;
        meter.append(fill);
        prog.append(meter);
      }

      head.append(title, prog);
      card.append(head);

      const body = el('div', 'chapter-body');
      if (!ch.topics.length) {
        body.append(el('p', 'chapter-empty', 'No topics recorded for this section yet.'));
      } else {
        visible.forEach((t) => body.append(renderTopic(subj, t)));
      }
      card.append(body);
      host.append(card);
    });

    bind('emptyState').hidden = shown > 0;
  }

  function renderBackup() {
    const box = bind('backup');
    if (document.activeElement !== box) {
      box.value = JSON.stringify(state.progress);
    }
  }

  function render() {
    renderOverall();
    renderTabs();
    renderSummary();
    renderFocus();
    renderChapters();
    renderBackup();
  }

  /* --------------------------------------------------------------- events */

  function setStatus(topicId) {
    const key = keyFor(state.subjectId, topicId);
    const next = CYCLE[state.progress[key] || 'todo'];
    if (next === 'todo') delete state.progress[key];
    else state.progress[key] = next;
    saveProgress();
    render();
  }

  function flash(message) {
    const msg = bind('backupMsg');
    msg.textContent = message;
    setTimeout(() => { msg.textContent = ''; }, 2500);
  }

  function wireEvents() {
    document.addEventListener('click', (event) => {
      const target = event.target.closest('button');
      if (!target) return;

      if (target.dataset.subject) {
        state.subjectId = target.dataset.subject;
        state.openChapters.clear();
        state.openTopics.clear();
        render();
        return;
      }

      if (target.dataset.toggle) return setStatus(target.dataset.toggle);

      if (target.dataset.expand) {
        const id = target.dataset.expand;
        state.openTopics.has(id) ? state.openTopics.delete(id) : state.openTopics.add(id);
        renderChapters();
        return;
      }

      if (target.dataset.chapterToggle) {
        const id = target.dataset.chapterToggle;
        state.openChapters.has(id) ? state.openChapters.delete(id) : state.openChapters.add(id);
        renderChapters();
        return;
      }

      if (target.dataset.jump) {
        const id = target.dataset.jump;
        const subj = subject();
        const chapter = subj.chapters.find((ch) => ch.topics.some((t) => t.id === id));
        if (chapter) state.openChapters.add(chapter.id);
        state.openTopics.add(id);
        renderChapters();
        const node = document.getElementById(`topic-${subj.id}-${id}`);
        if (node) {
          node.scrollIntoView({ behavior: 'smooth', block: 'center' });
          $('.topic-name', node).focus({ preventScroll: true });
        }
        return;
      }

      if (target.dataset.filter) {
        state[target.dataset.filter] = target.dataset.value;
        document.querySelectorAll(`[data-filter="${target.dataset.filter}"]`)
          .forEach((chip) => chip.setAttribute(
            'aria-pressed', String(chip.dataset.value === target.dataset.value)));
        renderChapters();
        return;
      }

      switch (target.dataset.action) {
        case 'collapse-all':
          state.openChapters.clear();
          state.openTopics.clear();
          renderChapters();
          break;

        case 'copy-backup':
          navigator.clipboard?.writeText(bind('backup').value)
            .then(() => flash('Copied.'))
            .catch(() => flash('Select the text and copy it by hand.'));
          break;

        case 'restore-backup': {
          try {
            const parsed = JSON.parse(bind('backup').value);
            if (!parsed || typeof parsed !== 'object') throw new Error('not an object');
            state.progress = parsed;
            saveProgress();
            render();
            flash('Restored.');
          } catch (err) {
            flash("That doesn't look like a backup.");
          }
          break;
        }

        case 'reset':
          if (confirm('Clear every tick on this device? This cannot be undone.')) {
            state.progress = {};
            saveProgress();
            render();
            flash('Cleared.');
          }
          break;
      }
    });

    $('#search').addEventListener('input', (event) => {
      state.query = event.target.value.trim().toLowerCase();
      renderChapters();
    });
  }

  /* ----------------------------------------------------------------- boot */

  fetch('data/topics.json')
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => {
      state.data = data;
      state.subjectId = data.subjects[0].id;
      renderHeader();
      wireEvents();
      render();
    })
    .catch((err) => {
      bind('chapters').append(Object.assign(document.createElement('p'), {
        className: 'empty',
        textContent:
          "Couldn't load data/topics.json. If you opened this file directly, " +
          'serve the folder instead: python3 -m http.server',
      }));
      console.error(err);
    });
})();
