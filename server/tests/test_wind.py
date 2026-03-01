"""Tests for /api/wind: _parse_srw unit test + endpoint with mocked NREL."""
import pytest
from unittest.mock import patch, MagicMock
from server.routers.wind import _parse_srw, _classify


def test_parse_srw():
    # Minimal valid SRW: header with "windspeed", then units row, then data
    text = "city,state,windspeed\n-, -, -\n1,2,5.0\n1,2,6.0"
    assert _parse_srw(text) == pytest.approx(5.5)


def test_classify():
    assert _classify(6.0) == ("Excellent", True, "Strong wind resource. A small turbine would be highly productive here.")
    assert _classify(5.0) == ("Good", True, "Good wind resource. A small turbine is likely economically viable.")
    assert _classify(4.0) == ("Marginal", False, "Marginal wind resource. Solar will deliver better returns at this location.")
    assert _classify(3.0) == ("Poor", False, "Low wind speeds. Wind is not recommended — focus on solar instead.")


@patch("server.routers.wind.requests.get")
def test_wind_endpoint_mock(mock_get):
    mock_get.return_value = MagicMock(
        raise_for_status=MagicMock(),
        text="city,state,windspeed\n-, -, -\n1,2,5.5\n1,2,5.7",
    )
    from fastapi.testclient import TestClient
    from server.main import app
    client = TestClient(app)
    r = client.get("/api/wind", params={"lat": 39.74, "lon": -104.99})
    assert r.status_code == 200
    data = r.json()
    assert data.get("status") == "ok"
    assert "data" in data
    assert data["data"]["feasible"] is True
    assert "avg_wind_speed_ms" in data["data"]
