import numpy as np

from utils.calculations import (
    calculate_gross_cost,
    calculate_net_cost,
    calculate_savings_over_time,
    calculate_carbon_offset,
)
from utils.constants import DEFAULT_UTILITY_RATE, DEFAULT_ANNUAL_KWH

DEFAULT_N = 1000

DISTRIBUTIONS = {
    "utility_inflation":      {"mean": 0.025, "std": 0.01,  "clip_min": 0.0},
    "panel_degradation":      {"mean": 0.005, "std": 0.001, "clip_min": 0.0},
    "cost_overrun_pct":       {"mean": 0.00,  "std": 0.05},
    "production_variability": {"mean": 1.0,   "std": 0.07,  "clip_min": 0.5},
}


def _sample(rng: np.random.Generator, dist: dict, shape: tuple) -> np.ndarray:
    values = rng.normal(dist["mean"], dist["std"], shape)
    if "clip_min" in dist:
        np.clip(values, dist["clip_min"], None, out=values)
    return values


def _summarize(arr: np.ndarray) -> dict:
    pcts = [5, 25, 50, 75, 95]
    return {
        "mean": round(float(np.mean(arr)), 2),
        "std": round(float(np.std(arr)), 2),
        "percentiles": {
            str(p): round(float(np.percentile(arr, p)), 2) for p in pcts
        },
    }


def run_simulation(
    system_size_kw: float,
    annual_kwh: float | None = None,
    price_per_kwh: float | None = None,
    flat_rebates: float = 0,
    state_itc_entries: list[dict] | None = None,
    years: int = 20,
    n: int = DEFAULT_N,
    seed: int | None = None,
) -> dict:
    rng = np.random.default_rng(seed)
    kwh = annual_kwh or DEFAULT_ANNUAL_KWH
    rate = price_per_kwh or DEFAULT_UTILITY_RATE

    inflation_samples = _sample(rng, DISTRIBUTIONS["utility_inflation"], (n,))
    degradation_samples = _sample(rng, DISTRIBUTIONS["panel_degradation"], (n,))
    overrun_samples = _sample(rng, DISTRIBUTIONS["cost_overrun_pct"], (n,))
    prod_mult_samples = _sample(rng, DISTRIBUTIONS["production_variability"], (n, years))

    gross = calculate_gross_cost(system_size_kw)

    all_net_costs = np.empty(n)
    all_payback = np.empty(n)
    all_carbon = np.empty(n)
    all_cumulative = np.empty((n, years))

    for i in range(n):
        gross_with_overrun = gross * (1 + float(overrun_samples[i]))
        net = calculate_net_cost(gross_with_overrun, flat_rebates, state_itc_entries=state_itc_entries)

        prod_mults = prod_mult_samples[i].tolist()

        savings = calculate_savings_over_time(
            net, kwh, rate, years,
            panel_degradation=float(degradation_samples[i]),
            utility_inflation=float(inflation_samples[i]),
            production_multipliers=prod_mults,
        )

        carbon = calculate_carbon_offset(
            kwh, years,
            panel_degradation=float(degradation_samples[i]),
            production_multipliers=prod_mults,
        )

        all_net_costs[i] = net
        all_carbon[i] = carbon

        for j, s in enumerate(savings):
            all_cumulative[i, j] = s['cumulative_savings']

        payback = next(
            (s['year'] for s in savings if s['cumulative_savings'] >= 0),
            years + 1,
        )
        all_payback[i] = payback

    pcts = [5, 25, 50, 75, 95]

    return {
        "n_simulations": n,
        "years": years,
        "net_cost": _summarize(all_net_costs),
        "payback_years": _summarize(all_payback),
        "total_savings_20yr": _summarize(all_cumulative[:, -1]),
        "carbon_offset_tons": _summarize(all_carbon),
        "savings_by_year": {
            "percentiles": {
                str(p): [round(float(v), 2) for v in np.percentile(all_cumulative, p, axis=0)]
                for p in pcts
            },
            "mean": [round(float(v), 2) for v in np.mean(all_cumulative, axis=0)],
        },
    }
