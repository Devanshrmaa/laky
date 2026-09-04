# PYQ Revision Checklist

A revision tool built from a topic-frequency analysis of past BDS papers.

It answers one question the syllabus never will: **of everything that could be
asked, what actually keeps getting asked — and how much of it have I covered?**

181 topics across four subjects, carrying 955 recorded question appearances from
48 sittings:

| Subject | Topics | Sittings |
| --- | --- | --- |
| Pathology | 50 | 28 |
| Microbiology | 32 | 28 |
| Pharmacology | 50 | 28 |
| Dental Materials | 49 | 18 |

## The four views

**Checklist** — every topic, by chapter, with a three-state tick
(untouched → revising → done). "Worth the most right now" ranks what's left by
how much of the paper it actually buys you.

**Papers** — two kinds. **Transcribed papers** are the real thing: 37 question
papers read off photographs of the originals, with every question as printed and
the marks it actually carries. Each question links to the topics it covers, so
you can tick straight from the paper. **Reconstructed sittings** are the rest,
rebuilt from the topics the frequency analysis recorded against each sitting.
Either way, this is the view for mock practice.

**Drill** — active recall, heaviest topic first. The topic name comes up alone;
you answer it out loud, then turn it over to see every sitting that asked it and
how it was phrased. `space` reveals, `1` / `2` / `3` for *had it* / *shaky* /
*skip*.

**Plan** — set an exam date and it works out the pace: topics left, days left,
how many a day, coverage per subject. It also tracks *going cold* — anything
ticked more than three weeks ago, resurfaced for one more pass.

Typing in the search box searches all four subjects at once. `/` jumps to it.

## Coverage is weighted, and that matters

Ticking topics is the wrong scoreboard: finishing *Local Anaesthetics* (asked 14
times) is not the same as finishing *Pit and Fissure Sealants* (asked once). So
every percentage in the app is measured in **recorded question appearances**, not
topic count. The five heaviest untouched Pathology topics are worth 16.8% of
everything that subject has ever asked — the app says so, on the front page.

## How it works

The papers were analysed **once** into `data/topics.json`. That file is the
source of truth. The page only reads and displays it — it never recomputes a
tier or a frequency. If a number looks wrong, fix the JSON, not the JavaScript.

Progress is stored in the reader's own browser (`localStorage`). Nothing is
uploaded, there is no account, and there is a backup box in the footer for
moving ticks between a phone and a laptop.

## Running it

Static, no build step, but it `fetch()`es the JSON, so serve it rather than
opening the file directly:

```sh
python3 -m http.server 8000
# http://localhost:8000
```

Any static host works — GitHub Pages, Netlify, a folder on a server.

## Design notes

The look is drawn from the material itself: a stained slide and a marked exam
booklet. Cool slide-glass greys, `IBM Plex Sans`/`Mono` for the clinical
register, `Archivo` for the masthead.

**Colour carries exactly two things.** *Hue* says which subject; *depth of
stain* says how often the papers asked it. Each subject borrows a colour from
its own world:

| Subject | Stain | Light | Dark |
| --- | --- | --- | --- |
| Pathology | haematoxylin violet | `#6d3bab` | `#9b70da` |
| Microbiology | culture-plate teal | `#0c84a3` | `#2aa7ab` |
| Pharmacology | amber drug glass | `#9a6a10` | `#b3882b` |
| Dental Materials | porcelain rose | `#c62f6d` | `#d96a8a` |

Each hue carries a three-step ramp (`--h1` pale → `--h3` deep) for LOW / MEDIUM
/ HIGH. Selecting a subject sets `data-hue` on `<body>`, so the whole page —
tabs, rules, spines, accents — takes on what you're revising. Views that show
several subjects at once (Papers, Plan, search results) scope `data-hue` per
group instead, which is where the colour actually earns its place: a mixed
sitting separates into its subjects at a glance.

Green is reserved for *done* and rust for *going cold*; neither is ever reused
for weight. Colour is never the only signal — every tier carries its word, every
subject its name, every status its label.

The four hues were checked with the `dataviz` skill's validator rather than by
eye, all-pairs, in both modes: lightness band, chroma floor, colour-blind
separation and contrast. Light passes outright; dark sits at ΔE 6.2 deutan for
the teal/rose pair, which is inside the band that's legal only when a second
encoding is present — here every mark is captioned with its subject.

The overall coverage bar in the masthead is **stacked by subject**: one segment
per subject, as wide as that subject's share of all 955 recorded appearances,
filled as far as you've covered it. The whole exam, in one 9px strip.

**The signature is the spine** — the small strip on every topic row. One cell per
year from 2008 to 2027, inked where that year's paper asked it, darker where it
was asked more than once, with a faint footing every fifth year. It is the one
thing a plain list of counts cannot tell you: whether a topic is perennial,
dormant since 2014, or a recent favourite.

## The data

```jsonc
{
  "meta": { "site": "…", "student": "…", "course": "…", "totalTopics": 181, … },
  "subjects": [
    {
      "id": "pathology",
      "name": "Pathology",
      "papersAnalyzed": 28,
      "mustRead": ["…"],          // the analysis' own summary list
      "chapters": [
        {
          "id": "neoplasia-tumours",
          "name": "Neoplasia (Tumours)",
          "blurb": "one-line description",
          "topics": [
            {
              "id": "metastasis-routes-mechanism",
              "name": "Metastasis (Routes, Mechanism)",
              "tier": "HIGH",     // HIGH | MEDIUM | LOW
              "timesAsked": 9,
              "years": ["2010", "2011", "2012", "2013", "2020", "2023", "2025"],
              "totalMarks": 0,
              "hasDiagram": false,
              "angles": [
                { "year": "2013", "session": "Old Supple", "marks": null, "note": "" }
              ]
            }
          ]
        }
      ],
      "satPapers": []
    }
  ]
}
```

**Tiers** are assigned once, from frequency: `HIGH` = asked 7+ times,
`MEDIUM` = 4–6, `LOW` = 3 or fewer.

**Angles** are one entry per appearance — the year, which sitting it was
(Annual, Supple, Sup, Dec, Mar, a paper code…), and any note the analysis made
about how it was phrased that time. The Papers view is built entirely from these.

### Honest caveats about this dataset

- `timesAsked` is the frequency the source analysis states. For a handful of
  topics it differs by one from the number of sittings listed next to it. Both
  are kept exactly as written rather than silently reconciled.
- The source records no mark weightings, so `totalMarks` is `0` and every
  angle's `marks` is `null`. They are in the schema, ready to be filled in.
- A few entries are labelled with a paper code instead of a sitting year
  (e.g. `2027 (Code 6343)`) — kept verbatim rather than guessed at. They sort to
  the top of the Papers list as a result.
- `hasDiagram` is a manual flag, set only where the question itself implies
  something to draw (growth curve, life cycles). Set more as you go.
- Pharmacology's **Autonomic Nervous System** section is listed in the source
  with no table under it, so it appears as an empty chapter. That is a real gap
  in the analysis, shown rather than hidden.

## Making it yours

Names and wording come from `meta` in `data/topics.json` — change them there,
not in the HTML:

```json
"site": "Laky",
"student": "Laky",
"course": "BDS — 2nd year",
"title": "PYQ Revision Checklist",
"tagline": "What the papers actually keep asking."
```

## The transcribed papers

`data/papers.json` holds the real question papers, transcribed from photographs
of the originals. It is additive — the checklist works without it, and it never
changes the frequency counts in `topics.json`.

| Subject | Papers | Questions |
| --- | --- | --- |
| Pharmacology | 19 | 339 |
| Dental Materials | 18 | 179 |

```jsonc
{
  "id": "pharmacology-5743-2083",
  "subjectId": "pharmacology",
  "code": "5743",            // the paper code printed on the sheet
  "series": "2083",
  "session": "Annual",
  "year": null,              // only when legibly dated — see below
  "yearNote": null,          // how we know the year
  "maxMarks": 70,
  "format": "classic",       // or "modern" (Part A/B/C with an MCQ section)
  "incomplete": null,        // set when the photo hid part of the paper
  "questions": [
    { "n": "2a", "part": "A", "text": "Short note: Preanaesthetic medication.",
      "marks": 4, "topics": ["pre-anaesthetic-medication"] }
  ]
}
```

### What these papers do and don't tell you

- **They identify themselves by paper code, not by date.** Most sheets print a
  code (`5743`) and a series (`2083`) but no calendar year. A `year` is recorded
  only where one is legibly written or printed on that paper, and `yearNote`
  says which. Everything else is left `null` rather than guessed.
- **Marks are real.** Every question carries the marks the paper awards it, so
  `totalMarks` per paper is a genuine figure. Where a paper's questions no longer
  add up to 70, that is the signal that the photograph hid something — the
  `incomplete` note says so, and the app shows it.
- **The photographs are of a stack of papers on a desk.** Hands and overlapping
  sheets obscure parts of several Dental Materials papers; those are marked
  incomplete rather than filled in from guesswork.
- **Some papers are newer than the frequency analysis.** The August 2025 and
  March 2026 Dental Materials sittings post-date the analysis in `topics.json`,
  so their questions appear in the Papers view but are not yet counted in any
  topic's `timesAsked`.
- **Questions with no matching topic have an empty `topics` list.** That is not
  an oversight — it is where the syllabus analysis has a gap. Beta blockers and
  adrenaline come up repeatedly in Pharmacology and have no topic to tick,
  because the source's Autonomic Nervous System section is empty.

## Files

```
index.html          the page
assets/app.css      design system, light + dark, print
assets/app.js       four views, coverage maths, progress
data/topics.json    topic frequency analysis — source of truth for tiers
data/papers.json    real question papers, transcribed (optional, additive)
```
