"""Tests for /api/geothermal (mocked Open-Meteo)."""
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from server.main import app

client = TestClient(app)


@patch("server.routers.geothermal.requests.get")
def test_geothermal_returns_expected_shape(mock_get):
    mock_get.return_value.status_code = 200
    mock_get.return_value.raise_for_status = lambda: None
    mock_get.return_value.json.return_value = {
        "daily": {"temperature_2m_mean": [10.0] * 365},
        "hourly": {
            "soil_temperature_0_to_7cm": [12.0] * 8760,
            "soil_temperature_7_to_28cm": [11.0] * 8760,
        },
    }
    r = client.get("/api/geothermal", params={"lat": 39.74, "lon": -104.99})
    assert r.status_code == 200
    data = r.json()
    assert data.get("status") == "ok"
    payload = data.get("data", {})
    assert "score" in payload
    assert "suitability" in payload
    assert "climate_zone" in payload
    assert "heating_degree_days" in payload
    assert "note" in payload
