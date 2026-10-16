# AgNER Annotation App & Service

Full-stack Named Entity Recognition (NER) pipeline and human-in-the-loop annotation tool.

```
NER-App/
├── frontend/          # React 18 + Vite + Tailwind CSS (1-Line Focus Mode + Label Studio Annotator)
├── backend/           # Node.js + Express + Mongoose (REST API & MongoDB Persistence)
└── python-ai-service/ # FastAPI + AgNER-BERTa (RoBERTa token classification)
```

---

## Key Capabilities

* **1-Line Focus Mode**: Annotate sentence-by-sentence with clear line numbers (`Line X of Y`), page indicators, and section headings.
* **Label Studio-Style Manual Tagging**: Highlight any word or span in the sentence to tag missed entities across 36 canonical agricultural entity classes.
* **Save & Reset Controls**: Save line changes directly to MongoDB or reset the sentence back to raw model predictions.
* **Bottom Status Deck**: Displays current page, pages remaining, line progress, total annotations completed (manual vs. model breakdown), progress bar, and Label Studio export.
* **Label Studio JSON Export**: One-click download of the document formatted according to official Label Studio task/annotation schema.

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

* `POST /api/documents` — Upload JSON file and trigger model inference.
* `GET /api/documents` — List uploaded documents with entity statistics.
* `GET /api/documents/:id` — Retrieve document details.
* `PUT /api/documents/:id/segments/:segmentIndex/line-entities` — Save/update manual annotations for a specific line/sentence in the backend.
* `POST /api/documents/:id/segments/:segmentIndex/reset-line` — Revert a single line back to original model predictions without losing other lines.
* `PUT /api/documents/:id/segments/:segmentIndex/entities` — Save/replace entities for an entire segment.
* `POST /api/documents/:id/segments/:segmentIndex/reset` — Reset full segment to original model output.
* `GET /api/documents/:id/label-studio` — Export in Label Studio JSON format.
* `GET /api/documents/:id/training-data?format=lines` — Export clean, deduplicated dataset line-by-line for model retraining.
