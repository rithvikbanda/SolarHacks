"""Tests for server.utils.calculations."""
import os
import sys

_here = os.path.dirname(os.path.abspath(__file__))
_server = os.path.dirname(_here)
_root = os.path.dirname(_server)
if _root not in sys.path:
    sys.path.insert(0, _root)

import pytest
from server.utils.calculations import (
    calculate_gross_cost,
    calculate_net_cost,
    calculate_payback,
    calculate_savings_over_time,
    calculate_carbon_offset,
)
from server.utils.constants import (
    COST_PER_WATT,
    PERMIT_COST,
    FEDERAL_ITC,
    DEFAULT_UTILITY_RATE,
    DEFAULT_SOLAR_PRODUCTION_KWH,
)


def test_calculate_gross_cost():
    assert calculate_gross_cost(10.0) == 10 * 1000 * COST_PER_WATT + PERMIT_COST
    assert calculate_gross_cost(5.0, cost_per_watt=2.5, permit_cost=500) == 5 * 1000 * 2.5 + 500


def test_calculate_net_cost_no_incentives():
    gross = 30_000
    # cost_basis=30k, federal_credit=9k, net=21k
    assert calculate_net_cost(gross) == pytest.approx(21_000)


def test_calculate_net_cost_flat_rebates():
    gross = 30_000
    # cost_basis=30k-2k=28k, federal_credit=28k*0.30=8.4k, net=28k-8.4k=19.6k
    assert calculate_net_cost(gross, flat_rebates=2000) == pytest.approx(19_600)


def test_calculate_net_cost_state_itc():
    gross = 30_000
    # cost_basis=30k, federal=9k, state=30k*0.15=4.5k capped at 1k, net=30k-9k-1k=20k
    entries = [{"pct": 0.15, "cap": 1000}]
    assert calculate_net_cost(gross, state_itc_entries=entries) == pytest.approx(20_000)


def test_calculate_net_cost_full_stack():
    gross = 30_000
    # cost_basis=30k-3k=27k, federal=27k*0.30=8.1k, state=27k*0.10=2.7k capped at 2k
    # net=27k-8.1k-2k=16.9k
    entries = [{"pct": 0.10, "cap": 2000}]
    assert calculate_net_cost(gross, flat_rebates=3000, state_itc_entries=entries) == pytest.approx(16_900)


def test_calculate_net_cost_custom_federal():
    gross = 30_000
    assert calculate_net_cost(gross, federal_itc=0.26) == pytest.approx(30_000 * 0.74)


def test_calculate_net_cost_clamps_negative_cost_basis():
    gross = 10_000
    # flat_rebates > gross: cost_basis should clamp to 0, net = 0
    assert calculate_net_cost(gross, flat_rebates=15_000) == 0


def test_calculate_payback():
    net = 21_000
    payback = calculate_payback(net)
    assert payback > 0 and payback < 20
    assert calculate_payback(net, solar_production_kwh=10_000, price_per_kwh=0.18) == pytest.approx(
        21_000 / (10_000 * 0.18)
    )
    assert calculate_payback(1000, solar_production_kwh=0, price_per_kwh=0.16) == float("inf")


def test_calculate_savings_over_time():
    net = 20_000
    result = calculate_savings_over_time(net, solar_production_kwh=10_000, years=5)
    assert len(result) == 5
    for r in result:
        assert "year" in r and "annual_savings" in r and "cumulative_savings" in r
    assert result[0]["year"] == 1
    assert result[0]["cumulative_savings"] == pytest.approx(-20_000 + result[0]["annual_savings"])


def test_calculate_carbon_offset():
    result = calculate_carbon_offset(solar_production_kwh=10_000, years=20)
    assert isinstance(result, (int, float)) and result >= 0
    result_10 = calculate_carbon_offset(solar_production_kwh=10_000, years=10)
    assert result_10 >= 0
