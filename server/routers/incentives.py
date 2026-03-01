import os
import re
import requests
from fastapi import APIRouter, HTTPException, Query
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

REWIRING_AMERICA_URL = "https://api.rewiringamerica.org/api/v1/calculator"


def _format_amount(value) -> str:
    """Turn API amount into display string (e.g. $1,200)."""
    if value is None:
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
    """Extract numeric value for total_value calculation."""
    if value is None:
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
    """Map Rewiring America (or similar) fields to frontend shape: name, amount, type."""
    name = (
        item.get("name")
        or item.get("title")
        or item.get("label")
        or item.get("program_name")
        or "Incentive"
    )
    raw_amount = item.get("amount") or item.get("value") or item.get("rebate") or item.get("max_value")
    amount = _format_amount(raw_amount)
    type_ = (
        item.get("type")
        or item.get("category")
        or item.get("incentive_type")
        or item.get("level")  # e.g. federal, state, utility
        or "Federal"
    )
    return {"name": name, "amount": amount, "type": type_}


@router.get("/incentives")
def get_incentives(
    zip: str = Query(..., description="5-digit zip code"),
    income: int | None = Query(None, description="Annual household income in dollars"),
    household_size: int = Query(default=2, alias="householdSize", description="Number of people in household"),
    filing_status: str = Query(default="single", alias="filingStatus", description="Tax filing status: single or married"),
    owners_or_renters: str = Query(default="owner", alias="ownersOrRenters", description="owner or renter"),
):
    if income is None:
        return {"incentives": [], "total_value": 0, "count": 0}

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
        "income": income,
        "household_size": household_size,
        "filing_status": filing_status,
        "owners_or_renters": owners_or_renters,
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

        # Normalize for frontend: { name, amount (display string), type }
        incentives = [_normalize_incentive(i) for i in raw_list if isinstance(i, dict)]
        total_value = sum(
            _numeric_amount(i.get("amount") or i.get("value") or i.get("rebate") or i.get("max_value"))
            for i in raw_list if isinstance(i, dict)
        )

        return {
            "incentives": incentives,
            "total_value": int(total_value),
            "count": len(incentives),
        }

    except requests.exceptions.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Rewiring America error: {str(e)}")
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Rewiring America request timed out")
    except requests.exceptions.ConnectionError:
        raise HTTPException(status_code=503, detail="Could not connect to Rewiring America")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
