import { useState } from 'react'
import AddressSearch from './components/AddressSearch'
import SolarCard from './components/SolarCard'
import GeothermalCard from './components/GeothermalCard'
import WindCard from './components/WindCard'
import IncentivesPanel from './components/IncentivesPanel'
import SavingsGraph from './components/SavingsGraph'

const MOCK_ROADMAP = {
  solar: {
    score: 78,
    annualKwh: 14200,
    systemKw: 10,
    grossCost: 30600,
    netCost: 21420,
    paybackYears: 8.2,
    annualSavings: 2610,
  },
  geothermal: {
    score: 72,
    suitability: 'Good',
    climateZone: 'Mixed-Humid',
    note: 'Soil conductivity suitable for ground-source heat pump.',
  },
  wind: {
    feasible: false,
    avgWindSpeed: 4.2,
    recommendation: 'Not recommended — average wind speed below 5 m/s.',
  },
  incentives: [
    { name: 'Federal ITC (30%)', amount: '$9,180', type: 'Federal' },
    { name: 'State Rebate — Residential Solar', amount: '$1,000', type: 'State' },
    { name: 'Utility Rebate — Grid Connection', amount: '$500', type: 'Utility' },
  ],
  savingsData: [
    { year: 1, savings: -18810 },
    { year: 2, savings: -16220 },
    { year: 3, savings: -13540 },
    { year: 4, savings: -10770 },
    { year: 5, savings: -7910 },
    { year: 6, savings: -4960 },
    { year: 7, savings: -1920 },
    { year: 8, savings: 1210 },
    { year: 9, savings: 4440 },
    { year: 10, savings: 7770 },
    { year: 11, savings: 11200 },
    { year: 12, savings: 14730 },
    { year: 13, savings: 18360 },
    { year: 14, savings: 22090 },
    { year: 15, savings: 25920 },
    { year: 16, savings: 29850 },
    { year: 17, savings: 33880 },
    { year: 18, savings: 38010 },
    { year: 19, savings: 42240 },
    { year: 20, savings: 46570 },
  ],
}

export default function App() {
  const [address, setAddress] = useState('')
  const [coordinates, setCoordinates] = useState(null) // { lat, lng } for future API calls
  const [roadmap, setRoadmap] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const hasResults = !loading && roadmap

  const handleAddressChange = ({ lat, lng, formattedAddress }) => {
    setSearchError(null)
    setAddress(formattedAddress)
    setCoordinates({ lat, lng })
    setLoading(true)
    setTimeout(() => {
      setRoadmap(MOCK_ROADMAP)
      setLoading(false)
    }, 600)
  }

  const handleSearchError = (message) => {
    setSearchError(message)
  }

  return (
    <div className="min-h-screen">
      <header className="relative border-b border-slate-800/80">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14 text-center">
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-300">
            Home Energy Roadmap
          </h1>
          <p className="mt-3 text-lg text-slate-400 max-w-xl mx-auto">
            Solar, geothermal, wind & rebates — your 30-second audit.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-20 pt-6">
        <div className="relative">
          <AddressSearch
            onChange={handleAddressChange}
            onError={handleSearchError}
            placeholder="e.g. 123 Main St, City, ST"
          />
          {searchError && (
            <p className="mt-2 text-sm text-amber-400/90" role="alert">
              {searchError}
            </p>
          )}
        </div>

        {address && coordinates && (
          <div className="mt-4 rounded-xl border border-slate-700/60 bg-slate-800/40 px-4 py-3 text-left">
            <p className="text-sm font-medium text-slate-300">Location</p>
            <p className="mt-0.5 text-slate-200">{address}</p>
            <p className="mt-2 text-xs text-slate-500 font-mono">
              {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
            </p>
          </div>
        )}

        {loading && (
          <div className="mt-12 flex flex-col items-center justify-center py-16">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-2 border-green-500/30 border-t-green-400 animate-spin" />
              <div className="absolute inset-0 h-12 w-12 rounded-full bg-green-500/10 blur-xl" />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-400 animate-shimmer">Finding your incentives…</p>
          </div>
        )}

        {!loading && hasResults && (
          <div className="space-y-10">
            <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <SolarCard data={roadmap.solar} className="animate-fade-in-up stagger-1" />
              <GeothermalCard data={roadmap.geothermal} className="animate-fade-in-up stagger-2" />
              <WindCard data={roadmap.wind} className="animate-fade-in-up stagger-3" />
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <IncentivesPanel incentives={roadmap.incentives} className="animate-fade-in-up stagger-4" />
              <SavingsGraph data={roadmap.savingsData} className="animate-fade-in-up stagger-5" />
            </section>
          </div>
        )}

        {!loading && !hasResults && (
          <div className="mt-16 text-center animate-fade-in">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl border border-slate-600/50 bg-slate-800/40">
              <svg className="h-10 w-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            </div>
            <p className="mt-5 text-lg font-medium text-slate-300">
              Enter your address to see your personalized roadmap
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Solar potential · Geothermal fit · Wind feasibility · Rebates you may qualify for
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
