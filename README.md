# PYQ Revision Checklist

A calm revision tracker built from a topic-frequency analysis of past BDS papers.

It answers one question, in one place: **of everything that could be asked, what
actually keeps getting asked — and how much of it have I covered?**

Four subjects, 181 topics, 955 recorded question appearances:

| Subject | Topics | Sittings analysed |
| --- | --- | --- |
| Pathology | 50 | 28 |
| Microbiology | 32 | 28 |
| Pharmacology | 50 | 28 |
| Dental Materials | 49 | 18 |

## How it works

The papers were analysed **once** into `data/topics.json`. That file is the
source of truth. The page only reads and displays it — it never recomputes a
tier or a frequency on its own. If a number looks wrong, fix the JSON, not the
JavaScript.

Progress (not started → revising → done) is stored in the reader's own browser
via `localStorage`. Nothing is uploaded anywhere, and there is no account.
Because it is per-browser, there is a **Backup & restore** box in the footer for
moving ticks between a phone and a laptop.

## Running it

It is a static page with no build step, but it does `fetch()` the JSON, so it
needs to be served rather than opened as a `file://` path:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

Any static host works — GitHub Pages, Netlify, a folder on a server.

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
about how it was phrased that time.

### Honest caveats about this dataset

- `timesAsked` is the frequency the source analysis states. For a handful of
  topics it differs by one from the number of sittings listed next to it. Both
  are kept exactly as written rather than silently reconciled.
- The source records no mark weightings, so `totalMarks` is `0` and every
  angle's `marks` is `null`. They are in the schema, ready to be filled in from
  the actual papers.
- A few entries are labelled with a paper code instead of a sitting year
  (e.g. `2027 (Code 6343)`) — kept verbatim rather than guessed at.
- `hasDiagram` is a manual flag. It is only set where the question itself
  implies something to draw (growth curve, life cycles). Set more as you go.
- Pharmacology's **Autonomic Nervous System** section is listed in the source
  with no table under it, so it appears as an empty chapter. That is a real gap
  in the analysis, shown rather than hidden.

## Making it yours

Names and wording all come from `meta` in `data/topics.json` — change them
there, not in the HTML:

```json
"site": "Laky",
"student": "Laky",
"course": "BDS — 2nd year",
"title": "PYQ Revision Checklist",
"tagline": "What the papers actually keep asking."
```

## Files

```
index.html          the page
assets/app.css      styling, light + dark
assets/app.js       rendering, filtering, progress
data/topics.json    the dataset — source of truth
```
