# Will call DOE WINDExchange API — returns average wind speeds by location
from fastapi import APIRouter

router = APIRouter()


@router.get("/wind")
def get_wind(lat: float, lon: float):
    return {"status": "ok", "data": None}
