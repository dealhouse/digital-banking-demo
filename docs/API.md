# API Reference (Core API)

All Core API endpoints are under `/api/*`.

**Auth header (demo):**
`Authorization: Bearer demo-token`

> Note: The dashboard uses environment variables to decide what base URL to call (see `dashboard/src/api.ts` and `.env`). For local runs, the Core API is typically on `http://localhost:8080`.

---

## Auth

### `POST /api/auth/login`

**Purpose:** Demo login that returns a token for local testing.

**Request**

```json
{ "email": "demo@digitalbanking.dev", "password": "anything" }
```

**Response**

```json
{ "token": "demo-token", "email": "demo@digitalbanking.dev" }
```

**Example**

```bash
curl -s -X POST "http://localhost:8080/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@digitalbanking.dev","password":"x"}'
```

---

## Protected

### `GET /api/protected/ping`

**Purpose:** Quick token verification.

**Example**

```bash
curl -s "http://localhost:8080/api/protected/ping" \
  -H "Authorization: Bearer demo-token"
```

---

## Accounts

### `GET /api/accounts`

**Purpose:** List demo user accounts.

**Example**

```bash
curl -s "http://localhost:8080/api/accounts" \
  -H "Authorization: Bearer demo-token"
```

### `GET /api/accounts/{accountId}/ledger`

**Purpose:** Ledger entries for one account (ordered newest first).

**Example**

```bash
curl -s "http://localhost:8080/api/accounts/<ACCOUNT_ID>/ledger" \
  -H "Authorization: Bearer demo-token"
```

---

## Transfers

### `POST /api/transfers`

**Purpose:** Create a transfer with **idempotency**.

**Required

