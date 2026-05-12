# syntax=docker/dockerfile:1.7
#
# Standalone Next.js + Doppler container for app.licensedtohaul.com.
# Build context = repo root (pnpm monorepo); Next.js standalone output lives
# at apps/platform-app/.next/standalone/.

# ---- deps ----
FROM node:20-slim AS deps
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/platform-app/package.json ./apps/platform-app/package.json
COPY apps/marketing-site/package.json ./apps/marketing-site/package.json
RUN pnpm install --frozen-lockfile

# ---- build ----
FROM node:20-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends curl gnupg ca-certificates apt-transport-https \
    && rm -rf /var/lib/apt/lists/*
RUN curl -sLf --retry 3 --tlsv1.2 --proto "=https" \
        "https://packages.doppler.com/public/cli/gpg.DE2A7741A397C129.key" \
        | gpg --dearmor -o /usr/share/keyrings/doppler-archive-keyring.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/doppler-archive-keyring.gpg] https://packages.doppler.com/public/cli/deb/debian any-version main" \
        > /etc/apt/sources.list.d/doppler-cli.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends doppler \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/platform-app/node_modules ./apps/platform-app/node_modules
COPY --from=deps /app/apps/marketing-site/node_modules ./apps/marketing-site/node_modules
COPY . .

ARG DOPPLER_TOKEN
ENV DOPPLER_TOKEN=$DOPPLER_TOKEN
# Build platform-app explicitly. Doppler injects the build-time env vars
# (NEXT_PUBLIC_HQX_SUPABASE_URL, NEXT_PUBLIC_HQX_SUPABASE_PUBLISHABLE_KEY,
# HQX_DB_URL_POOLED, APP_ENV, etc.) that env.ts validates at build time.
RUN doppler run -- pnpm --filter platform-app build

# ---- runner ----
FROM node:20-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends curl gnupg ca-certificates apt-transport-https \
    && rm -rf /var/lib/apt/lists/* \
    && curl -sLf --retry 3 --tlsv1.2 --proto "=https" \
        "https://packages.doppler.com/public/cli/gpg.DE2A7741A397C129.key" \
        | gpg --dearmor -o /usr/share/keyrings/doppler-archive-keyring.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/doppler-archive-keyring.gpg] https://packages.doppler.com/public/cli/deb/debian any-version main" \
        > /etc/apt/sources.list.d/doppler-cli.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends doppler \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Next.js standalone output in a monorepo nests the app at
# apps/platform-app/.next/standalone/apps/platform-app/server.js — copy
# the whole standalone tree (which also includes a top-level node_modules
# with the trimmed transitive deps) into /app.
COPY --from=builder /app/apps/platform-app/.next/standalone ./
COPY --from=builder /app/apps/platform-app/.next/static ./apps/platform-app/.next/static
COPY --from=builder /app/apps/platform-app/public ./apps/platform-app/public
COPY --from=builder /app/apps/platform-app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

RUN useradd --create-home --shell /bin/sh appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
