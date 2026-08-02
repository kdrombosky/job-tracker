FROM python:3.12-slim

WORKDIR /app

# Install deps first, separately from app code, so this layer only
# rebuilds when requirements.txt actually changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Now the rest of the app.
COPY . .

RUN adduser --disabled-password --gecos "" appuser && chown -R appuser /app
USER appuser

# Render (and most Docker hosts) inject $PORT at runtime and expect the
# container to bind to it — it's not knowable at build time, so this has
# to be shell form (not exec form) to get env-var expansion.
CMD alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
