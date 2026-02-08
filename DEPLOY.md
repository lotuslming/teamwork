# TeamWork Kanban - Deployment Guide

A collaborative Kanban board application with OnlyOffice integration.

## Quick Deployment

### Option 1: Basic Deployment (No OnlyOffice)

```bash
# Clone or copy the project to your server
git clone <your-repo-url> teamwork
cd teamwork

# Make the deploy script executable and run it
chmod +x deploy.sh
./deploy.sh
```

### Option 2: Full Deployment with OnlyOffice

```bash
./deploy.sh --with-onlyoffice
```

### Option 3: Production Deployment (with systemd)

```bash
./deploy.sh --with-onlyoffice --production
```

## Manual Deployment Steps

If you prefer manual deployment:

```bash
# 1. Install Python dependencies
sudo apt update
sudo apt install python3 python3-pip python3-venv

# 2. Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 3. Install Python packages
pip install -r requirements.txt

# 4. Create upload directories
mkdir -p uploads/attachments uploads/chat

# 5. Run the application
python app.py
```

## Configuration

Edit `.env` file or set environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | Flask secret key | Auto-generated |
| `JWT_SECRET_KEY` | JWT signing key | Auto-generated |
| `DATABASE_URL` | Database connection string | `sqlite:///teamwork.db` |
| `ONLYOFFICE_URL` | OnlyOffice server URL | `http://localhost:8080` |
| `INTERNAL_URL` | Internal URL for Docker access | `http://172.17.0.1:5000` |
| `OPENAI_API_KEY` | OpenAI API key (optional) | None |

## OnlyOffice Setup

OnlyOffice requires Docker. The deploy script handles this automatically with `--with-onlyoffice`.

Manual setup:
```bash
docker compose up -d
# Wait 1-2 minutes for initialization
curl http://localhost:8080/healthcheck  # Should return "true"
```

## Default Credentials

- **Username:** admin
- **Password:** admin123

⚠️ Change the default password after first login!

## Ports

| Service | Port |
|---------|------|
| Flask App | 5000 |
| OnlyOffice | 8080 |

## Service Management (Production)

```bash
# Check status
sudo systemctl status teamwork

# Restart
sudo systemctl restart teamwork

# View logs
sudo journalctl -u teamwork -f

# Stop
sudo systemctl stop teamwork
```

## Requirements

- Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- Python 3.9+
- Docker (for OnlyOffice)
- 2GB+ RAM (4GB+ recommended with OnlyOffice)
