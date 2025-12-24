import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from fastapi.encoders import jsonable_encoder

from app.main import app

client = TestClient(app)

SCORE_PATH = "/risk/score"  # confirmed from your output

def post_score(payload: dict) -> dict:
    r = client.post(SCORE_PATH, json=jsonable_encoder(payload))
    assert r.status_code == 200, f"{r.status_code} {r.text} (path={SCORE_PATH})"
    data = r.json()

    # Match your actual API response shape
    assert "riskScore" in data, data
    assert "reasons" in data, data
    assert isinstance(data["riskScore"], int), data
    assert isinstance(data["reasons"], list), data
    return data

def base_req(amount: float) -> dict:
    return {
        "userId": "u",
        "fromAccountId": "a1",
        "toAccountId": "a2",
        "amount": amount,
        "currency": "CAD",
        "timestamp": datetime.now(timezone.utc),
        "last24hTransferCount": 0,
        "last24hTransferTotal": 0,
    }

def test_large_amount_scores_and_reason_present():
    res = post_score(base_req(600))
    assert res["riskScore"] >= 0
    assert "large_amount" in res["reasons"]

def test_score_increases_with_amount():
    low = post_score(base_req(10))["riskScore"]
    high = post_score(base_req(10000))["riskScore"]
    assert high >= low

def test_zero_amount_is_allowed_and_returns_zero_score():
    res = post_score(base_req(0))
    assert res["riskScore"] == 0
    assert res["reasons"] == []

def test_response_shape_is_stable():
    res = post_score(base_req(123.45))
    assert isinstance(res["riskScore"], int)
    assert all(isinstance(x, str) for x in res["reasons"])

def test_scoring_is_deterministic():
    req = base_req(600)
    r1 = post_score(req)
    r2 = post_score(req)
    assert r1 == r2

@pytest.mark.parametrize("amount, expected_reason", [
    (500, "large_amount"),
    (499.99, None),
])
def test_large_amount_threshold(amount, expected_reason):
    req = base_req(amount)
    res = post_score(req)
    if expected_reason:
        assert expected_reason in res["reasons"]
        assert res["riskScore"] > 0
    else:
        assert "large_amount" not in res["reasons"]
