"""Tests for /api/EIA_price_and_usage (solar) with mocked EIA API."""
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from server.main import app

client = TestClient(app)


@patch("server.routers.solar.requests.get")
def test_solar_eia_price_and_usage_mock(mock_get):
    mock_get.return_value = MagicMock(
        raise_for_status=MagicMock(),
        json=MagicMock(
            return_value={
                "response": {
                    "data": [
                        {"price": 12.5, "sales": 100.0, "customers": 50.0}
                    ]
                }
            }
        ),
    )
    r = client.get("/api/EIA_price_and_usage", params={"state_abbrev": "co"})
    assert r.status_code == 200
    # Router returns tuple -> FastAPI may serialize as array
    data = r.json()
    assert isinstance(data, list) and len(data) == 2
    price, usage = data[0], data[1]
    assert price == pytest.approx(0.125)  # cents to dollars
    assert usage == pytest.approx(100.0 * 1_000_000 / 50.0)  # MWh to kWh / customers
