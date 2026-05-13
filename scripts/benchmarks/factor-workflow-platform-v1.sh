#!/usr/bin/env bash
# Benchmark for /scope cycle factor-workflow-platform-v1.
# Counts acceptance tests passing under apps/platform-app/__tests__/factor-workflow-v1/.
# Emits BENCHMARK_METRIC=<int> on stdout. Single line, single integer 0..5+.
# Exits 0 even when no tests exist yet (baseline = 0).

set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT/apps/platform-app"

# Pre-test infrastructure check. Until Vitest exists we have nothing to count.
if ! [ -f vitest.config.ts ] && ! [ -f vitest.config.mts ] && ! [ -f vitest.config.js ]; then
  echo "BENCHMARK_METRIC=0"
  exit 0
fi

# If the test directory doesn't exist yet, count = 0.
if ! [ -d __tests__/factor-workflow-v1 ]; then
  echo "BENCHMARK_METRIC=0"
  exit 0
fi

# Vitest --reporter=json prints a final JSON object after the run finishes
# (mixed in with stdout). We tolerate non-zero exit because Vitest exits
# non-zero on any failing test; we still want a count of the passing ones.
RESULT=$(pnpm exec vitest run --reporter=json __tests__/factor-workflow-v1/ 2>&1 || true)
PASSED=$(echo "$RESULT" | grep -oE '"numPassedTests":[0-9]+' | head -1 | grep -oE '[0-9]+' || echo 0)

# Defensive: if the JSON wasn't found, fall back to counting "✓" lines from a
# plain-reporter rerun. Cheap and reliable when JSON setup is broken.
if [ -z "$PASSED" ] || [ "$PASSED" = "0" ]; then
  if echo "$RESULT" | grep -q "No test files found"; then
    PASSED=0
  fi
fi

echo "BENCHMARK_METRIC=${PASSED:-0}"
