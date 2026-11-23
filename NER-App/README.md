# AgNER Annotation App & Service

Full-stack Named Entity Recognition (NER) pipeline and human-in-the-loop annotation workbench for agricultural texts.

```
NER-App/
├── frontend/          # React 18 + Vite + Tailwind CSS (passage annotation workbench)
├── backend/           # Node.js + Express + Mongoose (REST API & MongoDB persistence)
├── python-ai-service/ # FastAPI + AgNER-BERTa (RoBERTa token classification)
├── test/              # Automated integration & UI test suite
├── Dockerfile         # Unified production container (Node + FastAPI + PyTorch)
└── start.sh           # Container orchestration & startup script
```

---

## Key Capabilities

* **Multi-Format Ingestion**: Upload `.json` or `.jsonl` (JSON Lines) files (up to 100 MB) with automatic workflow detection (annotation vs. validation) and format fallback.
* **One Passage at a Time**: Review and annotate a whole advisory passage with every sentence in view, crops and stages shown beside it, and the model predicting a window ahead on demand (`POST /api/documents/:id/predict`).
* **Full 37-Class Entity Palette**: 2-column alphabetized card grid grouped by 7 domains in the right-hand sidebar, with real-time search (<kbd>/</kbd>), fixed keyboard shortcuts (<kbd>1</kbd>–<kbd>9</kbd>), per-label counts, and hover tooltips showing each label's description plus the top 5 most tagged words in the current file. The model predicts 36 classes; `Agri_Equipment` is annotator-only.
* **Save-Gated Navigation & Reset**: Edits stay staged on the active passage until saved via **Approve & Save All** (<kbd>A</kbd> / <kbd>Ctrl+S</kbd>) or discarded. Navigating with unsaved edits opens an **Unsaved Changes** confirmation modal; **Reset passage** restores the original model/pipeline output (`POST .../segments/:i/reset`).
* **One Export (Also the Working Copy)**: `GET /api/documents/:id/dataset` hands back the uploaded file with annotations appended — same records, same order, original fields untouched, and `entities` / `annotation` (or `validation` / `validation_summary`) added. Exported files can be re-uploaded to continue where you left off. See the root [README](../README.md#annotation-output) and [USER_GUIDE.md](../USER_GUIDE.md).
* **Legacy Exports Retained**: `GET /api/documents/:id/training-data` (`NER_LABELLED` / `MANUALLY_LABELLED`) and `GET /api/documents/:id/label-studio` remain available for downstream compatibility.

---

## Quick Start

From `NER-App/`:
```bash
npm run install:all
npm run dev:all     # Backend (:5000) + Frontend (:5173) + Python AI Service (:8000)
# or without the Python AI service (manual annotation / validation only):
npm run dev:no-ai
```

Or run separately across 3 terminals:
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

Run the automated test suite from `NER-App/`:
```bash
npm test
```

---

## API Endpoints

* `GET /health` — Server health check and AI service status (`aiEnabled`).
* `POST /api/documents` — Upload `.json` or `.jsonl` file, classify workflow, parse into passages, and store in MongoDB (inference runs on demand, not at upload).
* `POST /api/documents/:id/predict` — Run on-demand model inference over a window of pending passages.
* `POST /api/documents/:id/skip-inference` — Skip model inference for remaining pending passages (annotate from scratch).
* `POST /api/documents/:id/segments/:segmentIndex/nothing-to-validate` — Acknowledge an empty validation passage.
* `GET /api/documents` — List uploaded documents with entity statistics.
* `GET /api/documents/:id` — Retrieve document details, segments, and annotations.
* `DELETE /api/documents/:id` — Delete a document and all its annotations.
* `POST /api/documents/:id/segments/:segmentIndex/entities` — Add a single entity to a segment.
* `PUT /api/documents/:id/segments/:segmentIndex/entities` — Save/replace entities for an entire segment.
* `PATCH /api/documents/:id/segments/:segmentIndex/entities/:entityId` — Update individual entity status or label.
* `POST /api/documents/:id/segments/:segmentIndex/reset` — Reset full segment to original model/pipeline output.
* `PUT /api/documents/:id/segments/:segmentIndex/line-entities` — Save/update entities for a specific line (legacy compatibility).
* `POST /api/documents/:id/segments/:segmentIndex/reset-line` — Revert a single line back to original model predictions (legacy compatibility).
* `GET /api/documents/:id/dataset` (and `GET /api/documents/dataset`) — Primary dataset export (annotated/validated `.jsonl`, or `?format=conll|hf|spacy|jsonl|json|manifest`).
* `GET /api/documents/:id/label-studio` — Export in Label Studio JSON format.
* `GET /api/documents/:id/training-data` (and `GET /api/documents/training-data`) — Legacy line-by-line export (`?format=lines&as=jsonl`).
