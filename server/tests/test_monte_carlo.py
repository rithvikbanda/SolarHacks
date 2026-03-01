"""Tests for server.utils.monte_carlo (unit, deterministic with seed)."""
import pytest
from server.utils.monte_carlo import run_simulation


def test_run_simulation_deterministic_with_seed():
    a = run_simulation(10.0, annual_kwh=12_000, price_per_kwh=0.18, years=20, n=100, seed=42)
    b = run_simulation(10.0, annual_kwh=12_000, price_per_kwh=0.18, years=20, n=100, seed=42)
    assert a["net_cost"]["mean"] == b["net_cost"]["mean"]
    assert a["payback_years"]["mean"] == b["payback_years"]["mean"]


def test_run_simulation_shape():
    out = run_simulation(8.0, years=15, n=20, seed=1)
    assert out["n_simulations"] == 20
    assert out["years"] == 15
    assert "net_cost" in out and "mean" in out["net_cost"] and "percentiles" in out["net_cost"]
    assert "payback_years" in out
    assert "total_savings_20yr" in out
    assert "savings_by_year" in out
    assert len(out["savings_by_year"]["mean"]) == 15
