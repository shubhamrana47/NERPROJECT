# AgNER Agricultural NER & Annotation Suite

An AI-powered Named Entity Recognition (NER) and human-in-the-loop manual annotation suite designed for agricultural advisories, crop research, and biological documents.

The system pairs fine-tuned **RoBERTa-base (AgNER-BERTa)** with a **1-line-per-screen Focus Mode annotator** compatible with **Label Studio**, allowing domain specialists to review model predictions line-by-line, manually tag missed entities, and export verified datasets for model retraining.

---

## Architecture Overview

```
NERPROJECT/
├── NER-roberta-base_512/      # Fine-tuned RoBERTa token classification checkpoint
├── NER-App/
│   ├── frontend/              # React 18 + Vite + Tailwind CSS (Interactive Annotator)
│   ├── backend/               # Node.js + Express + Mongoose (REST API & Persistence)
│   └── python-ai-service/     # FastAPI + PyTorch + HuggingFace Transformers
└── .agents/                   # Antigravity agent configuration & frontend-design skill
```

---

## Key Features

### 1. 1-Line Focus Mode (Sentence-by-Sentence Review)
* **Single Line Presentation**: Each screen displays **one line (sentence)** at a time with a prominent header (`Line X of Y`), current page number, and advisory section name.
* **Next Card Progression**: Users can advance through lines sequentially via the `Next Line →` and `← Previous Line` buttons or keyboard shortcuts (`ArrowRight` / `ArrowLeft`).
* **Unsaved Changes Guard**: Prevents accidental navigation if manual annotations on the current line have not been saved.

### 2. Label Studio-Style Manual Text Annotation
* **Manual Span Tagging**: Select or highlight **any word or phrase** with the mouse cursor to annotate entities that were not identified by the model.
* **Instant Category Selector**: A floating/inline Label Studio palette presents:
  * Quick-category badges: `Crop`, `Chemical`, `Disease`, `Treatment`, `Nutrient`, `Quantity`, `Location`, `Weather`, `Soil`, `Agri_Method`.
  * Searchable dropdown covering all **36 canonical agricultural entity classes**.
* **Model vs. Manual Distinction**:
  * Model predictions display a confidence percentage pill (`96%`).
  * User annotations display an emerald `Manual` badge.
  * Click any entity tag to modify its label or remove it with `×`.

### 3. Save & Reset Workflows
* **Save Line Annotations**: Persists all additions, edits, and deletions for that sentence directly to MongoDB line-by-line via `PUT /api/documents/:id/segments/:segmentIndex/line-entities`. Even if the user annotates only some lines, the backend database remains immediately updated without risking other lines in the segment.
* **Reset Line to Model Output**: Reverts only the current line back to the model's original predictions via `POST /api/documents/:id/segments/:segmentIndex/reset-line` without wiping annotations on other lines.

### 4. Real-Time Bottom Metrics Deck
A persistent, docked status bar at the bottom displays:
* **Current Page**: e.g., `Page 1 of 3 (2 pages left)`
* **Current Line & Lines Remaining**: e.g., `Line 4 of 28 (24 remaining)`
* **Annotations Done Counter**: Total tagged entities with a breakdown (e.g., `14 done (3 manual, 11 model)`)
* **Progress Bar**: Document-level completion percentage
* **Label Studio Export Button**: Direct one-click download of the document formatted according to official **Label Studio NER tasks & annotations JSON schema**.
* **View Mode Switcher**: Toggle between `1-Line Focus Mode` and `Full Document Overview`.

---

## 36 Canonical Entity Classes

The model and annotation interface support 36 standardized entity types grouped into functional domains:

| Category | Entity Types |
| :--- | :--- |
| **Crops & Agriculture** | `Crop`, `Fruit`, `Vegetable`, `Food_Item`, `Soil` |
| **Pests & Pathology** | `Disease`, `Organism`, `Agri_Pollution`, `Agri_Waste` |
| **Treatments & Inputs** | `Chemical`, `Treatment`, `Nutrient` |
| **Meteorology & Climate**| `Weather`, `Rainfall`, `Temp`, `Humidity`, `Season`, `Natural_Disaster`, `Natural_Resource` |
| **Quantities & Time** | `Quantity`, `Other_Quantity`, `Field_Area`, `Duration`, `Money`, `Date_and_Time`, `Event` |
| **Entities & Agents** | `Person`, `Organization`, `Location`, `Policy` |
| **Methods & Technology** | `Agri_Method`, `Agri_Process`, `Technology`, `ML_Model`, `Citation`, `Other` |

---

## API Reference

### Document & Model Operations
* `POST /api/documents` — Upload JSON document and execute model inference.
* `GET /api/documents` — List all saved documents and entity counts.
* `GET /api/documents/:id` — Retrieve document with all segments and annotations.
* `DELETE /api/documents/:id` — Remove document.

### Manual Annotation Endpoints
* `PUT /api/documents/:id/segments/:segmentIndex/entities` — Batch save/update entities for a segment/line.
* `POST /api/documents/:id/segments/:segmentIndex/entities` — Add a new manual entity.
* `PATCH /api/documents/:id/segments/:segmentIndex/entities/:entityId` — Update or review a single entity.
* `POST /api/documents/:id/segments/:segmentIndex/reset` — Reset segment back to original model output.

### Export Endpoints
* `GET /api/documents/:id/label-studio` — Export document as a **Label Studio** task JSON with pre-annotations and human annotations.
* `GET /api/documents/:id/training-data` — Export deduplicated, normalized dataset for model fine-tuning.

---

## Quick Start (Local Development)

### Prerequisites
* **Node.js** v18+ and `npm`
* **Python** 3.10+ with `pip`
* **MongoDB** (local or MongoDB Atlas connection string in `backend/.env`)

### 1. Setup Environment Variables
In `NER-App/backend/.env`:
```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/ner_annotation
AI_SERVICE_URL=http://127.0.0.1:8000
CONFIDENCE_THRESHOLD=0.75
```

### 2. Run All Services
From the `NER-App` root directory:
```bash
# Install dependencies
npm run install:all

# Launch Backend, Frontend, and AI Service concurrently
npm run dev
```

Alternatively, run in 3 separate terminals:

* **Terminal 1 (Python AI Service)**:
  ```bash
  cd NER-App/python-ai-service
  pip install -r requirements.txt
  python -m uvicorn app:app --port 8000
  ```

* **Terminal 2 (Node.js Backend)**:
  ```bash
  cd NER-App/backend
  npm install
  npm run dev
  ```

* **Terminal 3 (React Frontend)**:
  ```bash
  cd NER-App/frontend
  npm install
  npm run dev
  ```
Open `http://localhost:5173` in your browser.

---

## Label Studio Integration

To import your annotations into Label Studio:
1. Complete manual reviews and additions in the 1-Line Focus Mode.
2. Click **Export Label Studio JSON** in the bottom bar or header.
3. Open Label Studio, create/open a project with a NER Labeling Interface:
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
4. Click **Import** in Label Studio and upload the downloaded JSON file. Both model predictions and manual annotations are imported with exact character spans.
