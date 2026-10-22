#!/usr/bin/env bash
# Checks a running copy of the app (live site or local) and prints PASS or FAIL for each step.
# Usage:  bash scripts/verify-deploy.sh https://study-abroad-copilot-seven.vercel.app
#         bash scripts/verify-deploy.sh            (defaults to http://localhost:3000)
# Set SKIP_AI=1 to skip the one real AI call (it uses a little of the key's quota).

BASE="${1:-http://localhost:3000}"
BASE="${BASE%/}"
fail=0

pass() { echo "PASS  $1"; }
bad() { echo "FAIL  $1"; fail=1; }

status() { curl -s -o /dev/null -w "%{http_code}" --max-time 20 "$1"; }

# 1. The server answers and says whether the AI key is set (it never prints the key).
health="$(curl -s --max-time 20 "$BASE/api/health")"
if echo "$health" | grep -q '"ok":true'; then pass "health endpoint answers"; else bad "health endpoint: $health"; fi
if echo "$health" | grep -q '"ai":"configured"'; then pass "AI key is configured"; else bad "AI key is missing on this deployment"; fi
echo "      grounding: $(echo "$health" | sed -n 's/.*"grounding":"\([a-z]*\)".*/\1/p')"

# 2. Every page loads.
for path in / /fly /fly/budget /profile /programs /applications /funding /plan /plan/shared /alumni; do
  code="$(status "$BASE$path")"
  # Pages that need saved data still return 200; they redirect inside the browser.
  if [ "$code" = "200" ]; then pass "GET $path"; else bad "GET $path returned $code"; fi
done

# 3. The old scholarships link moves to funding.
final="$(curl -s -o /dev/null -L -w "%{url_effective}" --max-time 20 "$BASE/scholarships")"
case "$final" in */funding) pass "/scholarships redirects to /funding" ;; *) bad "/scholarships ended at $final" ;; esac

# 4. A page that does not exist shows our not-found page, not a crash.
code="$(status "$BASE/this-page-does-not-exist")"
if [ "$code" = "404" ]; then pass "unknown page returns 404"; else bad "unknown page returned $code"; fi

# 5. Bad input is refused politely (no AI call is made).
code="$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 -X POST -H "Content-Type: application/json" -d '{"profile":"nope"}' "$BASE/api/shortlist")"
if [ "$code" = "400" ]; then pass "bad request is refused with 400"; else bad "bad request returned $code (expected 400)"; fi

# 5b. The voice guide answers in another language (typed text, no microphone needed).
if [ "${SKIP_AI:-0}" != "1" ]; then
  hi="$(curl -s --max-time 60 -X POST -H "Content-Type: application/json" -d '{"profile":{"degreeLevel":"Master'"'"'s","countries":"Germany"},"page":"plan","language":"Hindi","messages":[{"role":"user","text":"What is a statement of purpose?"}],"programs":[]}' "$BASE/api/chat")"
  if echo "$hi" | grep -q '[ऀ-ॿ]'; then pass "OVEREASE replies in Hindi script"; else bad "OVEREASE Hindi reply was not in Devanagari: $(echo "$hi" | head -c 160)"; fi
fi

# 6. One real AI call, to prove the key works from this deployment.
if [ "${SKIP_AI:-0}" = "1" ]; then
  echo "SKIP  real AI call (SKIP_AI=1)"
else
  body='{"profile":{"degreeLevel":"Master'"'"'s","field":"Computer Science","grades":"8.4 / 10 CGPA","homeCountry":"India","countries":"Germany, Canada","budgetUsd":30000,"englishStatus":"taken","englishTest":"IELTS","englishScore":"7.5","interests":["Machine learning"]},"page":"intake","messages":[{"role":"user","text":"In one sentence, what is a statement of purpose?"}],"programs":[]}'
  out="$(curl -s --max-time 60 -X POST -H "Content-Type: application/json" -d "$body" "$BASE/api/chat")"
  if echo "$out" | grep -q '"message"'; then pass "real AI call answered"; else bad "real AI call failed: $(echo "$out" | head -c 200)"; fi
fi

echo
if [ "$fail" = "0" ]; then echo "All checks passed for $BASE"; else echo "Some checks FAILED for $BASE"; exit 1; fi
