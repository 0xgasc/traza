# Traza — Deployment Guide

## Quick Reference

```bash
make generate-secrets    # Generate all production secrets
make deploy              # Run migrations + start services
make logs                # Tail logs
make health              # Check API health
make ready               # Check DB connectivity
```

---

## Option A: VPS / Bare Metal (DigitalOcean, Hetzner, etc.)

Best for: Full control, lowest cost at scale.

### 1. Provision a Server

- Ubuntu 22.04+ or Debian 12+
- Minimum: 2 vCPU, 4GB RAM, 40GB SSD
- Open ports: 80, 443

### 2. Install Dependencies

```bash
# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Docker Compose (v2)
sudo apt install docker-compose-plugin
```

### 3. Clone & Configure

```bash
git clone <your-repo-url> /opt/traza
cd /opt/traza

# Generate secrets
make generate-secrets

# Create production env file
cp .env.production.example .env.production
nano .env.production   # Fill in secrets + your domain
```

### 4. Configure DNS

Point your domain to the server IP:
```
A   app.traza.dev    → <server-ip>
A   api.traza.dev    → <server-ip>
# OR use a single domain:
A   traza.dev        → <server-ip>
```

### 5. SSL with Let's Encrypt

```bash
# Install certbot
sudo apt install certbot

# Get certificates
sudo certbot certonly --standalone -d your-domain.com

# Copy certs for nginx
mkdir -p deploy/nginx/ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem deploy/nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem deploy/nginx/ssl/
```

Then uncomment the HTTPS server block in `deploy/nginx/nginx.conf`.

### 6. Deploy

```bash
make deploy
```

### 7. Verify

```bash
make health
make ready
curl https://your-domain.com
```

### 8. Auto-renewal (cron)

```bash
# Add to crontab
0 3 * * * certbot renew --quiet && docker compose -f /opt/traza/docker-compose.prod.yml restart nginx
```

---

## Option B: Railway

Best for: Fastest path to production, zero DevOps.

### 1. Install Railway CLI

```bash
npm install -g @railway/cli
railway login
```

### 2. Create Project

```bash
cd /path/to/traza
railway init
```

### 3. Add Services

In the Railway dashboard:
- Add **PostgreSQL** plugin → copy `DATABASE_URL`
- Add **Redis** plugin → copy `REDIS_URL`

### 4. Set Environment Variables

```bash
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=$(openssl rand -hex 64)
railway variables set JWT_REFRESH_SECRET=$(openssl rand -hex 64)
railway variables set SIGNING_TOKEN_SECRET=$(openssl rand -hex 64)
railway variables set PLATFORM_SECRET_KEY=$(openssl rand -hex 64)
railway variables set APP_URL=https://your-app.up.railway.app
railway variables set API_URL=https://your-api.up.railway.app
```

### 5. Deploy API

```bash
# Create service for API
railway service create traza-api
railway link traza-api

# Set Dockerfile path
railway variables set RAILWAY_DOCKERFILE_PATH=apps/api/Dockerfile

railway up
```

### 6. Deploy Web

```bash
railway service create traza-web
railway link traza-web

railway variables set RAILWAY_DOCKERFILE_PATH=apps/web/Dockerfile
railway variables set NEXT_PUBLIC_API_URL=https://your-api.up.railway.app

railway up
```

### 7. Run Migrations

```bash
railway run --service traza-api npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma
```

---

## Option C: Fly.io

Best for: Global edge deployment, easy scaling.

### 1. Install Fly CLI

```bash
curl -L https://fly.io/install.sh | sh
fly auth login
```

### 2. Create Apps

```bash
fly apps create traza-api
fly apps create traza-web
```

### 3. Provision Database

```bash
fly postgres create --name traza-db
fly postgres attach traza-db --app traza-api
```

### 4. Set Secrets

```bash
fly secrets set -a traza-api \
  JWT_SECRET=$(openssl rand -hex 64) \
  JWT_REFRESH_SECRET=$(openssl rand -hex 64) \
  SIGNING_TOKEN_SECRET=$(openssl rand -hex 64) \
  PLATFORM_SECRET_KEY=$(openssl rand -hex 64) \
  APP_URL=https://traza-web.fly.dev \
  API_URL=https://traza-api.fly.dev \
  NODE_ENV=production
```

### 5. Deploy API

Create `fly.api.toml`:
```toml
app = "traza-api"
primary_region = "mia"

[build]
  dockerfile = "apps/api/Dockerfile"

[http_service]
  internal_port = 4000
  force_https = true

  [[http_service.checks]]
    path = "/health"
    interval = 15000
    timeout = 5000

[deploy]
  release_command = "npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma"
```

```bash
fly deploy -c fly.api.toml
```

### 6. Deploy Web

Create `fly.web.toml`:
```toml
app = "traza-web"
primary_region = "mia"

[build]
  dockerfile = "apps/web/Dockerfile"
  [build.args]
    NEXT_PUBLIC_API_URL = "https://traza-api.fly.dev"

[http_service]
  internal_port = 3000
  force_https = true
```

```bash
fly deploy -c fly.web.toml
```

---

## Option D: AWS (ECS Fargate)

Best for: Enterprise clients who require AWS.

### Infrastructure (Terraform or manual):

1. **VPC** with public/private subnets
2. **RDS PostgreSQL 15** (db.t3.medium minimum)
3. **ElastiCache Redis** (cache.t3.micro)
4. **S3 bucket** for document storage (replaces MinIO)
5. **ECR** repositories for API and Web images
6. **ECS Cluster** with Fargate services
7. **ALB** (Application Load Balancer) with SSL via ACM
8. **CloudWatch** for logging

### Key differences for AWS:
- Use S3 directly instead of MinIO (update `S3_ENDPOINT`)
- Use RDS connection string for `DATABASE_URL`
- Use ElastiCache endpoint for `REDIS_URL`
- Push images to ECR instead of GHCR

---

## Post-Deployment Checklist

- [ ] Health check passes: `curl https://your-domain.com/health`
- [ ] Readiness check passes: `curl https://your-domain.com/ready`
- [ ] Can register a new user
- [ ] Can log in
- [ ] Can create and send a document
- [ ] Super admin can access `/admin`
- [ ] SSL certificate is valid (check with browser)
- [ ] Sentry DSN is configured (error tracking)
- [ ] Email sending works (RESEND_API_KEY set)
- [ ] Backups are configured for PostgreSQL
- [ ] DNS is propagated
- [ ] Rate limiting is working (try rapid requests)

## Monitoring

```bash
# Check logs
make logs

# Check specific service
make logs-api

# Service status
make status

# Database connectivity
make ready
```

## Rollback

```bash
# Redeploy previous image
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d api web

# Or tag-specific rollback
docker compose -f docker-compose.prod.yml up -d \
  --scale api=0 --scale web=0
docker tag traza-api:<previous-sha> traza-api:latest
docker tag traza-web:<previous-sha> traza-web:latest
docker compose -f docker-compose.prod.yml up -d
```
