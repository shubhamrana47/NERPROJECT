#!/bin/bash
# Starts the AgNER-BERTa model service (internal) and then the Node.js API (public).
set -e

echo "============================================="
echo " NER backend: Node API + AgNER-BERTa model"
echo "============================================="

AI_PID=""
ENABLE_AI="${ENABLE_AI:-true}"
AI_STARTUP_TIMEOUT="${AI_STARTUP_TIMEOUT:-240}"

if [ "$ENABLE_AI" = "true" ]; then
    echo "[1/2] Starting model service on 127.0.0.1:8000..."
    cd /app/ai-service
    python3 -m uvicorn app:app --host 127.0.0.1 --port 8000 --workers 1 &
    AI_PID=$!

    # Loading ~500 MB of weights takes a while on a small CPU; wait for it.
    echo "Waiting up to ${AI_STARTUP_TIMEOUT}s for the model to load..."
    TRIES=0
    until curl -sf http://127.0.0.1:8000/health > /dev/null 2>&1; do
        if ! kill -0 "$AI_PID" 2>/dev/null; then
            echo "WARNING: model service exited during startup (often: not enough RAM)."
            AI_PID=""
            break
        fi
        sleep 1
        TRIES=$((TRIES + 1))
        if [ "$TRIES" -ge "$AI_STARTUP_TIMEOUT" ]; then
            echo "WARNING: model service did not become ready in ${AI_STARTUP_TIMEOUT}s."
            kill -9 "$AI_PID" 2>/dev/null || true
            AI_PID=""
            break
        fi
    done

    if [ -n "$AI_PID" ]; then
        echo "Model service ready."
        export AI_SERVICE_URL="http://127.0.0.1:8000"
    else
        # Keep the app usable: annotation still works by hand.
        echo "Continuing in MANUAL-ANNOTATION mode (no model predictions)."
        unset AI_SERVICE_URL
    fi
else
    echo "[1/2] ENABLE_AI=false -> skipping model. Manual-annotation mode."
    unset AI_SERVICE_URL
fi

cleanup() {
    if [ -n "$AI_PID" ]; then
        echo "Shutting down model service..."
        kill -TERM "$AI_PID" 2>/dev/null || true
    fi
}
trap cleanup EXIT TERM INT

PORT="${PORT:-5000}"
export PORT
echo "[2/2] Starting Node.js API on port $PORT..."
cd /app/backend
node src/server.js &
NODE_PID=$!
wait "$NODE_PID"
