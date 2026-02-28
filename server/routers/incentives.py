# Will call Rewiring America API — returns federal and state rebates by zip code
from fastapi import APIRouter

router = APIRouter()


@router.get("/incentives")
def get_incentives(zip: str, income: int):
    return {"status": "ok", "data": None}
