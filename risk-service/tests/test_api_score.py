
"""
API contract tests for POST /score.
Verifies response shape + that the service stays compatible with core-api RiskClient.
"""

import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from fastapi.encoders import jsonable_encoder
from app.main import app

client = TestClient(app)
SCORE_PATH = "/risk/score"

def base_req(
    amount: float,
    *,
    currency: str = "CAD",
    last24hTransferCount: int = 0,
    last24hTransferTotal: float = 0,
) -> dict:
    return {
        "userId": "u",
        "fromAccountId": "a1",
        "toAccountId": "a2",
        "amount": amount,
        "currency": currency,
        "timestamp": datetime(2025, 1, 1, tzinfo=timezone.utc),
        "last24hTransferCount": last24hTransferCount,
        "last24hTransferTotal": last24hTransferTotal,
    }

def post_score(payload: dict):
    return client.post(SCORE_PATH, json=jsonable_encoder(payload))

def assert_ok(r):
    assert r.status_code == 200, r.text
    data = r.json()
    assert "riskScore" in data
    assert "reasons" in data
    return data

def test_missing_fields_422():
    r = client.post(SCORE_PATH, json={"amount": 100})
    assert r.status_code == 422

@pytest.mark.parametrize("amount", [-0.01, -1, -100])
def test_negative_amount_422(amount):
    r = post_score(base_req(amount))
    assert r.status_code == 422, r.text

def test_zero_amount_allowed():
    data = assert_ok(post_score(base_req(0)))
    assert data["riskScore"] == 0
    assert data["reasons"] == []

@pytest.mark.parametrize("currency", ["", "C", "CADX", "12$"])
def test_bad_currency_422(currency):
    r = post_score(base_req(100, currency=currency))
    assert r.status_code == 422, r.text

def test_currency_is_normalized_to_uppercase():
    data = assert_ok(post_score(base_req(100, currency="usd ")))
    assert isinstance(data["riskScore"], int)

def test_large_amount_boundary():
    below = assert_ok(post_score(base_req(499.99)))
    at = assert_ok(post_score(base_req(500.00)))
    assert "large_amount" not in below["reasons"]
    assert "large_amount" in at["reasons"]

def test_high_frequency_boundary():
    below = assert_ok(post_score(base_req(10, last24hTransferCount=4)))
    at = assert_ok(post_score(base_req(10, last24hTransferCount=5)))
    assert "high_frequency" not in below["reasons"]
    assert "high_frequency" in at["reasons"]

def test_high_total_boundary():
    below = assert_ok(post_score(base_req(10, last24hTransferTotal=999.99)))
    at = assert_ok(post_score(base_req(10, last24hTransferTotal=1000.00)))
    assert "high_total" not in below["reasons"]
    assert "high_total" in at["reasons"]
