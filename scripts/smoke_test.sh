# scripts/smoke_test.sh
#!/usr/bin/env bash
set -euo pipefail

API="http://localhost:8080"
TOKEN="demo-token"

echo "== Accounts =="
ACCOUNTS_JSON="$(curl -s "$API/api/accounts" -H "Authorization: Bearer $TOKEN")"
echo "$ACCOUNTS_JSON" | python3 -m json.tool

FROM_ID="$(echo "$ACCOUNTS_JSON" | python3 -c 'import sys,json; a=json.load(sys.stdin); print(a[0]["id"])')"
TO_ID="$(echo "$ACCOUNTS_JSON" | python3 -c 'import sys,json; a=json.load(sys.stdin); print(a[1]["id"])')"

KEY="$(uuidgen | tr '[:upper:]' '[:lower:]')"
echo "== Create transfer (key=$KEY) from=$FROM_ID to=$TO_ID =="

curl -s -X POST "$API/api/transfers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"fromAccountId\":\"$FROM_ID\",
    \"toAccountId\":\"$TO_ID\",
    \"amount\": 600,
    \"currency\":\"CAD\",
    \"memo\":\"smoke\"
  }" | python3 -m json.tool

echo "== Ledger FROM =="
curl -s "$API/api/accounts/$FROM_ID/ledger" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

echo "== Ledger TO =="
curl -s "$API/api/accounts/$TO_ID/ledger" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

echo "== Risk flags (minScore=1) =="
curl -s "$API/api/risk/flags?minScore=1" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
