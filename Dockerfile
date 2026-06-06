FROM python:3.11-slim

WORKDIR /app

# Install dependencies first for better layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application
COPY . .

# Streamlit defaults
EXPOSE 8501
ENV STREAMLIT_SERVER_HEADLESS=true \
    STREAMLIT_SERVER_ADDRESS=0.0.0.0 \
    STREAMLIT_SERVER_PORT=8501

# Provide OPENROUTER_API_KEY at runtime, e.g.:
#   docker run -p 8501:8501 -e OPENROUTER_API_KEY=sk-... skill-factory
CMD ["streamlit", "run", "app.py"]
