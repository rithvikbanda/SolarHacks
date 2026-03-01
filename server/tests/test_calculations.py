"""Tests for server.utils.calculations."""
import os
import sys

# Allow running this file directly (e.g. Code Runner) from repo root or server/
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
    DEFAULT_ANNUAL_KWH,
)


def test_calculate_gross_cost():
    assert calculate_gross_cost(10.0) == 10 * 1000 * COST_PER_WATT + PERMIT_COST
    assert calculate_gross_cost(5.0, cost_per_watt=2.5, permit_cost=500) == 5 * 1000 * 2.5 + 500


def test_calculate_net_cost():
    gross = 30_000
    # net = gross * (1 - 0.30) - 0 = 21_000
    assert calculate_net_cost(gross) == pytest.approx(21_000)
    assert calculate_net_cost(gross, state_rebate=1000) == pytest.approx(20_000)
    assert calculate_net_cost(gross, federal_itc=0.26) == pytest.approx(30_000 * 0.74)


def test_calculate_payback():
    net = 21_000
    # default annual_kwh and rate -> annual_savings = 10500 * 0.16 = 1680 -> payback ~12.5
    payback = calculate_payback(net)
    assert payback > 0 and payback < 20
    assert calculate_payback(net, annual_kwh=10_000, price_per_kwh=0.18) == pytest.approx(
        21_000 / (10_000 * 0.18)
    )
    assert calculate_payback(1000, annual_kwh=0, price_per_kwh=0.16) == float("inf")


def test_calculate_savings_over_time():
    net = 20_000
    result = calculate_savings_over_time(net, years=5)
    assert len(result) == 5
    for r in result:
        assert "year" in r and "annual_savings" in r and "cumulative_savings" in r
    assert result[0]["year"] == 1
    assert result[0]["cumulative_savings"] == pytest.approx(-20_000 + result[0]["annual_savings"])


def test_calculate_carbon_offset():
    result = calculate_carbon_offset(years=20)
    assert isinstance(result, (int, float)) and result >= 0
    result_10 = calculate_carbon_offset(annual_kwh=10_000, years=10)
    assert result_10 >= 0
