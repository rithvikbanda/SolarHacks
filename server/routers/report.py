import asyncio
from fastapi import APIRouter, Query

from routers.energy import get_price_and_usage
from routers.incentives import get_incentives
from routers.wind import get_wind
from routers.geothermal import get_geothermal
from utils.monte_carlo import run_simulation
from utils.calculations import (
    calculate_gross_cost,
    calculate_net_cost,
    calculate_payback,
    calculate_savings_over_time,
    calculate_carbon_offset,
)
from utils.charts import plot_savings_fan_chart

router = APIRouter()


async def _fetch_solar(state_abbrev: str) -> dict | None:
    try:
        result = await asyncio.to_thread(get_price_and_usage, state_abbrev)
        price, kwh = result
        if price is None:
            return None
        return {"price_per_kwh": price, "avg_kwh_per_household": kwh}
    except Exception:
        return None


async def _fetch_incentives(
    zip_code: str,
    income: int | None,
    household_size: int,
    filing_status: str,
    owners_or_renters: str,
) -> dict | None:
    try:
        result = await asyncio.to_thread(
            get_incentives, zip_code, income, household_size,
            filing_status, owners_or_renters,
        )
        return result
    except Exception:
        return None


async def _fetch_wind(lat: float, lon: float) -> dict | None:
    try:
        result = await asyncio.to_thread(get_wind, lat, lon)
        return result.get("data")
    except Exception:
        return None


async def _fetch_geothermal(lat: float, lon: float) -> dict | None:
    try:
        result = await asyncio.to_thread(get_geothermal, lat, lon)
        return result.get("data")
    except Exception:
        return None


@router.get("/report")
async def generate_report(
    lat: float,
    lon: float,
    state_abbrev: str,
    zip_code: str = Query(..., alias="zip"),
    system_size_kw: float = 8.0,
    income: int | None = None,
    household_size: int = 2,
    filing_status: str = "single",
    owners_or_renters: str = "owner",
    years: int = 20,
    n_simulations: int = 1000,
):
    solar_data, incentives_data, wind_data, geothermal_data = await asyncio.gather(
        _fetch_solar(state_abbrev),
        _fetch_incentives(zip_code, income, household_size, filing_status, owners_or_renters),
        _fetch_wind(lat, lon),
        _fetch_geothermal(lat, lon),
    )

    price_per_kwh = solar_data["price_per_kwh"] if solar_data else None
    annual_kwh = solar_data["avg_kwh_per_household"] if solar_data else None
    state_rebate = incentives_data.get("total_value", 0) if incentives_data else 0

    # Deterministic single-point estimates
    gross = calculate_gross_cost(system_size_kw)
    net = calculate_net_cost(gross, state_rebate)
    payback = calculate_payback(net, annual_kwh, price_per_kwh)
    savings = calculate_savings_over_time(net, annual_kwh, price_per_kwh, years)
    carbon = calculate_carbon_offset(annual_kwh, years)

    deterministic = {
        "gross_cost": round(gross, 2),
        "net_cost": round(net, 2),
        "payback_years": round(payback, 1),
        "savings_by_year": savings,
        "carbon_offset_tons": carbon,
    }

    # Monte Carlo distributions
    simulation = await asyncio.to_thread(
        run_simulation,
        system_size_kw=system_size_kw,
        annual_kwh=annual_kwh,
        price_per_kwh=price_per_kwh,
        state_rebate=state_rebate,
        years=years,
        n=min(n_simulations, 10000),
    )

    report_data = {
        "solar": solar_data,
        "incentives": incentives_data,
        "wind": wind_data,
        "geothermal": geothermal_data,
        "deterministic": deterministic,
        "simulation": simulation,
    }

    charts = await asyncio.to_thread(plot_savings_fan_chart, report_data)

    report_data["charts"] = {"savings_fan": charts}
    return report_data
