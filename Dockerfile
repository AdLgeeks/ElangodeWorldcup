FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for compiling psycopg2 if compiling from source
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt* backend/requirements.txt* ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# If built with the repository root as context, move backend/ files to the app root
RUN if [ -d "backend" ]; then mv backend/* . && rm -rf backend; fi

ENV PORT=8000
EXPOSE 8000

CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT
