# DeltaUp - Fintech Application

Modern fintech application built with Next.js frontend and Rust backend.

## Tech Stack

- **Frontend**: Next.js 15 + TailwindCSS
- **Backend**: Rust (Actix-web)
- **Database**: PostgreSQL 15
- **Deployment**: Dokploy

## Deployment

### Dokploy Configuration

1. **Database**: Create a PostgreSQL 15 database in Dokploy
2. **Backend**:
   - Use `Dockerfile` for production (pulls from GHCR)
   - Use `Dockerfile.build` for development
   - Set environment variables:
     - `DATABASE_URL`: PostgreSQL connection string from Dokploy
     - `JWT_SECRET`: Random secure string
     - `DOMAIN`: Your domain
     - `PORT`: 8000

3. **Frontend**:
   - Use `Dockerfile` for production (pulls from GHCR)
   - Use `Dockerfile.build` for development
   - Set environment variables:
     - `NEXT_PUBLIC_API_URL`: Backend API URL
     - `NODE_ENV`: production

### Environment Variables

Copy `.env.example` files and configure:

```bash
# Backend
cd backend
cp .env.example .env

# Frontend
cd frontend
cp .env.example .env
```

## CI/CD

GitHub Actions workflow builds multi-architecture images (AMD64 + ARM64) and pushes to GitHub Container Registry.

Images:
- `ghcr.io/shayneeo/deltaup-backend:latest`
- `ghcr.io/shayneeo/deltaup-frontend:latest`

## Development

```bash
# Backend
cd backend
cargo run

# Frontend
cd frontend
npm install
npm run dev
```

## Features

- User authentication (JWT)
- Bank transfers
- QR payments
- Balance checking
- Transaction history
- Profile management
