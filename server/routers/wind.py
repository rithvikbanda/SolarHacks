import os
import sys
import json
import statistics
import requests
from fastapi import APIRouter, HTTPException
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()

NREL_API_KEY = os.getenv("NREL_API_KEY")
WIND_URL = "https://developer.nrel.gov/api/wind-toolkit/v2/wind/wtk-srw-download"
HUB_HEIGHT = 40  # meters — lowest available in NREL Wind Toolkit, closest to residential

# (min_speed, label, feasible, message)
WIND_CLASSES = [
    (6.0, "Excellent", True,  "Strong wind resource. A small turbine would be highly productive here."),
    (5.0, "Good",      True,  "Good wind resource. A small turbine is likely economically viable."),
    (4.0, "Marginal",  False, "Marginal wind resource. Solar will deliver better returns at this location."),
    (0.0, "Poor",      False, "Low wind speeds. Wind is not recommended — focus on solar instead."),
]


def _classify(avg_speed_ms: float) -> tuple[str, bool, str]:
    for threshold, label, feasible, note in WIND_CLASSES:
        if avg_speed_ms >= threshold:
            return label, feasible, note
    return "Poor", False, "Low wind speeds. Wind is not recommended."


def _parse_srw(text: str) -> float:
    """
    Parse the NREL SRW format and return the annual average wind speed in m/s.
    SRW layout:
      Row 0: source / location metadata
      Row 1: city, state, country, lat, lon, elevation, timezone
      Row 2: column names  (Year, Month, Day, Hour, Minute, temperature, pressure, windspeed, winddirection)
      Row 3: units
      Rows 4+: hourly data
    """
    lines = text.strip().splitlines()

    # Find the header row — it contains "windspeed" or "wind speed"
    header_idx = None
    for i, line in enumerate(lines[:6]):
        if "windspeed" in line.lower() or "wind speed" in line.lower() or "speed" in line.lower():
            header_idx = i
            break

    if header_idx is None:
        raise ValueError("Could not locate wind speed column header in SRW response")

    headers = [h.strip().lower() for h in lines[header_idx].split(",")]
    speed_col = next((i for i, h in enumerate(headers) if "speed" in h), None)
    if speed_col is None:
        raise ValueError(f"No speed column found in header: {headers}")

    speeds = []
    for row in lines[header_idx + 2:]:  # +2 to skip header and units row
        cols = row.split(",")
        if len(cols) > speed_col:
            try:
                speeds.append(float(cols[speed_col]))
            except ValueError:
                continue

    if not speeds:
        raise ValueError("No wind speed data rows parsed from SRW file")

    return statistics.mean(speeds)


@router.get("/wind")
def get_wind(lat: float, lon: float):
    """
    Returns wind feasibility for a location using NREL Wind Toolkit data.
    Hub height is 30m (standard residential turbine).
    Feasible if annual average wind speed >= 5 m/s.
    """
    if not NREL_API_KEY:
        raise HTTPException(status_code=500, detail="NREL_API_KEY is not configured")

    try:
        resp = requests.get(
            WIND_URL,
            params={
                "api_key": NREL_API_KEY,
                "lat": lat,
                "lon": lon,
                "hubheight": HUB_HEIGHT,
                "year": 2012,
                "utc": "false",
            },
            timeout=20,
        )
        resp.raise_for_status()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"NREL Wind API error: {e}")

    try:
        avg_speed = _parse_srw(resp.text)
    except ValueError as e:
        raise HTTPException(status_code=502, detail=f"Failed to parse wind data: {e}")

    label, feasible, note = _classify(avg_speed)

    return {
        "status": "ok",
        "data": {
            "avg_wind_speed_ms": round(avg_speed, 2),
            "hub_height_m": HUB_HEIGHT,
            "classification": label,
            "feasible": feasible,
            "note": note,
        },
    }


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python -m server.routers.wind <LAT> <LON>")
        sys.exit(1)

    lat = float(sys.argv[1])
    lon = float(sys.argv[2])

    try:
        result = get_wind(lat, lon)
        print(json.dumps(result, indent=2))
    except HTTPException as e:
        print(f"Error {e.status_code}: {e.detail}")
        sys.exit(1)
