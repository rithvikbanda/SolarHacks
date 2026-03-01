# Home Energy Roadmap

Full-stack app that scores a home's renewable potential, estimates payback with Monte Carlo simulation, and surfaces every federal/state incentive the homeowner qualifies for.

## Stack

- **Frontend:** React 18, Vite, Tailwind, Recharts
- **Backend:** Python, FastAPI
- **APIs:** Google Solar, EIA, Rewiring America, NREL Wind Toolkit, Open-Meteo

## Setup

```bash
# server
cd server
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# client
cd ../client
npm install
```

`server/.env`:
```
EIA_API_KEY=
REWIRING_AMERICA_API_KEY=
NREL_API_KEY=
GOOGLE_MAPS_API_KEY=
```

`client/.env`:
```
VITE_GOOGLE_MAPS_API_KEY=
VITE_API_BASE_URL=
```

## Run

```bash
# backend
cd server && source venv/bin/activate
uvicorn main:app --reload --port 8000

# frontend
cd client
npm run dev
```

## License

MIT
