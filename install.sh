#!/bin/bash

set -e

# ============================================================================
# Enhanced Logging Functions
# ============================================================================
LOG_DIR="/var/log/deltaup"
LOG_FILE="$LOG_DIR/install-$(date +%Y%m%d-%H%M%S).log"
ERROR_LOG="$LOG_DIR/install-errors.log"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR" 2>/dev/null || sudo mkdir -p "$LOG_DIR"
sudo chmod 755 "$LOG_DIR" 2>/dev/null || true

# Function to log messages
log_info() {
    local msg="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[INFO] $timestamp - $msg" | tee -a "$LOG_FILE"
}

log_success() {
    local msg="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[✓] $timestamp - $msg" | tee -a "$LOG_FILE"
}

log_error() {
    local msg="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[✗] $timestamp - ERROR: $msg" | tee -a "$LOG_FILE" "$ERROR_LOG"
}

log_warning() {
    local msg="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[!] $timestamp - WARNING: $msg" | tee -a "$LOG_FILE"
}

log_debug() {
    local msg="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[DEBUG] $timestamp - $msg" >> "$LOG_FILE"
}

# Trap errors and log them
trap 'log_error "Installation failed at line $LINENO"; exit 1' ERR

# Check required environment variables
if [ -z "$DOMAIN" ]; then
    log_error "DOMAIN environment variable not set"
    echo "Usage: DOMAIN=deltaup.io EMAIL=admin@deltaup.io ./install.sh"
    exit 1
fi

if [ -z "$EMAIL" ]; then
    log_error "EMAIL environment variable not set"
    echo "Usage: DOMAIN=deltaup.io EMAIL=admin@deltaup.io ./install.sh"
    exit 1
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log_info "🚀 Setting up DeltaUp Production Environment"
log_info "📍 Domain: $DOMAIN"
log_info "📧 Email: $EMAIL"
log_info "📁 Project Directory: $PROJECT_DIR"

# Update system
log_info "📦 Updating system packages..."
if sudo apt-get update -qq 2>&1 | tee -a "$LOG_FILE"; then
    log_debug "apt-get update completed"
else
    log_warning "apt-get update encountered issues"
fi

if sudo apt-get install -y -qq curl git nginx certbot python3-certbot-nginx build-essential pkg-config libssl-dev 2>&1 | tee -a "$LOG_FILE"; then
    log_success "System packages installed"
else
    log_error "Failed to install system packages"
    exit 1
fi

# Check if Node.js is installed and get version
if ! command -v node &> /dev/null; then
    log_info "📦 Installing Node.js v22 (Latest LTS)..."
    if curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - 2>&1 | tee -a "$LOG_FILE"; then
        log_debug "Node.js repository added"
    else
        log_error "Failed to add Node.js repository"
        exit 1
    fi
    
    if sudo apt-get install -y -qq nodejs 2>&1 | tee -a "$LOG_FILE"; then
        log_success "Node.js installed: $(node --version)"
    else
        log_error "Failed to install Node.js"
        exit 1
    fi
else
    CURRENT_NODE_VERSION=$(node --version | sed 's/v//' | cut -d'.' -f1)
    CURRENT_NODE_VERSION=$((CURRENT_NODE_VERSION + 0))
    log_info "Node.js already installed: $(node --version)"
    
    if [ "$CURRENT_NODE_VERSION" -lt 18 ]; then
        log_warning "⚠️ Node.js v$CURRENT_NODE_VERSION detected - upgrading to v22..."
        if curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - 2>&1 | tee -a "$LOG_FILE"; then
            log_debug "Node.js v22 repository added"
        else
            log_error "Failed to add Node.js v22 repository"
            exit 1
        fi
        
        if sudo apt-get install -y -qq nodejs 2>&1 | tee -a "$LOG_FILE"; then
            log_success "Node.js upgraded to: $(node --version)"
        else
            log_error "Failed to upgrade Node.js"
            exit 1
        fi
    else
        log_success "Node.js v$CURRENT_NODE_VERSION meets requirements"
    fi
fi

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    log_info "📦 Installing Rust..."
    if curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y 2>&1 | tee -a "$LOG_FILE"; then
        source $HOME/.cargo/env
        log_success "Rust installed: $(cargo --version)"
    else
        log_error "Failed to install Rust"
        exit 1
    fi
else
    log_info "Rust already installed: $(cargo --version)"
fi

# Frontend setup
log_info "📦 Setting up Next.js Frontend..."
cd "$PROJECT_DIR/frontend"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    log_error "npm not found. Node.js may not be properly installed"
    exit 1
fi

# Install dependencies (skip if up to date)
if [ -d "node_modules" ] && [ -d "node_modules/next" ] && [ "package.json" -ot "node_modules" ]; then
    log_info "📦 Skipping npm install - dependencies are up to date"
else
    log_info "📥 Installing npm dependencies..."
    if npm install --legacy-peer-deps 2>&1 | tee -a "$LOG_FILE"; then
        log_success "✓ npm dependencies installed successfully"
    else
        log_error "npm install failed"
        exit 1
    fi
fi

# Generate Next.js TypeScript environment file
log_info "📝 Generating Next.js TypeScript environment..."

# Ensure next-env.d.ts exists with proper Next.js 15+ content
if [ ! -f "next-env.d.ts" ]; then
    log_info "🔧 Creating next-env.d.ts file..."
    cat > next-env.d.ts << 'EOF'
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/basic-features/typescript for more information.
EOF
    log_success "✓ next-env.d.ts created"
else
    log_debug "next-env.d.ts already exists"
fi

# Build frontend (skip if up to date)
if [ -d ".next" ] && [ "package.json" -ot ".next" ] && find pages components -name "*.tsx" -o -name "*.ts" -o -name "*.js" | xargs -r ls -t | head -1 | xargs -I {} test {} -ot ".next"; then
    log_info "🏗️  Skipping frontend build - already up to date"
else
    log_info "Building Next.js frontend (this may take 1-2 minutes)..."
    if NODE_ENV=production DOMAIN=$DOMAIN npm run build 2>&1 | tee -a "$LOG_FILE"; then
        log_success "✓ Next.js frontend build completed successfully"
    else
        log_error "Frontend build failed - check logs for TypeScript errors"
        exit 1
    fi
fi

# Backend setup
log_info "🦀 Setting up Rust Backend..."
cd "$PROJECT_DIR/backend"

# Source cargo environment
if [ -f "$HOME/.cargo/env" ]; then
    source "$HOME/.cargo/env" 2>&1 >> "$LOG_FILE" || log_warning "Could not source cargo env"
fi

# Build backend (skip if up to date)
BACKEND_BINARY="$PROJECT_DIR/backend/target/release/deltaup"
if [ -f "$BACKEND_BINARY" ] && [ "Cargo.toml" -ot "$BACKEND_BINARY" ] && find src -name "*.rs" | xargs -r ls -t | head -1 | xargs -I {} test {} -ot "$BACKEND_BINARY"; then
    log_info "⚙️  Skipping backend build - already up to date"
else
    log_info "Building Rust backend..."
    if cargo build --release 2>&1 | tee -a "$LOG_FILE"; then
        log_success "Rust backend build completed"
        if [ ! -f "$BACKEND_BINARY" ]; then
            # Try alternate binary names
            BACKEND_BINARY=$(find "$PROJECT_DIR/backend/target/release" -type f -executable | head -1)
            if [ -z "$BACKEND_BINARY" ]; then
                log_error "Backend binary not found after build"
                exit 1
            fi
        fi
        log_debug "Backend binary: $BACKEND_BINARY"
    else
        log_error "Backend build failed"
        exit 1
    fi
fi

# Create SSL certificates with Let's Encrypt
log_info "🔒 Setting up SSL Certificate with Let's Encrypt..."
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
if [ ! -d "$CERT_DIR" ]; then
    log_info "Generating SSL certificate for $DOMAIN..."
    if sudo certbot certonly --webroot \
        --webroot-path=/var/www/certbot \
        --non-interactive \
        --agree-tos \
        --email $EMAIL \
        -d $DOMAIN \
        -d www.$DOMAIN \
        --preferred-challenges http 2>&1 | tee -a "$LOG_FILE"; then
        log_success "SSL certificate generated successfully!"
    else
        log_error "Failed to generate SSL certificate"
        exit 1
    fi
else
    log_success "SSL certificate already exists"
fi

# Ensure certbot renewal directory exists
if [ ! -d "/var/www/certbot" ]; then
    log_debug "Creating certbot webroot directory"
    sudo mkdir -p /var/www/certbot
    sudo chmod 755 /var/www/certbot
fi

# Setup Nginx configuration
log_info "🌐 Configuring Nginx reverse proxy..."
if sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null <<EOF
upstream deltaup_backend {
    server 127.0.0.1:8000;
}

upstream deltaup_frontend {
    server 127.0.0.1:3000;
}

# HTTP to HTTPS redirect with Let's Encrypt renewal support
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Let's Encrypt ACME challenge location (required for webroot renewal)
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        try_files \$uri =404;
    }
    
    # Redirect all other HTTP traffic to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS configuration
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name $DOMAIN www.$DOMAIN;

    # TLS Configuration
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # TLS 1.2 and 1.3 (wider compatibility)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    client_max_body_size 50M;

    # API routes to backend
    location /api/ {
        proxy_pass http://deltaup_backend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_redirect off;
    }

    # OAuth routes to backend
    location /oauth/ {
        proxy_pass http://deltaup_backend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_redirect off;
    }

    # Frontend - proxy all routes including static files to Next.js app
    location / {
        proxy_pass http://deltaup_frontend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_redirect off;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";

        # Allow Next.js to handle cache headers for static files
        proxy_cache_bypass \$http_pragma \$http_authorization;
    }
}
EOF
then
    log_success "Nginx configuration created"
else
    log_error "Failed to create Nginx configuration"
    exit 1
fi

# Enable nginx site
log_debug "Enabling Nginx site configuration"
sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN 2>/dev/null || log_warning "Could not create symlink"
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload nginx
log_info "Testing Nginx configuration..."
if sudo nginx -t 2>&1 | tee -a "$LOG_FILE" | grep -q "successful"; then
    log_debug "Nginx configuration test passed"
    if sudo systemctl restart nginx 2>&1 | tee -a "$LOG_FILE"; then
        log_success "Nginx restarted successfully"
    else
        log_error "Failed to restart Nginx"
        exit 1
    fi
else
    log_warning "Nginx configuration has issues, attempting graceful restart..."
    if sudo systemctl restart nginx 2>&1 | tee -a "$LOG_FILE"; then
        log_warning "Nginx restart attempted (may have SSL certificate issues)"
    else
        log_warning "Nginx restart had issues - SSL certificates may need to be configured"
    fi
fi

# Create systemd services for frontend and backend (skip if already exist)
if [ -f "/etc/systemd/system/deltaup-backend.service" ] && [ -f "/etc/systemd/system/deltaup-frontend.service" ]; then
    log_info "📋 Skipping systemd services - already configured"
else
    log_info "📋 Setting up systemd services..."

    # Backend service
    log_debug "Creating backend systemd service"
    BACKEND_USER=$(whoami)
    if sudo tee /etc/systemd/system/deltaup-backend.service > /dev/null <<EOF
[Unit]
Description=DeltaUp Backend Service
After=network.target

[Service]
Type=simple
User=$BACKEND_USER
WorkingDirectory=$PROJECT_DIR/backend
Environment="DATABASE_URL=sqlite://$PROJECT_DIR/backend/fintech.db"
Environment="JWT_SECRET=$(openssl rand -base64 32)"
Environment="RUST_LOG=info"
ExecStart=$BACKEND_BINARY
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
    then
        log_success "Backend service created"
    else
        log_error "Failed to create backend service"
        exit 1
    fi

    # Frontend service
    log_debug "Creating frontend systemd service"
    FRONTEND_USER=$(whoami)
    NEXT_BIN="$PROJECT_DIR/frontend/node_modules/.bin/next"
    if sudo tee /etc/systemd/system/deltaup-frontend.service > /dev/null <<EOF
[Unit]
Description=DeltaUp Frontend Service
After=network.target deltaup-backend.service

[Service]
Type=simple
User=$FRONTEND_USER
WorkingDirectory=$PROJECT_DIR/frontend
Environment="NODE_ENV=production"
Environment="NEXT_PUBLIC_API_URL=https://$DOMAIN"
ExecStart=$NEXT_BIN start -p 3000
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
    then
        log_success "Frontend service created"
    else
        log_error "Failed to create frontend service"
        exit 1
    fi

    if sudo systemctl daemon-reload 2>&1 | tee -a "$LOG_FILE"; then
        log_success "Systemd daemon reloaded"
    else
        log_error "Failed to reload systemd daemon"
        exit 1
    fi
fi

# Setup auto-renewal for SSL certificates (skip if already configured)
if [ -f "/etc/cron.d/certbot-renew" ]; then
    log_info "⚙️  Skipping SSL renewal setup - already configured"
else
    log_info "⚙️ Setting up automatic SSL certificate renewal..."
    if sudo tee /etc/cron.d/certbot-renew > /dev/null <<EOF
# Auto-renew Let's Encrypt certificates using webroot method
# Runs daily at 2:30 AM to avoid peak traffic times
30 2 * * * root certbot renew --webroot --webroot-path=/var/www/certbot --quiet && systemctl reload nginx

# Additional renewal attempt at 14:30 (2:30 PM) in case of failures
30 14 * * * root certbot renew --webroot --webroot-path=/var/www/certbot --quiet -q 2>/dev/null || true
EOF
    then
        log_success "SSL auto-renewal cron jobs configured"
    else
        log_error "Failed to configure SSL auto-renewal"
        exit 1
    fi
fi

# Create .env.production file
log_info "📝 Creating .env.production..."
if tee "$PROJECT_DIR/.env.production" > /dev/null <<EOF
DOMAIN=$DOMAIN
EMAIL=$EMAIL
PROJECT_DIR=$PROJECT_DIR
EOF
then
    log_success ".env.production created"
else
    log_error "Failed to create .env.production"
    exit 1
fi

# Display completion summary
echo ""
log_success "✅ Setup complete!"
echo ""
echo "🌐 Your application is ready at: https://$DOMAIN"
echo ""
echo "📊 Commands:"
echo "  Start services: sudo systemctl start deltaup-backend deltaup-frontend"
echo "  Enable on boot: sudo systemctl enable deltaup-backend deltaup-frontend"
echo "  Check status: sudo systemctl status deltaup-backend deltaup-frontend"
echo ""
echo "📋 Logs: $LOG_FILE"

