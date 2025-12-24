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

## Quickstart (Mac)
### Core API
```bash
cd core-api
./gradlew bootRun
```

### Risk Service
```bash
cd risk-service
uvicorn app.main:app --reload --port 8000
```

### Dashboard
```bash
cd dashboard
npm install
npm run dev
```

## EndPoints (Core API)
- `POST /api/transfers`
   Headers: `Authorization: Bearer demo-token, Idempotency-Key: <uuid>`
   Body: `{ fromAccountId, toAccountId, amount, currency, memo }`
- `POST /api/risk/score` (Optional pass-through)

### Testing
#### Core Api
```bash
cd core-api
./gradlew test
```

#### Risk Service
```bash
cd risk-service
pytest -q
```




