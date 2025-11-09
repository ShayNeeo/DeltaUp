#!/bin/bash

set -e

# Load environment variables
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
fi

# Check required environment variables
if [ -z "$DOMAIN" ]; then
    echo "❌ Error: DOMAIN environment variable not set"
    echo "Usage: DOMAIN=deltaup.io EMAIL=admin@deltaup.io ./install.sh"
    exit 1
fi

if [ -z "$EMAIL" ]; then
    echo "❌ Error: EMAIL environment variable not set"
    echo "Usage: DOMAIN=deltaup.io EMAIL=admin@deltaup.io ./install.sh"
    exit 1
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Setting up DeltaUp Production Environment..."
echo "📍 Domain: $DOMAIN"
echo "📧 Email: $EMAIL"

# Update system
echo "📦 Updating system packages..."
sudo apt-get update -qq
sudo apt-get install -y -qq curl wget git nginx certbot python3-certbot-nginx > /dev/null 2>&1

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - > /dev/null 2>&1
    sudo apt-get install -y -qq nodejs > /dev/null 2>&1
fi

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo "📦 Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y > /dev/null 2>&1
    source $HOME/.cargo/env
fi

# Frontend setup
echo "📦 Setting up Next.js Frontend..."
cd "$PROJECT_DIR/frontend"
npm install --legacy-peer-deps > /dev/null 2>&1
DOMAIN=$DOMAIN npm run build > /dev/null 2>&1

# Backend setup
echo "🦀 Setting up Rust Backend..."
cd "$PROJECT_DIR/backend"
cargo build --release 2>&1 | grep -E "Compiling|Finished" || true

# Create SSL certificates with Let's Encrypt
echo "🔒 Setting up SSL Certificate with Let's Encrypt..."
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
if [ ! -d "$CERT_DIR" ]; then
    echo "Generating new certificate for $DOMAIN..."
    sudo certbot certonly --standalone \
        --non-interactive \
        --agree-tos \
        --email $EMAIL \
        -d $DOMAIN \
        -d www.$DOMAIN \
        --preferred-challenges http
    echo "✅ Certificate generated successfully!"
else
    echo "✅ Certificate already exists at $CERT_DIR"
fi

# Setup Nginx configuration
echo "🌐 Configuring Nginx reverse proxy..."
sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null <<EOF
upstream deltaup_backend {
    server 127.0.0.1:8000;
}

upstream deltaup_frontend {
    server 127.0.0.1:3000;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS configuration
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

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
    }
}
EOF

# Enable nginx site
sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN 2>/dev/null || true
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload nginx
echo "Testing Nginx configuration..."
sudo nginx -t
sudo systemctl restart nginx

# Create systemd services for frontend and backend
echo "📋 Setting up systemd services..."

# Backend service
sudo tee /etc/systemd/system/deltaup-backend.service > /dev/null <<EOF
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

# Frontend service
sudo tee /etc/systemd/system/deltaup-frontend.service > /dev/null <<EOF
[Unit]
Description=DeltaUp Frontend Service
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR/frontend
Environment="NODE_ENV=production"
Environment="NEXT_PUBLIC_API_URL=https://$DOMAIN"
ExecStart=$(which node) /root/.nvm/versions/node/*/bin/next start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload

# Setup auto-renewal for SSL certificates
echo "⚙️ Setting up automatic SSL certificate renewal..."
sudo tee /etc/cron.d/certbot-renew > /dev/null <<EOF
0 2 1 * * root certbot renew --quiet && systemctl reload nginx
EOF

# Create .env.production file
echo "📝 Creating .env.production..."
tee "$PROJECT_DIR/.env.production" > /dev/null <<EOF
DOMAIN=$DOMAIN
EMAIL=$EMAIL
PROJECT_DIR=$PROJECT_DIR
EOF

echo ""
echo "✅ Setup complete!"
echo ""
echo "📊 Next steps:"
echo "1. Start backend: sudo systemctl start deltaup-backend"
echo "2. Start frontend: sudo systemctl start deltaup-frontend"
echo "3. Enable on boot: sudo systemctl enable deltaup-backend deltaup-frontend"
echo "4. Check status: sudo systemctl status deltaup-backend deltaup-frontend"
echo ""
echo "🌐 Your application is ready at: https://$DOMAIN"
echo "📜 SSL Certificate: /etc/letsencrypt/live/$DOMAIN/"
echo ""
echo "🔄 Auto-renewal: Certificates will auto-renew on the 1st of each month at 2 AM"

