# Traza — Deployment & Operations Makefile
# Usage: make <target>

.PHONY: help dev build deploy logs restart stop clean db-migrate db-seed

# ============================================================================
# Development
# ============================================================================

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

dev: ## Start local dev environment (DB + Redis + MinIO)
	docker compose up -d
	pnpm dev

dev-services: ## Start only infrastructure services
	docker compose up -d

dev-stop: ## Stop local dev services
	docker compose down

# ============================================================================
# Build
# ============================================================================

build: ## Build all packages
	pnpm build

build-docker: ## Build Docker images locally
	docker build -f apps/api/Dockerfile -t traza-api:latest .
	docker build -f apps/web/Dockerfile -t traza-web:latest .

# ============================================================================
# Database
# ============================================================================

db-migrate: ## Run database migrations
	cd packages/database && npx prisma migrate deploy

db-migrate-dev: ## Create and run a new migration (dev only)
	cd packages/database && npx prisma migrate dev

db-seed: ## Seed the database with test data
	cd packages/database && npx prisma db seed

db-studio: ## Open Prisma Studio (DB GUI)
	cd packages/database && npx prisma studio

db-reset: ## Reset database (DESTRUCTIVE)
	cd packages/database && npx prisma migrate reset

# ============================================================================
# Production — Docker Compose
# ============================================================================

deploy: ## Deploy with docker-compose (production)
	docker compose -f docker-compose.prod.yml --env-file .env.production run --rm migrate
	docker compose -f docker-compose.prod.yml --env-file .env.production up -d api web nginx

restart: ## Restart production services
	docker compose -f docker-compose.prod.yml --env-file .env.production restart api web

stop: ## Stop production services
	docker compose -f docker-compose.prod.yml --env-file .env.production down

logs: ## Tail production logs
	docker compose -f docker-compose.prod.yml --env-file .env.production logs -f api web

logs-api: ## Tail API logs
	docker compose -f docker-compose.prod.yml --env-file .env.production logs -f api

status: ## Show status of production services
	docker compose -f docker-compose.prod.yml --env-file .env.production ps

# ============================================================================
# Health Checks
# ============================================================================

health: ## Check API health
	curl -s http://localhost/health | python3 -m json.tool

ready: ## Check API readiness (DB connectivity)
	curl -s http://localhost/ready | python3 -m json.tool

# ============================================================================
# Secrets
# ============================================================================

generate-secrets: ## Generate random secrets for production
	@echo "JWT_SECRET=$$(openssl rand -hex 64)"
	@echo "JWT_REFRESH_SECRET=$$(openssl rand -hex 64)"
	@echo "SIGNING_TOKEN_SECRET=$$(openssl rand -hex 64)"
	@echo "PLATFORM_SECRET_KEY=$$(openssl rand -hex 64)"
	@echo "POSTGRES_PASSWORD=$$(openssl rand -base64 32)"

# ============================================================================
# Cleanup
# ============================================================================

clean: ## Remove build artifacts
	pnpm clean
	rm -rf apps/api/dist apps/web/.next
