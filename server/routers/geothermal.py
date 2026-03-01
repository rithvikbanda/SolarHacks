import datetime
import requests
from fastapi import APIRouter, HTTPException

router = APIRouter()

OPEN_METEO_URL = "https://archive-api.open-meteo.com/v1/archive"
BASE_TEMP_C = 18.3  # 65°F — standard HDD/CDD base temperature

# Shallow soil temps (0–7 cm, 7–28 cm) approximate what horizontal ground loops exchange with.
# Deeper loops (vertical boreholes) see temps closer to annual mean air with less seasonal swing.
SOIL_DEPTH_LABELS = {
    "0_7cm": "Shallow (0–7 cm) — typical horizontal loop zone",
    "7_28cm": "Shallow-mid (7–28 cm) — horizontal/slinky loops",
}

# Classified by annual Heating Degree Days (Celsius base 18.3°C / 65°F).
# Thresholds aligned with DOE climate zone definitions (HDD°F converted to HDD°C via ×5/9):
#   Subarctic  ≥ 12,600 HDD°F → 7,000 HDD°C
#   Very Cold  ≥  9,000 HDD°F → 5,000 HDD°C
#   Cold       ≥  5,400 HDD°F → 3,000 HDD°C
#   Mixed      ≥  2,700 HDD°F → 1,500 HDD°C
#   Warm       ≥    900 HDD°F →   500 HDD°C
# Score does not penalize cooling-heavy climates — GSHP is effective for cooling too.
# (min_hdd, zone_name, score_out_of_5, savings_low_pct, savings_high_pct, note)
ZONE_TABLE = [
    (7000, "Subarctic", 5, 45, 60,
     "Extreme heating season; GSHP can be very compelling if electricity isn't very expensive."),
    (5000, "Very Cold", 5, 45, 60,
     "Very strong heating load; GSHP avoids low-temp ASHP efficiency drop."),
    (3000, "Cold",      5, 40, 55,
     "Long heating season; often a strong fit."),
    (1500, "Mixed",     4, 30, 50,
     "Balanced heating/cooling; good fit when replacing AC+furnace."),
    (500,  "Warm",      4, 25, 45,
     "Cooling-heavy areas can still benefit; consider loop temps & humidity."),
    (0,    "Hot",       4, 25, 45,
     "Cooling-dominated; GSHP can outperform ASHP where summers are harsh."),
]

SCORE_LABELS = {5: "Excellent", 4: "Good", 3: "Moderate", 2: "Fair", 1: "Low"}


def _classify(hdd: float) -> tuple:
    for threshold, zone, score, low, high, note in ZONE_TABLE:
        if hdd >= threshold:
            return zone, score, low, high, note
    return ZONE_TABLE[-1][1:]


def _soil_note(mean_0_7: float | None, mean_7_28: float | None) -> str:
    """Short note on how soil temperature affects GSHP (cooling vs heating)."""
    if mean_0_7 is None and mean_7_28 is None:
        return (
            "Suitability based on air temperature and heating/cooling load only. "
            "Soil temperature data was not available for this location; consider a site assessment for ground temps and thermal conductivity."
        )
    mean = (mean_0_7 or mean_7_28) or (mean_7_28 or mean_0_7)
    if mean > 22:
        return (
            "Shallow ground is relatively warm — cooling may be slightly less efficient than in cooler soils; "
            "heating efficiency is good. Actual performance depends on soil type and thermal conductivity."
        )
    if mean < 8:
        return (
            "Shallow ground is cool — heating efficiency is strong; cooling is efficient. "
            "Soil type and thermal conductivity will affect actual capacity."
        )
    return (
        "Shallow ground temperatures are in a favorable range for both heating and cooling. "
        "For accurate sizing, a site assessment (soil type, thermal conductivity) is recommended."
    )


@router.get("/geothermal")
def get_geothermal(lat: float, lon: float):
    """
    Returns geothermal (GSHP) suitability for a location.
    Uses Open-Meteo archive: (1) daily air temperature for HDD/CDD and climate zone,
    (2) hourly soil temperature (0–7 cm, 7–28 cm) when available for ground-heat context.
    Does not include soil type or thermal conductivity; those require a site assessment.
    """
    year = datetime.date.today().year - 1
    start_date = f"{year}-01-01"
    end_date = f"{year}-12-31"

    # Request both daily air temp and hourly soil temps (ERA5-Land has soil; IFS may for recent years).
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start_date,
        "end_date": end_date,
        "timezone": "auto",
        "daily": "temperature_2m_mean,soil_temperature_0_to_7cm_mean,soil_temperature_7_to_28cm_mean",
        "model": "era5_land",
    }

    try:
        resp = requests.get(OPEN_METEO_URL, params=params, timeout=15)
        resp.raise_for_status()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Open-Meteo API error: {e}")

    data = resp.json()
    daily = data.get("daily", {})

    # Air temperature: HDD, CDD, climate zone (unchanged logic)
    temps = daily.get("temperature_2m_mean", [])
    valid = [t for t in temps if t is not None]
    if not valid:
        raise HTTPException(status_code=502, detail="No temperature data returned from Open-Meteo")

    hdd = sum(max(0.0, BASE_TEMP_C - t) for t in valid)
    cdd = sum(max(0.0, t - BASE_TEMP_C) for t in valid)
    annual_mean_air_c = sum(valid) / len(valid)

    zone, score, savings_low, savings_high, note = _classify(hdd)

    # Soil temperature: annual mean and optional seasonal amplitude (stability)
    soil_0_7 = daily.get("soil_temperature_0_to_7cm_mean") or []
    soil_7_28 = daily.get("soil_temperature_7_to_28cm_mean") or []
    valid_0_7 = [t for t in soil_0_7 if t is not None]
    valid_7_28 = [t for t in soil_7_28 if t is not None]

    mean_soil_0_7_c = round(sum(valid_0_7) / len(valid_0_7), 1) if valid_0_7 else None
    mean_soil_7_28_c = round(sum(valid_7_28) / len(valid_7_28), 1) if valid_7_28 else None

    # Seasonal amplitude (max - min) — lower = more stable, often better for consistent GSHP performance
    amp_0_7 = round(max(valid_0_7) - min(valid_0_7), 1) if len(valid_0_7) > 1 else None
    amp_7_28 = round(max(valid_7_28) - min(valid_7_28), 1) if len(valid_7_28) > 1 else None

    soil_note = _soil_note(mean_soil_0_7_c, mean_soil_7_28_c)

    # Build response: keep existing fields, add soil and caveats
    payload = {
        "score": score,
        "suitability": SCORE_LABELS[score],
        "climate_zone": zone,
        "annual_mean_temp_c": round(annual_mean_air_c, 1),
        "heating_degree_days": round(hdd),
        "cooling_degree_days": round(cdd),
        "hvac_savings_pct_low": savings_low,
        "hvac_savings_pct_high": savings_high,
        "note": note,
        "soil_note": soil_note,
        "caveat": (
            "Based on reanalysis (ERA5-Land/IFS). Actual site may vary with soil type, moisture, "
            "and thermal conductivity. For final design and sizing, consider a site assessment."
        ),
    }

    if mean_soil_0_7_c is not None:
        payload["soil_temperature_0_7cm_mean_c"] = mean_soil_0_7_c
        if amp_0_7 is not None:
            payload["soil_temperature_0_7cm_seasonal_amplitude_c"] = amp_0_7
    if mean_soil_7_28_c is not None:
        payload["soil_temperature_7_28cm_mean_c"] = mean_soil_7_28_c
        if amp_7_28 is not None:
            payload["soil_temperature_7_28cm_seasonal_amplitude_c"] = amp_7_28

    return {"status": "ok", "data": payload}
