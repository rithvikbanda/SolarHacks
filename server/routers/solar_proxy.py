import os
import requests
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import Response
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

SOLAR_BASE = "https://solar.googleapis.com/v1"


def _api_key():
    key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not key:
        raise HTTPException(status_code=500, detail="GOOGLE_MAPS_API_KEY not configured")
    return key


@router.get("/solar/building-insights")
async def proxy_building_insights(req: Request):
    params = dict(req.query_params)
    params["key"] = _api_key()
    resp = requests.get(f"{SOLAR_BASE}/buildingInsights:findClosest", params=params, timeout=10)
    return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")


@router.get("/solar/data-layers")
async def proxy_data_layers(req: Request):
    params = dict(req.query_params)
    params["key"] = _api_key()
    resp = requests.get(f"{SOLAR_BASE}/dataLayers:get", params=params, timeout=15)
    return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")


@router.get("/solar/geotiff")
async def proxy_geotiff(url: str = Query(...)):
    key = _api_key()
    fetch_url = f"{url}&key={key}" if "?" in url else f"{url}?key={key}"
    resp = requests.get(fetch_url, timeout=30)
    if not resp.ok:
        raise HTTPException(status_code=resp.status_code, detail="GeoTIFF fetch failed")
    return Response(
        content=resp.content,
        status_code=200,
        media_type="image/tiff",
        headers={"Cache-Control": "public, max-age=3600"},
    )
