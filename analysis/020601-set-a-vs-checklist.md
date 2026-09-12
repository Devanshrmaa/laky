# Paper 020601 (set A) vs. the checklist

An out-of-sample test. The paper below was photographed after the frequency
analysis in `data/topics.json` was written, and asks two things that analysis
has never heard of — so the hit rate here is a prediction being scored, not a
list being checked against itself.

Only page 2 of the paper was photographed: Part A (Pathology) and Part B
(Microbiology). The year and session are not printed on that page, and any
further section — the other 020601 papers carry a Part C of MCQs — is not in
the photograph. Everything below is scored on the 65 marks that page prints.

## The headline

**50 of the 60 marks you actually write were already on the checklist — 83%.**

Question 4 prints five parts for `5×4=20`, so you answer four of five. Of the
65 marks printed, 60 get written.

| | Marks | Share |
| --- | --- | --- |
| Directly on the checklist | 50 | **83%** |
| On the checklist, but the paper's angle is new | 0 written (5 printed) | — |
| Not on the checklist at all | 10 | 17% |

Split by part, the two halves of the paper behave completely differently:

| Part | On the checklist | Share |
| --- | --- | --- |
| Part A — Pathology | 20 of 30 | 67% |
| Part B — Microbiology | 30 of 30 | **100%** |

## Question by question

### Part A — Pathology (30 marks)

| Q | Marks | Checklist topic | Tier | Verdict |
| --- | --- | --- | --- | --- |
| 1. Define oedema, pathogenesis, renal oedema in detail | 10 | Edema (Pathogenesis, Pulmonary/Cardiac) | MEDIUM · asked 6× | **Hit** — but see *renal* below |
| 2a. Granuloma | 5 | Granulomatous Inflammation (Granuloma, Tubercle) | MEDIUM · asked 4× | **Hit** |
| 2b. Oncogenes | 5 | — | — | **Miss** |
| 2c. Leukoplakia | 5 | — | — | **Miss** |
| 2d. Lab diagnosis of diabetes mellitus | 5 | Diabetes Mellitus (Types, Pathogenesis, Renal lesions) | MEDIUM · asked 5× | **Hit** |

Question 1 is the checklist's own topic and five transcribed papers ask its
first two thirds verbatim — *"Pathogenesis of edema"* in 2013 (6514), 2013
(6343) and 2016 (7173), *pulmonary* in 2011 (7856), *cardiac* in 2011 (7868).
The **renal** third is new: no transcribed paper has asked it, and the topic
title names pulmonary and cardiac only.

Question 2d has a near-verbatim precedent under this exact paper code — the
2022 020601 paper opened with *"Define WHO criteria for diagnosis of diabetes
mellitus"*.

### Part B — Microbiology (30 marks written, 35 printed)

| Q | Marks | Checklist topic | Tier | Verdict |
| --- | --- | --- | --- | --- |
| 3. TB — types, pathogenesis, lab diagnosis, prevention | 10 | Pulmonary Tuberculosis (Lab Diagnosis) | HIGH · asked 12× | **Hit** — joint-heaviest topic in the subject |
| 4a. Moist heat sterilization | 5 | Sterilization by Moist Heat / Autoclave | HIGH · asked 12× | **Hit**, near-verbatim |
| 4b. What is mycosis? Types of mycoses | 5 | Mycology chapter, but no classification topic | — | **Partial** |
| 4c. Pathogenesis of Herpes virus | 5 | Herpes Simplex Virus (HSV) | LOW · asked 2× | **Hit** |
| 4d. Acquired vs. innate immunity | 5 | Innate vs. Acquired Immunity | MEDIUM · asked 4× | **Hit**, verbatim |
| 4e. Any two protozoan diseases | 5 | Malaria (10×) + Entamoeba histolytica (7×) | HIGH | **Hit** |

Four of the five options are straight off the checklist, so a student who
skipped 4b answered twenty marks of Part B without leaving the list. Question 3
and question 4a are the two heaviest topics Microbiology has, both asked twelve
times on the record. Question 4a has been asked in almost these words nine
times in the transcribed set alone — *"Define Sterilization and Disinfection.
Discuss sterilization by moist heat in detail"* (6515, 2013) and again in 2018
(7224). Question 4d is asked as printed in 2012 (6033), 2013 (6800), 2016
(7857) and 2023 (020601).

## Where the marks came from, by tier

Of the 50 marks the checklist already had:

| Tier | Marks | Share |
| --- | --- | --- |
| HIGH (asked 7+ times) | 20 | 40% |
| MEDIUM (4–6) | 25 | 50% |
| LOW (3 or fewer) | 5 | 10% |

**The paper leaned MEDIUM, not HIGH.** Half the marks the checklist caught came
out of its middle band, and the whole of Part A did. That is the practical
lesson: revising only the HIGH tier would have covered 20 of 60 marks here.

The one LOW-tier hit is worth naming — **Herpes simplex**, on record twice
(2013, 2019) plus a 2018 short note on its oral manifestations. It is exactly
the kind of topic a frequency ranking tells you to leave until last, and it was
worth five marks.

## The must-read lists, scored

`topics.json` carries a `mustRead` summary per subject. They did not perform
alike.

**Microbiology — 3 of 6 lines, worth 20 of 30 marks.** Sterilization
(autoclave) → 4a. Pulmonary TB lab diagnosis → Q3. Malaria and *Entamoeba
histolytica* → 4e. Candidiasis is a partial via 4b. Hypersensitivity/ELISA,
oral flora and dental caries, and HIV/HBV did not appear.

**Pathology — 0 of 4 lines, 0 marks.** Not one item on that list was asked:
not necrosis, acute inflammation, wound healing, benign vs. malignant,
metastasis, the haematology block, osteosarcoma, ameloblastoma, thrombosis,
shock or fracture healing. **No HIGH-tier Pathology topic appeared on this
paper at all** — every Pathology hit was MEDIUM.

## What the paper exposed

Four gaps, in order of how much they cost:

1. **Leukoplakia — 5 marks, and a total blind spot.** The word appears zero
   times in `topics.json` and zero times across all 104 transcribed papers.
   Nothing in the checklist points at premalignant oral lesions.
2. **Oncogenes — 5 marks, effectively absent.** One MCQ mention on record
   ("oncogenic viruses in humans", 6555, 2021) and no written question ever.
   The nearest topic, *Carcinogenesis (Chemical, Radiation)* (MEDIUM, 4×), is a
   different answer.
3. **Renal oedema — part of a 10-mark question.** The topic exists but is
   scoped to pulmonary and cardiac; the renal pathway is not in it.
4. **Classification of mycoses — 5 marks, skippable.** The Mycology chapter is
   four named organisms, with no "define and classify mycoses" entry. The same
   framing went unmapped once before, in 2011 ("Morphological classification of
   Fungus", 7869).

Items 1 and 2 are the reason this counts as an out-of-sample test: had this
sitting been part of the source frequency analysis, Leukoplakia and Oncogenes
would be in `topics.json`. They are not.

## The other side of the ledger

The checklist is a bet placed across sittings, not a prediction of one paper.
Topics it ranks HIGH that this paper did not ask include Candidiasis (13×),
Acute Inflammation (12×), HIV/AIDS (11×), Benign vs. Malignant (11×), Wound
Healing (10×), Megaloblastic Anaemia (10×), Necrosis, Metastasis, Amyloidosis,
AML, CML and Ameloblastoma (9× each). None of that is a failure of the
ranking — it is what "asked 9 times in 28 sittings" means. It is also the list
still owed, and the reason to keep revising by weight rather than by what one
paper happened to want.

## Suggested changes to the data

Not applied here — adding topics would change `totalTopics` (181) and
`totalQuestionDemands` (955), which are the source analysis' own numbers and
should not be rewritten off a single paper. Worth considering:

- A **Leukoplakia / premalignant oral lesions** topic under Neoplasia.
- An **Oncogenes / molecular basis of cancer** topic, or widening
  *Carcinogenesis* to name them.
- Widening *Edema* to "Pulmonary/Cardiac/Renal".
- A **Classification of mycoses** topic under Mycology.

The paper itself is transcribed into `data/papers.json` as
`pathology-020601-setA` and `microbiology-020601-setA`, so it is browsable in
the Papers view and its wording now shows on the topics it covers. Two topics
gained their first real question wording from it: *Herpes Simplex Virus (HSV)*
and *Innate vs. Acquired Immunity*.
