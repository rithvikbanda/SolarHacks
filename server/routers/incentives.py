import os
import re
import sys
import json
import requests
from fastapi import APIRouter, HTTPException, Query
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

REWIRING_AMERICA_URL = "https://api.rewiringamerica.org/api/v1/calculator"


def _format_amount(value) -> str:
    """Turn API amount into display string (e.g. $1,200 or 15% up to $1,000)."""
    if value is None:
        return "—"
    if isinstance(value, dict):
        amt_type = value.get("type", "")
        number = value.get("number")
        maximum = value.get("maximum")
        if amt_type == "percent" and number is not None:
            pct = f"{int(number * 100)}%"
            return f"{pct} (up to ${int(maximum):,})" if maximum else pct
        if number is not None:
            return f"${int(number):,}" if number == int(number) else f"${number:,.2f}"
        return "—"
    if isinstance(value, str):
        try:
            value = float(value.replace(",", "").replace("$", "").strip())
        except (ValueError, TypeError):
            return value if value else "—"
    try:
        return f"${int(value):,}" if value == int(value) else f"${value:,.2f}"
    except (TypeError, ValueError):
        return str(value)


def _numeric_amount(value) -> float:
    """Extract numeric dollar value for total_value calculation."""
    if value is None:
        return 0.0
    if isinstance(value, dict):
        amt_type = value.get("type", "")
        if amt_type == "dollar_amount":
            return float(value.get("number") or 0)
        if amt_type == "percent" and value.get("maximum"):
            return float(value["maximum"])
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value.replace(",", "").replace("$", "").strip())
        except (ValueError, TypeError):
            return 0.0
    return 0.0


def _normalize_incentive(item: dict) -> dict:
    """Map Rewiring America fields to frontend shape: name, amount, type."""
    name = item.get("program") or item.get("short_description") or "Incentive"
    raw_amount = item.get("amount")
    amount = _format_amount(raw_amount)
    type_ = item.get("authority_type") or "federal"
    return {"name": name, "amount": amount, "type": type_}


@router.get("/incentives")
def get_incentives(
    zip: str = Query(..., description="5-digit zip code"),
    income: int | None = Query(None, description="Annual household income in dollars"),
    household_size: int = Query(default=2, alias="householdSize", description="Number of people in household"),
    filing_status: str = Query(default="single", alias="filingStatus", description="Tax filing status: single or married"),
    owners_or_renters: str = Query(default="homeowner", alias="ownersOrRenters", description="homeowner or renter"),
):
    if income is None:
        return {
            "incentives": [],
            "total_value": 0,
            "count": 0,
            "for_calculations": {"flat_rebates": 0, "state_itc_entries": []},
        }

    if not re.match(r"^\d{5}$", zip):
        raise HTTPException(status_code=400, detail="Invalid zip code format")

    api_key = os.getenv("REWIRING_AMERICA_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Rewiring America API key not configured")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    params = {
        "zip": zip,
        "household_income": income,
        "household_size": household_size,
        "tax_filing": filing_status,
        "owner_status": owners_or_renters,
    }

    try:
        response = requests.get(
            REWIRING_AMERICA_URL,
            headers=headers,
            params=params,
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()

        # Rewiring America may return incentives under different keys
        raw_list = (
            data.get("incentives")
            or data.get("rebates")
            or data.get("results")
            or []
        )
        if not isinstance(raw_list, list):
            raw_list = []

        incentives = [_normalize_incentive(i) for i in raw_list if isinstance(i, dict)]
        total_value = sum(
            _numeric_amount(i.get("amount") or i.get("value") or i.get("rebate") or i.get("max_value"))
            for i in raw_list if isinstance(i, dict)
        )

        SOLAR_ITEMS = {"rooftop_solar_installation", "battery_storage_installation"}

        flat_rebates = 0.0
        state_itc_entries = []
        for item in raw_list:
            if not isinstance(item, dict):
                continue
            item_tags = set(item.get("items") or [])
            if not item_tags & SOLAR_ITEMS:
                continue
            amt = item.get("amount")
            if not isinstance(amt, dict):
                continue
            amt_type = amt.get("type", "")
            authority = (item.get("authority_type") or "").lower()
            if amt_type == "dollar_amount" and authority != "federal":
                flat_rebates += float(amt.get("number") or 0)
            elif amt_type == "percent" and authority != "federal":
                entry = {"pct": float(amt.get("number") or 0)}
                if amt.get("maximum") is not None:
                    entry["cap"] = float(amt["maximum"])
                state_itc_entries.append(entry)

        return {
            "incentives": incentives,
            "total_value": int(total_value),
            "count": len(incentives),
            "for_calculations": {
                "flat_rebates": flat_rebates,
                "state_itc_entries": state_itc_entries,
            },
        }

    except requests.exceptions.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Rewiring America error: {str(e)}")
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Rewiring America request timed out")
    except requests.exceptions.ConnectionError:
        raise HTTPException(status_code=503, detail="Could not connect to Rewiring America")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python -m server.routers.incentives <ZIP> <INCOME> [HOUSEHOLD_SIZE]")
        sys.exit(1)

    zip_code = sys.argv[1]
    income = int(sys.argv[2])
    household_size = int(sys.argv[3]) if len(sys.argv) > 3 else 2

    try:
        result = get_incentives(zip_code, income, household_size, "single", "homeowner")
        print(json.dumps(result, indent=2))
    except HTTPException as e:
        print(f"Error {e.status_code}: {e.detail}")
        sys.exit(1)
