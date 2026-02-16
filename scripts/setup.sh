#!/usr/bin/env bash
set -euo pipefail

echo "=== Traza Local Setup ==="
echo ""

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Error: node is required (>= 20). Install from https://nodejs.org"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "Error: pnpm is required (>= 9). Run: npm install -g pnpm@9"; exit 1; }

NODE_V=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_V" -lt 20 ]; then
  echo "Error: Node.js >= 20 required (found v$NODE_V)"
  exit 1
fi

# Copy env files if they don't exist
if [ ! -f apps/api/.env ]; then
  echo "Creating apps/api/.env from example..."
  cp apps/api/.env.example apps/api/.env
else
  echo "apps/api/.env already exists, skipping."
fi

if [ ! -f apps/web/.env.local ]; then
  echo "Creating apps/web/.env.local from example..."
  cp apps/web/.env.example apps/web/.env.local
else
  echo "apps/web/.env.local already exists, skipping."
fi

# Install dependencies
echo ""
echo "Installing dependencies..."
pnpm install

# Generate Prisma client
echo ""
echo "Generating Prisma client..."
pnpm --filter @traza/database db:generate

# Check if Postgres is reachable
echo ""
DB_URL=$(grep DATABASE_URL apps/api/.env | head -1 | cut -d= -f2-)
if command -v pg_isready >/dev/null 2>&1; then
  if pg_isready -q 2>/dev/null; then
    echo "PostgreSQL is running."

    # Run migrations
    echo "Running database migrations..."
    cd packages/database && DATABASE_URL="$DB_URL" npx prisma migrate dev && cd ../..

    # Seed
    echo "Seeding database..."
    DATABASE_URL="$DB_URL" pnpm --filter @traza/database db:seed
  else
    echo "PostgreSQL is not running. Start it and then run:"
    echo "  cd packages/database && npx prisma migrate dev && cd ../.."
    echo "  pnpm --filter @traza/database db:seed"
  fi
else
  echo "pg_isready not found. Make sure PostgreSQL is running, then run:"
  echo "  cd packages/database && npx prisma migrate dev && cd ../.."
  echo "  pnpm --filter @traza/database db:seed"
fi

echo ""
echo "=== Setup complete ==="
echo ""
echo "Start development:"
echo "  pnpm --filter api dev    # API on http://localhost:4000"
echo "  pnpm --filter web dev    # Web on http://localhost:3000"
echo ""
echo "Or start everything:"
echo "  pnpm dev"
