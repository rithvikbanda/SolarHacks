import { useState } from 'react'
import AddressSearch from './components/AddressSearch'
import MapPreview from './components/MapPreview'
import SolarCard from './components/SolarCard'
import WindCard from './components/WindCard'
import GeothermalCard from './components/GeothermalCard'
import IncentivesPanel from './components/IncentivesPanel'
import SavingsGraph from './components/SavingsGraph'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

function Skeleton() {
  return (
    <div className="space-y-4">
      {[160, 120, 120].map((h, i) => (
        <div
          key={i}
          className="card-base animate-pulse"
          style={{ height: h }}
        />
      ))}
    </div>
  )
}

export default function App() {
  const [location, setLocation] = useState(null)
  const [income, setIncome] = useState('')
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function fetchReport(loc, incomeVal) {
    if (!loc) return
    setLoading(true)
    setError(null)
    setReport(null)
    try {
      const params = new URLSearchParams({
        lat: loc.lat,
        lon: loc.lng,
        state_abbrev: loc.address.state ?? '',
        zip: loc.address.zip ?? '',
        n_simulations: 500,
      })
      if (incomeVal) params.set('income', incomeVal)
      const res = await fetch(`${API}/api/report?${params}`)
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      setReport(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleAddressChange(loc) {
    setLocation(loc)
    setReport(null)
    setError(null)
  }

  const addressStr = location?.address
    ? [location.address.street, location.address.city, location.address.state, location.address.zip]
        .filter(Boolean).join(', ')
    : null

  return (
    <div className="min-h-screen page-gradient">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/80 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-white tracking-tight">Home Energy Roadmap</span>
            <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Solar · Wind · Geothermal</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">

        {/* Hero */}
        <section className="pt-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
            What's your home's{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">energy potential?</span>
          </h1>
          <p className="mt-3 text-[var(--text-secondary)] text-base leading-relaxed max-w-lg">
            Get a full solar, wind, and geothermal analysis with real payback projections and incentives for your address.
          </p>
        </section>

        {/* Search card */}
        <section className="rounded-2xl border border-[var(--border-muted)] p-5 sm:p-6 bg-[var(--bg-card)] shadow-xl shadow-black/10">
          <AddressSearch
            onChange={handleAddressChange}
            onError={setError}
            placeholder="Enter your home address…"
          />
        </section>

        {error && (
          <div className="flex items-start gap-3 rounded-xl px-4 py-3 text-sm text-red-300 border border-red-500/20 bg-red-500/5">
            <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {error}
          </div>
        )}

        {/* Map */}
        {location && (
          <section className="overflow-hidden rounded-2xl border border-[var(--border-muted)] shadow-xl shadow-black/10">
            <MapPreview lat={location.lat} lng={location.lng} address={addressStr} className="w-full" />
          </section>
        )}

        {/* Income + Analyze */}
        {location && (
          <section className="flex flex-col items-center gap-4 p-5 rounded-2xl border border-[var(--border-muted)] bg-[var(--bg-card)]">
            <p className="text-sm font-medium text-[var(--text-secondary)] text-center">
              Enter your household income to get personalized incentives
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] text-sm font-semibold">$</span>
                <input
                  type="number"
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                  placeholder="Annual household income"
                  className="input-base pl-8"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              <button
                onClick={() => fetchReport(location, income ? parseInt(income, 10) : null)}
                disabled={loading}
                className="btn-primary"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Analyzing…
                  </span>
                ) : (
                  'Analyze →'
                )}
              </button>
            </div>
          </section>
        )}

        {loading && <Skeleton />}

        {/* Results */}
        {report && !loading && (
          <div className="space-y-6 pb-12">
            {addressStr && (
              <p className="text-sm text-[var(--text-muted)] flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {addressStr}
              </p>
            )}
            <SolarCard solar={report.solar} deterministic={report.deterministic} className="stagger-1" />
            <div className="grid sm:grid-cols-2 gap-4">
              <WindCard wind={report.wind} className="stagger-2" />
              <GeothermalCard geothermal={report.geothermal} className="stagger-3" />
            </div>
            <IncentivesPanel incentives={report.incentives} hasIncome={!!income} className="stagger-4" />
            <SavingsGraph simulation={report.simulation} deterministic={report.deterministic} className="stagger-5" />
          </div>
        )}

      </main>
    </div>
  )
}
