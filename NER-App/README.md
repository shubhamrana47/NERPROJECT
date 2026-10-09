# AgNER Annotation App

```
NER-App/
├─ frontend/          React + Vite + Tailwind
├─ backend/           Node + Express + MongoDB (MVC: models/controllers/routes/services)
└─ python-ai-service/ FastAPI + AgNER-BERTa (model/ folder)
```

## Run (3 terminals)
1. MongoDB running locally (or edit `backend/.env`).
2. AI service:
   ```
   cd python-ai-service
   pip install -r requirements.txt
   uvicorn app:app --port 8000
   ```
3. Backend: `cd backend && npm install && npm run dev`
4. Frontend: `cd frontend && npm install && npm run dev` → http://localhost:5173

Upload `sample.json` (or your dataset JSON). Format `{pages:[{page, paragraphs|text}]}` is
read page/paragraph-wise; any other JSON is walked and all text strings are extracted.

## Notes
- Confidence = mean softmax probability of the entity's words. `>= 0.85` → accepted, else `review`.
- The model config only has `LABEL_0..LABEL_72`. Put real names in `python-ai-service/labels.json`
  (e.g. `{"0":"O","1":"B-CROP",...}`). LABEL_0 is assumed to be "O" (outside).
- LLM verification step is not implemented; the hook is `routeEntity` in `backend/src/services/nerService.js`.
- Accept/Edit/Delete update MongoDB; `GET /api/documents/training-data` exports training data.
