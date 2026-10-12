#!/bin/bash
set -e

echo "============================================="
echo " Starting Unified NER Backend & AI Service   "
echo "============================================="

# 1. Start Python AI Service in the background
echo "[1/2] Starting Python AI Service on 127.0.0.1:8000..."
cd /app/ai-service
python3 -m uvicorn app:app --host 127.0.0.1 --port 8000 &
AI_PID=$!

# Health check loop for AI service
echo "Waiting for Python AI Service to be ready..."
MAX_TRIES=60
TRIES=0
until curl -s http://127.0.0.1:8000/health > /dev/null 2>&1; do
    sleep 1
    TRIES=$((TRIES + 1))
    if [ $TRIES -ge $MAX_TRIES ]; then
        echo "Error: AI Service failed to initialize within $MAX_TRIES seconds."
        kill -9 $AI_PID 2>/dev/null || true
        exit 1
    fi
done
echo "Python AI Service is ready and responding on 127.0.0.1:8000!"

# Cleanup on shutdown
cleanup() {
    echo "Shutting down AI service..."
    kill -TERM $AI_PID 2>/dev/null || true
}
trap cleanup EXIT TERM INT

# 2. Start Node.js Express Backend as foreground process
PORT="${PORT:-5000}"
export PORT
export AI_SERVICE_URL="http://127.0.0.1:8000"

echo "[2/2] Starting Node.js Backend on port $PORT..."
cd /app/backend

# exec replaces the shell with node to maintain container lifecycle and signal handling
exec node src/server.js
