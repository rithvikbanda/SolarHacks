from utils.constants import (
    COST_PER_WATT,
    PERMIT_COST,
    FEDERAL_ITC,
    DEFAULT_UTILITY_RATE,
    UTILITY_INFLATION,
    PANEL_DEGRADATION,
    DEFAULT_ANNUAL_KWH,
    CO2_LBS_PER_KWH,
)


def calculate_gross_cost(
    system_size_kw: float,
    cost_per_watt: float = COST_PER_WATT,
    permit_cost: float = PERMIT_COST,
) -> float:
    """System size * cost per watt + permit"""
    return system_size_kw * 1000 * cost_per_watt + permit_cost


def calculate_net_cost(
    gross_cost: float,
    state_rebate: float = 0,
    federal_itc: float = FEDERAL_ITC,
) -> float:
    """Gross cost minus federal ITC and state rebates"""
    return gross_cost * (1 - federal_itc) - state_rebate


def calculate_payback(
    net_cost: float,
    annual_kwh: float | None = None,
    price_per_kwh: float | None = None,
) -> float:
    """Net cost divided by first-year savings (simplified estimate)"""
    kwh = annual_kwh or DEFAULT_ANNUAL_KWH
    rate = price_per_kwh or DEFAULT_UTILITY_RATE
    annual_savings = kwh * rate
    if annual_savings == 0:
        return float('inf')
    return net_cost / annual_savings


def calculate_savings_over_time(
    net_cost: float,
    annual_kwh: float | None = None,
    price_per_kwh: float | None = None,
    years: int = 20,
    panel_degradation: float = PANEL_DEGRADATION,
    utility_inflation: float = UTILITY_INFLATION,
    production_multipliers: list[float] | None = None,
) -> list[dict]:
    """Year-by-year savings with inflation, degradation, and optional production variability"""
    kwh = annual_kwh or DEFAULT_ANNUAL_KWH
    rate = price_per_kwh or DEFAULT_UTILITY_RATE
    cumulative_savings = -net_cost
    results = []

    for year in range(1, years + 1):
        production = kwh * (1 - panel_degradation) ** year
        if production_multipliers is not None:
            production *= production_multipliers[year - 1]
        effective_rate = rate * (1 + utility_inflation) ** year
        annual_savings = production * effective_rate
        cumulative_savings += annual_savings
        results.append({"year": year, "annual_savings": annual_savings, "cumulative_savings": cumulative_savings})

    return results


def calculate_carbon_offset(
    annual_kwh: float | None = None,
    years: int = 20,
    panel_degradation: float = PANEL_DEGRADATION,
    production_multipliers: list[float] | None = None,
) -> float:
    """kWh production converted to CO2 tons offset"""
    kwh = annual_kwh or DEFAULT_ANNUAL_KWH
    total_kwh = 0.0
    for year in range(1, years + 1):
        production = kwh * (1 - panel_degradation) ** year
        if production_multipliers is not None:
            production *= production_multipliers[year - 1]
        total_kwh += production
    return round(total_kwh * CO2_LBS_PER_KWH / 2000, 2)
