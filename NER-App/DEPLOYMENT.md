# Deploying: Frontend on Vercel, Backend + AgNER-BERTa on Render

```
Browser ──> Vercel (React, NER-App/frontend)
              │  VITE_API_URL
              ▼
           Render web service (Docker, NER-App/Dockerfile)
              ├─ Node.js API      :$PORT (public)
              └─ AgNER-BERTa      127.0.0.1:8000 (internal, optional)
              │
              ▼
           MongoDB Atlas
```

## Two modes, one image

| `ENABLE_AI` | What runs | RAM | Render plan |
|---|---|---|---|
| `true` | API + model predictions | ~1.2 GB | **Standard** (2 GB, ~$25/mo) |
| `false` | API only, manual annotation | ~150 MB | **Free** works |

If the model can't start (for example, too little RAM), the API still starts in
manual-annotation mode instead of crashing. Switch modes at any time by changing
`ENABLE_AI` in the Render dashboard and redeploying.

## 0. MongoDB Atlas

1. Copy your connection string (`mongodb+srv://...`).
2. **Network Access → Add IP → `0.0.0.0/0`.** Render has no fixed outbound IP,
   so without this the backend cannot connect.

## 1. Backend on Render

1. Push this repo to GitHub (including the Git LFS model file).
2. Render → **New → Blueprint** → select the repo. It reads [`render.yaml`](../render.yaml).
3. When asked, paste `MONGO_URI`.
4. Plan: keep **Standard** for the model. For free manual-only, change the plan to
   Free and set `ENABLE_AI=false`.
5. Wait for the deploy. The first build takes a while because it installs PyTorch.
6. Check `https://<your-service>.onrender.com/health` → `{"status":"ok"}`.
   The logs should show `Model service ready.` (or `MANUAL-ANNOTATION mode`).

Manual setup without the Blueprint: New → Web Service → Docker,
Root Directory `NER-App`, Dockerfile path `NER-App/Dockerfile`, Docker context `NER-App`,
Health check path `/health`, then the same environment variables.

## 2. Frontend on Vercel

1. Vercel → **Add New → Project** → import the repo.
2. **Root Directory: `NER-App/frontend`** (framework: Vite, auto-detected).
3. Environment variable: `VITE_API_URL = https://<your-service>.onrender.com`
   (no trailing slash).
4. Deploy. If you change `VITE_API_URL` later, **redeploy**: it is baked in at build time.

## Troubleshooting

- **"Unable to reach the server"**: a Free Render service sleeps after 15 min idle;
  the first request takes about a minute.
- **Logs say the model exited during startup**: not enough RAM. Upgrade to Standard
  or set `ENABLE_AI=false`.
- **`MongoDB connection failed`**: check `MONGO_URI` and the Atlas IP allow-list.
- **Build log says it is downloading the model weights**: Render cloned without LFS; the
  Dockerfile fetches the weights from GitHub instead (the repo must be public).

## Local development (unchanged)

```bash
cd NER-App
npm run dev        # frontend + backend + model
```

For manual-only locally, remove `AI_SERVICE_URL` from `backend/.env` and run `npm run dev:no-ai`.
