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

ENV MODEL_DIR=/app/model
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# Railway provides $PORT at runtime
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}"]
