# Railway Deployment Guide (2-Service Architecture)

This project is configured for **Railway.app** using two services in the same Railway project:
1. **`ner-backend`** — Unified container running the **Node.js Express Backend API** (`$PORT`) + **Python FastAPI AgNER-BERTa NER Model** (`127.0.0.1:8000` internal).
2. **`ner-frontend`** — **React + Vite UI** served by Nginx (`$PORT`), communicating with `ner-backend`.

```text
Browser ──> ner-frontend (Nginx + React UI, Root: NER-App/frontend)
               │  VITE_API_URL
               ▼
            ner-backend (Docker, Root: NER-App)
               ├─ Node.js Express API   :$PORT (public)
               └─ AgNER-BERTa FastAPI   127.0.0.1:8000 (internal)
               │
               ▼
            MongoDB Atlas
```

---

## Production URLs on Railway
- **Backend Service (`ner-backend` — API + AI Model)**: `https://ner-backend-production-f72a300d.up.railway.app`
- **Frontend Service (`ner-frontend` — React UI)**: `https://nerproject-production-aa1bd093.up.railway.app`

---

## Step 1: Deploy Service 1 — `ner-backend` (Backend + NER Model)

1. In your Railway Project, click **+ New** → **GitHub Repo** → select `shubhamrana47/NERPROJECT`.
2. Click on the new service → **Settings**:
   - **Service Name**: `ner-backend`
   - **Root Directory**: `./NER-App`
   - **Builder**: `Dockerfile` (`Dockerfile` inside `./NER-App`)
   - **Watch Paths** *(so only Backend + NER Model changes trigger `ner-backend`, NOT `frontend`)*:
     - `/NER-App/backend/**`
     - `/NER-App/python-ai-service/**`
     - `/NER-App/Dockerfile`
     - `/NER-App/start.sh`
   - **Healthcheck Path**: `/health` (timeout `300s`)
3. Go to the **Variables** tab of `ner-backend` and add:
   ```env
   PORT=5000
   MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/ner_annotation?retryWrites=true&w=majority
   ENABLE_AI=true
   CONFIDENCE_THRESHOLD=0.75
   TORCH_THREADS=1
   ```
   *(Note: Ensure `0.0.0.0/0` is allowed under **Network Access** in MongoDB Atlas so Railway can connect.)*
4. Go to **Settings** → **Networking**:
   - **Public Domain**: `https://ner-backend-production-f72a300d.up.railway.app` (Target Port: `5000`)
5. Once deployed, open `https://ner-backend-production-f72a300d.up.railway.app/health` and verify it returns:
   ```json
   {"status":"ok","service":"ner-backend","aiEnabled":true}
   ```

---

## Step 2: Deploy Service 2 — `ner-frontend` (React UI)

1. In the **same** Railway Project, click **+ New** → **GitHub Repo** → select `shubhamrana47/NERPROJECT` again.
2. Click on this second service → **Settings**:
   - **Service Name**: `ner-frontend`
   - **Root Directory**: `./NER-App/frontend`
   - **Builder**: `Dockerfile` (`Dockerfile` inside `./NER-App/frontend`)
   - **Watch Paths** *(so only Frontend changes trigger `ner-frontend`)*:
     - `/NER-App/frontend/**`
3. Go to the **Variables** tab of `ner-frontend` and add:
   ```env
   PORT=80
   VITE_API_URL=https://ner-backend-production-f72a300d.up.railway.app
   ```
   *(Or `VITE_API_URL=https://${{ner-backend.RAILWAY_PUBLIC_DOMAIN}}`)*
4. Go to **Settings** → **Networking** → click **Generate Domain** (Target Port: `80`).

---

## Local Development

You can still run all three components locally from `NER-App`:

```bash
cd NER-App
npm run dev:all
```
- **Python AI Service**: `http://127.0.0.1:8000`
- **Backend API**: `http://localhost:5000`
- **Frontend UI**: `http://localhost:5173` (proxies `/api` to `http://127.0.0.1:5000`)
