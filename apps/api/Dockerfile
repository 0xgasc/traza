FROM node:20-alpine AS base
RUN npm install -g pnpm@9

FROM base AS build
WORKDIR /app

# Copy workspace config and package manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/crypto/package.json ./packages/crypto/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/database ./packages/database
COPY packages/crypto ./packages/crypto
COPY apps/api ./apps/api
COPY tsconfig.base.json ./

# Prisma generate needs a DATABASE_URL placeholder (doesn't connect, just generates client)
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"

# Build all packages in order
RUN pnpm --filter @traza/database build && \
    pnpm --filter @traza/crypto build && \
    pnpm --filter @traza/api build

# Remove devDependencies to reduce image size
RUN pnpm prune --prod

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 traza

# Copy entire app directory from build (preserves pnpm symlink structure)
COPY --from=build --chown=traza:nodejs /app ./

USER traza
EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
