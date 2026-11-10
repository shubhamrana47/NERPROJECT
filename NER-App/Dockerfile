# One container for Render: Node.js API (public) + AgNER-BERTa model service (internal).
#
#   Browser (Vercel) --> Node API on $PORT --> FastAPI model on 127.0.0.1:8000
#
# ENABLE_AI=true  (default) loads the model. Needs ~1.2 GB RAM -> Render "Standard" plan.
# ENABLE_AI=false skips the model; the app runs manual-annotation only and fits Render Free.
FROM python:3.11-slim

WORKDIR /app

# 1. System tools + Node.js 20
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
        ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# 2. PyTorch CPU-only (far smaller than the default CUDA build)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# 3. Model service dependencies
RUN pip install --no-cache-dir fastapi "uvicorn[standard]" transformers safetensors

# 4. Node.js backend dependencies (cached separately from source changes)
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev

# 5. Model service code + AgNER-BERTa weights
WORKDIR /app
COPY python-ai-service/ ./ai-service/

# If the repo was cloned without Git LFS, model.safetensors is a tiny pointer
# file. Fetch the real ~500 MB weights from GitHub in that case.
ARG MODEL_URL="https://media.githubusercontent.com/media/shubhamrana47/NERPROJECT/main/NER-App/python-ai-service/model/model.safetensors"
RUN if [ "$(wc -c < ai-service/model/model.safetensors)" -lt 1000000 ]; then \
        echo "Git LFS pointer detected, downloading model weights..."; \
        curl -fL --retry 3 -o ai-service/model/model.safetensors "$MODEL_URL"; \
    fi \
    && echo "Model weights: $(du -h ai-service/model/model.safetensors | cut -f1)"

# 6. Backend source
COPY backend/ ./backend/

# 7. Startup script (strip Windows line endings)
COPY start.sh ./start.sh
RUN sed -i 's/\r$//' ./start.sh && chmod +x ./start.sh

ENV MODEL_DIR=/app/ai-service/model \
    PYTHONUNBUFFERED=1 \
    NODE_ENV=production \
    ENABLE_AI=true \
    TORCH_THREADS=1 \
    AI_STARTUP_TIMEOUT=240 \
    PORT=5000

EXPOSE 5000

CMD ["/bin/bash", "./start.sh"]
