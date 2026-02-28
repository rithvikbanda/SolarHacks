# Will call NREL Climate Zone API — returns geothermal suitability score by location
from fastapi import APIRouter

router = APIRouter()


@router.get("/geothermal")
def get_geothermal(lat: float, lon: float):
    return {"status": "ok", "data": None}
