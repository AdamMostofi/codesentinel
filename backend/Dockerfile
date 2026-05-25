FROM python:3.12-slim

WORKDIR /app/backend

RUN apt-get update && apt-get install -y --no-install-recommends \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p logs uploads

EXPOSE 8000

CMD ["python", "-m", "app.main"]
