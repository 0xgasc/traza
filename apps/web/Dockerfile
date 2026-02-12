FROM node:20-alpine AS base
RUN npm install -g pnpm@9

FROM base AS build
WORKDIR /app

# Copy workspace config and package manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/ui/package.json ./packages/ui/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/ui ./packages/ui
COPY apps/web ./apps/web
COPY tsconfig.base.json ./

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

# Build web (ui has no build script, Next.js handles transpilation via transpilePackages)
RUN pnpm --filter @traza/web build

# Debug: show standalone structure
RUN echo "=== Standalone contents ===" && \
    ls -la apps/web/.next/standalone/ 2>/dev/null || echo "No standalone dir!" && \
    find apps/web/.next/standalone -name "server.js" -type f 2>/dev/null || echo "No server.js found"

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 traza

COPY --from=build --chown=traza:nodejs /app/apps/web/.next/standalone ./
COPY --from=build --chown=traza:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=traza:nodejs /app/apps/web/public ./apps/web/public

USER traza
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "apps/web/server.js"]
