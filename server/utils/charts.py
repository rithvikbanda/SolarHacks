import io
import base64
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns


def plot_savings_fan_chart(report: dict) -> str:
    """Cumulative savings over time with Monte Carlo confidence bands.
    Returns a base64-encoded PNG string."""
    sim = report["simulation"]
    det = report["deterministic"]

    years = list(range(1, sim["years"] + 1))
    pcts = sim["savings_by_year"]["percentiles"]
    det_savings = [s["cumulative_savings"] for s in det["savings_by_year"]]

    sns.set_theme(style="darkgrid")
    fig, ax = plt.subplots(figsize=(10, 6))

    ax.fill_between(years, pcts["5"], pcts["95"], alpha=0.15, color="green", label="P5–P95")
    ax.fill_between(years, pcts["25"], pcts["75"], alpha=0.3, color="green", label="P25–P75")
    ax.plot(years, pcts["50"], color="green", linewidth=2, label="Median (MC)")
    ax.plot(years, det_savings, color="white", linewidth=1.5, linestyle="--", label="Deterministic")
    ax.axhline(0, color="gray", linewidth=0.8, linestyle=":")

    ax.set_xlabel("Year")
    ax.set_ylabel("Cumulative Savings ($)")
    ax.set_title("20-Year Savings Projection with Uncertainty")
    ax.legend()
    plt.tight_layout()

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150)
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode()


def print_report(report: dict) -> None:
    """Print each section of the report to console."""
    print("=" * 60)
    print("ENERGY REPORT")
    print("=" * 60)

    solar = report.get("solar")
    if solar:
        print(f"\n--- Solar (EIA) ---")
        print(f"  Electricity price:    ${solar['price_per_kwh']:.4f}/kWh")
        print(f"  Avg household usage:  {solar['annual_usage_kwh']:,.0f} kWh/yr")
    else:
        print("\n--- Solar (EIA) --- unavailable, using defaults")

    incentives = report.get("incentives")
    if incentives:
        print(f"\n--- Incentives ---")
        print(f"  Programs found: {incentives['count']}")
        print(f"  Total value:    ${incentives['total_value']:,.0f}")
    else:
        print("\n--- Incentives --- unavailable")

    wind = report.get("wind")
    if wind:
        print(f"\n--- Wind ---")
        print(f"  Avg speed:       {wind['avg_wind_speed_ms']} m/s")
        print(f"  Classification:  {wind['classification']}")
        print(f"  Feasible:        {wind['feasible']}")
    else:
        print("\n--- Wind --- unavailable")

    geo = report.get("geothermal")
    if geo:
        print(f"\n--- Geothermal ---")
        print(f"  Score:       {geo.get('score')}/5 ({geo.get('suitability')})")
        print(f"  Climate:     {geo.get('climate_zone')}")
        print(f"  HDD / CDD:  {geo.get('heating_degree_days')} / {geo.get('cooling_degree_days')}")
    else:
        print("\n--- Geothermal --- unavailable")

    det = report.get("deterministic", {})
    print(f"\n--- Deterministic Estimates ---")
    print(f"  Gross cost:       ${det.get('gross_cost', 0):>10,.2f}")
    print(f"  Net cost:         ${det.get('net_cost', 0):>10,.2f}")
    print(f"  Payback:          {det.get('payback_years', '?')} years")
    print(f"  Carbon offset:    {det.get('carbon_offset_tons', '?')} tons (20yr)")

    sim = report.get("simulation", {})
    if sim:
        print(f"\n--- Monte Carlo ({sim.get('n_simulations', '?')} runs) ---")
        for key in ["net_cost", "payback_years", "total_savings_20yr", "carbon_offset_tons"]:
            s = sim.get(key, {})
            p = s.get("percentiles", {})
            print(f"  {key}:")
            print(f"    mean={s.get('mean')}  std={s.get('std')}")
            print(f"    P5={p.get('5')}  P25={p.get('25')}  P50={p.get('50')}  P75={p.get('75')}  P95={p.get('95')}")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    from server.utils.calculations import (
        calculate_gross_cost,
        calculate_net_cost,
        calculate_payback,
        calculate_savings_over_time,
        calculate_carbon_offset,
    )
    from server.utils.monte_carlo import run_simulation

    system_size_kw = 8.0
    solar_production_kwh = 10000.0
    gross = calculate_gross_cost(system_size_kw)
    net = calculate_net_cost(gross)
    payback = calculate_payback(net, solar_production_kwh)
    savings = calculate_savings_over_time(net, solar_production_kwh)
    carbon = calculate_carbon_offset(solar_production_kwh)
    simulation = run_simulation(system_size_kw=system_size_kw, solar_production_kwh=solar_production_kwh, seed=42)

    sample_report = {
        "solar": {"price_per_kwh": 0.16, "annual_usage_kwh": 10500},
        "incentives": {"incentives": [], "total_value": 0, "count": 0},
        "wind": {
            "avg_wind_speed_ms": 4.2,
            "feasible": False,
            "classification": "Marginal",
            "note": "Marginal wind resource.",
        },
        "geothermal": {
            "score": 4,
            "suitability": "Good",
            "climate_zone": "Mixed",
            "heating_degree_days": 1800,
            "cooling_degree_days": 600,
        },
        "deterministic": {
            "gross_cost": round(gross, 2),
            "net_cost": round(net, 2),
            "payback_years": round(payback, 1),
            "savings_by_year": savings,
            "carbon_offset_tons": carbon,
        },
        "simulation": simulation,
    }

    print_report(sample_report)

    b64 = plot_savings_fan_chart(sample_report)
    print(f"\nChart base64 length: {len(b64)} chars")

    from PIL import Image
    img = Image.open(io.BytesIO(base64.b64decode(b64)))
    img.show()
