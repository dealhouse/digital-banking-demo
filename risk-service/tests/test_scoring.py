from datetime import datetime
from app.main import score, ScoreRequest

def test_large_amount_scores():
    req = ScoreRequest(
        userId="user1",
        fromAccountId="account1",
        toAccountId="account2",
        amount=600,
        currency="CAD",
        timestamp=datetime.utcnow(),
        last24hTransferCount=0,
        last24hTransferTotal=0
    )

    res = score(req)

    assert res.riskScore >= 30
    assert "large_amount" in res.reasons
