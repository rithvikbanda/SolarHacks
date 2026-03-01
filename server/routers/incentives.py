import os
import requests
from fastapi import APIRouter, HTTPException, Query
from dotenv import load_dotenv
import re

load_dotenv()

router = APIRouter()

REWIRING_AMERICA_URL = "https://api.rewiringamerica.org/api/v1/calculator"


@router.get("/api/incentives")
def get_incentives(
    zip: str = Query(..., description="5-digit zip code"),
    income: int | None = Query(None, description="Annual household income in dollars"),
    household_size: int = Query(default=2, alias="householdSize", description="Number of people in household"),
    filing_status: str = Query(default="single", alias="filingStatus", description="Tax filing status: single or married"),
    owners_or_renters: str = Query(default="owner", alias="ownersOrRenters", description="owner or renter"),
):
    if income is None: # Check if income is provided
        return {"incentives": [], "total_value": 0, "count": 0}

    if not re.match(r'^\d{5}$', zip): # Check if zip code valid
        raise HTTPException(status_code=400, detail="Invalid zip code format")
    
    api_key = os.getenv("REWIRING_AMERICA_API_KEY")

    if not api_key: # Check if API key is configured
        raise HTTPException(status_code=500, detail="Rewiring America API key not configured")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
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
            timeout=10
        )
        response.raise_for_status()
        data = response.json()

        # Parse and clean up the response for the frontend
        incentives = data.get("incentives", [])

        # Calculate total incentive value
        total_value = sum(i.get("amount", 0) for i in incentives)

        return {
            "incentives": incentives,
            "total_value": total_value,
            "count": len(incentives)
        }

    except requests.exceptions.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Rewiring America error: {str(e)}")
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Rewiring America request timed out")
    except requests.exceptions.ConnectionError:
        raise HTTPException(status_code=503, detail="Could not connect to Rewiring America")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
