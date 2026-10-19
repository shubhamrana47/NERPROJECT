# AgNER Annotation App & Service

Full-stack Named Entity Recognition (NER) pipeline and human-in-the-loop annotation workbench for agricultural texts.

```
NER-App/
├── frontend/          # React 18 + Vite + Tailwind CSS (passage annotation workbench)
├── backend/           # Node.js + Express + Mongoose (REST API & MongoDB Persistence)
└── python-ai-service/ # FastAPI + AgNER-BERTa (RoBERTa token classification)
```

---

## Key Capabilities

* **Multi-Format Ingestion**: Upload `.json` documents or `.jsonl` (JSON Lines) files with automatic detection and format fallback.
* **One passage at a time**: Review and annotate a whole advisory passage with every sentence in view, crops and stages shown beside it, and the model predicting a window ahead on demand.
* **Full Entity Palette**: Highlight any word or phrase to pick from all 37 canonical agricultural classes, grouped by domain and always open, with real-time search. The model predicts 36 of them; `Agri_Equipment` is annotator-only.
* **Save & Reset Controls**: Approving a passage writes it (`PUT .../segments/:i/entities`); **Reset passage** restores the model's own reading (`POST .../segments/:i/reset`). Writes happen behind the interface, so a click never waits on the network.
* **One export**: the uploaded file handed back with annotations appended — same records, same order, every original field untouched, `entities` and `annotation` added at the end. An exported file can be uploaded again to carry on where it left off. See the root [README](../README.md#annotation-output) and the [Annotator's Guide](../USER_GUIDE.md).
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
