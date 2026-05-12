#!/usr/bin/env sh
set -eu

# DOPPLER_TOKEN service token is scoped to a single Doppler config (prd here),
# so project + config are inferred. Real env values live inside Doppler.
#
# Next.js standalone in a pnpm monorepo nests the runtime app at
# apps/platform-app/server.js (Next preserves the workspace path so the
# trimmed node_modules at /app/node_modules works for the deeper resolution).
exec doppler run -- node apps/platform-app/server.js
