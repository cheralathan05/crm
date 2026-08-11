#!/usr/bin/env bash
# Verifies the onboarding state machine over real HTTP.
set -euo pipefail
BASE="http://localhost:3000"
JAR=$(mktemp)
EMAIL="ob-1786473235686@example.com"
PASS="OnboardPass123"

echo "== 1. login (cookie jar) =="
curl -s -c "$JAR" -b "$JAR" -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | head -c 200
echo

echo "== 2. state before =="
curl -s -b "$JAR" "$BASE/api/onboarding" | head -c 300
echo

echo "== 3. complete overview =="
curl -s -b "$JAR" -X POST "$BASE/api/onboarding/overview" | head -c 200
echo

echo "== 4. create workspace =="
curl -s -b "$JAR" -X POST "$BASE/api/onboarding/workspace" \
  -H "Content-Type: application/json" \
  -d '{"companyName":"Nova Systems"}' | head -c 200
echo

echo "== 5. state after (expect next=/dashboard, Nova Systems) =="
curl -s -b "$JAR" "$BASE/api/onboarding"
echo

echo "== 6. dashboard render =="
curl -s -b "$JAR" "$BASE/dashboard" | grep -o "Nova Systems workspace\|Signed in as [^<]*" | head -3

echo "== 7. duplicate workspace guard: /onboarding/workspace should redirect =="
curl -s -o /dev/null -w "status=%{http_code} location=%{redirect_url}\n" -b "$JAR" "$BASE/onboarding/workspace"

echo "== 8. completed overview guard: /onboarding/overview should redirect =="
curl -s -o /dev/null -w "status=%{http_code} location=%{redirect_url}\n" -b "$JAR" "$BASE/onboarding/overview"

rm -f "$JAR"
