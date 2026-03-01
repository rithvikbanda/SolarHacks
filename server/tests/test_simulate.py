"""Tests for /api/simulate and server.utils.monte_carlo."""
import pytest
from fastapi.testclient import TestClient
from server.main import app

client = TestClient(app)


def test_simulate_returns_expected_shape():
    r = client.get(
        "/api/simulate",
        params={
            "system_size_kw": 10.0,
            "annual_kwh": 12_000,
            "price_per_kwh": 0.18,
            "years": 20,
            "n_simulations": 50,
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert "n_simulations" in data
    assert "years" in data
    assert data["years"] == 20
    assert data["n_simulations"] == 50
    assert "net_cost" in data and "mean" in data["net_cost"]
    assert "payback_years" in data and "percentiles" in data["payback_years"]
    assert "total_savings_20yr" in data
    assert "carbon_offset_tons" in data
    assert "savings_by_year" in data and "mean" in data["savings_by_year"]


def test_simulate_defaults():
    r = client.get("/api/simulate", params={"system_size_kw": 5.0})
    assert r.status_code == 200
    d = r.json()
    assert d["n_simulations"] == 1000
    assert d["years"] == 20


def test_simulate_caps_n_simulations():
    r = client.get(
        "/api/simulate",
        params={"system_size_kw": 6.0, "n_simulations": 50000},
    )
    assert r.status_code == 200
    assert r.json()["n_simulations"] == 10000
