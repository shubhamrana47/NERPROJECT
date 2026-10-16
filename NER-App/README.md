# AgNER Annotation App & Service

Full-stack Named Entity Recognition (NER) pipeline and human-in-the-loop annotation workbench for agricultural texts.

```
NER-App/
├── frontend/          # React 18 + Vite + Tailwind CSS (1-Line Focus Mode & Label Studio Annotator)
├── backend/           # Node.js + Express + Mongoose (REST API & MongoDB Persistence)
└── python-ai-service/ # FastAPI + AgNER-BERTa (RoBERTa token classification)
```

---

## Key Capabilities

* **Multi-Format Ingestion**: Upload `.json` documents or `.jsonl` (JSON Lines) files with automatic detection and format fallback.
* **1-Line Focus Mode**: Review and annotate sentence-by-sentence with clear progress indicators (`Line X of Y`), page numbers, and section headings.
* **Compact All-36 Entity Palette**: Highlight any word or phrase with cursor to select from all 36 canonical agricultural classes in an ultra-compact palette with real-time filter search.
* **Save & Reset Controls**: Save line changes directly to MongoDB (`PUT .../line-entities`) or reset single sentences back to raw model predictions (`POST .../reset-line`).
* **Direct File Download Station**: Export training datasets with one click directly to disk as:
  * **Training Data (`.json`)**: Sentence-level training dataset with character offsets and provenance tags.
  * **Training Data (`.jsonl`)**: Newline-delimited JSON Lines for transformer fine-tuning.
  * **Label Studio Tasks (`.json`)**: Official Label Studio schema with pre-annotations and human ground-truth.
* **Entity Provenance Tagging**: Exported datasets distinguish NER model predictions (`tag: "NER_LABELLED"`, `labelled_by: "NER Model"`) from human annotations (`tag: "MANUALLY_LABELLED"`, `labelled_by: "Manual Annotator"`).
* **Bottom Metrics Deck**: Sticky dock displaying current page, lines remaining, total annotations done (manual vs. model breakdown), progress bar, and the export station.

---

## Quick Start (3 Terminals)

1. **MongoDB**: Ensure MongoDB Atlas or local MongoDB is running (configured in `backend/.env`).
2. **AI Service**:
   ```bash
   cd python-ai-service
   pip install -r requirements.txt
   python -m uvicorn app:app --port 8000
   ```
3. **Backend**:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
4. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Open `http://localhost:5173`.

---

## API Endpoints

* `POST /api/documents` — Upload `.json` or `.jsonl` file and trigger model inference.
* `GET /api/documents` — List uploaded documents with entity statistics.
* `GET /api/documents/:id` — Retrieve document details.
* `PUT /api/documents/:id/segments/:segmentIndex/line-entities` — Save/update manual annotations for a specific line/sentence in the backend.
* `POST /api/documents/:id/segments/:segmentIndex/reset-line` — Revert a single line back to original model predictions without losing other lines.
* `PUT /api/documents/:id/segments/:segmentIndex/entities` — Save/replace entities for an entire segment.
* `POST /api/documents/:id/segments/:segmentIndex/reset` — Reset full segment to original model output.
* `GET /api/documents/:id/label-studio` — Export in Label Studio JSON format with provenance tags.
* `GET /api/documents/:id/training-data?format=lines` — Download clean, deduplicated dataset line-by-line with `tag: NER_LABELLED` vs `MANUALLY_LABELLED` (`as=jsonl` for JSON Lines).
