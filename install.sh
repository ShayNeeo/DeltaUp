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

# Update system (skip if updated recently for faster reruns)
NEED_UPDATE=false
UPDATE_MARKER="/var/log/deltaup/.last_apt_update"
if [ ! -f "$UPDATE_MARKER" ] || [ $(find "$UPDATE_MARKER" -mmin +720 2>/dev/null | wc -l) -gt 0 ]; then
    NEED_UPDATE=true
fi

if [ "$NEED_UPDATE" = true ]; then
    log_info "📦 Updating system packages..."
    if sudo apt-get update -qq 2>&1 | tee -a "$LOG_FILE"; then
        log_debug "apt-get update completed"
        sudo touch "$UPDATE_MARKER" 2>/dev/null || true
    else
        log_warning "apt-get update encountered issues"
    fi
else
    log_info "✓ Skipping apt update (updated recently - faster rerun)"
fi

# Install required packages (apt handles already-installed packages efficiently)
log_info "📦 Ensuring required system packages are installed..."
if sudo apt-get install -y -qq curl git nginx certbot python3-certbot-nginx build-essential pkg-config libssl-dev 2>&1 | tee -a "$LOG_FILE"; then
    log_success "System packages verified/installed"
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

# Smart clean - only clean if package.json changed or node_modules missing
NEED_CLEAN=false
if [ ! -d "node_modules" ]; then
    NEED_CLEAN=true
    log_info "node_modules missing - will perform clean install"
elif [ "package.json" -nt "node_modules" ]; then
    NEED_CLEAN=true
    log_info "package.json updated - will refresh dependencies"
fi

if [ "$NEED_CLEAN" = true ]; then
    log_info "🧹 Cleaning frontend build cache..."
    rm -rf .next node_modules package-lock.json 2>&1 >> "$LOG_FILE" || log_warning "Could not clean some files"
else
    log_info "✓ Using cached node_modules (faster rerun)"
    # Only clean .next for fresh build
    rm -rf .next 2>&1 >> "$LOG_FILE" || log_warning "Could not clean .next"
fi

# Verify postcss.config.js has correct Tailwind v4 configuration
log_info "🔍 Verifying PostCSS configuration for Tailwind v4..."
if ! grep -q "tailwindcss:" postcss.config.js 2>/dev/null; then
    log_warning "PostCSS config missing tailwindcss - creating correct config"
    cat > postcss.config.js << 'EOF'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF
    log_success "✓ PostCSS config updated for Tailwind v4"
else
    log_debug "PostCSS config verified"
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

# Install dependencies with correct environment for Tailwind v4
if [ "$NEED_CLEAN" = true ]; then
    log_info "📥 Installing npm dependencies..."
    if npm install --no-audit --no-fund 2>&1 | tee -a "$LOG_FILE"; then
        :
    else
        # Fallback to legacy-peer-deps if standard install fails
        log_warning "Standard npm install failed, retrying with --legacy-peer-deps..."
        if npm install --legacy-peer-deps --no-audit --no-fund 2>&1 | tee -a "$LOG_FILE"; then
            :
        else
            log_error "❌ npm install failed with both standard and legacy modes"
            exit 1
        fi
    fi
    
    # Check if install actually succeeded by verifying node_modules was created
    if [ ! -d "node_modules" ]; then
        log_error "❌ npm install failed - node_modules directory not created"
        log_info "npm version: $(npm --version)"
        log_info "node version: $(node --version)"
        exit 1
    fi
    
    log_success "✓ Dependencies installed successfully"
else
    log_success "✓ Using cached dependencies (skipped npm install for speed)"
fi

# Verify key packages are installed
if [ ! -d "node_modules/next" ]; then
    log_error "❌ next package not found"
    exit 1
fi
if [ ! -d "node_modules/tailwindcss" ]; then
    log_error "❌ tailwindcss package not found"
    log_info "Available packages in node_modules: $(ls -1 node_modules | head -20)"
    exit 1
fi
if [ ! -d "node_modules/postcss" ]; then
    log_error "❌ postcss package not found"
    exit 1
fi
log_success "✓ Essential packages verified: next, tailwindcss, postcss"

# Build frontend
log_info "Building Next.js frontend..."
log_debug "NODE_ENV=production, NEXT_PUBLIC_API_URL=https://$DOMAIN"
log_debug "Tailwind version: $(npm ls tailwindcss 2>/dev/null | grep tailwindcss || echo 'not found')"
log_debug "PostCSS config:"
log_debug "$(cat postcss.config.js || echo 'postcss.config.js not found')"

if NODE_ENV=production NEXT_PUBLIC_API_URL=https://$DOMAIN npm run build 2>&1 | tee -a "$LOG_FILE"; then
    log_success "✓ Next.js frontend build completed successfully"
    
    # Debug: Show complete .next structure
    log_debug "📁 .next directory structure:"
    find .next -type f -name "*.css" 2>/dev/null | head -20 | while read f; do log_debug "  Found CSS: $f"; done
    
    # Verify build output contains CSS
    if [ ! -d ".next/static/css" ] || [ -z "$(ls -A .next/static/css/ 2>/dev/null)" ]; then
        log_warning "⚠️  Warning: No CSS files found in .next/static/css/"
        log_info "Checking .next directory structure..."
        find .next -type d | head -20 2>&1 | tee -a "$LOG_FILE"
        log_info "Looking for any CSS files in .next:"
        find .next -name "*.css" 2>&1 | tee -a "$LOG_FILE"
    else
        log_success "✓ CSS files generated in .next/static/css/"
        log_info "CSS files:"
        ls -lh .next/static/css/ 2>&1 | tee -a "$LOG_FILE"
    fi
    
    # Fix permissions so frontend service can read files
    log_info "Setting proper permissions on .next directory..."
    if [ -d ".next" ]; then
        sudo chown -R ubuntu:ubuntu .next 2>&1 >> "$LOG_FILE" || log_warning "Could not change .next owner"
        sudo chmod -R 755 .next 2>&1 >> "$LOG_FILE" || log_warning "Could not change .next permissions"
        log_success "✓ Permissions fixed on .next directory"
    fi
else
    log_error "Frontend build failed - check logs for TypeScript errors"
    exit 1
fi

# Backend setup
log_info "🦀 Setting up Rust Backend..."
cd "$PROJECT_DIR/backend"

# Source cargo environment
if [ -f "$HOME/.cargo/env" ]; then
    source "$HOME/.cargo/env" 2>&1 >> "$LOG_FILE" || log_warning "Could not source cargo env"
fi

# Build backend (cargo handles incremental builds efficiently)
log_info "Building Rust backend..."
if cargo build --release 2>&1 | tee -a "$LOG_FILE"; then
    log_success "Rust backend build completed"
    BACKEND_BINARY="$PROJECT_DIR/backend/target/release/deltaup"
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

# Let Certbot handle all SSL configuration automatically
# (including DH params, ciphers, etc)

# Setup Simple Nginx configuration (Let Certbot handle SSL)
log_info "🌐 Configuring Nginx reverse proxy (simple config)..."
if sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name __DOMAIN__ www.__DOMAIN__ _;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /oauth/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
then
    sudo sed -i "s/__DOMAIN__/$DOMAIN/g" /etc/nginx/sites-available/$DOMAIN
    log_success "Simple nginx configuration created"
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
    if sudo systemctl reload nginx 2>&1 | tee -a "$LOG_FILE"; then
        log_success "Nginx reloaded successfully"
    else
        log_warning "Nginx reload failed, attempting restart..."
        if sudo systemctl restart nginx 2>&1 | tee -a "$LOG_FILE"; then
            log_success "Nginx restarted successfully"
        else
            log_error "Failed to restart Nginx"
            exit 1
        fi
    fi
else
    log_error "Nginx configuration test failed - check syntax errors above"
    log_info "Attempting to view nginx error details..."
    sudo nginx -t 2>&1 | tee -a "$LOG_FILE"
    exit 1
fi

# Let Certbot configure SSL automatically (this modifies nginx config)
log_info "🔒 Obtaining Let's Encrypt SSL certificate with Certbot..."
if sudo certbot --nginx \
    --redirect \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" 2>&1 | tee -a "$LOG_FILE"; then
    log_success "✅ SSL certificate obtained and nginx configured by Certbot"
    sudo systemctl reload nginx 2>&1 | tee -a "$LOG_FILE" || log_warning "Could not reload nginx after SSL"
else
    log_warning "⚠️  Certbot failed - site will run HTTP only"
    log_info "You can manually run: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
fi

# Verify SSL certificate if it exists
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    CERT_EXPIRY=$(sudo openssl x509 -enddate -noout -in /etc/letsencrypt/live/$DOMAIN/fullchain.pem 2>/dev/null | cut -d= -f2)
    if [ -n "$CERT_EXPIRY" ]; then
        log_success "SSL certificate expires: $CERT_EXPIRY"
    else
        log_warning "Could not read certificate expiry date"
    fi
else
    log_info "No SSL certificate found - site running on HTTP only"
fi

# Create/update systemd services for frontend and backend
log_info "📋 Setting up systemd services..."

# Backend service (always overwrite to ensure correct configuration)
log_debug "Creating/updating backend systemd service"
BACKEND_USER=$(whoami)
sudo rm -f /etc/systemd/system/deltaup-backend.service
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

# Frontend service (always overwrite to ensure correct configuration)
log_debug "Creating/updating frontend systemd service"
FRONTEND_USER=$(whoami)
sudo rm -f /etc/systemd/system/deltaup-frontend.service
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
Environment="PORT=3000"
ExecStart=$PROJECT_DIR/frontend/node_modules/.bin/next start --port 3000 --hostname 0.0.0.0
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

# Restart frontend service to pick up the new build
log_info "Restarting frontend service..."
if sudo systemctl restart deltaup-frontend 2>&1 | tee -a "$LOG_FILE"; then
    log_success "Frontend service restarted"
    sleep 2
    log_info "Checking frontend service status..."
    sudo systemctl status deltaup-frontend 2>&1 | head -5 | tee -a "$LOG_FILE"
else
    log_warning "Failed to restart frontend service - may need manual restart"
fi

# Certbot handles auto-renewal automatically via systemd timer
# Check if certbot timer is enabled
log_info "⚙️ Ensuring certbot auto-renewal is enabled..."
if sudo systemctl is-enabled certbot.timer &>/dev/null; then
    log_success "Certbot auto-renewal already enabled"
else
    if sudo systemctl enable certbot.timer 2>&1 | tee -a "$LOG_FILE"; then
        if sudo systemctl start certbot.timer 2>&1 | tee -a "$LOG_FILE"; then
            log_success "Certbot auto-renewal timer enabled"
        else
            log_warning "Could not start certbot timer"
        fi
    else
        log_warning "Could not enable certbot timer - manual renewal may be needed"
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
echo "📊 Quick Start Commands:"
echo "  Start services: sudo systemctl start deltaup-backend deltaup-frontend"
echo "  Enable on boot: sudo systemctl enable deltaup-backend deltaup-frontend"
echo "  Check status: sudo systemctl status deltaup-backend deltaup-frontend"
echo ""
echo "📋 Debugging:"
echo "  View frontend logs: sudo journalctl -u deltaup-frontend -n 50 -f"
echo "  View backend logs: sudo journalctl -u deltaup-backend -n 50 -f"
echo "  Nginx test: sudo nginx -t"
echo "  Reload nginx: sudo systemctl reload nginx"
echo ""
echo "📋 Installation logs: $LOG_FILE"

