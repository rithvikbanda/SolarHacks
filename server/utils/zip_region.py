"""Load zip-to-region mapping from CSV using numpy."""
import numpy as np
from pathlib import Path

REGION_CO2_LBS_PER_MWH = {
    "AKGD": 899.633,
    "AKMS": 520.483,
    "AZNM": 703.703,
    "CAMX": 428.464,
    "ERCT": 733.862,
    "FRCC": 782.262,
    "HIMS": 1123.37,
    "HIOA": 1489.55,
    "MROE": 1397.31,
    "MROW": 920.13,
    "NEWE": 539.275,
    "NWPP": 631.735,
    "NYCW": 864.469,
    "NYLI": 1180.67,
    "NYUP": 242.089,
    "PRMS": 1543.07,
    "RFCE": 596.904,
    "RFCM": 970.617,
    "RFCW": 911.424,
    "RMPA": 1036.60,
    "SPNO": 861.999,
    "SPSO": 872.042,
    "SRMV": 739.72,
    "SRMW": 1239.84,
    "SRSO": 842.329,
    "SRTV": 898.079,
    "SRVC": 593.419,
}

_CSV_PATH = Path(__file__).resolve().parent / "zipToRegion.csv"

_zip_region_array = np.loadtxt(
    _CSV_PATH,
    delimiter=",",
    dtype=str,
    skiprows=1,
)

zips = _zip_region_array[:, 0]
regions = _zip_region_array[:, 1]


def get_region(zip_code: str) -> str | None:
    """Return eGRID region for a given zip code, or None if not found."""
    zip_str = str(zip_code).zfill(5)
    idx = np.where(zips == zip_str)[0]
    if idx.size == 0:
        return None
    return regions[idx[0]]


def get_co2_emissions_lbs_mwh(zip_code: str) -> float | None:
    """Return CO2 emissions in lbs/MWh for a given zip code."""
    region = get_region(zip_code)
    if region is None:
        return None
    return REGION_CO2_LBS_PER_MWH.get(region)


def load_zip_to_region(path: str | Path | None = None) -> np.ndarray:
    """Load zipToRegion CSV as a string array (N, 2). Optional custom path."""
    p = path if path is not None else _CSV_PATH
    return np.loadtxt(p, delimiter=",", dtype=str, skiprows=1)
