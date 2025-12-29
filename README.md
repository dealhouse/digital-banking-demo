# Digital Banking Demo (Monorepo)

A small “bank-style” demo showing a **transfer/ledger flow** with **idempotency** and a separate **risk scoring service**:

- **Core API**: Java **Spring Boot** + **SQLite**
- **Risk Service**: Python **FastAPI**
- **Dashboard**: **React + TypeScript**

![CI](https://github.com/dealhouse/digital-banking-demo/actions/workflows/ci.yml/badge.svg)

## Why this is “bank-style”
- **Ledger-style history**: transfers create **ledger entries** and update balances.
- **Idempotency**: protects against duplicate transfers on retries.
- **Service boundary**: risk scoring lives in a separate service (typical microservice integration).
- **Validation + consistent errors**: inputs are validated and errors are returned predictably.

## Architecture
- `core-api/` — REST API for accounts + transfers, idempotency, validation, error handling (SQLite persistence)
- `risk-service/` — scores transfers and returns `{ "riskScore": number, "reasons": string[] }`
- `dashboard/` — UI to view accounts + send transfers + inspect risk flags/results

## Run locally (Mac)

### Prerequisites
- Java 17+
- Python 3.10+
- Node 18+
- Git

### Ports
- Core API: http://localhost:8080
- Risk Service: http://localhost:8000
- Dashboard: http://localhost:5173

### Dashboard API routing (dev)
The dashboard uses a Vite dev-server proxy:
- Browser requests go to `http://localhost:5173/api/*`
- Vite proxies `/api/*` to the Core API at `http://localhost:8080`

So the UI does not need to call `:8080` directly during local development.


### Option A: Run everything via script
```bash
./scripts/run_all_mac.sh
```

### Option B: Run each service manually

#### 1) Risk Service (FastAPI)
```bash
cd risk-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Open docs: http://localhost:8000/docs

#### 2) Core API (Spring Boot + SQLite)
```bash
cd core-api
# Optional: point Core API at the risk service
export RISK_BASE_URL=http://localhost:8000

./gradlew bootRun
```

#### 3) Dashboard (React)
```bash
cd dashboard
npm install
npm run dev
```

---

## Smoke tests

### Health checks
```bash
curl -s http://localhost:8000/docs >/dev/null && echo "risk ok"
curl -s http://localhost:8080/api/health
```

### List accounts (so you can pick IDs)
```bash
curl -s http://localhost:8080/api/accounts \
  -H "Authorization: Bearer demo-token"
```

### Create a transfer (with idempotency)
```bash
IDEMP=$(uuidgen)

curl -i -X POST http://localhost:8080/api/transfers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer demo-token" \
  -H "Idempotency-Key: $IDEMP" \
  -d '{
    "fromAccountId": "<FROM_ACCOUNT_ID>",
    "toAccountId": "<TO_ACCOUNT_ID>",
    "amount": 25.00,
    "currency": "CAD",
    "memo": "demo"
  }'
```

### Idempotency proof (same key + same body)
Run the exact same command again with the same `$IDEMP`.
You should get the **same** `transferId` back (no duplicate transfer created).

---

## Tests

### Core API (Spring Boot)
```bash
cd core-api
./gradlew test
```

### Risk Service (pytest)
```bash
cd risk-service
pytest -q
```

### Dashboard (vitest)
```bash
cd dashboard
npm run test
```

---

## Repo structure (high-level)
```
core-api/       Spring Boot API + SQLite
risk-service/   FastAPI risk scoring service
dashboard/      React + TypeScript UI
scripts/        helper scripts (e.g., run_all_mac.sh, smoke_test.sh)
```
