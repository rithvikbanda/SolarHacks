from fastapi import APIRouter, Body

from utils.monte_carlo import run_simulation

router = APIRouter()


@router.post("/simulate")
def simulate(
    system_size_kw: float,
    solar_production_kwh: float | None = None,
    price_per_kwh: float | None = None,
    flat_rebates: float = 0,
    state_itc_entries: list[dict] | None = Body(default=None),
    years: int = 20,
    n_simulations: int = 1000,
):
    return run_simulation(
        system_size_kw=system_size_kw,
        solar_production_kwh=solar_production_kwh,
        price_per_kwh=price_per_kwh,
        flat_rebates=flat_rebates,
        state_itc_entries=state_itc_entries,
        years=years,
        n=min(n_simulations, 10000),
    )
