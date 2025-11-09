# 🚀 DeltaUp - Fintech Application

Welcome! You now have **DeltaUp**, a production-ready fintech application ready to deploy to your VPS.

## 📋 Quick Summary

- **App Name:** DeltaUp
- **Frontend:** Next.js + TailwindCSS
- **Backend:** Rust + Actix-web
- **Database:** SQLite
- **Deployment:** Single command to VPS with SSL/TLS

## ⚡ Deploy in One Command

```bash
DOMAIN=deltaup.io EMAIL=admin@deltaup.io ./install.sh
```

That's it! The script will:
1. Install all dependencies (Node, Rust, Nginx, Certbot)
2. Build frontend and backend
3. Generate SSL certificate (Let's Encrypt)
4. Configure reverse proxy (Nginx)
5. Setup services (Systemd)
6. Enable auto-renewal

**Deployment takes:** ~10 minutes

## 🌐 After Deployment

- **Frontend:** https://deltaup.io
- **API:** https://deltaup.io/api/*
- **OAuth:** https://deltaup.io/oauth/*

## 📚 Documentation

- **README.md** - Project overview
- **DEPLOYMENT.md** - Detailed deployment guide
- **guide.md** - Additional information

## 🎯 Project Structure

```
DeltaUp/
├── frontend/          # Next.js app (port 3000)
│   ├── pages/        # All pages (transfer, balance, qr-payment)
│   └── styles/       # TailwindCSS styles
├── backend/          # Rust API server (port 8000)
│   ├── src/         # Rust source code
│   └── Cargo.toml   # Dependencies
└── install.sh        # Deployment script
```

## 🔧 Key Features

✅ **Bank Transfer** - Send money to accounts
✅ **Balance Check** - View account balance
✅ **QR Payments** - Generate & process QR codes
✅ **OAuth Ready** - Integrate with OpenAPI
✅ **SSL/TLS** - Automatic HTTPS with Let's Encrypt
✅ **Auto-Renewal** - Certificates auto-renew monthly
✅ **Auto-Restart** - Services restart on failure
✅ **Production Ready** - Nginx reverse proxy

## 🔐 Security

- HTTPS/TLS 1.2+
- JWT Authentication
- CORS Protection
- Strong Ciphers
- Automatic SSL renewal
- HTTP/2 Support

## 📊 Service Names

The following systemd services are created:
- `deltaup-backend.service` - Rust backend
- `deltaup-frontend.service` - Next.js frontend

## 🛠️ Commands After Deploy

```bash
# Start services
sudo systemctl start deltaup-backend deltaup-frontend

# Enable auto-start on boot
sudo systemctl enable deltaup-backend deltaup-frontend

# Check status
sudo systemctl status deltaup-backend deltaup-frontend

# View logs
sudo journalctl -u deltaup-backend -f
sudo journalctl -u deltaup-frontend -f

# Restart services
sudo systemctl restart deltaup-backend deltaup-frontend
```

## 📝 Environment Variables

The script automatically generates `.env.production` with:
- `DOMAIN` - Your domain (deltaup.io)
- `EMAIL` - For SSL certificate notifications

## 🔄 SSL Certificate

- **Auto-generated:** Let's Encrypt
- **Valid for:** 90 days
- **Auto-renewal:** 1st of each month at 2 AM UTC
- **Location:** `/etc/letsencrypt/live/deltaup.io/`

## ✅ Deployment Checklist

- [ ] VPS with Ubuntu/Debian running
- [ ] Domain (deltaup.io) DNS records pointing to VPS
- [ ] SSH access to VPS
- [ ] Run: `DOMAIN=deltaup.io EMAIL=admin@deltaup.io ./install.sh`
- [ ] Wait for completion
- [ ] Visit https://deltaup.io

## 🆘 Troubleshooting

**Services not running?**
```bash
sudo systemctl status deltaup-backend deltaup-frontend
```

**View error logs?**
```bash
sudo journalctl -u deltaup-backend -n 50
```

**Certificate issues?**
```bash
sudo certbot certificates
```

**Nginx problems?**
```bash
sudo nginx -t
sudo systemctl status nginx
```

## 📞 Need Help?

1. Check logs: `sudo journalctl -u deltaup-* -f`
2. Test API: `curl -I https://deltaup.io/api/health`
3. Check certificate: `sudo certbot certificates`
4. Read DEPLOYMENT.md for detailed information

## 🎉 Ready to Deploy?

```bash
DOMAIN=deltaup.io EMAIL=admin@deltaup.io ./install.sh
```

Then monitor the process and access your application at https://deltaup.io!

---

**App Name:** DeltaUp ✅
**Version:** 1.0.0
**Status:** Production Ready

