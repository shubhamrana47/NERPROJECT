# Dual-Environment (Local & Railway Production) Guide for AgNER Full-Stack Project

This guide covers testing the full stack **locally on your machine** and deploying to **Railway.app** using the 2-service architecture within the free tier.

---

## Production URLs on Railway
- **Backend Service (API + AI Service)**: `https://nerproject-production.up.railway.app/`
- **Frontend Service (React UI)**: `https://nerproject-production-e534.up.railway.app/`

---

## Part 1: How to Test Locally on Your Machine

You can run and test the complete stack locally using Node.js and Python.

### Option A: Run all services with one command
In a terminal at `C:\Users\Shubham Rana\Desktop\NERPROJECT\NER-App`:
```bash
npm run dev:all
```
This simultaneously starts:
1. **Python AI Service**: `http://127.0.0.1:8000` (FastAPI + PyTorch)
2. **Backend API**: `http://localhost:5000` (Express + MongoDB)
3. **Frontend UI**: `http://localhost:5173` (Vite dev server)

Open `http://localhost:5173` in your browser to interact with the app locally!

### Option B: Run each service in separate terminal tabs
- **Terminal 1 (Python AI Service)**:
  ```bash
  cd NER-App/python-ai-service
  python -m uvicorn app:app --port 8000
  ```
- **Terminal 2 (Backend)**:
  ```bash
  cd NER-App/backend
  npm run dev
  ```
- **Terminal 3 (Frontend)**:
  ```bash
  cd NER-App/frontend
  npm run dev
  ```

---

## Part 2: Production Deployment on Railway

The codebase is engineered with dual-compatibility:
- In local development (`npm run dev`), the frontend automatically calls `/api/...`, which Vite proxies to `http://127.0.0.1:5000`.
- In production (`https://nerproject-production-e534.up.railway.app/`), the frontend automatically directs API calls to `https://nerproject-production.up.railway.app`.

### Service 1: `ner-backend` Settings on Railway
1. **Root Directory**: `NER-App`
2. **Builder**: `Dockerfile`
3. **Variables**:
   - `PORT`: `5000` (or `8080`)
   - `MONGO_URI`: `mongodb+srv://<username>:<password>@cluster0.v5qxg7.mongodb.net/ner_annotation?appName=Cluster0`
   - `CONFIDENCE_THRESHOLD`: `0.75`
4. **Networking**:
   - Domain: `https://nerproject-production.up.railway.app`
   - Target port: `8080` (or `5000` — backend listens on both ports simultaneously)

### Service 2: `ner-frontend` Settings on Railway
1. **Root Directory**: `NER-App/frontend`
2. **Builder**: `Dockerfile`
3. **Variables**:
   - `VITE_API_URL`: `https://nerproject-production.up.railway.app`
4. **Networking**:
   - Domain: `https://nerproject-production-e534.up.railway.app`
   - Target port: `80` (or `8080`)
