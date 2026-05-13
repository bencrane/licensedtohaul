#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT/apps/platform-app"
if ! [ -d __tests__/partner-pipeline-v1 ]; then echo "BENCHMARK_METRIC=0"; exit 0; fi
RESULT=$(doppler run --project hq-licensed-to-haul --config prd -- pnpm exec vitest run --reporter=json __tests__/partner-pipeline-v1/ 2>&1 || true)
PASSED=$(echo "$RESULT" | grep -oE '"numPassedTests":[0-9]+' | head -1 | grep -oE '[0-9]+' || echo 0)
echo "BENCHMARK_METRIC=$PASSED"
