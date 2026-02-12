FROM node:20-alpine AS base
RUN npm install -g pnpm@9

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/crypto/package.json ./packages/crypto/
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/packages/crypto/node_modules ./packages/crypto/node_modules
COPY packages/database ./packages/database
COPY packages/crypto ./packages/crypto
COPY apps/api ./apps/api
COPY tsconfig.base.json ./

# Prisma generate needs a DATABASE_URL placeholder (doesn't connect, just generates client)
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"

RUN pnpm --filter @traza/database build && \
    pnpm --filter @traza/crypto build && \
    pnpm --filter @traza/api build

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 traza
COPY --from=build --chown=traza:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=traza:nodejs /app/apps/api/package.json ./apps/api/
COPY --from=build --chown=traza:nodejs /app/packages/database/dist ./packages/database/dist
COPY --from=build --chown=traza:nodejs /app/packages/database/package.json ./packages/database/
COPY --from=build --chown=traza:nodejs /app/packages/database/prisma ./packages/database/prisma
COPY --from=build --chown=traza:nodejs /app/packages/crypto/dist ./packages/crypto/dist
COPY --from=build --chown=traza:nodejs /app/packages/crypto/package.json ./packages/crypto/
COPY --from=deps --chown=traza:nodejs /app/node_modules ./node_modules
# Copy generated Prisma client from build stage (prisma generate output)
COPY --from=build --chown=traza:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=traza:nodejs /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

USER traza
EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
