# Technical Design — Digital Banking Demo

## Goal

A small end-to-end demo of “bank-style” transfers:

* Create transfers with **idempotency**
* Persist **accounts, transfers, ledger entries, risk assessments** in SQLite
* Call a separate **Risk Service (FastAPI)** to score transfers
* Show everything in a **React + TypeScript** dashboard

This is intentionally scoped for interview walkthroughs (not production banking).

---

## Architecture (high level)

**Dashboard (React/TS)** → calls **Core API (Spring Boot)** → persists to **SQLite**
**Core API** → calls **Risk Service (FastAPI)** for scoring → stores risk result

Diagrams:

* `docs/diagrams/system-context.mmd`
* `docs/diagrams/container.mmd`

---

## Core flows

### 1) Create transfer (happy path)

1. Dashboard submits a transfer to `POST /api/transfers` with:

   * JSON: `{ fromAccountId, toAccountId, amount, currency, memo? }`
   * header: `Idempotency-Key: <uuid>`
2. Core API validates request and checks balances.
3. Core API calls Risk Service to score the transfer.
4. Core API persists:

   * `TransferEntity`
   * two `LedgerEntryEntity` rows (debit + credit)
   * `RiskAssessmentEntity` linked by `transferId`
5. Core API returns transfer + risk metadata to the UI.

### 2) Review ledger

* Dashboard loads accounts: `GET /api/accounts`
* Dashboard loads ledger entries for an account: `GET /api/accounts/{accountId}/ledger`
* Ledger is ordered by `createdAt desc`.

### 3) Review risk flags

* Dashboard calls: `GET /api/risk/flags?minScore=<n>`
* Returns items with `riskScore`, `riskLevel`, `reasonsJson`, transfer metadata.

### 4) 24-hour “high activity” stats

* Endpoint: `GET /api/transfers/stats/24h?currency=CAD`
* Implemented via repository aggregation over transfers in the last 24h:

  * `count(transfers)`
  * `sum(amount)`

---

## API surface (key endpoints)

**Auth**

* `POST /api/auth/login` → returns demo token

**Accounts**

* `GET /api/accounts`
* `GET /api/accounts/{accountId}/ledger`

**Transfers**

* `POST /api/transfers` (requires `Idempotency-Key`)
* `GET /api/transfers/{transferId}`
* `GET /api/transfers/search?prefix=...`
* `GET /api/transfers?page=<n>&size=<n>` (paged list)
* `GET /api/transfers/stats/24h?currency=...`

**Risk**

* `POST /api/risk/score` (sandbox scoring)
* `GET /api/risk/flags?minScore=...`

---

## Data model (entities)

* **UserEntity**: demo user by email (single demo user)
* **AccountEntity**: `userId`, `balance`, `currency`, `type`, `name`
* **TransferEntity**: `userId`, from/to account IDs, `amount`, `currency`, `status`, `idempotencyKey`, `createdAt`
* **LedgerEntryEntity**: per-account entries representing debits/credits and resulting balance over time
* **RiskAssessmentEntity**: `transferId`, `riskScore`, `level`, `reasonsJson`, `createdAt`

---

## Security & error handling (demo constraints)

* Demo auth accepts `Authorization: Bearer demo-token`.
* Errors are returned as a consistent JSON shape via `ApiExceptionHandler` / `ApiError`.

---

## Testing (what’s covered)

* **Core API**: Spring/JUnit integration tests for transfer behavior + persistence
* **Risk service**: pytest unit tests for scoring logic thresholds/reasons
* **Dashboard**: Vitest/RTL component-level tests (smoke / interaction)

---

## Tradeoffs (intentional)

* SQLite + demo auth chosen for local simplicity.
* Risk scoring is synchronous (transfer waits for score).
* Not a full accounting ledger model; ledger entries are sized for demo clarity.


