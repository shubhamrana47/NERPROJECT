# Fieldnote — Annotator's Guide

A guide to marking up agricultural advisories in Fieldnote. If you are setting
the system up or working on its code, see [README.md](README.md) instead.

---

## What this is for

A model called **AgNER-BERTa** reads agricultural advisories and proposes which
words are crops, chemicals, diseases, quantities, dates and so on. It is good,
but it is not right every time, and nobody should train or measure a model on
its own guesses.

Your job is to judge those proposals: approve what is correct, fix what is
mislabelled, add what the model missed, and remove what is not an entity at
all. What comes out is a dataset where **every span records whether a person
verified it** — which is what makes it usable both for training a better model
and for measuring one honestly.

One line of your file is one **passage**: a few sentences of advice about a
particular crop at a particular stage. You work through them one passage at a
time.

---

## What you need

A `.json` or `.jsonl` file. For a `.jsonl` file, **one JSON object per line with
a `text` field is the only requirement**:

```json
{"text": "For wheat sown after mid-December, apply 55 kg DAP per acre at sowing."}
```

If your file also carries `passage_tag`, `crops`, `stages` or `subjects`, they
are shown alongside each passage so you can see what it is about:

```json
{"passage_id": "3817e6a6596d", "passage_tag": "PUN-0001",
 "crops": ["WHEAT"], "stages": ["Sowing"], "subjects": ["WHEAT (Sowing)"],
 "text": "Farmers are advised to sow varieties PBW 752 ..."}
```

Nested advisory documents, paged documents and plain JSON also work — the file
is parsed with whatever structure it has.

---

## Two kinds of file

| Your file | What happens |
| :--- | :--- |
| Advisory text to mark up | You annotate it, and the model can suggest entities as you go. |
| Output from the hybrid pipeline, entities already tagged | You **validate** it: confirm, reject or relabel what the pipeline found, and add what it missed. The model never runs, and no model option is offered. |

The platform works out which it is from the file itself when you open it.

---

## Validating pipeline output

When a file arrives already tagged, the job changes from marking up to checking.

* Each entity is listed on the left with its **score** and the **sources** that
  backed it — `llm`, `berta`, `ontology`, a regex rule. A span at 1.00 agreed by
  three sources needs a glance; one at 0.61 from a single source is where your
  time belongs.
* **Correct** keeps it. **Wrong** rejects it — the entity stays in the file,
  struck through, and **Put it back** undoes that.
* To fix a label, click the entity in the passage and pick a label on the right,
  or press its number. The original label is remembered and travels in the
  export. With words selected, a label applies to the selection instead — a
  selection always wins over whatever is in focus.
* **If the pipeline missed an entity, add it.** Drag across the words and pick a
  label, exactly as in annotation. A span of yours is listed as *you added
  this*, and carries **Remove** instead of Correct and Wrong — there is no
  pipeline guess behind it to judge, so it is either right or it goes. In the
  export it arrives as `"validation": {"status": "added"}` with
  `"sources": ["human"]`, which is how it stays yours after a round trip.
* Your span may **overlap** one of the pipeline's — marking a longer phrase than
  it did is a normal correction. Both are kept in the validated file; the row
  says `overlaps` so the clash is visible. A training export keeps the one a
  person stands behind.
* The record's own `n_entities` is left as the pipeline wrote it: it is history.
  The current total is in `validation_summary.entities`.
* `Mark N correct and continue` records everything still undecided as correct
  and moves on. <kbd>A</kbd> does the same.
* If the pipeline found **nothing** in a passage, say **Nothing to validate**
  before moving on. Without it, a passage nobody opened looks exactly like one
  that was checked and found empty.
* Export gives you `validated_<timestamp>.jsonl`: your original file with a
  `validation` block on each entity you judged, and a `validation_summary` per
  record. Upload it again any time to carry on where you stopped.

Rejected entities are deliberately kept, because "the pipeline said this and a
person disagreed" is the most useful thing in the file. They are never used as
training labels.

---

## Opening a file

Click the **file name** in the top bar, or **New** in the left panel, and pick
your file. You are asked how to start:

| Choice | What happens |
| :--- | :--- |
| **Let the model read it first** | Passages arrive pre-marked. You review and correct. This is the normal choice. |
| **Start from a clean sheet** | No predictions at all. You mark every span yourself. Use this when building reference data without model influence. |

Either way the file opens **immediately**, however large it is. Nothing waits
for the model.

---

## The screen

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Fieldnote   your_file.jsonl ▾            Whole document    Export        │
├────────────────┬───────────────────────────────┬─────────────────────────┤
│  Spans here  12│  PUN-0001  WHEAT  Sowing      │  Entity labels      37  │
│  ─────────────│  WHEAT (Sowing)                │  ──────────────────────  │
│  1 wheat      │  3 sentences                   │  "yellow rust"          │
│    Crop  4:9  │                                │  pick a label           │
│  2 55 kg      │  ┌──┬──────────────────────┐   │  ──────────────────────  │
│    Quantity   │  │ 1│ For wheat sown after │   │  Recently used          │
│  3 DAP        │  │  │ mid-December, apply  │   │  [Crop 4][Disease 7]    │
│    Chemical   │  │  │ 55 kg DAP per acre.  │   │  [Chemical 6][Quantity] │
│               │  │ 2│ Broadcast 45 kg urea │   │  ──────────────────────  │
│  ─────────────│  │  │ for timely sown crop │   │  Crops & Botanical      │
│  Progress  12%│  └──┴──────────────────────┘   │   ● Crop            41  │
│  passage 12 of│  Reset  Skip  Save  [Approve]  │   ● Fruit            3  │
│  323          │                                │   ● Vegetable        7  │
│  Go to passage│  To add a span: drag across…   │  Pests & Diseases       │
├────────────────┴───────────────────────────────┴─────────────────────────┤
│  passage 12 / 323   3 sentences here   1,204 spans            Export     │
└──────────────────────────────────────────────────────────────────────────┘
```

* **Left — Spans here.** Every span in the passage you are on. Click a label to
  change it, **Approve** one at a time or **Approve all**, or **remove** one.
  The number before each span is the sentence it sits in.
* **Middle — the passage.** All of its sentences, numbered down the gutter, so
  you never lose the context a sentence sits in.
* **Right — Entity labels.** All 37, always open and scrollable, grouped by
  domain. The block at the top follows the labels you have been using.
* **Bottom.** Where you are, how many spans exist, and the export button. A
  quiet `saving` appears here while a change is being written.

---

## What the marks mean

| Mark | Meaning |
| :--- | :--- |
| **Solid underline** | the model proposed this span |
| **Dashed underline** | you added or changed it |
| Small label beneath | the entity type |
| Red dot before the label | added by hand |
| Colour | the entity type — each of the 37 has its own, and it is the only colour on the screen |

---

## Annotating a passage

**1. Read it.** The model's spans are already marked.

**2. Add what it missed.** Drag across the words — any words, in any sentence —
then either press the label's number key or click a label on the right. All 37
are listed there; the search box finds one by name. The
selected text appears in both the right panel and the bar under the passage, so
you can see exactly what you are about to label.

**3. Fix what is wrong.** Click the span in the text and the right panel opens
an editor for it, where you can change its label or remove it. Or click the
label in the left panel and pick a different type there.

**4. Remove what is not an entity.** Hover a span and click the small ×, or use
**remove** in the left panel.

**5. Approve and continue** — the dark button, or press <kbd>A</kbd>. Every span
in the passage is marked as verified by you, and the next passage opens.

If a passage is already correct, <kbd>A</kbd> is the whole job. If it needs
nothing from you and you would rather not vouch for it, use **Skip**.

### Comparing with the model

The tabs above the passage switch between **Model output** (what the model
proposed, read-only, never changed by your edits), **Annotate** (your working
copy), and **Both** side by side. Useful when you have reworked a passage and
want to see what you changed.

**Reset passage** throws your edits away and puts the model's original reading
back. It asks first.

---

## Keys

| Key | Action |
| :--- | :--- |
| <kbd>1</kbd>–<kbd>9</kbd> | Label the selected text |
| <kbd>A</kbd> | Approve the passage and go to the next |
| <kbd>→</kbd> / <kbd>←</kbd> | Next / previous passage |
| <kbd>/</kbd> | Jump to the label search box |
| <kbd>Esc</kbd> | Drop the current selection |

The number keys are fixed, so a key always means the same label:

| | | | | | | | | |
|:--|:--|:--|:--|:--|:--|:--|:--|:--|
| **1** Person | **2** Organization | **3** Location | **4** Crop | **5** Date & time | **6** Chemical | **7** Disease | **8** Soil | **9** Weather |

Everything else is one click away on the right, or found by typing in the
search box. The quick block at the top of that panel reorders itself to the
labels you actually use, but the numbers never move.

---

## Saving

**You do not need to save.** Approving a passage saves it, and moving between
passages saves anything unsaved on the way out. Writes happen behind the
interface, so nothing waits for the network.

* `saving` in the bottom bar means a write is still going out. It usually
  disappears immediately.
* **Don't close the tab while `saving` is showing** — the browser will warn you.
* **Unsaved changes in this passage** means you have edited and not yet
  approved or moved on. **Save** commits it without approving.
* If a write fails you get a message naming the passage, and **Save** retries.

---

## The model runs ahead of you

Nothing is predicted when the file opens. The model reads the passage you are on
plus the next ten, and keeps up as you move forward. That is why a large file
opens instantly.

* **"The model is reading this passage"** — it has not been read yet. You can
  start marking it up anyway; the model's spans will join yours when they land.
* **"The model service could not be reached"** — the inference service is down
  or restarting. **Try again** re-requests that window. Your annotations are
  unaffected.
* The bottom bar shows `reading ahead` with how many passages are still
  unread.

Jumping far ahead (**Go to passage**) means the model has to catch up from
there, which takes a moment.

---

## Exporting

**Export** gives you one file: **your original file, with the annotations
appended**. Same records, same order, every original field untouched, with two
fields added at the end:

```json
{
  "passage_id": "3817e6a6596d", "passage_tag": "PUN-0001",
  "crops": ["WHEAT"], "stages": ["Sowing"], "n_chars": 1059,
  "text": "Farmers are advised to sow varieties PBW 752 ...",

  "entities": [
    { "start": 37, "end": 44, "label": "Other", "text": "PBW 752",
      "source": "human", "verified": true,  "status": "approved", "confidence": 1 },
    { "start": 108, "end": 113, "label": "Crop", "text": "wheat",
      "source": "model", "verified": false, "status": "accepted", "confidence": 0.93 }
  ],
  "annotation": {
    "spans": 2, "model_spans": 1, "human_spans": 1, "verified_spans": 1,
    "reviewed": true, "ner_status": "done"
  }
}
```

A note appears telling you what the saved file contains, for example
*"Saved annotated_2026-10-26_14-05-31.jsonl — 323 records, 1,204 spans, 712 verified
by hand."*

### Reading the output

* `start` / `end` are character positions in that record's own `text`.
* `source` says who proposed the span: `model` or `human`.
* **`verified` is the one that matters.** It is `true` only where a person
  approved, edited or added the span. `status: "accepted"` means only that the
  model was confident and **nobody has checked it**.
* `ner_status` says whether the model ever read that passage, so a record with
  no entities because nobody looked is distinguishable from one that genuinely
  has none.
* **Every record is present**, including passages with no entities at all. Those
  are the negative examples a model needs in order to learn when *not* to
  predict an entity.

**For a gold benchmark, keep only `verified: true` spans.** One file serves both
purposes — there is no separate gold export to produce or keep in step.

### The exported file is your working copy

You can **upload an exported file again to carry on where you left off.** Its
annotations come back with their provenance intact, and those passages are not
sent to the model a second time. Spans that no longer match the text they claim
are dropped on the way in, so an edited file cannot corrupt the annotation.

This is the right way to pause long work, hand a file to someone else, or keep a
versioned copy as you go.

---

## The 37 entity labels

| Domain | Labels |
| :--- | :--- |
| **Crops & Botanical** | Crop, Fruit, Vegetable, Food_Item |
| **Pests & Diseases** | Disease, Organism, Agri_Pollution, Agri_Waste |
| **Chemicals & Nutrients** | Chemical, Treatment, Nutrient |
| **Weather & Environment** | Weather, Rainfall, Temp, Humidity, Season, Natural_Disaster, Natural_Resource, Soil |
| **Quantities & Time** | Quantity, Other_Quantity, Field_Area, Duration, Money, Date_and_Time, Event |
| **Actors & Policy** | Person, Organization, Location, Policy |
| **Methods & Technology** | Agri_Equipment, Agri_Method, Agri_Process, Technology, ML_Model, Citation, Other |

**`Agri_Equipment` is yours to apply.** It was added to the list after the model
was trained, so the model will never propose it — machinery like `happy seeder`,
`super seeder`, `rotavator`, `tractor` or `tensiometer` is only labelled when you
do it. Everything about it works normally: it exports, it counts, and it carries
`"source": "human"` so anyone using the data can see it came from a person.

---

## Annotating well

The value of this dataset is consistency, so a few habits matter more than speed.

* **Mark the whole entity, not part of it.** `single super-phosphate`, not
  `phosphate`. `55 kg`, not `55`.
* **Leave punctuation out.** Select `wheat`, not `wheat,`. Trailing spaces and
  punctuation are trimmed for you, but it is easier to select cleanly.
* **Two labels cannot cover the same words.** If you mark a span over an
  existing one, the overlap is resolved on export — verified spans win, then
  longer ones. Remove the one you do not want rather than leaving both.
* **Quantity vs Other_Quantity**: use `Quantity` for an amount with an
  agricultural unit (`55 kg`, `200 litres`); `Other_Quantity` for counts and
  measures that are not inputs.
* **Date_and_Time vs Duration vs Season**: `15th December` is a date,
  `within 2 days` is a duration, `Kharif` is a season.
* **Agri_Process vs Agri_Method vs Treatment**: `tillering` is a process the
  crop goes through, `drip irrigation` is a method a farmer uses, and
  `fungicide spray` is a treatment applied to a problem.
* **If you are unsure, `Other` is better than a wrong guess** — a wrong label
  teaches the model something false, while `Other` only teaches it less.
* **Approve deliberately.** Approving says a person checked this passage. That
  claim is what a benchmark rests on, so don't hold <kbd>A</kbd> down to get
  through a file.

---

## When something looks wrong

| What you see | What it means |
| :--- | :--- |
| **Export fails with 404** | The interface is newer than the API it is talking to. The service needs redeploying. |
| **"The model service could not be reached"** | Inference is down or restarting. Annotation still works; **Try again** when it is back. |
| **Every passage says "the model is reading this passage"** | The inference service never came up. Annotation by hand still works and saves normally. |
| **A passage shows no spans and the model has read it** | The model genuinely found nothing. That is a valid, useful record — approve it as an empty passage. |
| **`verified_spans: 0` across your export** | Nothing has been approved yet. Model confidence is not verification; work through passages and approve them. |
| **Nothing happens when you click a label** | No text is selected. Drag across the words first — the panel says so when it is waiting. |
| **Your spans disappeared after a reload** | Check the bottom bar before leaving; a write may not have finished. The browser warns you while one is in flight. |

---

## Where it runs

* **Hosted**: https://nerproject-production-e534.up.railway.app
* **On your machine**: see [README.md](README.md) for running the three
  services (interface, API, model) locally.
