#!/usr/bin/env sh
set -eu

# DOPPLER_TOKEN service token is scoped to a single Doppler config (prd here),
# so project + config are inferred. Real env values live inside Doppler.
exec doppler run -- node server.js
