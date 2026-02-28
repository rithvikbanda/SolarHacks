# Will call NREL PVWatts API — returns annual kWh production based on lat/lon
from fastapi import APIRouter

router = APIRouter()


@router.get("/solar")
def get_solar(lat: float, lon: float):
    return {"status": "ok", "data": None}
