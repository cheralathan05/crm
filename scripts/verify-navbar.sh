#!/usr/bin/env bash
# Verifies the shared AppNavbar arrangement over real HTTP on both
# the onboarding page and the dashboard (server-rendered HTML).
set -uo pipefail
BASE="http://localhost:3000"
JAR=$(mktemp)
EMAIL="ob-1786475237671@example.com"
PASS="OnboardPass123"

echo "== 1. login =="
curl -s -c "$JAR" -b "$JAR" -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | head -c 120
echo

echo "== 2. onboarding page navbar (before completion) =="
HTML=$(curl -s -b "$JAR" "$BASE/onboarding/overview")
for token in "WORKSPACE SETUP" "System online" "Clients" "Requirements" "Proposals" "Projects" "Tasks" "Delivery" "Sign out"; do
  if echo "$HTML" | grep -q "$token"; then echo "  ✓ $token"; else echo "  ✗ MISSING: $token"; fi
done

echo "== 3. complete overview + create workspace =="
curl -s -b "$JAR" -X POST "$BASE/api/onboarding/overview" | head -c 80; echo
curl -s -b "$JAR" -X POST "$BASE/api/onboarding/workspace" \
  -H "Content-Type: application/json" \
  -d '{"companyName":"Navbar Test Corp"}' | head -c 80; echo

echo "== 4. dashboard navbar (workspace name + sign out in bar) =="
DASH=$(curl -s -b "$JAR" "$BASE/dashboard")
for token in "Navbar Test Corp" "Workspace" "System online" "Clients" "Requirements" "Sign out" "ob-1786475237671@example.com"; do
  if echo "$DASH" | grep -q "$token"; then echo "  ✓ $token"; else echo "  ✗ MISSING: $token"; fi
done

echo "== 5. sign-out no longer at dashboard page bottom =="
if echo "$DASH" | grep -q "The full dashboard is under development"; then
  echo "  ✓ placeholder note still present"
else
  echo "  ✗ placeholder note missing"
fi

rm -f "$JAR"
echo "DONE"
