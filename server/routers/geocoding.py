# Will call Google Geocoding API — converts address string to lat/lon
from fastapi import APIRouter

router = APIRouter()


@router.get("/geocode")
def get_geocode(address: str):
    return {"status": "ok", "data": None}
