#!/bin/bash
# BuildMatch — one-shot Gemini Edge Function deploy
# Usage: SUPABASE_ACCESS_TOKEN=sbp_... bash backend/deploy-gemini.sh [gemini_api_key]
set -euo pipefail

PROJECT_REF="odtffperievxozcnovgl"
GEMINI_KEY="${1:-${GEMINI_API_KEY:-}}"
GEMINI_MODEL="${GEMINI_MODEL:-gemini-3.6-flash}"

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "ERROR: set SUPABASE_ACCESS_TOKEN first"; exit 1
fi
if [ -z "$GEMINI_KEY" ]; then
  echo "ERROR: pass the Gemini API key as argument 1 (or GEMINI_API_KEY env)"; exit 1
fi

cd "$(dirname "$0")"

echo "== 1. Setting secrets =="
supabase secrets set GEMINI_API_KEY="$GEMINI_KEY" GEMINI_MODEL="$GEMINI_MODEL" --project-ref "$PROJECT_REF"

echo "== 2. Deploying functions =="
supabase functions deploy ai-assistant   --project-ref "$PROJECT_REF" --no-verify-jwt
supabase functions deploy interior-design --project-ref "$PROJECT_REF" --no-verify-jwt

echo "== 3. Verifying live =="
sleep 3
AI_URL="https://${PROJECT_REF}.supabase.co/functions/v1/ai-assistant"
ANON_KEY=$(grep -o 'VITE_SUPABASE_ANON_KEY=.*' ../frontend/.env | cut -d= -f2-)
HTTP=$(curl -s -o /tmp/ai-health.json -w '%{http_code}' -X POST "$AI_URL" \
  -H "Authorization: Bearer $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"op":"health"}')
echo "health HTTP $HTTP:"; cat /tmp/ai-health.json; echo
python3 - <<'EOF'
import json
d = json.load(open('/tmp/ai-health.json'))
assert d.get('configured') is True, 'GEMINI_API_KEY not detected by function!'
assert d.get('provider') == 'Google Gemini'
print('GEMINI LIVE ✓  model:', d.get('model'), '| db:', d.get('database'))
EOF
echo "DEPLOY COMPLETE"
