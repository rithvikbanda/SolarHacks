from fastapi import APIRouter

from utils.monte_carlo import run_simulation

router = APIRouter()


@router.get("/simulate")
def simulate(
    system_size_kw: float,
    annual_kwh: float | None = None,
    price_per_kwh: float | None = None,
    flat_rebates: float = 0,
    years: int = 20,
    n_simulations: int = 1000,
):
    return run_simulation(
        system_size_kw=system_size_kw,
        annual_kwh=annual_kwh,
        price_per_kwh=price_per_kwh,
        flat_rebates=flat_rebates,
        years=years,
        n=min(n_simulations, 10000),
    )
