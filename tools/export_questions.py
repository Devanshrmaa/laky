#!/usr/bin/env python3
"""Export every question this site holds into portable files under export/.

The site keeps its questions in two places, and this reads both:

  data/papers.json  the real papers, transcribed question by question
  data/topics.json  the frequency analysis: topics, tiers, every sitting on record

and writes them back out in forms another site, a spreadsheet or a person can
use without this page's JavaScript:

  export/questions.csv      one row per transcribed question, topics resolved
  export/questions.json     the same rows as JSON, ready to import elsewhere
  export/topics.csv         one row per topic, analysis plus on-paper counts
  export/sittings.csv       one row per sitting the analysis recorded
  export/all-data.json      topics + papers + scored, verbatim, in one file
  export/<subject>.md       readable: topic-wise question bank, then every paper
  export/README.md          what each file is, with the counts

Like the page, nothing here recomputes a tier or a frequency: those are read
from topics.json as written. Run from anywhere:

  python3 tools/export_questions.py
"""

import csv
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'data'
OUT = ROOT / 'export'

TIER_RANK = {'HIGH': 0, 'MEDIUM': 1, 'LOW': 2}


def load(name):
    with open(DATA / name, encoding='utf-8') as f:
        return json.load(f)


def fmt_marks(m):
    """4.5 stays 4.5; 4.0 prints as 4."""
    if m is None:
        return ''
    return str(int(m)) if float(m).is_integer() else str(m)


def paper_label(p):
    """The paper said the way the site says it: year (if printed), session, code."""
    bits = [p['year']] if p['year'] else []
    bits.append(p['session'])
    bits.append(f"code {p['code']}")
    return ' · '.join(bits)


def main():
    topics = load('topics.json')
    papers = load('papers.json')
    scored = load('scored.json')

    subjects = topics['subjects']
    subject_name = {s['id']: s['name'] for s in subjects}

    # Every topic, findable by id. Ids are unique across all four subjects, so a
    # combined Pathology/Microbiology paper that tags a topic from the other half
    # still resolves — the page drops those, this keeps them and says so.
    topic_index = {}
    for s in subjects:
        for c in s['chapters']:
            for t in c['topics']:
                topic_index[t['id']] = {'subject': s, 'chapter': c, 'topic': t}

    # Invert the papers into topic -> questions, the same way the page does.
    asked = defaultdict(list)
    unmapped = defaultdict(list)
    rows = []
    for p in papers['papers']:
        for q in p['questions']:
            resolved = []
            for tid in q['topics']:
                hit = topic_index.get(tid)
                if hit is None:
                    raise SystemExit(f"{p['id']} q{q['n']}: unknown topic {tid}")
                resolved.append(hit)
                asked[tid].append((p, q))
            if not q['topics']:
                unmapped[p['subjectId']].append((p, q))

            rows.append({
                'subject': subject_name[p['subjectId']],
                'subjectId': p['subjectId'],
                'paperId': p['id'],
                'paperCode': p['code'],
                'series': p['series'],
                'session': p['session'],
                'year': p['year'],
                'yearNote': p['yearNote'],
                'regulation': p['regulation'],
                'format': p['format'],
                'paperMaxMarks': p['maxMarks'],
                'paperHours': p['hours'],
                'paperIncomplete': p['incomplete'],
                'part': q['part'],
                'questionNo': q['n'],
                'marks': q['marks'],
                'question': q['text'],
                'topics': [{
                    'id': h['topic']['id'],
                    'name': h['topic']['name'],
                    'subjectId': h['subject']['id'],
                    'chapter': h['chapter']['name'],
                    'tier': h['topic']['tier'],
                    'timesAsked': h['topic']['timesAsked'],
                } for h in resolved],
            })

    # Newest first, undated last, then by code — the order the page reads them in.
    def paper_order(p):
        return (-(int(p['year']) if p['year'] else 0), p['code'])

    def newest_first(hits):
        return sorted(hits, key=lambda pq: (paper_order(pq[0]), str(pq[1]['n'])))

    OUT.mkdir(exist_ok=True)

    # ------------------------------------------------------------ questions
    with open(OUT / 'questions.json', 'w', encoding='utf-8') as f:
        json.dump({
            'meta': {
                'source': papers['meta']['source'],
                'note': papers['meta']['note'],
                'generatedFrom': ['data/papers.json', 'data/topics.json'],
                'totalPapers': len(papers['papers']),
                'totalQuestions': len(rows),
            },
            'questions': rows,
        }, f, ensure_ascii=False, indent=1)
        f.write('\n')

    with open(OUT / 'questions.csv', 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f)
        w.writerow(['subject', 'paper_id', 'paper_code', 'series', 'session', 'year',
                    'year_note', 'regulation', 'format', 'paper_max_marks', 'paper_hours',
                    'paper_incomplete', 'part', 'q_no', 'marks', 'question',
                    'topic_ids', 'topic_names', 'chapters', 'tiers', 'times_asked'])
        for r in rows:
            w.writerow([
                r['subject'], r['paperId'], r['paperCode'], r['series'] or '',
                r['session'], r['year'] or '', r['yearNote'] or '', r['regulation'] or '',
                r['format'], r['paperMaxMarks'], r['paperHours'], r['paperIncomplete'] or '',
                r['part'], r['questionNo'], fmt_marks(r['marks']), r['question'],
                ' | '.join(t['id'] for t in r['topics']),
                ' | '.join(t['name'] for t in r['topics']),
                ' | '.join(t['chapter'] for t in r['topics']),
                ' | '.join(t['tier'] for t in r['topics']),
                ' | '.join(str(t['timesAsked']) for t in r['topics']),
            ])

    # --------------------------------------------------------------- topics
    with open(OUT / 'topics.csv', 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f)
        w.writerow(['subject', 'chapter', 'topic_id', 'topic', 'tier', 'times_asked',
                    'years', 'sittings', 'on_paper_questions', 'on_paper_marks',
                    'has_diagram'])
        for s in subjects:
            for c in s['chapters']:
                for t in c['topics']:
                    hits = asked.get(t['id'], [])
                    w.writerow([
                        s['name'], c['name'], t['id'], t['name'], t['tier'], t['timesAsked'],
                        ', '.join(t['years']),
                        '; '.join(f"{a['year']} {a['session']}" + (f" ({a['note']})" if a['note'] else '')
                                  for a in sorted(t['angles'], key=lambda a: a['year'], reverse=True)),
                        len(hits), fmt_marks(sum(q['marks'] for _, q in hits)),
                        'yes' if t['hasDiagram'] else '',
                    ])

    with open(OUT / 'sittings.csv', 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f)
        w.writerow(['subject', 'chapter', 'topic', 'tier', 'year', 'session', 'note'])
        for s in subjects:
            for c in s['chapters']:
                for t in c['topics']:
                    for a in sorted(t['angles'], key=lambda a: a['year'], reverse=True):
                        w.writerow([s['name'], c['name'], t['name'], t['tier'],
                                    a['year'], a['session'], a['note']])

    # ------------------------------------------------------------- everything
    with open(OUT / 'all-data.json', 'w', encoding='utf-8') as f:
        json.dump({'topics': topics, 'papers': papers, 'scored': scored},
                  f, ensure_ascii=False, indent=1)
        f.write('\n')

    # ------------------------------------------------------- readable, per subject
    for s in subjects:
        sp = sorted((p for p in papers['papers'] if p['subjectId'] == s['id']), key=paper_order)
        nq = sum(len(p['questions']) for p in sp)
        ntopics = sum(len(c['topics']) for c in s['chapters'])
        out = []
        add = out.append

        add(f"# {s['name']} — every question\n")
        add(f"BDS 2nd year · {ntopics} topics from {s['papersAnalyzed']} analysed sittings · "
            f"{len(sp)} transcribed papers carrying {nq} questions.\n")
        add('Generated from `data/topics.json` and `data/papers.json` by '
            '`tools/export_questions.py` — edit the data, not this file.\n')
        add(f"Tiers: {topics['meta']['tierRule']}\n")
        add('## Contents\n')
        add('1. [Must read](#must-read)')
        add('2. [Question bank, topic by topic](#question-bank-topic-by-topic)')
        add('3. [Questions with no topic on the checklist](#questions-with-no-topic-on-the-checklist)')
        add('4. [The papers, in full](#the-papers-in-full)\n')

        add('## Must read\n')
        for line in s['mustRead']:
            add(f'- {line}')
        add('')

        add('## Question bank, topic by topic\n')
        add('Every topic with the frequency analysis first (tier, times asked, every '
            'sitting on record), then the real questions that asked it, word for word, '
            'newest first.\n')
        for ci, c in enumerate(s['chapters'], 1):
            add(f"### {ci}. {c['name']}\n")
            if c.get('blurb'):
                add(f"_{c['blurb']}_\n")
            if not c['topics']:
                add('No topics under this chapter in the source analysis — a real gap, '
                    'not an omission here. Its questions are listed under '
                    '"Questions with no topic on the checklist".\n')
                continue
            for t in sorted(c['topics'], key=lambda t: (TIER_RANK[t['tier']], -t['timesAsked'], t['name'])):
                hits = newest_first(asked.get(t['id'], []))
                marks = sum(q['marks'] for _, q in hits)
                add(f"#### {t['name']}\n")
                tags = [f"**{t['tier']}**", f"asked {t['timesAsked']}×"]
                if hits:
                    tags.append(f"{len(hits)} on paper · {fmt_marks(marks)} marks")
                if t['hasDiagram']:
                    tags.append('diagram')
                add(' · '.join(tags) + '\n')
                add(f"Years: {', '.join(t['years'])}\n")
                angles = sorted(t['angles'], key=lambda a: a['year'], reverse=True)
                add('Sittings on record: ' + '; '.join(
                    f"{a['year']} {a['session']}" + (f" — {a['note']}" if a['note'] else '')
                    for a in angles) + '\n')
                if hits:
                    add('How it was asked:\n')
                    for p, q in hits:
                        other = '' if p['subjectId'] == s['id'] else f" ({subject_name[p['subjectId']]} paper)"
                        add(f"- {q['text']} — _{paper_label(p)}{other}, Q{q['n']}, "
                            f"{fmt_marks(q['marks'])} marks_")
                    add('')
                else:
                    add('_No transcribed paper covers this one yet._\n')

        add('## Questions with no topic on the checklist\n')
        loose = newest_first(unmapped.get(s['id'], []))
        if loose:
            add(f'{len(loose)} questions off the real papers that the analysis has no '
                'topic for — mostly MCQ blocks, and the gaps worth knowing about.\n')
            for p, q in loose:
                add(f"- {q['text']} — _{paper_label(p)}, Q{q['n']}, {fmt_marks(q['marks'])} marks_")
            add('')
        else:
            add('None — every question maps to a topic.\n')

        add('## The papers, in full\n')
        add('Each paper as printed, with the marks it awards, newest first. A year '
            'appears only where one is legibly printed on the paper; undated papers '
            'come last, by code.\n')
        for p in sp:
            add(f"### {paper_label(p)}\n")
            facts = [f"Paper code {p['code']}"]
            if p['series']:
                facts.append(f"series {p['series']}")
            facts += [f"{p['maxMarks']} marks", f"{p['hours']} hours",
                      f"{len(p['questions'])} questions", p['format']]
            if p['regulation']:
                facts.append(p['regulation'])
            add(' · '.join(facts) + '\n')
            if p['yearNote']:
                add(f"Dated from the paper itself — {p['yearNote']}.\n")
            if p['incomplete']:
                add(f"> Incomplete: {p['incomplete']}\n")
            for part in dict.fromkeys(q['part'] for q in p['questions']):
                qs = [q for q in p['questions'] if q['part'] == part]
                add(f"**Part {part}** — {fmt_marks(sum(q['marks'] for q in qs))} marks\n")
                for q in qs:
                    names = [topic_index[tid]['topic']['name'] for tid in q['topics']]
                    tail = f" _[{'; '.join(names)}]_" if names else ''
                    add(f"- **{q['n']}.** {q['text']} ({fmt_marks(q['marks'])}){tail}")
                add('')

        (OUT / f"{s['id']}.md").write_text('\n'.join(out), encoding='utf-8')

    # ---------------------------------------------------------- the guide
    guide = [
        '# Every question, exported\n',
        'Generated by `tools/export_questions.py` from `data/topics.json`, '
        '`data/papers.json` and `data/scored.json`. Do not edit these files by hand — '
        'fix the data and run `python3 tools/export_questions.py` again.\n',
        '| Subject | Topics | Transcribed papers | Questions | Unmapped |',
        '| --- | --- | --- | --- | --- |',
    ]
    for s in subjects:
        sp = [p for p in papers['papers'] if p['subjectId'] == s['id']]
        guide.append(
            f"| [{s['name']}]({s['id']}.md) | {sum(len(c['topics']) for c in s['chapters'])} "
            f"| {len(sp)} | {sum(len(p['questions']) for p in sp)} "
            f"| {len(unmapped.get(s['id'], []))} |")
    guide.append(f"| **All** | {len(topic_index)} | {len(papers['papers'])} | {len(rows)} "
                 f"| {sum(len(v) for v in unmapped.values())} |\n")
    guide += [
        '## Which file to use\n',
        '| File | What it is | Use it for |',
        '| --- | --- | --- |',
        '| `<subject>.md` | Must-read list, every topic with every question that asked it '
        '(word for word, newest first), unmapped questions, then every paper in full | '
        'Reading and revising, printing |',
        '| `questions.csv` | One row per question: paper, part, number, marks, wording, topics | '
        'Excel / Google Sheets, importing into another site |',
        '| `questions.json` | The same rows as JSON, topics resolved to name, chapter and tier | '
        'Importing into another site or app |',
        '| `topics.csv` | One row per topic: chapter, tier, times asked, years, every sitting, '
        'questions and marks on the transcribed papers | Building a checklist |',
        '| `sittings.csv` | One row per sitting the frequency analysis recorded against a topic | '
        'Year-wise views, the reconstructed sittings |',
        '| `all-data.json` | `topics.json`, `papers.json` and `scored.json` verbatim, in one file | '
        'Running a copy of this site — split it back into `data/` |\n',
        '## Reading the data honestly\n',
        f"- **{sum(1 for p in papers['papers'] if not p['year'])} of the {len(papers['papers'])} "
        'papers are undated.** Papers print a code and series; `year` is filled only where one '
        'is legibly written or printed on the paper, and `year_note` says which. Otherwise it is blank.',
        '- **Marks are the paper\'s own**, so a few are fractional — 9-mark questions split 4.5 + 4.5.',
        '- **Some papers are incomplete** — the photograph hid part of them. The '
        '`paper_incomplete` column says what is missing.',
        '- **Unmapped questions** have no topic on the checklist. Mostly MCQ blocks, plus real '
        'gaps such as beta blockers and adrenaline, whose Pharmacology chapter (ANS) has no topics.',
        '- **Two counts per topic, kept apart.** `times_asked` is the frequency analysis; '
        '`on_paper_questions` counts the transcribed papers. They come from different sets of '
        'sittings and are not reconciled.',
        '- **Combined papers.** Older Pathology and Microbiology sittings share one sheet; a few '
        'of their questions are tagged with a topic from the other half. The subject files list '
        'those under the topic\'s own subject and say which paper they came off.',
        '- **Paper codes are this university\'s.** If another syllabus uses different codes or '
        'chapters, map by topic name rather than by id.',
    ]
    (OUT / 'README.md').write_text('\n'.join(guide) + '\n', encoding='utf-8')

    total_hits = sum(len(v) for v in asked.values())
    print(f"{len(papers['papers'])} papers, {len(rows)} questions, "
          f"{len(topic_index)} topics, {total_hits} question→topic links -> {OUT.relative_to(ROOT)}/")


if __name__ == '__main__':
    main()
