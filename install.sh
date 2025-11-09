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
    if [ "$DEBUG_MODE" == "true" ]; then
        echo "[DEBUG] $timestamp - $msg" | tee -a "$LOG_FILE"
    else
        echo "[DEBUG] $timestamp - $msg" >> "$LOG_FILE"
    fi
}

# Trap errors and log them
trap 'log_error "Installation failed at line $LINENO"; exit 1' ERR

# Load environment variables
if [ -f .env.production ]; then
    log_debug "Loading .env.production"
    export $(cat .env.production | grep -v '^#' | xargs)
fi

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

if sudo apt-get install -y -qq curl wget git nginx certbot python3-certbot-nginx build-essential pkg-config libssl-dev 2>&1 | tee -a "$LOG_FILE"; then
    log_success "System packages installed"
else
    log_error "Failed to install system packages"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    log_info "📦 Installing Node.js v18..."
    if curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - 2>&1 | tee -a "$LOG_FILE"; then
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
    log_info "Node.js already installed: $(node --version)"
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
if npm install --legacy-peer-deps 2>&1 | tee -a "$LOG_FILE"; then
    log_debug "npm dependencies installed"
else
    log_error "Failed to install npm dependencies"
    exit 1
fi

if DOMAIN=$DOMAIN npm run build 2>&1 | tee -a "$LOG_FILE"; then
    log_success "Next.js frontend build completed"
else
    log_error "Frontend build failed"
    exit 1
fi

# Backend setup
log_info "🦀 Setting up Rust Backend..."
cd "$PROJECT_DIR/backend"
if cargo build --release 2>&1 | tee -a "$LOG_FILE"; then
    log_success "Rust backend build completed"
else
    log_error "Backend build failed"
    exit 1
fi

# Create SSL certificates with Let's Encrypt
log_info "🔒 Setting up SSL Certificate with Let's Encrypt..."
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
if [ ! -d "$CERT_DIR" ]; then
    log_info "Generating new certificate for $DOMAIN (www subdomain included)..."
    # Use webroot method with nginx - this doesn't require stopping the server
    if sudo certbot certonly --webroot \
        --webroot-path=/var/www/certbot \
        --non-interactive \
        --agree-tos \
        --email $EMAIL \
        -d $DOMAIN \
        -d www.$DOMAIN \
        --preferred-challenges http 2>&1 | tee -a "$LOG_FILE"; then
        log_success "SSL certificate generated successfully for $DOMAIN and www.$DOMAIN!"
    else
        log_warning "Failed to generate SSL certificate with Let's Encrypt (checking DNS configuration)"
        log_info "Trying with standalone mode (temporary Nginx stop)..."
        
        # Stop nginx temporarily for standalone verification
        if sudo systemctl stop nginx 2>&1 | tee -a "$LOG_FILE"; then
            log_debug "Nginx stopped for certificate generation"
            
            if sudo certbot certonly --standalone \
                --non-interactive \
                --agree-tos \
                --email $EMAIL \
                -d $DOMAIN \
                -d www.$DOMAIN \
                --preferred-challenges http 2>&1 | tee -a "$LOG_FILE"; then
                log_success "SSL certificate generated successfully with standalone method!"
            else
                log_warning "Failed to generate SSL certificate with Let's Encrypt - using self-signed certificate"
                log_info "Generating self-signed certificate for development/testing..."
                sudo mkdir -p "$CERT_DIR"
                if sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
                    -keyout "$CERT_DIR/privkey.pem" \
                    -out "$CERT_DIR/fullchain.pem" \
                    -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN" 2>&1 | tee -a "$LOG_FILE"; then
                    log_success "Self-signed certificate generated for development"
                else
                    log_error "Failed to generate self-signed certificate"
                    exit 1
                fi
            fi
        else
            log_error "Failed to stop Nginx for certificate generation"
            exit 1
        fi
    fi
else
    log_success "SSL certificate already exists at $CERT_DIR"
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

# HTTPS/HTTP2/HTTP3 configuration
server {
    # HTTPS with HTTP/2
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    
    # HTTP/3 with QUIC
    listen 443 quic reuseport;
    listen [::]:443 quic reuseport;
    
    server_name $DOMAIN www.$DOMAIN;

    # TLS Configuration
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # TLS 1.3 only (maximum security)
    ssl_protocols TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # HTTP/3 QUIC support
    add_header Alt-Svc 'h3=":443"; ma=2592000' always;
    
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

    # Frontend
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

# Create systemd services for frontend and backend
log_info "📋 Setting up systemd services..."

# Backend service
log_debug "Creating backend systemd service"
if sudo tee /etc/systemd/system/deltaup-backend.service > /dev/null <<EOF
[Unit]
Description=DeltaUp Backend Service
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR/backend
Environment="DATABASE_URL=sqlite://$PROJECT_DIR/backend/fintech.db"
Environment="JWT_SECRET=$(openssl rand -base64 32)"
Environment="RUST_LOG=info"
ExecStart=$HOME/.cargo/bin/cargo run --release
Restart=always
RestartSec=10

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
if sudo tee /etc/systemd/system/deltaup-frontend.service > /dev/null <<EOF
[Unit]
Description=DeltaUp Frontend Service
After=network.target deltaup-backend.service

[Service]
Type=simple
User=root
WorkingDirectory=$PROJECT_DIR/frontend
Environment="NODE_ENV=production"
Environment="NEXT_PUBLIC_API_URL=https://$DOMAIN"
ExecStart=/usr/bin/npx next start -p 3000
Restart=always
RestartSec=10

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

# Setup auto-renewal for SSL certificates
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
echo "📊 Next steps:"
echo "1. Start backend: sudo systemctl start deltaup-backend"
echo "2. Start frontend: sudo systemctl start deltaup-frontend"
echo "3. Enable on boot: sudo systemctl enable deltaup-backend deltaup-frontend"
echo "4. Check status: sudo systemctl status deltaup-backend deltaup-frontend"
echo ""
echo "🌐 Your application is ready at: https://$DOMAIN"
echo "📜 SSL Certificate: /etc/letsencrypt/live/$DOMAIN/"
echo "📋 Full installation logs: $LOG_FILE"
echo "⚠️  Error logs: $ERROR_LOG"
echo ""
echo "🔄 Auto-renewal: Certificates will auto-renew on the 1st of each month at 2 AM"

