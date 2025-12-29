# Work Plan (Estimates vs Actual)

This is a lightweight record of work packages for the demo.
Goal: show planning + tracking, not bureaucracy.

| Work Package                                      | Estimate | Actual | Notes |
| ------------------------------------------------- | -------: | -----: | ----- |
| Repo scaffold (core-api, risk-service, dashboard) |     2–3h |    ___ |       |
| Demo auth (fake token) + protected ping           |     1–2h |    ___ |       |
| Accounts + SQLite persistence                     |     2–3h |    ___ |       |
| Transfers (idempotency + validation)              |     4–6h |    ___ |       |
| Ledger entries (debit/credit) + UI display        |     3–5h |    ___ |       |
| Risk service scoring rules + pytest               |     2–4h |    ___ |       |
| Core API ↔ Risk service integration               |     3–5h |    ___ |       |
| Risk flags endpoint + UI list                     |     2–4h |    ___ |       |
| Demo seed data (accounts + burst transfers)       |     2–3h |    ___ |       |
| 24h velocity stats (count + total)                |     1–2h |    ___ |       |
| Transfers list paging + “Load more”               |     2–4h |    ___ |       |
| Docs (API / design / testing)                     |     2–3h |    ___ |       |

## Notes 

* Keep demo scope tight; prioritize correctness + clarity over feature count.
