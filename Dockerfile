# ---- Stage 1: build the React frontend ----
FROM node:20-slim AS web
WORKDIR /web
COPY web/package.json web/package-lock.json* ./
RUN npm ci
COPY web/ ./
RUN npm run build

# ---- Stage 2: Python API serving the built SPA ----
FROM python:3.11-slim
WORKDIR /app

# Install Python dependencies first for better layer caching.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application and the built frontend (served via StaticFiles).
COPY . .
COPY --from=web /web/dist ./web/dist

EXPOSE 8000
ENV SKILLS_DIR=/app/skills

# Provide OPENROUTER_API_KEY at runtime, e.g.:
#   docker run -p 8000:8000 -e OPENROUTER_API_KEY=sk-or-... skill-factory
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
