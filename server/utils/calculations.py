from server.utils.constants import (
    COST_PER_WATT,
    PERMIT_COST,
    FEDERAL_ITC,
    DEFAULT_UTILITY_RATE,
    UTILITY_INFLATION,
    PANEL_DEGRADATION,
    DEFAULT_ANNUAL_KWH,
)

def calculate_gross_cost(system_size_kw: float):
    """System size * cost per watt + permit"""
    return system_size_kw * 1000 * COST_PER_WATT + PERMIT_COST



def calculate_net_cost(gross_cost: float):
    """Gross cost minus federal ITC and state rebates"""
    #return gross_cost - (gross_cost * FEDERAL_ITC)
    return None # TODO: waiting for state rebates and incentives format


def calculate_payback(net_cost: float, annual_kwh: float, price_per_kwh: float):
    """Net cost divided by annual savings"""
    kwh = annual_kwh or DEFAULT_ANNUAL_KWH
    rate = price_per_kwh or DEFAULT_UTILITY_RATE
    annual_savings = kwh * rate
    if annual_savings == 0:
        return float('inf')
    return net_cost / annual_savings


def calculate_savings_over_time(net_cost: float, annual_kwh: float, price_per_kwh: float, years: int = 20):
    """20 year savings with inflation + degradation"""
    kwh = annual_kwh or DEFAULT_ANNUAL_KWH
    rate = price_per_kwh or DEFAULT_UTILITY_RATE
    cumulative_savings = -net_cost
    results = []

    for year in range(1, years + 1):
        production = kwh * (1 - PANEL_DEGRADATION) ** (year - 1)
        effective_rate = rate * (1 + UTILITY_INFLATION) ** (year - 1)
        annual_savings = production * effective_rate
        cumulative_savings += annual_savings
        results.append({"year": year, "annual_savings": annual_savings, "cumulative_savings": cumulative_savings})

    return results


def calculate_carbon_offset(annual_kwh: float, years: int = 20):
    """kWh production converted to CO2 tons offset"""
    kwh = annual_kwh or DEFAULT_ANNUAL_KWH
    total_kwh = sum(kwh * (1 - PANEL_DEGRADATION) ** (year - 1) for year in range(1, years + 1))
    return round(total_kwh * CO2_LBS_PER_KWH / 2000, 2)
