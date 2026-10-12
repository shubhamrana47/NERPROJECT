# Unified Dockerfile combining Node.js Backend and Python AI Service into 1 Railway Service
FROM python:3.11-slim

WORKDIR /app

# 1. Install system tools and Node.js 20
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    build-essential \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# 2. Install PyTorch CPU-only first for smaller image size & fast builds
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# 3. Install Python AI service dependencies
COPY python-ai-service/requirements.txt ./ai-service/requirements.txt
RUN pip install --no-cache-dir fastapi uvicorn transformers safetensors

# 4. Install Node.js backend dependencies
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --omit=dev

# 5. Copy AI service code and model
WORKDIR /app
COPY python-ai-service/ ./ai-service/

# Download actual model weights if cloned as a Git LFS pointer (<1000 bytes)
RUN if [ $(wc -c < ai-service/model/model.safetensors) -lt 1000 ]; then \
        echo "LFS pointer detected, downloading model weights..."; \
        curl -L -o ai-service/model/model.safetensors "https://media.githubusercontent.com/media/shubhamrana47/NERPROJECT/main/NER-App/python-ai-service/model/model.safetensors"; \
    fi

# 6. Copy Backend source code
COPY backend/ ./backend/

# 7. Copy startup script
COPY start.sh ./start.sh
RUN tr -d '\r' < ./start.sh > ./start_unix.sh && mv ./start_unix.sh ./start.sh && chmod +x ./start.sh

# Environment settings
ENV MODEL_DIR=/app/ai-service/model
ENV PYTHONUNBUFFERED=1
ENV NODE_ENV=production
ENV AI_SERVICE_URL=http://127.0.0.1:8000

# Railway provides $PORT dynamically at runtime (defaults to 5000)
EXPOSE 5000 8080

CMD ["/bin/bash", "./start.sh"]
