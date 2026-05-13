#!/usr/bin/env bash
# Verification script for carrier-take-quote-flow acceptance criteria.
# Run from repo root: bash apps/platform-app/.scope/carrier-take-quote-flow-verify.sh
# Dev server must be running at http://localhost:3007.

PASS=0
FAIL=0
SKIP=0

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
APP="$REPO_ROOT/apps/platform-app"
BASE_URL="http://localhost:3007"

pass() { echo "PASS: $1: $2"; PASS=$((PASS+1)); }
fail() { echo "FAIL: $1: $2"; FAIL=$((FAIL+1)); }

echo "=== carrier-take-quote-flow verification ==="
echo "APP root: $APP"
echo ""

# ---------------------------------------------------------------------------
# C1: modal with role="dialog" exists in financing/ or components/dashboard/
# ---------------------------------------------------------------------------
if grep -rn 'role="dialog"' \
  "$APP/app/dashboard/[dot]/financing/" \
  "$APP/components/dashboard/" 2>/dev/null | grep -q .; then
  pass C1 'role="dialog" found in financing or components/dashboard'
else
  fail C1 'No role="dialog" found in financing or components/dashboard'
fi

# ---------------------------------------------------------------------------
# C2: modal source contains all required field tokens
# ---------------------------------------------------------------------------
MODAL="$APP/components/dashboard/ConsentModal.tsx"
C2_OK=1
for tok in "USDOT" "MC" "address" "fleet size" "authority history" "insurance summary" "BASIC scores"; do
  if ! grep -qi "$tok" "$MODAL" 2>/dev/null; then
    fail C2 "Token missing from modal: $tok"
    C2_OK=0
  fi
done
if [ "$C2_OK" = "1" ]; then
  pass C2 "All required field tokens found in ConsentModal.tsx"
fi

# ---------------------------------------------------------------------------
# C3: modal has onConfirm/onClose; Confirm path calls store mutation
# ---------------------------------------------------------------------------
if grep -q "onConfirm" "$MODAL" 2>/dev/null && grep -q "onClose" "$MODAL" 2>/dev/null; then
  if grep -rn "submitQuote\|setQuoteStatus\|pushInboxMessage" "$APP/components/dashboard/FinancingClientSection.tsx" 2>/dev/null | grep -q .; then
    pass C3 "Modal has onConfirm/onClose; store mutation call found in FinancingClientSection"
  else
    fail C3 "Modal has handlers but no store mutation call found in FinancingClientSection"
  fi
else
  fail C3 "Modal missing onConfirm or onClose handler props"
fi

# ---------------------------------------------------------------------------
# C4: FinancingQuoteStatus type contains all 8 required values
# ---------------------------------------------------------------------------
OPPORTUNITIES="$APP/lib/mock-opportunities.ts"
C4_OK=1
for s in "available" "submitted" "contacted" "underwriting" "approved" "declined" "onboarding" "active"; do
  if ! grep -q "\"$s\"" "$OPPORTUNITIES" 2>/dev/null; then
    fail C4 "Status value missing: $s"
    C4_OK=0
  fi
done
if [ "$C4_OK" = "1" ]; then
  pass C4 "All 8 status values found in mock-opportunities.ts"
fi

# ---------------------------------------------------------------------------
# C5: FinancingClientSection has >=8 status branches and >=3 distinct color tokens
# ---------------------------------------------------------------------------
CLIENT="$APP/components/dashboard/FinancingClientSection.tsx"
BRANCH_COUNT=0
for s in "available" "submitted" "contacted" "underwriting" "approved" "declined" "onboarding" "active" "pending" "received"; do
  # Match quoted ("available") or unquoted object key (available:)
  if grep -qE "\"$s\"|  $s:" "$CLIENT" 2>/dev/null; then
    BRANCH_COUNT=$((BRANCH_COUNT+1))
  fi
done
if [ "$BRANCH_COUNT" -ge 8 ]; then
  COLOR_COUNT=$(grep -oE 'emerald|amber|sky|stone|orange|red' "$CLIENT" 2>/dev/null | sort -u | wc -l | tr -d ' ')
  if [ "$COLOR_COUNT" -ge 3 ]; then
    pass C5 ">=8 status branches and $COLOR_COUNT distinct color tokens in FinancingClientSection"
  else
    fail C5 "Has $BRANCH_COUNT status branches but only $COLOR_COUNT color tokens (need >=3)"
  fi
else
  fail C5 "Only $BRANCH_COUNT status branches found in FinancingClientSection (need >=8)"
fi

# ---------------------------------------------------------------------------
# C6: Settings page has DataPartnerLog / data partners subsection with Revoke button
# ---------------------------------------------------------------------------
SETTINGS_DIR="$APP/app/dashboard/[dot]/settings"
if grep -rn "DataPartner\|data partners\|access log" "$SETTINGS_DIR" 2>/dev/null | grep -qi .; then
  if grep -rn "Revoke" "$APP/components/dashboard/DataPartnerLog.tsx" 2>/dev/null | grep -q .; then
    pass C6 "DataPartner subsection found in settings; Revoke button in DataPartnerLog.tsx"
  else
    fail C6 "DataPartner subsection found but no Revoke button in DataPartnerLog.tsx"
  fi
else
  fail C6 "No DataPartner/data-partners/access-log reference in settings page"
fi

# ---------------------------------------------------------------------------
# C7: inbox-store pushes category:financing with factorName in subject
# ---------------------------------------------------------------------------
INBOX_STORE="$APP/lib/inbox-store.ts"
if grep -q 'category: "financing"' "$INBOX_STORE" 2>/dev/null; then
  if grep -q 'factorName' "$INBOX_STORE" 2>/dev/null; then
    pass C7 "inbox-store.ts pushes category:financing message with factorName in subject"
  else
    fail C7 "inbox-store.ts has category:financing but no factorName in subject"
  fi
else
  fail C7 "No category:financing found in inbox-store.ts"
fi

# ---------------------------------------------------------------------------
# C8: mock-factor-transfers.ts has FACTOR_SLUGS; transfers page intercepts them
# ---------------------------------------------------------------------------
TRANSFERS_LIB="$APP/lib/mock-factor-transfers.ts"
TRANSFERS_PAGE="$APP/app/partner/[slug]/transfers/page.tsx"
if grep -q "FACTOR_SLUGS" "$TRANSFERS_LIB" 2>/dev/null && grep -q "rts-financial" "$TRANSFERS_LIB" 2>/dev/null; then
  if grep -q "FACTOR_SLUGS" "$TRANSFERS_PAGE" 2>/dev/null; then
    pass C8 "FACTOR_SLUGS defined in mock-factor-transfers and intercept applied in transfers/page.tsx"
  else
    fail C8 "FACTOR_SLUGS defined but not used in transfers/page.tsx"
  fi
else
  fail C8 "FACTOR_SLUGS or factor slugs not found in mock-factor-transfers.ts"
fi

# ---------------------------------------------------------------------------
# C10: HTTP checks — all routes must return < 400
# ---------------------------------------------------------------------------
check_http() {
  local id="$1"
  local path="$2"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$BASE_URL$path" 2>/dev/null || echo "000")
  if [ "$code" -lt 400 ] 2>/dev/null; then
    pass "$id" "GET $path => HTTP $code"
  else
    fail "$id" "GET $path => HTTP $code (expected <400)"
  fi
}

check_http "C10-financing" "/dashboard/3614435/financing"
check_http "C10-inbox"     "/dashboard/3614435/inbox"
check_http "C10-settings"  "/dashboard/3614435/settings"
check_http "C10-rts"       "/partner/rts-financial/transfers"
check_http "C10-brookhaven" "/partner/brookhaven/transfers"

# ---------------------------------------------------------------------------
# D1: new files use max-w-[1400px]
# ---------------------------------------------------------------------------
D1_HITS=0
for f in \
  "$APP/components/dashboard/FinancingClientSection.tsx" \
  "$APP/components/dashboard/ConsentModal.tsx" \
  "$APP/components/dashboard/DataPartnerLog.tsx" \
  "$APP/app/dashboard/[dot]/financing/page.tsx"; do
  if grep -q 'max-w-\[1400' "$f" 2>/dev/null; then
    D1_HITS=$((D1_HITS+1))
  fi
done
if [ "$D1_HITS" -ge 1 ]; then
  pass D1 "max-w-[1400px] found in $D1_HITS new file(s)"
else
  fail D1 "max-w-[1400px] not found in any new component files"
fi

# ---------------------------------------------------------------------------
# D2: section-heading h2s use font-display text-2xl text-stone-900
#     (card/inline h2s with text-xl are exempt — only top-level section headings)
# ---------------------------------------------------------------------------
# Check that new files that have section-heading h2s use the correct pattern.
# FinancingClientSection is the primary new file with section h2s.
D2_OK=1
for f in \
  "$APP/components/dashboard/FinancingClientSection.tsx" \
  "$APP/components/dashboard/ConsentModal.tsx"; do
  if grep -q "<h2" "$f" 2>/dev/null; then
    if ! grep -qE 'font-display.*text-2xl|text-2xl.*font-display' "$f" 2>/dev/null; then
      fail D2 "Section h2 in $(basename "$f") missing font-display text-2xl combo"
      D2_OK=0
    fi
  fi
done
if [ "$D2_OK" = "1" ]; then
  pass D2 "Section h2s in new files use font-display text-2xl"
fi

# ---------------------------------------------------------------------------
# D3: no blacklisted patterns in NEW files
# ---------------------------------------------------------------------------
D3_HITS=0
for f in \
  "$APP/components/dashboard/ConsentModal.tsx" \
  "$APP/components/dashboard/FinancingClientSection.tsx" \
  "$APP/components/dashboard/DataPartnerLog.tsx" \
  "$APP/lib/quote-state-store.ts" \
  "$APP/lib/inbox-store.ts" \
  "$APP/lib/mock-factor-transfers.ts"; do
  if grep -qE 'from-(violet|purple|indigo)|to-(violet|purple|indigo)|via-(violet|purple|indigo)|rounded-full.*bg-(blue|emerald|amber|orange|violet)-(50|100|200)|grid-cols-3' "$f" 2>/dev/null; then
    D3_HITS=$((D3_HITS+1))
  fi
done
if [ "$D3_HITS" -eq 0 ]; then
  pass D3 "Zero blacklisted AI-slop patterns in new files"
else
  fail D3 "$D3_HITS blacklisted pattern hit(s) in new files"
fi

# ---------------------------------------------------------------------------
# D4: modal uses border border-line bg-surface
# ---------------------------------------------------------------------------
if grep -q 'border border-line bg-surface' "$MODAL" 2>/dev/null; then
  pass D4 "ConsentModal uses border border-line bg-surface"
else
  fail D4 "ConsentModal missing border border-line bg-surface treatment"
fi

# ---------------------------------------------------------------------------
# C9: stretch — multi-quote warning in ConsentModal
# ---------------------------------------------------------------------------
if grep -q "existingSubmissionPartner\|already submitted" "$MODAL" 2>/dev/null; then
  echo "PASS (STRETCH): C9: Multi-quote warning found in ConsentModal"
  PASS=$((PASS+1))
else
  echo "SKIP (STRETCH): C9: Multi-quote warning not implemented"
  SKIP=$((SKIP+1))
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "=== Summary ==="
echo "PASS: $PASS"
echo "FAIL: $FAIL"
echo "SKIP (stretch): $SKIP"
echo ""
REQUIRED_PASS=13
if [ "$FAIL" -eq 0 ] && [ "$PASS" -ge "$REQUIRED_PASS" ]; then
  echo "RESULT: ALL REQUIRED CRITERIA PASS (${PASS}/${REQUIRED_PASS} required + ${SKIP} stretch skipped)"
  exit 0
else
  echo "RESULT: PARTIAL — ${FAIL} required criterion/criteria FAILED, ${PASS} passed"
  exit 1
fi
