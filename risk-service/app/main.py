from fastapi import FastAPI, Request
from pydantic import BaseModel
from typing import List
from datetime import datetime


app = FastAPI(title="Risk Service", version="0.1.0")

class ScoreRequest(BaseModel):
    userId: str
    fromAccountId: str
    toAccountId: str
    amount: float
    currency: str
    timestamp: datetime
    last24hTransferCount: int = 0
    last24hTransferTotal: float = 0.0

class ScoreResponse(BaseModel):
    riskScore: int
    reasons: List[str]

@app.get("/risk/health")
def health():
    return {"status": "ok", "service": "risk-service"}

@app.post("/risk/score", response_model=ScoreResponse)
def score(req: ScoreRequest):
    score = 0
    reasons: List[str] = []

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
