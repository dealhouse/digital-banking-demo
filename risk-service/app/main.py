"""
FastAPI Risk Scoring Service (rule-based + explainable).

Contract:
- POST /score -> { riskScore: int, reasons: list[str] }

Used by: core-api (Spring Boot) after it computes transfer stats (24h velocity/total).
Run: uvicorn app.main:app --reload --port 8000
"""

from fastapi import FastAPI, Request
from typing import List
import re
from datetime import datetime
from pydantic import BaseModel, Field

# Request fields are intentionally small + stable because core-api and dashboard depend on them.
# Add fields only when you also update RiskClient DTOs + UI.
try:
    # Pydantic v2
    from pydantic import field_validator
    V2 = True
except Exception:
    # Pydantic v1
    from pydantic import validator as field_validator
    V2 = False


app = FastAPI(title="Risk Service", version="0.1.0")

# Scoring is rule-based (not ML) so it stays explainable for demos/interviews.
# riskScore is additive; reasons are stable string codes consumed by the UI.
# Keep reason codes consistent over time (breaking change for dashboard filters).


class ScoreRequest(BaseModel):
    userId: str
    fromAccountId: str
    toAccountId: str

    # allow 0, reject negatives
    amount: float = Field(..., ge=0)

    # we’ll normalize to uppercase + strip, then validate
    currency: str

    timestamp: datetime

    last24hTransferCount: int = Field(..., ge=0)
    last24hTransferTotal: float = Field(..., ge=0)

    if V2:
        @field_validator("currency")
        @classmethod
        def normalize_currency(cls, v: str) -> str:
            v = (v or "").strip().upper()
            if not re.fullmatch(r"[A-Z]{3}", v):
                raise ValueError("currency must be a 3-letter ISO code (e.g., CAD)")
            return v
    else:
        @field_validator("currency")
        def normalize_currency(cls, v: str) -> str:
            v = (v or "").strip().upper()
            if not re.fullmatch(r"[A-Z]{3}", v):
                raise ValueError("currency must be a 3-letter ISO code (e.g., CAD)")
            return v
class ScoreResponse(BaseModel):
    riskScore: int
    reasons: List[str]

@app.get("/risk/health")
def health():
    return {"status": "ok", "service": "risk-service"}

# API endpoint: pure function of input -> score + reasons.
# No DB calls here; persistence happens in core-api (RiskAssessmentEntity).

@app.post("/risk/score", response_model=ScoreResponse)
def score(req: ScoreRequest):
    score = 0
    reasons: List[str] = []
    
    # Tuning knobs (demo defaults). These map to the “signals” shown in the dashboard.
    # In a real service, these would come from config / feature flags.

    if req.amount >= 500:
        score += 30
        reasons.append("large_amount")

    if req.last24hTransferCount >= 5:
        score += 25
        reasons.append("high_frequency")

    if req.last24hTransferTotal >= 1000:
        score += 20
        reasons.append("high_total")

    return ScoreResponse(riskScore=min(score, 100), reasons=reasons)

# Dev tool
# @app.post("/risk/echo")  
# async def echo(request: Request):
#     raw = await request.body()

#     # Try JSON parse only if raw exists
#     parsed = None
#     if raw:
#         try:
#             parsed = await request.json()
#         except Exception:
#             parsed = None

#     # Return key transport headers so we can compare curl vs Java
#     interesting = {}
#     for k in ["content-type", "content-length", "transfer-encoding", "expect", "host", "user-agent"]:
#         interesting[k] = request.headers.get(k)

#     return {
#         "httpVersion": request.scope.get("http_version"),
#         "headers": interesting,
#         "rawLen": len(raw),
#         "json": parsed,
#     }


