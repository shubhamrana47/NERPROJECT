# Fieldnote — Introduction and Annotator's Guide

Everything you need to use Fieldnote: what it is for, what is on the screen,
what every mark and colour means, how to annotate and how to validate, the
keys, and what comes out at the end. Start at the top and you can work from
your first file; dip in anywhere once you know it.

If you are setting the system up or working on its code, see
[README.md](README.md) instead.

**Contents** — [What this is for](#what-this-is-for) ·
[What you need](#what-you-need) · [Two kinds of file](#two-kinds-of-file) ·
[The screen](#the-screen) · [The visual language](#the-visual-language) ·
[Annotating](#annotating-a-passage) ·
[Validating](#validating-pipeline-output) · [Keys](#keys) ·
[Saving](#saving) · [Exporting](#exporting) ·
[The 37 labels](#the-37-entity-labels) ·
[Annotating well](#annotating-well) ·
[When something looks wrong](#when-something-looks-wrong)

---

## What this is for

**Fieldnote is a tool for annotating NER data by hand.** You read agricultural
text and mark which words are entities and what kind each one is — crops,
chemicals, diseases, quantities, dates, places, equipment. What comes out is a
labelled dataset: training data for a model, and a gold benchmark to measure
one against.

The annotation is the work. **The model is only there to help you do it
faster.** It reads ahead and pre-marks what it thinks are entities, so that on
a good passage you are correcting rather than starting from an empty page. That
is the whole of its role:

* **You can turn it off.** Choose *"No, I will mark everything myself"* when a
  file opens and nothing is ever predicted. Everything else works the same.
* **Its spans count for nothing until you say so.** A span the model proposed
  carries `verified: false` however confident it was. Confidence is a machine's
  opinion of itself; only a person's sign-off makes a label data.
* **It is never the authority.** Where the model and you disagree, you are
  right by definition — that is the point of the exercise. Its proposals are
  kept separately from your decisions so nobody downstream can confuse the two.

So the model is a convenience, and the dataset is the product. A file annotated
with the model switched off is worth exactly as much as one annotated with it
on — it just took longer.

One line of your file is one **passage**: a few sentences of advice about a
particular crop at a particular stage. You work through them one passage at a
time, and the work comes in two shapes depending on what your file already
holds — marking up plain text yourself, or checking entities that a model or
pipeline has already proposed. Fieldnote decides which from the file itself,
and the rest of this guide covers both.

Three things are worth knowing before you start, because they are what the
design is for:

* **A machine's reading and a person's are never mixed up.** Every span on
  screen and in the export says which it is, in the marks you see and in the
  fields you get.
* **Nothing is thrown away.** A span you reject stays in the file, marked
  rejected, because "a machine said this and a person disagreed" is one of the
  most useful things in a dataset. It is simply never used as a training label.
* **The file you export is the file you re-open.** There is no separate project
  state to keep; your work travels in the data.

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

Fieldnote works out which it is from the file itself when you open it — from
the shape of the entities inside, never from the file name. A file whose
entities use `label` is annotation; one whose entities use `type` with offsets
and scores, as the hybrid pipeline writes them, is validation. A file carrying
both is treated as annotation, so an annotated export can never be misread as
pipeline output.

---

## Opening a file

Click the **file name** in the top bar, or **New** in the left panel, and pick
your file. You are asked how to start:

| Choice | What happens |
| :--- | :--- |
| **Yes, suggest entities as I go** | Passages arrive pre-marked. You review and correct. This is the normal choice. |
| **No, I will mark everything myself** | No predictions at all. You mark every span yourself. Use this when building reference data without model influence. |

Either way the file opens **immediately**, however large it is: it is read,
split into passages and saved before anything is predicted. Nothing waits for
the model.

**A validation file is never asked this question** — the dialog does not appear,
because the model has no business running on a file that is already tagged.

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

Three columns, and they stay put: the list of spans on the left, the passage in
the middle, the labels on the right. Nothing collapses or slides away while you
work.

**Left, top — `Spans here` (annotation) or `Entities to check` (validation).**
Every span in the passage you are on, in reading order.

* The small number before each span is the **sentence** it sits in.
* Click the span's text to put it **in focus** — the passage tints it and the
  right-hand panel starts talking about it.
* Click the **label chip** (swatch, name, chevron) to change the label from a
  drop-down.
* **Annotating:** `4:9` is the span's character range in the passage text, and
  `model 93%` or `yours` says where it came from. `Approve` signs off one span,
  `remove` deletes it, and `Approve all N` at the top does the lot.
* **Validating:** each row shows the pipeline's **score** and the **sources**
  that backed it — `llm + berta`, `ontology`, a regex rule — the decision you
  have recorded (*confirmed*, *rejected*, *relabelled*, *you added this*), and
  the buttons for it: `Correct`, `Wrong`, `Put it back`, `Undo`, or `Remove` for
  a span of your own. The header counts them: *3 correct, 1 wrong, 1 relabelled,
  2 added, 8 to go*, with `Mark the remaining 8 correct` above.
* `overlaps` on a row means another span covers some of the same words.

**Left, bottom — `Progress`.** How far through the file you are as a percentage
and a bar, `passage 12 of 323 · 11 reviewed`, how many passages the model has
not read yet, a **`Go to passage`** box, the file name with **`New`** to open
another, and **`Show low confidence only`**, which narrows the
**`Whole document`** view to the passages holding spans the model was unsure of
— useful for a pass over the weak predictions rather than the whole file.

**Middle — the passage.** All of its sentences, numbered down the gutter, so a
sentence is never cut off from the advice around it. Above it:

* the **passage tag** and the **crop and stage chips** the file records;
* three tabs — **`Model output`** (what the machine proposed, read-only, never
  touched by your edits), **`Annotate`** (your working copy), **`Both`** one
  under the other. In validation these read *What the pipeline tagged* and
  *Checking these*.

Below it: the legend, **`Reset passage`** / **`Undo decisions`**, **`Skip`**,
**`Save`**, and the dark **`Approve and continue`**. Under that sits the
selection bar: it names the words you have selected and offers the labels you
use most, or tells you what to do next when nothing is selected.

**Right — `Entity labels`.** All 37, always open, scrollable, grouped by domain
with a count beside each.

* The block at the top shows what you are about to label — the selected words,
  or the span in focus.
* **`Recently used`** keeps the labels you have been reaching for at the top,
  with their number keys. Before you have used any, it shows the common ones.
* The **search box** finds a label by name; <kbd>/</kbd> jumps into it and
  <kbd>Enter</kbd> applies the first match.
* The foot keeps a tally for this passage: `Model found`, `You added`, and the
  model's `Mean confidence`.

**Bottom bar.** Where you are, how many sentences and spans, a quiet `saving`
while a write goes out or `reading ahead` while the model catches up, the
**`Whole document`** toggle, and a second **`Export`** button. Both export
buttons do the same thing.

**`Whole document`** (top bar, or the toggle at the bottom) lays every passage
out as a card to scroll through, honouring the low-confidence filter.
**`Back to one passage`** returns you to work.

---

## The visual language

Fieldnote is deliberately plain: paper-coloured background, serif text at
reading size, thin rules. Everything that carries meaning does so through a
**mark under a word**, and there are only a few marks to learn.

### Two inks

The whole interface is written in two colours, and they mean one thing each:

| Ink | Where you see it | Meaning |
| :--- | :--- | :--- |
| **Blue** `#2F5FA8` | solid underlines, `Model found`, the legend, the wordmark | **a machine's reading** — the model, or the hybrid pipeline |
| **Red** `#B5403A` | dashed underlines, `You added`, `yours`, the dot before a caption | **a person's reading** — you |

Nothing else is coloured for effect. If something is red, a person did it.

### Marks on a span

| Mark | Meaning |
| :--- | :--- |
| **Solid underline**, in the label's colour | the model or the pipeline proposed this span, and nobody has touched it |
| **Dashed underline**, with a faint tint of the label's colour behind the words | **yours** — you added it, or changed its label |
| **Dotted grey underline, with the words struck through and greyed** | **rejected** during validation. The span is still in the file and still in the export; `Put it back` undoes it |
| **Small caption under the span** | the label, written in that label's colour |
| **Small red dot before the caption** | the same thing the dashes say: this one is yours |
| **`×` on the caption** (appears on hover) | remove this span |
| **Faint grey tint behind the words** | hover, or the span currently in focus. The focused span is the one the right-hand panel is talking about |
| **Pink text selection** | a selection is armed and a label will apply to it |

A caption fades in when a span is first marked, so you can see the mark land
without hunting for it.

### Colour

Each of the **37 labels has its own fixed colour**, and that one colour is used
for the underline, the caption, and the round swatch beside the label
everywhere it is listed. `Crop` is always the same green; `Chemical` is always
the same purple.

**Colour never means confidence.** A span the model is 61% sure of looks exactly
like one it is 99% sure of — confidence is a number, shown as a number, in the
span list. This is on purpose: a colour that shifted with confidence would make
the passage hard to read and tell you nothing you cannot read off the list.

### The legend is on screen

Under the passage, the same three marks are spelled out — solid for the
machine, dashed for yours, dotted and struck through for rejected — so you never
have to remember this page.

---

## Annotating a passage

**1. Read it.** The model's spans are already marked.

**2. Add what it missed.** Drag across the words — any words, in any sentence —
then press the label's number key (<kbd>1</kbd>–<kbd>9</kbd>) or click a label
on the right. All 37 are listed there, and the search box finds one by name. The
selected words appear in both the right panel and the bar under the passage, so
you can see exactly what you are about to label. Release the mouse anywhere —
even past the end of the line — and the selection still holds.

**Each occurrence is its own span.** If `wheat` appears three times in a
passage, you can tag all three, and tagging the third tags the third — spans are
held by character position, not by the word itself. The same goes for a word
inside another: `December` within `mid-December` is a span in its own right.

A selection that runs across two sentences cannot become one span, and a
selection the interface cannot place exactly is refused rather than guessed at.
Both say so under the passage instead of failing silently.

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

## Validating pipeline output

When a file arrives already tagged, the job changes from marking up to checking.
**The model never runs on it** — you are not asked about it, and nothing is
predicted. What the pipeline wrote is what you see.

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
* `Undo decisions` puts the whole passage back to what the pipeline said.
* Export gives you `validated_<date>_<time>.jsonl`: your original file with a
  `validation` block on each entity you judged, and a `validation_summary` per
  record. Upload it again any time to carry on where you stopped.

Rejected entities are deliberately kept, because "the pipeline said this and a
person disagreed" is the most useful thing in the file. They are never used as
training labels.

### What a validated record looks like

Only the `validation` blocks and the summary are added. `score`, `sources`,
`mean_logprob`, `bio`, `hybrid`, `suppressed` and `n_entities` are the
pipeline's own record of its run and are passed through untouched — including
`n_entities`, which stays as the pipeline counted it even after you add spans.

```json
{
  "passage_id": "3817e6a6596d", "passage_tag": "PUN-0001", "n_entities": 3,
  "text": "For wheat sown after mid-December, apply 55 kg DAP per acre at sowing.",

  "entities": [
    { "text": "wheat", "type": "Crop", "start": 4, "end": 9,
      "score": 1.0, "sources": ["berta", "llm"],
      "validation": { "status": "confirmed" } },

    { "text": "mid-December", "type": "Duration", "start": 21, "end": 33,
      "score": 0.72, "sources": ["llm"],
      "validation": { "status": "relabelled", "original_type": "Duration" } },

    { "text": "acre", "type": "Field_Area", "start": 55, "end": 59,
      "score": 0.61, "sources": ["ontology"],
      "validation": { "status": "rejected" } },

    { "text": "happy seeder", "type": "Agri_Equipment", "start": 0, "end": 12,
      "score": 1.0, "sources": ["human"],
      "validation": { "status": "added" } }
  ],
  "validation_summary": {
    "entities": 4, "confirmed": 1, "rejected": 1, "relabelled": 1, "added": 1,
    "unreviewed": 0, "complete": true
  }
}
```

An entity you have not judged carries **no `validation` block at all** — which
is exactly what lets a part-finished file be picked up again. After a relabel,
`bio` no longer agrees with the types beside it and should not be trusted.

---

## Keys

| Key | Action |
| :--- | :--- |
| <kbd>1</kbd>–<kbd>9</kbd> | Label the selected words — or, in validation with nothing selected, correct the entity in focus |
| <kbd>A</kbd> | Approve the passage (validation: mark the rest correct) and go to the next |
| <kbd>→</kbd> / <kbd>←</kbd> | Next / previous passage, saving on the way out |
| <kbd>/</kbd> | Jump to the label search box |
| <kbd>Enter</kbd> (in the search box) | Apply the first matching label |
| <kbd>Esc</kbd> | Clear the search, then the selection, then the span in focus |

Keys are ignored while you are typing in a box, so <kbd>4</kbd> in the search
box searches for "4" rather than tagging a crop.

The number keys are fixed, so a key always means the same label:

| | | | | | | | | |
|:--|:--|:--|:--|:--|:--|:--|:--|:--|
| **1** Person | **2** Organization | **3** Location | **4** Crop | **5** Date & time | **6** Chemical | **7** Disease | **8** Soil | **9** Weather |

Everything else is one click away on the right, or found by typing in the
search box. The quick block at the top of that panel reorders itself to the
labels you actually use, but **the numbers never move** — the digit printed
beside a label is the digit that applies it, wherever the label has drifted to.

A selection always wins over a span in focus. If you have an entity in focus and
then drag across different words, <kbd>4</kbd> labels the words you dragged
over — not the entity you had clicked.

---

## Saving

**You do not need to save.** Approving a passage saves it, and moving between
passages saves anything unsaved on the way out. Writes happen behind the
interface, so nothing waits for the network.

Four things write the passage you are on:

| | |
| :--- | :--- |
| **Approve and continue** / <kbd>A</kbd> | signs the passage off and writes it |
| **Save** | writes it without signing anything off |
| **Moving passage** — <kbd>→</kbd>, <kbd>←</kbd>, `Skip`, `Go to passage` | writes whatever was open on the way out |
| **Export** | writes the open passage first, then builds the file |

* `saving` in the bottom bar means a write is still going out. It usually
  disappears immediately.
* **Unsaved changes in this passage** means you have tagged something and not
  yet approved, saved or moved on. It is on screen, not on the server.
* **The browser warns you if you close or reload the tab** with a write in
  flight or with unsaved changes in the passage.
* If a write fails you get a message naming the passage, and **Save** retries.
* Export used to be the one way out of this: it asks the *server* for the file,
  so work that had never been written was not in it. It now writes the open
  passage first and waits for that to land.

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
appended**. Same records, same order, every original field untouched. There is
one button's worth of choice — no formats to pick, no second gold export to keep
in step.

The button is in the top bar and again at the bottom; both do the same thing,
and both write the passage you are on before asking the server for the file. An
annotation file comes back as `annotated_<date>_<time>.jsonl`, a validated one
as `validated_<date>_<time>.jsonl`.

An annotated record gains two fields at the end:

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

A note under the top bar tells you what the saved file actually contains,
counted from the file itself rather than from anything the server claimed:
*"Saved annotated_2026-10-26_14-05-31.jsonl — 323 records, 1,204 spans, 712
verified by hand."* For a validated file it reads *"… 6,471 spans, 59 decided by
hand."*

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
| **Nothing happens when you click a label** | Nothing is selected and, in validation, nothing is in focus. Drag across the words first, or click an entity — the panel says which it is waiting for. |
| **A selection did nothing** | It ran across two sentences, or could not be placed exactly. A message under the passage says which; select again inside one numbered line. |
| **A span you tagged is missing from the export** | This was a real bug and is fixed: Export now writes the open passage first. If you see it again, press **Save** before exporting and report it. |
| **Your spans disappeared after a reload** | Work on screen is not on the server until something writes it. The browser warns you before closing or reloading with a write in flight or unsaved changes in the passage. |
| **A validated file comes back with "none verified by hand"** | Validation records *decisions*, not the annotation workflow's `verified` flag. The note says *"N decided by hand"* for these files. |

---

## Where it runs

* **Hosted**: https://nerproject-production-e534.up.railway.app
* **On your machine**: see [README.md](README.md) for running the three
  services (interface, API, model) locally.
