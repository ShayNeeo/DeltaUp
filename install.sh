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

# Clean build to ensure fresh CSS generation
log_info "🧹 Cleaning frontend build cache..."
rm -rf .next node_modules package-lock.json 2>&1 >> "$LOG_FILE" || log_warning "Could not clean some files"

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

# Prepare certbot webroot directory BEFORE certificate request
log_info "🔒 Preparing Let's Encrypt environment..."
if [ ! -d "/var/www/certbot" ]; then
    log_debug "Creating certbot webroot directory"
    sudo mkdir -p /var/www/certbot
    sudo chmod 755 /var/www/certbot
    log_success "Certbot webroot directory created"
fi

# Create temporary nginx config for ACME challenge validation
log_debug "Setting up temporary ACME challenge handler..."
if sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null <<'NGINX_TEMP'
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        try_files $uri =404;
    }
    
    location / {
        return 200 "Setup in progress...";
    }
}
NGINX_TEMP
then
    sudo sed -i "s/\\\$DOMAIN/$DOMAIN/g" /etc/nginx/sites-available/$DOMAIN
    sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN 2>/dev/null || true
    sudo systemctl reload nginx 2>&1 >> "$LOG_FILE" || log_warning "Could not reload nginx"
    sleep 2
    log_debug "Temporary ACME handler ready"
else
    log_warning "Could not setup temporary ACME handler"
fi

# Create SSL certificates with Let's Encrypt
log_info "🔒 Requesting SSL Certificate from Let's Encrypt..."
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"

if [ ! -d "$CERT_DIR" ]; then
    log_info "Generating new SSL certificate for $DOMAIN..."
    if sudo certbot certonly --webroot \
        --webroot-path=/var/www/certbot \
        --non-interactive \
        --agree-tos \
        --email "$EMAIL" \
        -d "$DOMAIN" \
        -d "www.$DOMAIN" \
        --preferred-challenges http \
        --rsa-key-size 4096 \
        --key-type rsa \
        --expand 2>&1 | tee -a "$LOG_FILE"; then
        log_success "✅ SSL certificate generated successfully!"
    else
        log_error "❌ Failed to generate SSL certificate - check logs above"
        sudo certbot certificates 2>&1 | tee -a "$LOG_FILE"
        exit 1
    fi
else
    log_info "SSL certificate already exists at $CERT_DIR"
    log_info "Certificate validity:"
    sudo openssl x509 -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" -noout -dates 2>&1 | tee -a "$LOG_FILE"
fi

# Verify certificate files exist and are readable
log_info "✓ Verifying SSL certificate files..."
for cert_file in "fullchain.pem" "privkey.pem"; do
    if [ ! -f "/etc/letsencrypt/live/$DOMAIN/$cert_file" ]; then
        log_error "❌ $cert_file not found at /etc/letsencrypt/live/$DOMAIN/"
        log_info "Available certificates:"
        sudo certbot certificates 2>&1 | tee -a "$LOG_FILE"
        exit 1
    fi
    log_debug "✓ $cert_file found"
done

# Create chain.pem symlink if needed
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/chain.pem" ]; then
    log_debug "Creating chain.pem symlink"
    sudo ln -sf /etc/letsencrypt/live/$DOMAIN/fullchain.pem /etc/letsencrypt/live/$DOMAIN/chain.pem 2>&1 || log_warning "Could not create chain.pem symlink"
fi

log_success "✅ SSL certificate verification complete"

# Setup Nginx configuration
log_info "🌐 Configuring Nginx reverse proxy..."
if sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null <<EOF
upstream deltaup_backend {
    server 127.0.0.1:8000 fail_timeout=0;
}

upstream deltaup_frontend {
    server 127.0.0.1:3000 fail_timeout=0;
}

# HTTP server - handle certbot renewal and redirect to HTTPS
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name $DOMAIN www.$DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        try_files \$uri =404;
    }

    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS server block - IPv4 + IPv6
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # SSL Certificate Configuration
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    # TLS Protocol Configuration - Secure for all networks
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    
    # Cipher suites - Compatible with WiFi networks
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';

    # SSL Session Configuration
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;

    # Diffie-Hellman parameter
    ssl_dhparam /etc/ssl/certs/dhparam.pem;

    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Client body size
    client_max_body_size 50M;

    # API proxy
    location /api/ {
        proxy_pass http://deltaup_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Connection "";
        proxy_redirect off;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # OAuth proxy
    location /oauth/ {
        proxy_pass http://deltaup_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Connection "";
        proxy_redirect off;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Frontend proxy
    location / {
        proxy_pass http://deltaup_frontend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$server_name;
        
        # WebSocket support
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_redirect off;
        proxy_buffering off;
        proxy_request_buffering off;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF
then
    log_success "Nginx configuration created"
else
    log_error "Failed to create Nginx configuration"
    exit 1
fi

# Generate Diffie-Hellman parameters for forward secrecy
log_info "Generating DH parameters (this may take a minute)..."
if [ ! -f /etc/ssl/certs/dhparam.pem ]; then
    if sudo openssl dhparam -out /etc/ssl/certs/dhparam.pem 2048 2>&1 | tee -a "$LOG_FILE"; then
        log_success "DH parameters generated"
    else
        log_warning "DH parameter generation failed - continuing without"
    fi
else
    log_debug "DH parameters already exist"
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

# Verify SSL certificate is working
log_info "Verifying SSL certificate is accessible..."
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    CERT_EXPIRY=$(sudo openssl x509 -enddate -noout -in /etc/letsencrypt/live/$DOMAIN/fullchain.pem 2>/dev/null | cut -d= -f2)
    if [ -n "$CERT_EXPIRY" ]; then
        log_success "SSL certificate expires: $CERT_EXPIRY"
    else
        log_warning "Could not read certificate expiry date"
    fi
else
    log_error "SSL certificate file not found - certificate may not be properly configured"
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
ExecStart=/usr/bin/npm start
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

# Setup auto-renewal for SSL certificates (skip if already configured)
if [ -f "/etc/cron.d/certbot-renew" ]; then
    log_info "⚙️  Skipping SSL renewal setup - already configured"
else
    log_info "⚙️ Setting up automatic SSL certificate renewal..."
    if sudo tee /etc/cron.d/certbot-renew > /dev/null <<'EOF'
# Auto-renew Let's Encrypt certificates using webroot method
# Runs daily at 2:30 AM to avoid peak traffic times

# Primary renewal attempt
30 2 * * * root certbot renew --webroot --webroot-path=/var/www/certbot --quiet >> /var/log/deltaup/certbot-renew.log 2>&1 && systemctl reload nginx >> /var/log/deltaup/certbot-renew.log 2>&1 || true

# Backup renewal attempt at 14:30 (2:30 PM) in case of failures
30 14 * * * root certbot renew --webroot --webroot-path=/var/www/certbot --quiet >> /var/log/deltaup/certbot-renew.log 2>&1 || true

# Weekly certificate status check (Monday at 3:00 AM)
0 3 * * 1 root certbot certificates >> /var/log/deltaup/certbot-renew.log 2>&1
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

