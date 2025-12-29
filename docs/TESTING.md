# Testing & Local Verification

This repo contains:

* `core-api/` — Spring Boot + SQLite (JUnit)
* `risk-service/` — FastAPI (pytest)
* `dashboard/` — React + TypeScript (Vitest + RTL)

> Tip: `scripts/run_all_mac.sh` and `scripts/smoke_test.sh` are the quickest way to validate “the whole system works”.

---

## Core API (JUnit)

### Run tests

```bash
cd core-api
./gradlew test
```

### Run one test class

```bash
./gradlew test --tests com.minibank.core.TransfersIntegrationTest
```

### View test report (HTML)

After running tests:

* `core-api/build/reports/tests/test/index.html`

### Run the API

```bash
cd core-api
./gradlew bootRun
```

---

## Risk Service (pytest)

### Setup + install

```bash
cd risk-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Run tests

```bash
pytest -q
```

### Run the service (dev)

Your exact command/port may be defined in `scripts/run_all_mac.sh`, but typically:

```bash
uvicorn app.main:app --reload
```

---

## Dashboard (npm / Vitest)

### Install

```bash
cd dashboard
npm install
```

### Run tests

```bash
npm test
```

### Run dev server

```bash
npm run dev
```

---

## End-to-end smoke test

### Run everything (recommended)

From repo root:

```bash
./scripts/run_all_mac.sh
```

### Smoke test calls (recommended)

From repo root:

```bash
./scripts/smoke_test.sh
```

If you prefer manual curl checks:

1. Login → get token
2. Get accounts → pick IDs
3. Create a transfer with `Idempotency-Key`
4. Verify ledger updated
5. Verify risk flags updated
6. Verify `/api/transfers/stats/24h`

---

## What is covered (high level)

**Core API**

* transfer creation + persistence
* ledger entry creation
* idempotency behavior
* risk assessment persistence/return
* paging behavior for transfers list (newest first)

**Risk service**

* scoring thresholds + reasons

**Dashboard**

* component-level behavior (renders, interactions, mocked API)

