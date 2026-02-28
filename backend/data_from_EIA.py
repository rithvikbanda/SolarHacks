import requests
import sys
import os
from dotenv import load_dotenv

load_dotenv()
EIA_API_KEY = os.getenv("EIA_API_KEY")
if not EIA_API_KEY:
    raise ValueError("EIA_API_KEY is not set")

def get_price_and_usage(state_abbrev: str):
    """
    Returns a tuple (price_per_kwh, avg_kwh_per_household) for the given state.
    price_per_kwh is in dollars
    avg_kwh_per_household is in kWh/year
    """
    url = (
        "https://api.eia.gov/v2/electricity/retail-sales/data"
        f"?api_key={EIA_API_KEY}"
        "&data[]=price"
        "&data[]=sales"
        "&data[]=customers"
        f"&facets[sectorid][]=RES"
        f"&facets[stateid][]={state_abbrev.upper()}"
        "&frequency=annual"
        "&sort[0][column]=period"
        "&sort[0][direction]=desc"
        "&length=1"
    )

    try:
        resp = requests.get(url)
        resp.raise_for_status()
    except requests.RequestException as e:
        print("Error calling EIA API:", e)
        return None, None

    data = resp.json().get("response", {}).get("data", [])
    if not data:
        print(f"No data returned for state {state_abbrev}")
        return None, None

    latest = data[0]

    # Price in $/kWh
    price_cents = float(latest.get("price", 0))
    price_dollars = price_cents / 100.0

    # Average household usage in kWh
    sales_mwh = float(latest.get("sales", 0))
    customers = float(latest.get("customers", 0))
    if customers == 0:
        avg_kwh_per_household = None
    else:
        avg_kwh_per_household = (sales_mwh * 1000000) / customers

    return price_dollars, avg_kwh_per_household


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python price_and_usage.py <STATE_ABBREV>")
        sys.exit(1)

    state_code = sys.argv[1]
    price, usage = get_price_and_usage(state_code)

    if price is not None and usage is not None:
        print(f"State: {state_code.upper()}")
        print(f"Average residential electricity price: ${price:.4f}/kWh")
        print(f"Average household usage: {usage:,.0f} kWh/year")