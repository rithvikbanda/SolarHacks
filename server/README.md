# Home Energy Roadmap — Backend

Python FastAPI server. Implements the API contract used by `client/src/api.js`.

## Setup

```bash
cd server
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # add your API keys when ready
```

## Run

From the `server` directory, **use the venv** (otherwise you may get "No module named 'fastapi'"):

```bash
source venv/bin/activate   # Windows: venv\Scripts\activate
uvicorn main:app --reload --port 3001
```

Or without activating the venv:

```bash
./venv/bin/python -m uvicorn main:app --reload --port 3001
```

API: http://localhost:3001 — interactive docs: http://localhost:3001/docs

## Tests

Run from the **project root** (SolarHacks), using the server venv so FastAPI and pytest are available:

```bash
cd /path/to/SolarHacks
server/venv/bin/python -m pytest server/tests -v
```

Or activate the venv first, then run pytest:

```bash
cd server
source venv/bin/activate
cd ..
pytest server/tests -v
```

If you see `ModuleNotFoundError: No module named 'fastapi'`, you're not using the server venv — use one of the commands above.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/geocode?address=` | Geocode address → lat, lon, zip |
| GET | `/api/solar?lat=&lon=` | Solar potential + payback + savings curve |
| GET | `/api/rates?lat=&lon=` | Utility $/kWh |
| GET | `/api/incentives?zip=` | Rebates (optional: income, householdSize) |
| GET | `/api/wind?lat=&lon=` | Wind feasibility |

Replace mock logic in `main.py` with calls to NREL, Rewiring America, and Google (see TODOs and root README).
