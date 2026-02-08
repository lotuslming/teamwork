#!/bin/bash

# ============================================================
# TeamWork Kanban Application - Deployment Script
# ============================================================
# This script deploys the TeamWork application on a new Ubuntu server
# Usage: ./deploy.sh [--with-onlyoffice] [--production] [--docker]
# ============================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$APP_DIR/.venv"
LOG_FILE="$APP_DIR/deploy.log"
FLASK_PORT=5000
ONLYOFFICE_PORT=8080

# Parse command line arguments
WITH_ONLYOFFICE=false
PRODUCTION=false
DOCKER_DEPLOY=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --with-onlyoffice) WITH_ONLYOFFICE=true ;;
        --production) PRODUCTION=true ;;
        --docker) DOCKER_DEPLOY=true ;;
        -h|--help) 
            echo "Usage: ./deploy.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --with-onlyoffice  Install OnlyOffice Document Server (requires Docker)"
            echo "  --production       Configure for production environment with Gunicorn"
            echo "  --docker           Deploy using Docker Compose (includes Flask app container)"
            echo "  -h, --help         Show this help message"
            exit 0
            ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Logging function
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

# Header
echo -e "${BLUE}"
echo "============================================================"
echo "     TeamWork Kanban Application - Deployment Script"
echo "============================================================"
echo -e "${NC}"

log "Starting deployment in: $APP_DIR"
log "OnlyOffice: $WITH_ONLYOFFICE | Production: $PRODUCTION | Docker: $DOCKER_DEPLOY"

# ============================================================
# Docker Deployment Path
# ============================================================
if [ "$DOCKER_DEPLOY" = true ]; then
    log "Using Docker deployment..."
    
    # Check for Docker
    if ! command -v docker &>/dev/null; then
        log "Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        rm get-docker.sh
        warn "Docker installed. You may need to log out and back in for group changes."
    fi
    
    # Check for docker compose
    if ! docker compose version &>/dev/null; then
        log "Installing Docker Compose plugin..."
        sudo apt-get update -qq
        sudo apt-get install -y docker-compose-plugin 2>/dev/null || \
        warn "Could not install docker-compose-plugin automatically."
    fi
    
    # Create .env file if not exists
    if [ ! -f "$APP_DIR/.env" ]; then
        SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
        JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
        ONLYOFFICE_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(16))")
        
        cat > "$APP_DIR/.env" << EOF
SECRET_KEY=$SECRET_KEY
JWT_SECRET_KEY=$JWT_SECRET
ONLYOFFICE_JWT_SECRET=$ONLYOFFICE_SECRET
EOF
        log "Created .env file with secrets"
    fi
    
    # Build and start containers
    log "Building and starting Docker containers..."
    cd "$APP_DIR"
    sudo docker compose up -d --build
    
    log "Docker deployment complete!"
    echo ""
    echo -e "${GREEN}Services are starting...${NC}"
    echo "  TeamWork App: http://localhost:$FLASK_PORT"
    echo "  OnlyOffice:   http://localhost:$ONLYOFFICE_PORT"
    echo ""
    echo "Check status with: docker compose ps"
    echo "View logs with: docker compose logs -f"
    exit 0
fi

# ============================================================
# Step 1: Check System Requirements
# ============================================================
log "Step 1: Checking system requirements..."

# Check if running on Linux
if [[ "$(uname)" != "Linux" ]]; then
    error "This script is designed for Linux systems only."
fi

# Check for required commands
command -v python3 >/dev/null 2>&1 || error "Python3 is required but not installed."
command -v pip3 >/dev/null 2>&1 || warn "pip3 not found, will try to install."

log "System requirements check passed."

# ============================================================
# Step 2: Install System Dependencies
# ============================================================
log "Step 2: Installing system dependencies..."

# Detect package manager
if command -v apt-get >/dev/null 2>&1; then
    PKG_MANAGER="apt"
    sudo apt-get update -qq
    sudo apt-get install -y -qq python3 python3-pip python3-venv curl git
elif command -v yum >/dev/null 2>&1; then
    PKG_MANAGER="yum"
    sudo yum install -y python3 python3-pip python3-venv curl git
elif command -v dnf >/dev/null 2>&1; then
    PKG_MANAGER="dnf"
    sudo dnf install -y python3 python3-pip python3-venv curl git
else
    warn "Could not detect package manager. Please install Python 3.9+ manually."
fi

log "System dependencies installed."

# ============================================================
# Step 3: Create Python Virtual Environment
# ============================================================
log "Step 3: Setting up Python virtual environment..."

if [ -d "$VENV_DIR" ]; then
    log "Virtual environment already exists, recreating..."
    rm -rf "$VENV_DIR"
fi

python3 -m venv "$VENV_DIR"
source "$VENV_DIR/bin/activate"

log "Virtual environment created and activated."

# ============================================================
# Step 4: Install Python Dependencies
# ============================================================
log "Step 4: Installing Python dependencies..."

pip install --upgrade pip -q
pip install -r "$APP_DIR/requirements.txt" -q

log "Python dependencies installed."

# ============================================================
# Step 5: Create Upload Directories
# ============================================================
log "Step 5: Creating upload directories..."

mkdir -p "$APP_DIR/uploads/attachments"
mkdir -p "$APP_DIR/uploads/chat"
mkdir -p "$APP_DIR/uploads/versions"

log "Upload directories created."

# ============================================================
# Step 6: Configure Environment
# ============================================================
log "Step 6: Configuring environment..."

ENV_FILE="$APP_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
    # Generate random secret keys
    SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
    JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
    ONLYOFFICE_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(16))")
    
    cat > "$ENV_FILE" << EOF
# TeamWork Environment Configuration
# Generated on $(date)

# Flask Configuration
SECRET_KEY=$SECRET_KEY
JWT_SECRET_KEY=$JWT_SECRET
FLASK_ENV=$([ "$PRODUCTION" = true ] && echo "production" || echo "development")
FLASK_DEBUG=$([ "$PRODUCTION" = true ] && echo "0" || echo "1")

# Database
DATABASE_URL=sqlite:///$APP_DIR/teamwork.db

# OnlyOffice Configuration
ONLYOFFICE_URL=http://localhost:$ONLYOFFICE_PORT
ONLYOFFICE_JWT_SECRET=$ONLYOFFICE_SECRET
INTERNAL_URL=http://172.17.0.1:$FLASK_PORT

# Optional: OpenAI API (for AI features)
# OPENAI_API_KEY=your-api-key-here
# OPENAI_MODEL=gpt-3.5-turbo

# Gunicorn Configuration (Production)
GUNICORN_WORKERS=4
GUNICORN_BIND=0.0.0.0:$FLASK_PORT
EOF
    
    log "Environment file created: $ENV_FILE"
else
    log "Environment file already exists, skipping..."
fi

# Source environment variables
set -a
source "$ENV_FILE"
set +a

# ============================================================
# Step 7: Initialize Database
# ============================================================
log "Step 7: Initializing database..."

cd "$APP_DIR"

# Create init script to initialize database
python3 << 'EOF'
import sys
sys.path.insert(0, '.')
from app import app, db, User

with app.app_context():
    db.create_all()
    
    # Create default admin user if not exists
    admin = User.query.filter_by(username='admin').first()
    if not admin:
        admin = User(username='admin', email='admin@teamwork.local')
        admin.set_password('admin123')
        db.session.add(admin)
        db.session.commit()
        print("Default admin user created (username: admin, password: admin123)")
    else:
        print("Admin user already exists")

print("Database initialized successfully!")
EOF

# Run content column migration if needed
if [ -f "$APP_DIR/migrate_content_column.py" ]; then
    log "Running database migrations (content)..."
    python3 "$APP_DIR/migrate_content_column.py" || warn "Migration script failed (may already be applied)"
fi

# Run columns and unread status migration
if [ -f "$APP_DIR/migrate_columns.py" ]; then
    log "Running database migrations (columns/unread)..."
    python3 "$APP_DIR/migrate_columns.py" || warn "Column migration script failed"
fi

log "Database initialized."

# ============================================================
# Step 8: Install OnlyOffice (Optional)
# ============================================================
if [ "$WITH_ONLYOFFICE" = true ]; then
    log "Step 8: Setting up OnlyOffice Document Server..."
    
    # Check for Docker
    if ! command -v docker >/dev/null 2>&1; then
        log "Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        rm get-docker.sh
        warn "Docker installed. You may need to log out and back in for group changes to take effect."
    fi
    
    # Check for docker compose
    if ! docker compose version >/dev/null 2>&1; then
        log "Installing Docker Compose plugin..."
        sudo apt-get install -y docker-compose-plugin 2>/dev/null || \
        sudo yum install -y docker-compose-plugin 2>/dev/null || \
        warn "Could not install docker-compose-plugin automatically."
    fi
    
    # Start only OnlyOffice from docker-compose
    log "Starting OnlyOffice Document Server..."
    cd "$APP_DIR"
    sudo docker compose up -d onlyoffice
    
    log "OnlyOffice Document Server started on port $ONLYOFFICE_PORT"
    log "Note: OnlyOffice takes 1-2 minutes to fully initialize."
else
    log "Step 8: Skipping OnlyOffice installation (use --with-onlyoffice to install)"
fi

# ============================================================
# Step 9: Create Systemd Service (Production)
# ============================================================
if [ "$PRODUCTION" = true ]; then
    log "Step 9: Creating systemd service with Gunicorn..."
    
    SERVICE_FILE="/etc/systemd/system/teamwork.service"
    
    sudo tee "$SERVICE_FILE" > /dev/null << EOF
[Unit]
Description=TeamWork Kanban Application (Gunicorn)
After=network.target

[Service]
Type=notify
User=$USER
Group=$USER
WorkingDirectory=$APP_DIR
Environment="PATH=$VENV_DIR/bin"
Environment="FLASK_ENV=production"
EnvironmentFile=$APP_DIR/.env
ExecStart=$VENV_DIR/bin/gunicorn -c gunicorn_config.py app:app
ExecReload=/bin/kill -s HUP \$MAINPID
KillMode=mixed
TimeoutStopSec=30
Restart=always
RestartSec=10

# Security hardening
PrivateTmp=true
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable teamwork
    sudo systemctl start teamwork
    
    log "Systemd service created and started with Gunicorn."
    log "Service configured for 100+ concurrent users (4 workers x 1000 connections)"
else
    log "Step 9: Skipping systemd service (use --production to create)"
fi

# ============================================================
# Step 10: Display Summary
# ============================================================
echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}     Deployment Complete!${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo -e "Application Directory: ${BLUE}$APP_DIR${NC}"
echo -e "Virtual Environment:   ${BLUE}$VENV_DIR${NC}"
echo -e "Flask Port:            ${BLUE}$FLASK_PORT${NC}"

if [ "$WITH_ONLYOFFICE" = true ]; then
    echo -e "OnlyOffice Port:       ${BLUE}$ONLYOFFICE_PORT${NC}"
fi

echo ""
if [ "$PRODUCTION" = true ]; then
    echo -e "${YELLOW}Production mode enabled with Gunicorn${NC}"
    echo -e "  Workers: 4 (eventlet async)"
    echo -e "  Capacity: ~4000 concurrent connections"
    echo ""
    echo -e "${YELLOW}Service management:${NC}"
    echo "  sudo systemctl status teamwork"
    echo "  sudo systemctl restart teamwork"
    echo "  sudo journalctl -u teamwork -f"
    echo ""
else
    echo -e "${YELLOW}To start the application manually (development):${NC}"
    echo "  cd $APP_DIR"
    echo "  source .venv/bin/activate"
    echo "  python app.py"
    echo ""
    echo -e "${YELLOW}To start with Gunicorn (production):${NC}"
    echo "  cd $APP_DIR"
    echo "  source .venv/bin/activate"
    echo "  gunicorn -c gunicorn_config.py app:app"
    echo ""
fi

echo -e "${YELLOW}Health check endpoints:${NC}"
echo "  http://localhost:$FLASK_PORT/health  (basic health)"
echo "  http://localhost:$FLASK_PORT/ready   (readiness with DB check)"
echo ""

echo -e "${YELLOW}Default login credentials:${NC}"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo -e "${YELLOW}Access the application at:${NC}"
echo "  http://localhost:$FLASK_PORT"
echo ""

log "Deployment script completed successfully!"
