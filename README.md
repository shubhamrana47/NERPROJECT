# AgNER: Agricultural Named Entity Recognition & Human-in-the-Loop Annotation Suite

A full-stack, enterprise-grade Named Entity Recognition (NER) pipeline and interactive annotation workbench purpose-built for agricultural advisories, pest/disease reports, and agronomic research documents.

The system pairs fine-tuned **RoBERTa-base (AgNER-BERTa)** with a **1-Line Focus Mode Annotation Workbench**, offering full compatibility with **Label Studio** and training dataset exports. Reviewers can inspect model predictions sentence-by-sentence, tag missed entities across **all 36 canonical agricultural classes**, and export verified ground-truth datasets distinguishing model predictions from manual human annotations.

---

## Architecture Overview

```
NERPROJECT/
├── NER-roberta-base_512/      # Fine-tuned RoBERTa token classification checkpoint
├── NER-App/
│   ├── frontend/              # React 18 + Vite + Tailwind CSS (Focus Mode UI & Annotator)
│   ├── backend/               # Node.js + Express + Mongoose (REST API & Persistence)
│   ├── python-ai-service/     # FastAPI + PyTorch + Hugging Face Transformers
│   ├── Dockerfile             # Unified production container (Node + FastAPI + PyTorch)
│   └── start.sh               # Container orchestration & startup script
└── README.md
```

---

## Key Capabilities

### 1. Multi-Format Document Ingestion (`.json` and `.jsonl`)
* **Flexible Ingestion**: Upload standard `.json` documents or newline-delimited `.jsonl` files (common in modern NLP/NER training pipelines).
* **Automatic Format Detection**: If a `.jsonl` file is uploaded with a `.json` or `.txt` extension, the backend automatically detects line-by-line JSON and parses it gracefully.
* **Document Structure Support**: Handles nested advisory sections, PAU/Agromet bulletin formats, page-segmented reports, or flat sentence-record datasets (`{"text": "..."}`).

### 2. 1-Line Focus Mode (Sentence-by-Sentence Review)
* **Distraction-Free Focus**: Displays exactly one sentence per screen (`Line X of Y`) with page numbers, advisory section tags, and document progress.
* **Rapid Keyboard Navigation**: Advance or rewind through sentences with keyboard shortcuts (<kbd>ArrowRight</kbd> / <kbd>ArrowLeft</kbd>) or navigation buttons.
* **Unsaved Changes Guard**: Built-in state guard (`isDirty`) prevents navigating away if manual edits on the active line have not been saved.

### 3. Compact All-36 Entity Annotation Palette
* **Free-Form Text Highlighting**: Highlight any word or multi-word phrase with the cursor to tag missed entities.
* **All 36 Classes Visible**: Displays all 36 canonical agricultural entity classes in a single, high-density, color-coded palette (~80–90px height) without arbitrary 10-item limits or hidden dropdowns.
* **Live Typeahead Search**: Filter entities in real time by typing (<kbd>Enter</kbd> to apply matching tag, <kbd>Esc</kbd> to cancel).
* **In-Place Entity Editing**: Click any existing tag to reclassify its category, inspect confidence scores, or delete false positives.

### 4. Direct File Download Station
* **One-Click Real Downloads**: Replaced raw text viewing with immediate browser file downloads (Blob-driven, saving directly to the user's Downloads directory).
* **Multiple Export Formats**:
  * **Training Data (`.json`)**: Sentence-level training dataset with character offsets and provenance tags.
  * **Training Data (`.jsonl`)**: Standard newline-delimited JSON Lines for fine-tuning Hugging Face transformers.
  * **Label Studio Tasks (`.json`)**: Official Label Studio schema containing model pre-annotations and human ground-truth.
* **Sticky Bottom Metrics Deck**: Displays current page, remaining sentences, total annotations completed (model vs. manual breakdown), progress bar, and the export station.

### 5. Entity Provenance & Labelling Tags (NER vs. Manual)
Exported datasets explicitly record the provenance of every single entity:
* **NER Model Output**: Entities identified by the AI model are tagged with:
  * `"tag": "NER_LABELLED"`
  * `"labelled_by": "NER Model"`
  * `"source": "model"`
* **Manual Annotations**: Terms added from scratch or corrected by an annotator are tagged with:
  * `"tag": "MANUALLY_LABELLED"`
  * `"labelled_by": "Manual Annotator"`
  * `"source": "human"`
* **Sentence-Level Summary**: Every exported sentence row includes a `labelled_summary` object with exact counts (`ner_labelled_count`, `manually_labelled_count`, and `total_entities`).

### 6. Non-Destructive Granular Persistence
* **Line-Level Save (`PUT .../line-entities`)**: Commits additions and corrections for only the active sentence directly to MongoDB.
* **Line-Level Reset (`POST .../reset-line`)**: Restores original model predictions for only the current sentence from immutable `originalEntities` without altering annotations on any other line.

---

## 36 Canonical Agricultural Entity Classes

The model and annotation interface categorize agronomic entities into 36 standardized classes across 7 functional domains:

| Domain | Entity Classes | Typical Examples |
| :--- | :--- | :--- |
| **Crops & Agriculture** | `Crop`, `Fruit`, `Vegetable`, `Food_Item`, `Soil` | Wheat, Maize, Basmati Rice, Sandy Loam, Clay Soil |
| **Pests & Pathology** | `Disease`, `Organism`, `Agri_Pollution`, `Agri_Waste` | Yellow Rust, Aphids, Whitefly, Stubble Burning, Rice Straw |
| **Treatments & Inputs** | `Chemical`, `Treatment`, `Nutrient` | Urea, Imidacloprid, Fungicide Spray, Nitrogen, Potash |
| **Meteorology & Climate**| `Weather`, `Rainfall`, `Temp`, `Humidity`, `Season`, `Natural_Disaster`, `Natural_Resource` | Monsoon, Frost, 28°C, 85% RH, Kharif, Drought, Groundwater |
| **Quantities & Time** | `Quantity`, `Other_Quantity`, `Field_Area`, `Duration`, `Money`, `Date_and_Time`, `Event` | 50 kg/ha, 2.5 acres, 15 days, ₹1200, October 15, Sowing |
| **Entities & Agents** | `Person`, `Organization`, `Location`, `Policy` | PAU Ludhiana, ICAR, Punjab, PM-KISAN, Extension Officer |
| **Methods & Technology** | `Agri_Method`, `Agri_Process`, `Technology`, `ML_Model`, `Citation`, `Other` | Drip Irrigation, Tillering, Tensiometer, AgNER-BERTa |

---

## Exported Data Format Samples

### 1. Training Data (`.json` or `.jsonl`)
```json
{
  "document": "punjab_wheat_advisory.jsonl",
  "segmentIndex": 0,
  "lineIndex": 1,
  "text": "Wheat crop requires nitrogen fertilizer at tillering stage, but watch for yellow rust.",
  "entities": [
    {
      "text": "Wheat",
      "label": "Crop",
      "start": 0,
      "end": 5,
      "tag": "NER_LABELLED",
      "labelled_by": "NER Model",
      "source": "model",
      "status": "accepted",
      "confidence": 0.9842
    },
    {
      "text": "nitrogen fertilizer",
      "label": "Chemical",
      "start": 19,
      "end": 38,
      "tag": "MANUALLY_LABELLED",
      "labelled_by": "Manual Annotator",
      "source": "human",
      "status": "approved",
      "confidence": 1.0
    },
    {
      "text": "yellow rust",
      "label": "Disease",
      "start": 74,
      "end": 85,
      "tag": "NER_LABELLED",
      "labelled_by": "NER Model",
      "source": "model",
      "status": "accepted",
      "confidence": 0.9415
    }
  ],
  "labelled_summary": {
    "ner_labelled_count": 2,
    "manually_labelled_count": 1,
    "total_entities": 3
  }
}
```

### 2. Label Studio Export (`.json`)
```json
[
  {
    "id": 1,
    "data": {
      "text": "Wheat crop requires nitrogen fertilizer...",
      "segment_index": 0,
      "page": 1,
      "section": "Crop Specific Advisory",
      "filename": "punjab_wheat_advisory.jsonl"
    },
    "predictions": [
      {
        "model_version": "AgNER-BERTa",
        "result": [
          {
            "id": "pred_0_0",
            "from_name": "label",
            "to_name": "text",
            "type": "labels",
            "value": { "start": 0, "end": 5, "text": "Wheat", "labels": ["Crop"] },
            "score": 0.9842,
            "tag": "NER_LABELLED",
            "labelled_by": "NER Model"
          }
        ]
      }
    ],
    "annotations": [
      {
        "result": [
          {
            "id": "ann_0_0",
            "from_name": "label",
            "to_name": "text",
            "type": "labels",
            "value": { "start": 0, "end": 5, "text": "Wheat", "labels": ["Crop"] },
            "score": 0.9842,
            "tag": "NER_LABELLED",
            "labelled_by": "NER Model"
          },
          {
            "id": "ann_0_1",
            "from_name": "label",
            "to_name": "text",
            "type": "labels",
            "value": { "start": 19, "end": 38, "text": "nitrogen fertilizer", "labels": ["Chemical"] },
            "score": 1.0,
            "tag": "MANUALLY_LABELLED",
            "labelled_by": "Manual Annotator"
          }
        ]
      }
    ]
  }
]
```

---

## API Reference

### Document Management
* `POST /api/documents` — Upload `.json` or `.jsonl` document, execute NER inference, and save to MongoDB.
* `GET /api/documents` — List uploaded documents with entity statistics.
* `GET /api/documents/:id` — Retrieve document details, segments, and annotations.
* `DELETE /api/documents/:id` — Delete document and all annotations.

### Annotation Operations
* `PUT /api/documents/:id/segments/:segmentIndex/line-entities` — Save/update entities for a specific sentence.
* `POST /api/documents/:id/segments/:segmentIndex/reset-line` — Revert a single sentence back to original model predictions.
* `PUT /api/documents/:id/segments/:segmentIndex/entities` — Batch save/update entities for an entire segment.
* `POST /api/documents/:id/segments/:segmentIndex/reset` — Reset full segment to original model output.
* `PATCH /api/documents/:id/segments/:segmentIndex/entities/:entityId` — Update individual entity status or label.

### Dataset Export
* `GET /api/documents/:id/training-data` — Download verified training data with `tag: NER_LABELLED` vs `MANUALLY_LABELLED`.
  * Query parameters:
    * `format=lines`: Exports sentence-by-sentence dataset.
    * `as=jsonl`: Exports as newline-delimited JSON Lines.
    * `download=false`: Returns raw JSON response for API integrations.
* `GET /api/documents/:id/label-studio` — Download official Label Studio tasks and annotations JSON.

---

## Local Development Setup

### Prerequisites
* **Node.js** v18+ and `npm`
* **Python** 3.10+ with `pip`
* **MongoDB** (local community edition or MongoDB Atlas URI)

### 1. Environment Configuration
Create `NER-App/backend/.env`:
```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/ner_annotation
AI_SERVICE_URL=http://127.0.0.1:8000
CONFIDENCE_THRESHOLD=0.75
```

### 2. Run All Services Concurrently
From `NER-App/`:
```bash
npm run dev:all
```
This simultaneously starts:
* **Python AI Service**: `http://127.0.0.1:8000`
* **Express Backend**: `http://localhost:5000`
* **Vite Frontend**: `http://localhost:5173`

Or run separately across 3 terminals:
* **Terminal 1 (AI Service)**:
  ```bash
  cd NER-App/python-ai-service
  pip install -r requirements.txt
  python -m uvicorn app:app --port 8000
  ```
* **Terminal 2 (Backend)**:
  ```bash
  cd NER-App/backend
  npm install
  npm run dev
  ```
* **Terminal 3 (Frontend)**:
  ```bash
  cd NER-App/frontend
  npm install
  npm run dev
  ```

---

## Production Deployment & Stability Optimizations

The system is containerized via a **unified single-container Dockerfile** (`NER-App/Dockerfile`) running both the Node.js backend and FastAPI AI service, optimized for cloud platforms like **Railway.app**:

1. **PyTorch CPU Optimization**:
   * Thread pool throttled via `torch.set_num_threads(2)` and `torch.set_num_interop_threads(1)` to eliminate vCPU contention in container environments.
   * Model inference switched to `@torch.inference_mode()` for lower memory consumption.
2. **Micro-Batching**:
   * Segment inference is processed in chunks of 5 segments, ensuring execution times stay well under reverse proxy 60-second timeouts to prevent `502 Bad Gateway` errors.
3. **Hardened CORS**:
   * Configured with dynamic origin reflection (`origin: true`), global preflight handling (`app.options('*')`), and error-middleware header persistence so cross-origin requests from frontends never drop `Access-Control-Allow-Origin`.

---

## Label Studio Integration Guide

To import annotated datasets into Label Studio:
1. Review sentences and make annotations in **1-Line Focus Mode**.
2. Click **Download Training Data → Label Studio Tasks (.json)** in the bottom deck.
3. Open Label Studio, create a new project, and configure the labeling interface:
   ```xml
   <View>
     <Labels name="label" toName="text">
       <Label value="Crop" background="#10B981"/>
       <Label value="Chemical" background="#14B8A6"/>
       <Label value="Disease" background="#F43F5E"/>
       <Label value="Treatment" background="#06B6D4"/>
       <Label value="Nutrient" background="#0EA5E9"/>
       <Label value="Location" background="#6366F1"/>
       <Label value="Quantity" background="#8B5CF6"/>
       <Label value="Weather" background="#38BDF8"/>
     </Labels>
     <Text name="text" value="$text"/>
   </View>
   ```
4. Click **Import** in Label Studio and upload the downloaded file. Both model pre-annotations and manual human tags will load with character-exact offsets.
