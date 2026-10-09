FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch CPU-only first for smaller image size & fast builds
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Copy and install other requirements
COPY requirements.txt .
RUN pip install --no-cache-dir fastapi uvicorn transformers safetensors

# Copy model files and service code
COPY model/ ./model/
COPY app.py types.json labels.json ./

# Download actual model weights if cloned as a Git LFS pointer (<1000 bytes)
RUN if [ $(wc -c < model/model.safetensors) -lt 1000 ]; then \
        echo "LFS pointer detected, downloading model weights..."; \
        curl -L -o model/model.safetensors "https://media.githubusercontent.com/media/shubhamrana47/NERPROJECT/main/NER-App/python-ai-service/model/model.safetensors"; \
    fi


ENV MODEL_DIR=/app/model
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# Railway provides $PORT at runtime
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}"]
