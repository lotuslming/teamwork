FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create upload directories
RUN mkdir -p uploads/attachments uploads/chat uploads/versions

# Expose port
EXPOSE 5000

# Run with Gunicorn
CMD ["gunicorn", "-c", "gunicorn_config.py", "app:app"]
