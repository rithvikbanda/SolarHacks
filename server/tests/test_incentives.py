"""Tests for server.routers.incentives (unit + API with mocked Rewiring America)."""
import os
import sys

_here = os.path.dirname(os.path.abspath(__file__))
_server = os.path.dirname(_here)
_root = os.path.dirname(_server)
if _root not in sys.path:
    sys.path.insert(0, _root)

os.environ.setdefault("REWIRING_AMERICA_API_KEY", "test-key")

import pytest
from unittest.mock import patch, MagicMock

from server.routers import incentives as incentives_module

REWIRING_AMERICA_URL = incentives_module.REWIRING_AMERICA_URL


def test_format_amount():
    _fa = incentives_module._format_amount
    assert _fa(1200) == "$1,200"
    assert _fa(0) == "$0"
    assert _fa(None) == "—"
    assert _fa("$2,500") == "$2,500"
    assert _fa(99.5) == "$99.50"


def test_numeric_amount():
    _na = incentives_module._numeric_amount
    assert _na(1000) == 1000.0
    assert _na(None) == 0.0
    assert _na("$1,200") == 1200.0
    assert _na("500") == 500.0


def test_normalize_incentive():
    _norm = incentives_module._normalize_incentive
    out = _norm({"program": "ITC", "amount": {"type": "dollar_amount", "number": 1800}, "authority_type": "federal"})
    assert out["name"] == "ITC"
    assert out["amount"] == "$1,800"
    assert out["type"] == "federal"
    out2 = _norm({"program": "State Rebate", "amount": {"type": "dollar_amount", "number": 500}, "authority_type": "state"})
    assert out2["name"] == "State Rebate"
    assert out2["amount"] == "$500"
    assert out2["type"] == "state"
    out3 = _norm({})
    assert out3["name"] == "Incentive"
    assert out3["type"] == "federal"


@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    from server.main import app
    return TestClient(app)


def test_incentives_no_income_returns_empty(client):
    r = client.get("/api/incentives", params={"zip": "80202"})
    assert r.status_code == 200
    data = r.json()
    assert data["incentives"] == []
    assert data["total_value"] == 0
    assert data["count"] == 0


def test_incentives_invalid_zip_400(client):
    r = client.get("/api/incentives", params={"zip": "123", "income": 75000})
    assert r.status_code == 400
    r = client.get("/api/incentives", params={"zip": "123456", "income": 75000})
    assert r.status_code == 400


@patch("server.routers.incentives.requests.get")
def test_incentives_success_mock(mock_get, client):
    mock_get.return_value = MagicMock(
        status_code=200,
        raise_for_status=MagicMock(),
        json=MagicMock(return_value={
            "incentives": [
                {"program": "Federal ITC", "amount": {"type": "dollar_amount", "number": 9000}, "authority_type": "federal"},
                {"program": "State Rebate", "amount": {"type": "dollar_amount", "number": 1000}, "authority_type": "state"},
            ]
        }),
    )
    r = client.get(
        "/api/incentives",
        params={"zip": "80202", "income": 80000, "householdSize": 2},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["count"] == 2
    assert data["total_value"] == 10000
    assert any(i["name"] == "Federal ITC" and i["amount"] == "$9,000" for i in data["incentives"])
    assert any(i["name"] == "State Rebate" and i["amount"] == "$1,000" for i in data["incentives"])


@patch("server.routers.incentives.requests.get")
def test_incentives_calls_api_with_correct_parameters(mock_get, client):
    """Verify the endpoint calls Rewiring America API with correct URL, headers, and params."""
    mock_get.return_value = MagicMock(
        raise_for_status=MagicMock(),
        json=MagicMock(return_value={"incentives": []}),
    )

    client.get(
        "/api/incentives",
        params={
            "zip": "90210",
            "income": 75000,
            "householdSize": 4,
            "filingStatus": "joint",
            "ownersOrRenters": "renter",
        },
    )

    assert mock_get.called
    call_kwargs = mock_get.call_args.kwargs
    call_args = mock_get.call_args.args

    # Correct URL (first positional arg)
    assert call_args[0] == REWIRING_AMERICA_URL

    # Correct headers: Bearer token and Content-Type
    headers = call_kwargs["headers"]
    assert "Authorization" in headers
    assert headers["Authorization"] == "Bearer test-key"
    assert headers["Content-Type"] == "application/json"

    # Correct params: snake_case as sent to requests (FastAPI receives camelCase via alias and passes to handler)
    params = call_kwargs["params"]
    assert params["zip"] == "90210"
    assert params["household_income"] == 75000
    assert params["household_size"] == 4
    assert params["tax_filing"] == "joint"
    assert params["owner_status"] == "renter"

    # Timeout
    assert call_kwargs["timeout"] == 10


@patch("server.routers.incentives.requests.get")
def test_incentives_uses_default_params_when_omitted(mock_get, client):
    """Verify default values for householdSize, filingStatus, ownersOrRenters when not provided."""
    mock_get.return_value = MagicMock(
        raise_for_status=MagicMock(),
        json=MagicMock(return_value={"incentives": []}),
    )

    client.get("/api/incentives", params={"zip": "80202", "income": 60000})

    params = mock_get.call_args.kwargs["params"]
    assert params["zip"] == "80202"
    assert params["household_income"] == 60000
    assert params["household_size"] == 2
    assert params["tax_filing"] == "single"
    assert params["owner_status"] == "owner"


@patch("server.routers.incentives.requests.get")
def test_incentives_accepts_rebates_key_from_api(mock_get, client):
    """API might return 'rebates' instead of 'incentives'; response should still be parsed."""
    mock_get.return_value = MagicMock(
        raise_for_status=MagicMock(),
        json=MagicMock(return_value={
            "rebates": [
                {"program": "Utility Rebate", "amount": {"type": "dollar_amount", "number": 500}, "authority_type": "utility"},
            ]
        }),
    )

    r = client.get("/api/incentives", params={"zip": "80202", "income": 50000})
    assert r.status_code == 200
    data = r.json()
    assert data["count"] == 1
    assert data["incentives"][0]["name"] == "Utility Rebate"
    assert data["incentives"][0]["amount"] == "$500"
    assert data["incentives"][0]["type"] == "utility"
    assert data["total_value"] == 500
