# 🌱 Home Energy Roadmap

> A neutral, 30-second home energy audit that tells homeowners exactly what renewable technology makes sense for their property — ranked by payback period — and every government incentive they qualify for.

---

## 🧠 The Problem

Homeowners want to go green but are paralyzed by complexity. There are dozens of options, confusing tax laws, and every tool online is either incomplete or trying to sell you something.

- Google Project Sunroof → solar only, no incentives or geothermal
- EnergySage → pushes sales quotes, not neutral advice
- Rewiring America Calculator → incentives only, no energy potential

**Home Energy Roadmap is the only tool that combines all three into a single, unbiased roadmap.**

---

## ✨ What It Does

Enter any US address and instantly get:

- ☀️ **Solar Potential Score** — annual kWh output + estimated system cost + payback period
- 🌍 **Geothermal Suitability Score** — based on local climate zone and soil conductivity
- 💨 **Wind Feasibility Check** — honest recommendation based on actual wind speeds
- 💰 **Government Incentives** — every federal and state rebate you qualify for
- 📈 **Savings Over Time Graph** — 20-year view showing your break-even point

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React (Vite) + Tailwind CSS |
| Backend | Node.js + Express |
| Charts | Recharts |
| Address Search | Google Maps Autocomplete |
| HTTP Client | Axios |

---

## 🔌 APIs Used

### NREL PVWatts
- **What it does:** Simulates annual solar electricity production for any location based on roof specs, local weather, and sun hours
- **Used for:** Solar potential score, kWh output, payback period, savings graph
- **Auth:** API key as query param
- **Rate limit:** 1,000 requests/day (free)
- **Docs:** https://developer.nrel.gov/docs/solar/pvwatts/v6/

### NREL Utility Rates
- **What it does:** Returns the local utility company's residential $/kWh rate for any lat/lon
- **Used for:** Converting kWh production into real dollar savings, powering the financial model
- **Auth:** API key as query param
- **Rate limit:** 1,000 requests/day (free)
- **Docs:** https://developer.nrel.gov/docs/electricity/utility-rates-v3/

### Rewiring America
- **What it does:** Returns every federal (IRA) and state incentive a homeowner qualifies for, filtered by zip, income, and household size
- **Used for:** Incentives cards UI, reducing net system cost in payback calculations
- **Auth:** Bearer token in header
- **Rate limit:** Generous — check their docs
- **Docs:** https://api.rewiringamerica.org

### Google Geocoding / Autocomplete
- **What it does:** Converts a typed address into lat/lon coordinates and powers the address search suggestions
- **Used for:** Feeding coordinates to all other APIs, validating addresses
- **Auth:** API key as query param
- **Rate limit:** $200 free credit/month
- **Docs:** https://developers.google.com/maps/documentation/geocoding

### WINDExchange (NREL)
- **What it does:** Returns average wind speed at hub height for any US location
- **Used for:** Wind feasibility score — flags "Not Recommended" if average speed is under 5 m/s
- **Auth:** API key as query param
- **Rate limit:** 1,000 requests/day (free)
- **Docs:** https://windexchange.energy.gov/api

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- npm or yarn
- API keys (see below)

### Installation

```bash
# Clone the repo
git clone https://github.com/your-team/home-energy-roadmap.git
cd home-energy-roadmap

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### Environment Variables

Create a `.env` file in the `/server` directory:

```env
NREL_API_KEY=your_nrel_key_here
REWIRING_AMERICA_API_KEY=your_rewiring_key_here
GOOGLE_API_KEY=your_google_key_here
PORT=3001
```

Create a `.env` file in the `/client` directory:

```env
VITE_GOOGLE_API_KEY=your_google_key_here
VITE_API_BASE_URL=http://localhost:3001
```

### Running the App

```bash
# Start the backend (from /server)
npm run dev

# Start the frontend (from /client)
npm run dev
```

App will be running at `http://localhost:5173`

---

## 🗂️ Project Structure

```
home-energy-roadmap/
├── client/                   # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── AddressSearch.jsx      # Google Autocomplete input
│   │   │   ├── SolarCard.jsx          # Solar score + kWh output
│   │   │   ├── GeothermalCard.jsx     # Geothermal suitability
│   │   │   ├── WindCard.jsx           # Wind feasibility
│   │   │   ├── IncentivesPanel.jsx    # Government rebates display
│   │   │   └── SavingsGraph.jsx       # Recharts savings over time
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
├── server/                   # Node/Express backend
│   ├── routes/
│   │   ├── solar.js          # PVWatts API proxy
│   │   ├── rates.js          # Utility Rates API proxy
│   │   ├── incentives.js     # Rewiring America API proxy
│   │   ├── wind.js           # WINDExchange API proxy
│   │   └── geocode.js        # Google Geocoding proxy
│   ├── utils/
│   │   ├── calcPayback.js    # Payback period calculation
│   │   ├── calcSavings.js    # 20-year savings projection
│   │   └── stateRates.js     # EIA state rate fallback table
│   ├── index.js
│   └── package.json
│
└── README.md
```

---

## 🧮 Core Calculations

### Payback Period

```javascript
function calcPayback(annualKwh, utilityRate, systemKw = 10) {
  const costPerWatt = 3.00;             // National average installed cost
  const permitting = 600;               // Flat permitting estimate
  const grossCost = (systemKw * 1000 * costPerWatt) + permitting;
  const federalCredit = grossCost * 0.30;  // 30% ITC (applied to system only)
  const netCost = grossCost - federalCredit;
  const annualSavings = annualKwh * utilityRate;
  const paybackYears = netCost / annualSavings;
  return { grossCost, netCost, annualSavings, paybackYears };
}
```

### 20-Year Savings Projection

```javascript
function calcSavings(annualSavings, netCost, years = 20) {
  const utilityInflation = 0.03; // 3% annual utility rate increase
  let cumulative = -netCost;     // Start negative (upfront investment)
  return Array.from({ length: years }, (_, i) => {
    const yearSavings = annualSavings * Math.pow(1 + utilityInflation, i);
    cumulative += yearSavings;
    return { year: i + 1, savings: Math.round(cumulative) };
  });
}
```

### Average Electric Bill Estimate

```javascript
// If user doesn't provide their bill, estimate it
function estimateBill(annualKwh, utilityRate) {
  const monthlyKwh = annualKwh / 12;
  const monthlyBill = monthlyKwh * utilityRate;
  return { monthlyKwh, monthlyBill };
}
```

---

## 🗝️ Getting Your API Keys

| API | Sign Up URL | Cost |
|-----|-------------|------|
| NREL (PVWatts + Utility Rates + Wind) | https://developer.nrel.gov/signup | Free |
| Rewiring America | https://api.rewiringamerica.org | Free for hackathons |
| Google Maps + Geocoding | https://console.cloud.google.com | $200 free credit/month |

> **Tip:** NREL gives you one API key that works across PVWatts, Utility Rates, and WINDExchange. That's three APIs for one signup.

---

## 📋 Feature Roadmap

### MVP (Phase 1)
- [x] Address search with geocoding
- [x] Solar potential score + kWh output
- [x] System cost + payback period
- [x] Federal + local incentives display
- [x] Savings over time graph
- [x] Geothermal suitability score

### Competitive (Phase 2)
- [ ] Wind feasibility check
- [ ] Technology ranking by payback period
- [ ] Downloadable PDF report
- [ ] User utility bill input for personalized estimates

### Stretch (Phase 3)
- [ ] Side-by-side scenario comparison
- [ ] Carbon offset visualization
- [ ] Neighborhood solar adoption map
- [ ] Mobile responsive layout



## 📄 License

MIT