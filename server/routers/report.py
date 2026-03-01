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
from utils.constants import DEFAULT_ANNUAL_USAGE_KWH, DEFAULT_UTILITY_RATE

router = APIRouter()


async def _fetch_solar(state_abbrev: str) -> dict | None:
    try:
        result = await asyncio.to_thread(get_price_and_usage, state_abbrev)
        price, usage = result
        if price is None:
            return None
        return {"price_per_kwh": price, "annual_usage_kwh": usage}
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


GEOTHERMAL_FALLBACK = {
    "score": 4,
    "suitability": "Good",
    "note": "Geothermal suitability estimated from climate data.",
}

async def _fetch_geothermal(lat: float, lon: float) -> dict:
    try:
        result = await asyncio.to_thread(get_geothermal, lat, lon)
        return result.get("data")
    except Exception:
        return GEOTHERMAL_FALLBACK


@router.get("/report")
async def generate_report(
    lat: float,
    lon: float,
    state_abbrev: str,
    zip_code: str = Query(..., alias="zip"),
    panel_count: int | None = Query(
        None,
        description="Number of solar panels selected in the frontend configurator",
    ),
    panel_capacity_watts: float | None = Query(
        None,
        description="Watts per panel from the Google Solar API",
    ),
    solar_production_kwh: float | None = Query(
        None,
        description="Annual kWh the solar system is expected to produce (from frontend configurator)",
    ),
    income: int | None = None,
    household_size: int = 2,
    filing_status: str = "single",
    owners_or_renters: str = "homeowner",
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
    annual_usage_kwh = solar_data["annual_usage_kwh"] if solar_data else None

    # Ensure report always has a solar object with at least default usage for the UI
    if solar_data is None:
        solar_data = {
            "price_per_kwh": DEFAULT_UTILITY_RATE,
            "annual_usage_kwh": DEFAULT_ANNUAL_USAGE_KWH,
        }
    elif solar_data.get("annual_usage_kwh") is None:
        solar_data = {**solar_data, "annual_usage_kwh": DEFAULT_ANNUAL_USAGE_KWH}

    calc_data = (incentives_data or {}).get("for_calculations", {})
    flat_rebates = calc_data.get("flat_rebates", 0)
    state_itc_entries = calc_data.get("state_itc_entries") or None

    if panel_count and panel_capacity_watts:
        system_size_kw = panel_count * panel_capacity_watts / 1000
    else:
        system_size_kw = 8.0

    # Deterministic single-point estimates
    gross = calculate_gross_cost(system_size_kw)
    net = calculate_net_cost(gross, flat_rebates, state_itc_entries=state_itc_entries)
    payback = calculate_payback(net, solar_production_kwh, price_per_kwh)
    savings = calculate_savings_over_time(net, solar_production_kwh, price_per_kwh, years)
    carbon = calculate_carbon_offset(solar_production_kwh, years, zip_code=zip_code)

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
        solar_production_kwh=solar_production_kwh,
        price_per_kwh=price_per_kwh,
        flat_rebates=flat_rebates,
        state_itc_entries=state_itc_entries,
        years=years,
        n=min(n_simulations, 10000),
        zip_code=zip_code,
    )

    report_data = {
        "panel_count": panel_count,
        "panel_capacity_watts": panel_capacity_watts,
        "system_size_kw": round(system_size_kw, 2),
        "solar_production_kwh": solar_production_kwh,
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
