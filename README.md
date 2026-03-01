# SolarHacks

A web app that estimates a home's renewable energy potential — solar, wind, and geothermal — based on its address. Pulls real data from Google Solar, NREL, EIA, and more to generate cost projections, payback timelines, carbon impact, and available incentives.

Built for [SolarHacks 2025](https://solarhacks1.vercel.app/).

## What it does

1. User enters a home address (Google Places autocomplete)
2. Google Solar API loads roof imagery and building insights — the user can adjust panel count with a slider on the map
3. Clicking **Analyze** kicks off parallel backend calls to estimate solar production, wind feasibility, geothermal suitability, electricity rates, and carbon offset
4. A Monte Carlo simulation models 20-year savings under randomized inflation, degradation, and production variance
5. Results page shows:
   - Solar cost breakdown and payback period
   - AI-generated summary (GPT-4o)
   - Carbon offset with EPA equivalencies
   - 20-year savings fan chart
   - Panel count comparison
   - Wind and geothermal feasibility
   - IRA rebates and state/local incentives (after entering household income)
   - Financing estimates by credit score and loan term

## Tech stack

**Client** — React 18, Vite 5, Tailwind CSS, Recharts, Google Maps JS API

**Server** — Python / FastAPI / Uvicorn, NumPy, Matplotlib, OpenAI SDK

## Project structure

```
├── client/
│   └── src/
│       ├── components/     # React UI components (cards, charts, panels)
│       └── utils/          # GeoTIFF parsing + solar overlay rendering
│
└── server/
    ├── routers/            # FastAPI route handlers for each API endpoint
    ├── utils/              # cost calculations, Monte Carlo, carbon lookups
    └── tests/
```

## APIs used

| API | What for |
|-----|----------|
| [Google Solar API](https://developers.google.com/maps/documentation/solar) | Building insights, roof data layers, GeoTIFF flux maps |
| [Google Maps / Places](https://developers.google.com/maps) | Address autocomplete, map rendering |
| [EIA Open Data](https://www.eia.gov/opendata/) | State electricity prices and residential usage |
| [Rewiring America](https://www.rewiringamerica.org/app/ira-calculator) | IRA rebates, state/local incentives |
| [NREL Wind Toolkit](https://www.nrel.gov/grid/wind-toolkit.html) | Wind speed at 40m hub height |
| [Open-Meteo](https://open-meteo.com/) | Historical air + soil temps for geothermal suitability |
| [OpenAI](https://platform.openai.com/) | GPT-4o for generating a plain-English summary |

## Running locally

### Prerequisites

- Node.js 18+
- Python 3.10+
- API keys for Google Maps/Solar, EIA, NREL, Rewiring America, and OpenAI

### Server

```bash
cd server
pip install -r requirements.txt
```

Create `server/.env`:

```
EIA_API_KEY=your_key
REWIRING_AMERICA_API_KEY=your_key
NREL_API_KEY=your_key
GOOGLE_MAPS_API_KEY=your_key
OPENAI_API_KEY=your_key
```

```bash
uvicorn main:app --reload
```

Server runs on `http://localhost:8000`.

### Client

```bash
cd client
npm install
```

Create `client/.env`:

```
VITE_GOOGLE_MAPS_API_KEY=your_key
VITE_API_BASE_URL=http://localhost:8000
```

```bash
npm run dev
```

Client runs on `http://localhost:5173`.
