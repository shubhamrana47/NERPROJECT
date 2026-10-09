# Railway Deployment Guide for AgNER Full-Stack Project

This guide covers deploying the full application to [Railway.app](https://railway.app).

---

## Architecture Overview

The system consists of 3 microservices:
1. **`python-ai-service`**: FastAPI serving the AgNER-BERTa PyTorch model.
2. **`backend`**: Node.js Express API connecting to MongoDB Atlas & AI Service.
3. **`frontend`**: React + Tailwind SPA served via Nginx.

---

## Step-by-Step Railway Deployment

### Step 1: Push Your Code to GitHub
Ensure your repository is pushed to GitHub with the project structure:
```text
NER-App/
├── backend/
│   └── Dockerfile
├── frontend/
│   └── Dockerfile
├── python-ai-service/
│   └── Dockerfile
└── docker-compose.yml
```

---

### Step 2: Deploy `python-ai-service` on Railway

1. In Railway, click **New Project** → **Deploy from GitHub repo**.
2. Select your repository.
3. Go to the created service **Settings**:
   - Under **General**: Rename service to `ai-service`.
   - Under **Root Directory**: Set to `NER-App/python-ai-service` (or `python-ai-service` if your repo root is inside NER-App).
4. Railway will automatically pick up `python-ai-service/Dockerfile`.
5. Under **Networking**:
   - Click **Generate Domain** (for public URL) or note the **Private Networking** name.
   - Example Private URL: `http://ai-service.railway.internal:8000`

---

### Step 3: Deploy `backend` on Railway

1. In the same Railway project, click **+ New** → **GitHub Repo** → select the same repository.
2. Go to service **Settings**:
   - Under **General**: Rename service to `backend`.
   - Under **Root Directory**: Set to `NER-App/backend` (or `backend`).
3. Under **Variables**, add:
   - `PORT`: `5000`
   - `MONGO_URI`: `mongodb+srv://<username>:<password>@cluster0.v5qxg7.mongodb.net/ner_annotation?appName=Cluster0`
   - `AI_SERVICE_URL`: `http://ai-service.railway.internal:8000` (or the public domain generated for your AI service: `https://ai-service-xxxx.up.railway.app`)
   - `CONFIDENCE_THRESHOLD`: `0.75`
4. Under **Networking**:
   - Click **Generate Domain** to get the backend public URL (e.g., `https://backend-production-xxxx.up.railway.app`).

---

### Step 4: Deploy `frontend` on Railway

1. In the same Railway project, click **+ New** → **GitHub Repo** → select the same repository.
2. Go to service **Settings**:
   - Under **General**: Rename service to `frontend`.
   - Under **Root Directory**: Set to `NER-App/frontend` (or `frontend`).
3. Under **Variables**, add:
   - `VITE_API_URL`: Your backend's public domain from Step 3 (e.g. `https://backend-production-xxxx.up.railway.app`).
4. Under **Networking**:
   - Click **Generate Domain** to get the public frontend URL.
5. Open your frontend URL in the browser and start uploading JSON documents!

---

## Alternative: Local Docker Testing

You can run the entire multi-container stack locally before pushing to Railway:

```bash
cd NER-App
docker compose up --build
```

Then visit:
- Frontend: `http://localhost:80`
- Backend API: `http://localhost:5000`
- AI Service Docs: `http://localhost:8000/docs`
