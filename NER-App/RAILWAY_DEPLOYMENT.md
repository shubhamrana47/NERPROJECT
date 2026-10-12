# Railway 2-Service Deployment Guide for AgNER Full-Stack Project

This guide covers deploying the full application to [Railway.app](https://railway.app) within Railway's **Free Tier limit (maximum 2 services)**.

---

## 2-Service Architecture Overview

To comply with Railway's free plan limit of 2 services, the stack is consolidated into:

1. **Service 1: `ner-backend` (Unified Backend & AI-Service)**
   - **Base**: `python:3.11-slim` + `Node.js 20`
   - **Internal AI Service**: FastAPI running AgNER-BERTa PyTorch model on internal port `127.0.0.1:8000`.
   - **Public API**: Node.js Express API connected to MongoDB Atlas, listening on Railway's `$PORT`.
   - **Zero Latency**: Backend and AI-service communicate over local loopback (`127.0.0.1`), requiring only **1 Railway service**.
   - **Git LFS Safe**: Automatically downloads the full PyTorch model weights (~496MB) if Railway clones the Git LFS pointer.

2. **Service 2: `ner-frontend` (React SPA)**
   - **Base**: `nginx:alpine`
   - **Application**: Vite + React + Tailwind CSS single page application.
   - **Dynamic Port**: Nginx automatically listens on Railway's dynamic `$PORT`.

---

## Docker Image & Build Status

- **Docker Image Presence**: Railway builds your containers directly from the `Dockerfile` in your GitHub repository. You **do not** need to install Docker Desktop locally or manually push images to Docker Hub. Railway's cloud builder will automatically build and deploy both services from your GitHub commits.

---

## Step-by-Step Railway Deployment

### Step 1: Commit and Push Changes to GitHub
Make sure all updated files (`Dockerfile`, `start.sh`, `docker-compose.yml`, etc.) are committed and pushed to your GitHub repository:
```bash
git add .
git commit -m "Configure 2-service deployment for Railway free tier"
git push origin main
```

---

### Step 2: Deploy Service 1 — `ner-backend` (Unified Backend + AI Service)

1. Open your [Railway Dashboard](https://railway.app/dashboard).
2. Click **+ New Project** (or open your existing project) → Select **Deploy from GitHub repo**.
3. Select your repository: `shubhamrana47/NERPROJECT`.
4. Once the service is created, click on it and open **Settings**:
   - Under **General**: Rename the service to `ner-backend`.
   - Under **Root Directory**: Set to `NER-App`.
     *(Railway will automatically detect `NER-App/Dockerfile`)*
5. Go to the **Variables** tab and add the following environment variables:
   - `PORT`: `5000` *(Railway injects its own $PORT automatically, but setting 5000 as default is recommended)*
   - `MONGO_URI`: `mongodb+srv://<username>:<password>@cluster0.v5qxg7.mongodb.net/ner_annotation?appName=Cluster0` *(Replace `<username>` and `<password>` with your MongoDB credentials)*
   - `CONFIDENCE_THRESHOLD`: `0.75`
6. Go to the **Networking** tab:
   - Click **Generate Domain** (e.g., `https://ner-backend-production-xxxx.up.railway.app`).
   - Copy this domain URL! You will use it in Step 3.

---

### Step 3: Deploy Service 2 — `ner-frontend` (React SPA)

1. In the **same** Railway project, click **+ New** (top right) → **GitHub Repo** → select `shubhamrana47/NERPROJECT` again.
2. Click on the newly created service and open **Settings**:
   - Under **General**: Rename the service to `ner-frontend`.
   - Under **Root Directory**: Set to `NER-App/frontend`.
     *(Railway will automatically detect `NER-App/frontend/Dockerfile`)*
3. Go to the **Variables** tab and add:
   - `VITE_API_URL`: Paste your backend public URL from Step 2 (e.g., `https://ner-backend-production-xxxx.up.railway.app` without trailing slash).
4. Go to the **Networking** tab:
   - Click **Generate Domain** to get the public frontend URL (e.g., `https://ner-frontend-production-xxxx.up.railway.app`).
5. Open your public frontend URL in your browser!

---

## Important Configuration Checks

1. **MongoDB Atlas Network Access**:
   - Ensure MongoDB Atlas allows connections from `0.0.0.0/0` (Allow Access from Anywhere) under **Network Access** → **IP Access List**, so Railway containers can reach your database.
2. **Health Checks**:
   - The backend service provides a `GET /health` endpoint at `https://<your-backend-domain>/health`.
   - You can set `/health` as Railway's **Healthcheck Path** in Service Settings if desired.

---

## Local Docker Testing (2 Services)

To test the consolidated 2-service stack locally before or alongside Railway:

```bash
cd NER-App
docker compose up --build
```

- Frontend: `http://localhost:80`
- Unified Backend API: `http://localhost:5000`
- Backend Health Check: `http://localhost:5000/health`
