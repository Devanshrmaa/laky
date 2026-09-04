/* =============================================================================
   Specimen — PYQ revision checklist.

   data/topics.json is the source of truth. Tiers, frequencies and the sittings
   a topic was asked in are read straight from it; nothing here recomputes them.
   This file owns two things only: what you've ticked, and when you ticked it.
   Both live in localStorage on this device.
   ========================================================================== */
(() => {
  'use strict';

  const KEY_PROGRESS = 'laky.pyq.progress.v2';
  const KEY_LEGACY = 'laky.pyq.progress.v1';
  const KEY_PREFS = 'laky.pyq.prefs.v1';

  const CYCLE = { todo: 'revising', revising: 'done', done: 'todo' };
  const LABEL = { todo: 'Untouched', revising: 'Revising', done: 'Done' };
  const RANK = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  const STALE_DAYS = 21;
  const DAY = 86400000;

  const bind = (n) => document.querySelector(`[data-bind="${n}"]`);
  const panel = (n) => document.querySelector(`[data-panel="${n}"]`);

  const state = {
    data: null,
    subjectId: null,
    view: 'checklist',
    tier: 'all',
    status: 'all',
    query: '',
    progress: {},
    prefs: {},
    openChapters: new Set(),
    openTopics: new Set(),
    sitting: null,
    drill: { queue: [], at: 0, shown: false },
    years: [],
  };

  /* ============================================================== storage */

  function readProgress() {
    try {
      const raw = localStorage.getItem(KEY_PROGRESS);
      if (raw) return JSON.parse(raw) || {};
      // carry over the first version, which stored a bare status string
      const old = localStorage.getItem(KEY_LEGACY);
      if (!old) return {};
      const migrated = {};
      Object.entries(JSON.parse(old) || {}).forEach(([k, v]) => {
        if (typeof v === 'string') migrated[k] = { s: v, t: null };
      });
      return migrated;
    } catch (err) {
      return {};
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      /* private window or storage blocked — the session still works */
    }
  }

  const saveProgress = () => write(KEY_PROGRESS, state.progress);
  const savePrefs = () => write(KEY_PREFS, state.prefs);

  const idOf = (subjectId, topicId) => `${subjectId}/${topicId}`;

  function statusOf(subjectId, topicId) {
    const rec = state.progress[idOf(subjectId, topicId)];
    return rec ? rec.s : 'todo';
  }

  function stampOf(subjectId, topicId) {
    const rec = state.progress[idOf(subjectId, topicId)];
    return rec ? rec.t : null;
  }

  function setStatus(subjectId, topicId, next) {
    const key = idOf(subjectId, topicId);
    if (next === 'todo') delete state.progress[key];
    else state.progress[key] = { s: next, t: Date.now() };
    saveProgress();
  }

  /* =============================================================== shapes */

  const subjectById = (id) => state.data.subjects.find((s) => s.id === id);
  const current = () => subjectById(state.subjectId);
  const topicsOf = (subj) => subj.chapters.flatMap((c) => c.topics);
  const everyTopic = () =>
    state.data.subjects.flatMap((s) => topicsOf(s).map((t) => ({ subject: s, topic: t })));

  /** Coverage is measured in question appearances, not topics: finishing one
   *  topic asked 12 times is worth more than three asked once. */
  function coverage(pairs) {
    let total = 0;
    let held = 0;
    pairs.forEach(({ subject, topic }) => {
      total += topic.timesAsked;
      if (statusOf(subject.id, topic.id) === 'done') held += topic.timesAsked;
    });
    return { total, held, pct: total ? (held / total) * 100 : 0 };
  }

  const subjectPairs = (subj) => topicsOf(subj).map((t) => ({ subject: subj, topic: t }));

  const byWeight = (a, b) =>
    RANK[a.tier] - RANK[b.tier] || b.timesAsked - a.timesAsked || a.name.localeCompare(b.name);

  function isStale(subjectId, topicId) {
    const t = stampOf(subjectId, topicId);
    return statusOf(subjectId, topicId) === 'done' && t && Date.now() - t > STALE_DAYS * DAY;
  }

  /* =================================================================== DOM */

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  const ICON_TICK =
    '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 10.5l4 4 8-9" ' +
    'stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICON_HALF =
    '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="4" fill="currentColor"/></svg>';

  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
    'XI', 'XII', 'XIII', 'XIV', 'XV'];

  /* The signature: one cell per year, inked where that year's paper asked it,
     darker where it was asked more than once in the same year. */
  function spine(topic, opts = {}) {
    const perYear = {};
    topic.angles.forEach((a) => { perYear[a.year] = (perYear[a.year] || 0) + 1; });

    const strip = el('div', 'spine');
    strip.setAttribute('role', 'img');
    const asked = topic.years.join(', ');
    strip.setAttribute('aria-label',
      `Asked in ${asked}. ${topic.timesAsked} appearances in total.`);

    state.years.forEach((y, i) => {
      const cell = el('span', 'spine-cell');
      const n = perYear[y] || 0;
      if (n) {
        cell.dataset.ink = String(Math.min(n, 3));
        cell.title = `${y}: asked ${n} time${n > 1 ? 's' : ''}`;
      } else if (i % 5 === 0) {
        cell.dataset.mark = '5'; // every fifth year, so the strip can be read
      }
      strip.append(cell);
    });

    if (!opts.axis) return strip;

    const wrap = el('div', 'spine-wrap');
    const axis = el('div', 'spine-axis');
    axis.append(el('span', null, state.years[0]), el('span', null, state.years.at(-1)));
    wrap.append(strip, axis);
    return wrap;
  }

  function tierTag(topic) {
    const tag = el('span', 'tier', topic.tier);
    tag.dataset.tier = topic.tier;
    return tag;
  }

  function angleList(topic) {
    const list = el('ul', 'angles');
    // newest first for reading; the stored order in the data is untouched
    const ordered = [...topic.angles].sort((a, b) => b.year.localeCompare(a.year));
    list.replaceChildren(...ordered.map((a) => {
      const li = el('li', 'angle');
      li.append(el('span', 'angle-y', a.year), el('span', 'angle-s', a.session));
      li.append(el('span', 'angle-n', a.note || (a.marks != null ? `${a.marks} marks` : '')));
      return li;
    }));
    return list;
  }

  /* ============================================================== masthead */

  function paintMasthead() {
    const meta = state.data.meta;
    document.title = `${meta.title} — ${meta.site}`;
    bind('course').textContent = meta.course;
    bind('heading').textContent = meta.title;
    bind('tagline').textContent = meta.tagline;
    bind('source').textContent = meta.source;
    bind('tierRule').textContent = meta.tierRule;
    bind('yearFrom').textContent = state.years[0];
    bind('yearTo').textContent = state.years.at(-1);

    const sittings = new Set();
    state.data.subjects.forEach((s) => topicsOf(s).forEach((t) =>
      t.angles.forEach((a) => sittings.add(`${a.year}|${a.session}`))));
    bind('papersLine').textContent =
      `${meta.totalTopics} topics · ${sittings.size} sittings`;

    bind('dataNotes').replaceChildren(...meta.dataNotes.map((n) => el('li', null, n)));

    const legend = bind('legendSwatches');
    legend.replaceChildren(...[
      ['3', 'Asked 3+ times that year'],
      ['2', 'Asked twice'],
      ['1', 'Asked once'],
      ['0', 'Not asked'],
    ].map(([ink, text]) => {
      const row = el('div', 'legend-row');
      const cell = el('span', 'legend-cell spine-cell');
      if (ink !== '0') cell.dataset.ink = ink;
      row.append(cell, el('span', null, text));
      return row;
    }));
  }

  function paintCoverage() {
    const cov = coverage(everyTopic());
    const pct = Math.round(cov.pct);
    bind('covPct').textContent = String(pct);
    bind('covFill').style.width = `${cov.pct}%`;
    bind('covAria').setAttribute('aria-label',
      `${pct}% of recorded question appearances covered`);

    const doneTopics = everyTopic()
      .filter(({ subject, topic }) => statusOf(subject.id, topic.id) === 'done').length;
    bind('covFoot').textContent =
      `${cov.held} of ${cov.total} recorded appearances · ` +
      `${doneTopics} topic${doneTopics === 1 ? '' : 's'} ticked`;
  }

  /* ============================================================= checklist */

  function paintRail() {
    const list = bind('subjectList');
    list.replaceChildren(...state.data.subjects.map((s) => {
      const li = el('li');
      const btn = el('button', 'subject-btn');
      btn.type = 'button';
      btn.dataset.subject = s.id;
      btn.setAttribute('aria-current', String(s.id === state.subjectId));
      const done = topicsOf(s).filter((t) => statusOf(s.id, t.id) === 'done').length;
      btn.append(el('span', null, s.name), el('span', 'tally', `${done}/${topicsOf(s).length}`));
      li.append(btn);
      return li;
    }));

    const subj = current();
    const cov = coverage(subjectPairs(subj));
    const stats = bind('railStats');
    stats.replaceChildren(el('h3', 'rail-h', 'This subject'));

    const rows = [
      ['Coverage', `${Math.round(cov.pct)}%`],
      ['High-weight left', String(topicsOf(subj)
        .filter((t) => t.tier === 'HIGH' && statusOf(subj.id, t.id) !== 'done').length)],
      ['Sittings analysed', String(subj.papersAnalyzed)],
      ['Appearances', String(cov.total)],
    ];
    rows.forEach(([k, v]) => {
      const row = el('div', 'rail-stat');
      row.append(el('span', null, k), el('b', null, v));
      stats.append(row);
    });
  }

  function paintNextUp() {
    const subj = current();
    const cov = coverage(subjectPairs(subj));
    const host = bind('nextUp');
    host.replaceChildren();

    const box = el('section', 'nextup');
    box.append(el('h2', null, 'Worth the most right now'));

    const left = topicsOf(subj)
      .filter((t) => statusOf(subj.id, t.id) !== 'done')
      .sort(byWeight);

    if (!left.length) {
      box.append(el('p', 'nextup-done',
        `Every ${subj.name} topic is ticked. That's the whole subject covered.`));
      host.append(box);
      return;
    }

    const top = left.slice(0, 5);
    const gain = top.reduce((sum, t) => sum + t.timesAsked, 0) / cov.total * 100;
    box.append(el('p', 'sub',
      `These five alone are worth ${gain.toFixed(1)}% of everything ${subj.name} has ever asked.`));

    const list = el('ol', 'nextup-list');
    list.replaceChildren(...top.map((t) => {
      const li = el('li', 'nextup-row');
      const name = el('button', 'nextup-name', t.name);
      name.type = 'button';
      name.dataset.jump = t.id;
      li.append(name, el('span', 'nextup-asked', `${t.timesAsked}×`),
        el('span', 'nextup-gain', `+${(t.timesAsked / cov.total * 100).toFixed(1)}%`));
      return li;
    }));
    box.append(list);
    host.append(box);
  }

  function topicRow(subj, topic) {
    const status = statusOf(subj.id, topic.id);
    const row = el('div', 'topic');
    row.dataset.status = status;
    row.id = `t-${subj.id}-${topic.id}`;

    const tick = el('button', 'tick');
    tick.type = 'button';
    tick.dataset.tick = topic.id;
    tick.setAttribute('aria-label', `${topic.name}: ${LABEL[status]}. Change status.`);
    tick.title = `${LABEL[status]} — click to change`;
    tick.innerHTML = status === 'done' ? ICON_TICK : status === 'revising' ? ICON_HALF : '';

    const body = el('div', 'topic-body');
    const open = state.openTopics.has(topic.id);
    const name = el('button', 'topic-name', topic.name);
    name.type = 'button';
    name.dataset.open = topic.id;
    name.setAttribute('aria-expanded', String(open));

    const tags = el('div', 'topic-tags');
    tags.append(tierTag(topic), el('span', null, `asked ${topic.timesAsked}×`));
    if (topic.hasDiagram) tags.append(el('span', null, 'diagram'));
    if (isStale(subj.id, topic.id)) {
      const days = Math.floor((Date.now() - stampOf(subj.id, topic.id)) / DAY);
      tags.append(el('span', 'stale-tag', `ticked ${days}d ago`));
    }

    body.append(name, tags);
    row.append(tick, body, spine(topic));

    if (open) {
      const detail = el('div', 'detail');
      detail.append(el('p', 'detail-h', 'How it came up'), angleList(topic));
      row.append(detail);
    }
    return row;
  }

  function paintChapters() {
    const subj = current();
    const host = bind('chapters');
    host.replaceChildren();
    const filtering = state.tier !== 'all' || state.status !== 'all';
    let shown = 0;

    subj.chapters.forEach((ch, i) => {
      const visible = ch.topics.filter((t) =>
        (state.tier === 'all' || t.tier === state.tier) &&
        (state.status === 'all' || statusOf(subj.id, t.id) === state.status));

      if (filtering && !visible.length) return;
      shown += visible.length;

      const done = ch.topics.filter((t) => statusOf(subj.id, t.id) === 'done').length;
      const open = filtering || state.openChapters.has(ch.id);

      const card = el('section', 'chapter');
      card.dataset.open = String(open);

      const head = el('button', 'chapter-head');
      head.type = 'button';
      head.dataset.chapter = ch.id;
      head.setAttribute('aria-expanded', String(open));

      const title = el('div');
      title.append(el('h3', 'chapter-name', ch.name));
      if (ch.blurb) title.append(el('p', 'chapter-blurb', ch.blurb));

      head.append(
        el('span', 'chapter-idx', ROMAN[i] || String(i + 1)),
        title,
        el('span', 'chapter-tally', ch.topics.length ? `${done}/${ch.topics.length}` : '—'),
      );
      card.append(head);

      const body = el('div', 'chapter-body');
      if (!ch.topics.length) {
        body.append(el('p', 'chapter-void',
          'The source analysis names this section but records no table under it.'));
      } else {
        visible.forEach((t) => body.append(topicRow(subj, t)));
      }
      card.append(body);
      host.append(card);
    });

    const none = bind('voidState');
    none.hidden = shown > 0;
    none.textContent = 'Nothing in this subject matches those filters.';
  }

  /* ================================================================ papers */

  function sittingIndex() {
    const map = new Map();
    state.data.subjects.forEach((subject) => {
      subject.chapters.forEach((chapter) => {
        chapter.topics.forEach((topic) => {
          topic.angles.forEach((a) => {
            const key = `${a.year}|${a.session}`;
            if (!map.has(key)) map.set(key, { year: a.year, session: a.session, asks: [] });
            map.get(key).asks.push({ subject, chapter, topic, note: a.note });
          });
        });
      });
    });
    return [...map.entries()]
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => b.year.localeCompare(a.year) || a.session.localeCompare(b.session));
  }

  function paintPapers() {
    const sittings = sittingIndex();
    if (!state.sitting || !sittings.some((s) => s.key === state.sitting)) {
      state.sitting = sittings[0].key;
    }

    bind('sittingList').replaceChildren(...sittings.map((s) => {
      const li = el('li');
      const btn = el('button', 'sitting-btn');
      btn.type = 'button';
      btn.dataset.sitting = s.key;
      btn.setAttribute('aria-current', String(s.key === state.sitting));
      btn.append(el('span', null, `${s.year} ${s.session}`),
        el('span', 'tally', String(s.asks.length)));
      li.append(btn);
      return li;
    }));

    const sitting = sittings.find((s) => s.key === state.sitting);
    const pane = bind('paperPane');
    pane.replaceChildren();

    const head = el('div', 'paper-head');
    head.append(el('h2', null, `${sitting.year} · ${sitting.session}`));
    const covered = sitting.asks
      .filter((a) => statusOf(a.subject.id, a.topic.id) === 'done').length;
    const subjects = new Set(sitting.asks.map((a) => a.subject.id)).size;
    const n = sitting.asks.length;
    head.append(el('p', null,
      `${n} recorded question${n === 1 ? '' : 's'} across ` +
      `${subjects} subject${subjects === 1 ? '' : 's'}. You've covered ${covered}.`));
    pane.append(head);

    state.data.subjects.forEach((subject) => {
      const asks = sitting.asks.filter((a) => a.subject.id === subject.id);
      if (!asks.length) return;

      const group = el('div', 'paper-subject');
      group.append(el('h3', null, subject.name));
      asks.sort((a, b) => byWeight(a.topic, b.topic));

      asks.forEach((a, i) => {
        const row = el('div', 'paper-q');
        row.dataset.status = statusOf(subject.id, a.topic.id);
        row.append(el('span', 'qn', String(i + 1).padStart(2, '0')));

        const mid = el('span', 'qname');
        mid.append(document.createTextNode(a.topic.name));
        if (a.note) mid.append(' ', el('span', 'qnote', `— ${a.note}`));
        row.append(mid);

        const meta = el('span', 'qmeta');
        meta.append(tierTag(a.topic), document.createTextNode(` ${a.topic.timesAsked}×`));
        row.append(meta);
        group.append(row);
      });
      pane.append(group);
    });
  }

  /* ================================================================= drill */

  function buildQueue() {
    const subj = current();
    state.drill.queue = topicsOf(subj)
      .filter((t) => statusOf(subj.id, t.id) !== 'done')
      .sort(byWeight);
    state.drill.at = 0;
    state.drill.shown = false;
  }

  function paintDrill() {
    const subj = current();
    const pane = bind('drillPane');
    pane.replaceChildren();

    const queue = state.drill.queue;
    if (state.drill.at >= queue.length) {
      const card = el('div', 'card');
      card.append(el('p', 'card-eyebrow', subj.name));
      card.append(el('h2', 'card-q', queue.length
        ? 'That’s the whole stack.'
        : `Nothing left to drill in ${subj.name}.`));
      card.append(el('p', 'card-prompt', queue.length
        ? 'You worked through every topic in the deck. Start again whenever you like.'
        : 'Every topic here is already ticked as done. Pick another subject, or clear a tick to drill it again.'));
      const acts = el('div', 'card-actions');
      const again = el('button', 'btn btn-solid');
      again.type = 'button';
      again.dataset.act = 'drill-restart';
      again.textContent = 'Shuffle the deck again';
      acts.append(again);
      card.append(acts);
      pane.append(card);
      return;
    }

    const topic = queue[state.drill.at];

    const bar = el('div', 'drill-bar');
    bar.append(el('span', null, `${subj.name} · heaviest first`));
    bar.append(el('span', null, `${state.drill.at + 1} / ${queue.length}`));
    pane.append(bar);

    const card = el('div', 'card');
    card.append(el('p', 'card-eyebrow', 'Recall it before you turn it over'));
    card.append(el('h2', 'card-q', topic.name));

    const tags = el('div', 'card-tags');
    tags.append(tierTag(topic), el('span', null, `asked ${topic.timesAsked}×`));
    if (topic.hasDiagram) tags.append(el('span', null, 'draw the diagram too'));
    tags.append(spine(topic, { axis: true }));
    card.append(tags);

    if (!state.drill.shown) {
      card.append(el('p', 'card-prompt',
        'Say the answer out loud — classification, mechanism, the diagram if there is one. Then check what the papers actually wanted.'));
      const acts = el('div', 'card-actions');
      const show = el('button', 'btn btn-solid');
      show.type = 'button';
      show.dataset.act = 'drill-show';
      show.innerHTML = 'Show how it was asked <kbd>space</kbd>';
      const skip = el('button', 'btn');
      skip.type = 'button';
      skip.dataset.act = 'drill-skip';
      skip.innerHTML = 'Skip <kbd>3</kbd>';
      acts.append(show, skip);
      card.append(acts);
    } else {
      const reveal = el('div', 'card-reveal');
      reveal.append(el('p', 'detail-h', `${topic.angles.length} recorded appearances`),
        angleList(topic));
      card.append(reveal);

      const acts = el('div', 'card-actions');
      const got = el('button', 'btn btn-mark');
      got.type = 'button';
      got.dataset.act = 'drill-got';
      got.innerHTML = 'I had it <kbd>1</kbd>';
      const shaky = el('button', 'btn');
      shaky.type = 'button';
      shaky.dataset.act = 'drill-shaky';
      shaky.innerHTML = 'Shaky — keep it in <kbd>2</kbd>';
      const skip = el('button', 'btn');
      skip.type = 'button';
      skip.dataset.act = 'drill-skip';
      skip.innerHTML = 'Skip <kbd>3</kbd>';
      acts.append(got, shaky, skip);
      card.append(acts);
    }
    pane.append(card);
  }

  function drillAnswer(status) {
    const topic = state.drill.queue[state.drill.at];
    if (topic && status) setStatus(state.subjectId, topic.id, status);
    state.drill.at += 1;
    state.drill.shown = false;
    paintAll();
  }

  /* ================================================================== plan */

  function paintPlan() {
    const pane = bind('planPane');
    pane.replaceChildren();

    const pairs = everyTopic();
    const cov = coverage(pairs);
    const left = pairs.filter(({ subject, topic }) => statusOf(subject.id, topic.id) !== 'done');
    const highLeft = left.filter(({ topic }) => topic.tier === 'HIGH');

    const row = el('div', 'date-row');
    const label = el('label', null, 'Exam date');
    label.htmlFor = 'exam-date';
    const input = el('input');
    input.type = 'date';
    input.id = 'exam-date';
    input.value = state.prefs.examDate || '';
    row.append(label, input);
    if (state.prefs.examDate) {
      const clear = el('button', 'link-btn', 'Clear');
      clear.type = 'button';
      clear.dataset.act = 'clear-date';
      row.append(clear);
    }
    pane.append(row);

    let days = null;
    if (state.prefs.examDate) {
      const target = new Date(`${state.prefs.examDate}T00:00:00`);
      days = Math.ceil((target - new Date()) / DAY);
    }

    const grid = el('div', 'plan-grid');
    const cell = (k, v, n) => {
      const c = el('div', 'plan-cell');
      c.append(el('p', 'k', k), el('p', 'v', v));
      if (n) c.append(el('p', 'n', n));
      return c;
    };

    grid.append(cell('Covered', `${Math.round(cov.pct)}%`, 'of all recorded appearances'));
    grid.append(cell('Topics left', String(left.length),
      `${highLeft.length} of them high-weight`));

    if (days == null) {
      grid.append(cell('Days left', '—', 'set an exam date above'));
      grid.append(cell('Per day', '—', 'set an exam date above'));
    } else if (days <= 0) {
      grid.append(cell('Days left', '0', 'the date has passed'));
      grid.append(cell('Per day', '—', 'update the date to plan again'));
    } else {
      grid.append(cell('Days left', String(days), `until ${state.prefs.examDate}`));
      grid.append(cell('Per day', (left.length / days).toFixed(1),
        `or ${(highLeft.length / days).toFixed(1)}/day for high-weight only`));
    }
    pane.append(grid);

    pane.append(el('h2', 'plan-h', 'Coverage by subject'));
    pane.append(el('p', 'plan-sub',
      'Measured in question appearances, so the heavy topics count for what they are worth.'));

    const bars = el('div', 'bars');
    state.data.subjects.forEach((s) => {
      const c = coverage(subjectPairs(s));
      const line = el('div', 'bar-row');
      const track = el('div', 'bar-track');
      const fill = el('span', 'bar-fill');
      fill.style.width = `${c.pct}%`;
      track.append(fill);
      line.append(el('span', null, s.name), track,
        el('span', 'bar-val', `${Math.round(c.pct)}%`));
      bars.append(line);
    });
    pane.append(bars);

    const stale = pairs
      .filter(({ subject, topic }) => isStale(subject.id, topic.id))
      .sort((a, b) => stampOf(a.subject.id, a.topic.id) - stampOf(b.subject.id, b.topic.id));

    pane.append(el('h2', 'plan-h', 'Going cold'));
    pane.append(el('p', 'plan-sub',
      `Ticked more than ${STALE_DAYS} days ago. Worth one more pass before the paper.`));

    if (!stale.length) {
      pane.append(el('p', 'plan-none',
        'Nothing has gone cold yet. Topics show up here once a tick is more than three weeks old.'));
      return;
    }

    const list = el('ul', 'stale-list');
    stale.slice(0, 12).forEach(({ subject, topic }) => {
      const days2 = Math.floor((Date.now() - stampOf(subject.id, topic.id)) / DAY);
      const li = el('li', 'stale-row');
      li.append(el('span', null, `${topic.name} · ${subject.name}`));
      li.append(el('span', 'stale-when', `${days2} days ago`));
      const back = el('button', 'link-btn', 'Put it back in');
      back.type = 'button';
      back.dataset.revive = idOf(subject.id, topic.id);
      li.append(back);
      list.append(li);
    });
    pane.append(list);
  }

  /* ================================================================ search */

  function paintSearch() {
    const pane = bind('searchPane');
    pane.replaceChildren();
    const q = state.query;
    let hits = 0;

    state.data.subjects.forEach((subj) => {
      const found = topicsOf(subj).filter((t) =>
        `${t.name} ${t.years.join(' ')}`.toLowerCase().includes(q));
      if (!found.length) return;
      hits += found.length;

      const group = el('div', 'result-group');
      group.append(el('h3', null, `${subj.name} — ${found.length}`));
      found.sort(byWeight).forEach((t) => {
        const wrapper = topicRow(subj, t);
        wrapper.dataset.searchSubject = subj.id;
        group.append(wrapper);
      });
      pane.append(group);
    });

    if (!hits) pane.append(el('p', 'void', `Nothing matches “${q}”.`));
  }

  /* ================================================================ paint */

  function paintAll() {
    paintCoverage();

    const searching = state.view === 'checklist' && state.query.length > 0;
    const active = searching ? 'search' : state.view;
    ['checklist', 'papers', 'drill', 'plan', 'search'].forEach((v) => {
      panel(v).hidden = v !== active;
    });
    document.querySelectorAll('[data-view]').forEach((b) =>
      b.setAttribute('aria-current', String(b.dataset.view === state.view)));

    if (active === 'search') { paintSearch(); paintRail(); }
    if (active === 'checklist') { paintRail(); paintNextUp(); paintChapters(); }
    if (active === 'papers') paintPapers();
    if (active === 'drill') paintDrill();
    if (active === 'plan') paintPlan();

    const box = bind('backup');
    if (document.activeElement !== box) box.value = JSON.stringify(state.progress);
  }

  function say(message) {
    const node = bind('say');
    node.textContent = message;
    setTimeout(() => { node.textContent = ''; }, 2600);
  }

  /* =============================================================== events */

  function onClick(event) {
    const t = event.target.closest('button');
    if (!t) return;
    const d = t.dataset;

    if (d.view) {
      state.view = d.view;
      if (d.view === 'drill') buildQueue();
      if (d.view !== 'checklist') { state.query = ''; document.getElementById('find').value = ''; }
      paintAll();
      return;
    }

    if (d.subject) {
      state.subjectId = d.subject;
      state.openChapters.clear();
      state.openTopics.clear();
      if (state.view === 'drill') buildQueue();
      paintAll();
      return;
    }

    if (d.tick) {
      const subjectId = t.closest('[data-search-subject]')?.dataset.searchSubject
        || state.subjectId;
      setStatus(subjectId, d.tick, CYCLE[statusOf(subjectId, d.tick)]);
      paintAll();
      return;
    }

    if (d.open) {
      state.openTopics.has(d.open)
        ? state.openTopics.delete(d.open)
        : state.openTopics.add(d.open);
      paintAll();
      return;
    }

    if (d.chapter) {
      state.openChapters.has(d.chapter)
        ? state.openChapters.delete(d.chapter)
        : state.openChapters.add(d.chapter);
      paintChapters();
      return;
    }

    if (d.jump) {
      const subj = current();
      const chapter = subj.chapters.find((c) => c.topics.some((x) => x.id === d.jump));
      if (chapter) state.openChapters.add(chapter.id);
      state.openTopics.add(d.jump);
      paintChapters();
      const node = document.getElementById(`t-${subj.id}-${d.jump}`);
      if (node) {
        node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        node.querySelector('.topic-name').focus({ preventScroll: true });
      }
      return;
    }

    if (d.sitting) { state.sitting = d.sitting; paintPapers(); return; }

    if (d.revive) {
      const [subjectId, topicId] = d.revive.split('/');
      setStatus(subjectId, topicId, 'revising');
      paintAll();
      return;
    }

    if (d.filter) {
      state[d.filter] = d.value;
      document.querySelectorAll(`[data-filter="${d.filter}"]`).forEach((c) =>
        c.setAttribute('aria-pressed', String(c.dataset.value === d.value)));
      paintChapters();
      return;
    }

    switch (d.act) {
      case 'collapse':
        state.openChapters.clear();
        state.openTopics.clear();
        paintChapters();
        break;
      case 'drill-show': state.drill.shown = true; paintDrill(); break;
      case 'drill-got': drillAnswer('done'); break;
      case 'drill-shaky': drillAnswer('revising'); break;
      case 'drill-skip': drillAnswer(null); break;
      case 'drill-restart': buildQueue(); paintDrill(); break;
      case 'clear-date':
        delete state.prefs.examDate;
        savePrefs();
        paintPlan();
        break;
      case 'copy':
        navigator.clipboard?.writeText(bind('backup').value)
          .then(() => say('Copied.'))
          .catch(() => say('Select the text and copy it by hand.'));
        break;
      case 'restore':
        try {
          const parsed = JSON.parse(bind('backup').value);
          if (!parsed || typeof parsed !== 'object') throw new Error('bad shape');
          state.progress = Object.fromEntries(Object.entries(parsed).map(([k, v]) =>
            [k, typeof v === 'string' ? { s: v, t: null } : v]));
          saveProgress();
          paintAll();
          say('Restored.');
        } catch (err) {
          say('That text is not a progress backup.');
        }
        break;
      case 'reset':
        if (confirm('Clear every tick on this device? It cannot be undone.')) {
          state.progress = {};
          saveProgress();
          paintAll();
          say('Cleared.');
        }
        break;
    }
  }

  function onKey(event) {
    const typing = /^(INPUT|TEXTAREA)$/.test(event.target.tagName);
    if (event.key === '/' && !typing) {
      event.preventDefault();
      document.getElementById('find').focus();
      return;
    }
    if (event.key === 'Escape' && typing) {
      event.target.value = '';
      event.target.blur();
      state.query = '';
      paintAll();
      return;
    }
    if (state.view !== 'drill' || typing) return;

    if (event.key === ' ' || event.key === 'Enter') {
      if (!state.drill.shown) { event.preventDefault(); state.drill.shown = true; paintDrill(); }
      return;
    }
    if (event.key === '1' && state.drill.shown) drillAnswer('done');
    if (event.key === '2' && state.drill.shown) drillAnswer('revising');
    if (event.key === '3') drillAnswer(null);
  }

  /* ================================================================= boot */

  fetch('data/topics.json')
    .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .then((data) => {
      state.data = data;
      state.subjectId = data.subjects[0].id;
      state.progress = readProgress();
      try { state.prefs = JSON.parse(localStorage.getItem(KEY_PREFS)) || {}; }
      catch (err) { state.prefs = {}; }

      const years = new Set();
      data.subjects.forEach((s) => s.chapters.forEach((c) => c.topics.forEach((t) =>
        t.angles.forEach((a) => years.add(Number(a.year))))));
      const lo = Math.min(...years);
      const hi = Math.max(...years);
      state.years = Array.from({ length: hi - lo + 1 }, (_, i) => String(lo + i));

      paintMasthead();
      document.addEventListener('click', onClick);
      document.addEventListener('keydown', onKey);
      document.getElementById('find').addEventListener('input', (e) => {
        state.query = e.target.value.trim().toLowerCase();
        paintAll();
      });
      document.addEventListener('change', (e) => {
        if (e.target.id !== 'exam-date') return;
        state.prefs.examDate = e.target.value;
        savePrefs();
        paintPlan();
      });

      paintAll();
    })
    .catch((err) => {
      bind('chapters').append(Object.assign(document.createElement('p'), {
        className: 'void',
        textContent: 'data/topics.json did not load. If you opened this file directly, ' +
          'serve the folder instead: python3 -m http.server',
      }));
      console.error(err);
    });
})();
