# Digital Banking Demo (Monorepo)

A small “bank-style” demo showing:
- Java Spring Boot Core API (SQLite)
- Python FastAPI Risk Scoring service
- React + TypeScript dashboard

![CI](https://github.com/dealhouse/digital-banking-demo/actions/workflows/ci.yml/badge.svg)


## Architecture
- `core-api/` — REST API for accounts + transfers, idempotency, validation, error handling
- `risk-service/` — scores transfers and returns `{score, level, reasons}`
- `dashboard/` — UI to view accounts + send transfers + show risk result

## Run locally (Mac)

### Prerequisites
- Java 17+ (Spring Boot)
- Python 3.10+ (FastAPI)
- Node 18+ (Dashboard)
- Git

### Ports
- Core API: http://localhost:8080
- Risk Service: http://localhost:8000
- Dashboard: http://localhost:5173

### 1) Risk Service (FastAPI)
```bash
cd risk-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Open docs: http://localhost:8000/docs

### 2) Core API (Spring Boot + SQLite)
```bash
cd core-api
# Optional: point Core API at the risk service
export RISK_BASE_URL=http://localhost:8000

./gradlew bootRun
```

### 3) Dashboard (React)
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
curl -s http://localhost:8080/api/health || true
```

### Create a transfer (with idempotency)
```bash
IDEMP=$(uuidgen)

curl -i -X POST http://localhost:8080/api/transfers   -H "Content-Type: application/json"   -H "Authorization: Bearer demo-token"   -H "Idempotency-Key: $IDEMP"   -d '{
    "fromAccountId": "acct_1",
    "toAccountId": "acct_2",
    "amount": 25.00,
    "currency": "USD",
    "memo": "demo"
  }'
```

### Idempotency proof (same key + same body)
Run the exact same command again with the same `$IDEMP`.
You should get the *same* transfer result (no duplicate transfer created).

---

## Tests

### Core API
```bash
cd core-api
./gradlew test
```

### Risk Service
```bash
cd risk-service
pytest -q
```


### Dashboard
```bash
cd dashboard
npm test
```
