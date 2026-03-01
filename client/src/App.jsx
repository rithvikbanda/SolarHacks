import { useState } from 'react'
import AddressSearch from './components/AddressSearch'
import MapPreview from './components/MapPreview'
import SolarCard from './components/SolarCard'
import WindCard from './components/WindCard'
import GeothermalCard from './components/GeothermalCard'
import FinancingCard from './components/FinancingCard'
import IncentivesPanel from './components/IncentivesPanel'
import SavingsGraph from './components/SavingsGraph'
import PanelComparisonChart from './components/PanelComparisonChart'
import CarbonCard from './components/CarbonCard'

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
  const [householdSize, setHouseholdSize] = useState(2)
  const [filingStatus, setFilingStatus] = useState('single')
  const [ownerStatus, setOwnerStatus] = useState('homeowner')
  const [panelConfig, setPanelConfig] = useState(null)
  const [allConfigs, setAllConfigs] = useState(null)
  const [solarReady, setSolarReady] = useState(false)
  const [report, setReport] = useState(null)
  const [incentives, setIncentives] = useState(null)
  const [loading, setLoading] = useState(false)
  const [incentivesLoading, setIncentivesLoading] = useState(false)
  const [error, setError] = useState(null)

  async function fetchReport(loc, panelCfg) {
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
      if (panelCfg) {
        params.set('panel_count', panelCfg.panelCount)
        params.set('solar_production_kwh', panelCfg.yearlyKwh)
        if (panelCfg.panelCapacityWatts)
          params.set('panel_capacity_watts', panelCfg.panelCapacityWatts)
      }
      const res = await fetch(`${API}/api/report?${params}`)
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      setReport(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchIncentives() {
    if (!location?.address?.zip) return
    setIncentivesLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        lat: location.lat,
        lon: location.lng,
        state_abbrev: location.address.state ?? '',
        zip: location.address.zip ?? '',
        n_simulations: 500,
        household_size: householdSize,
        filing_status: filingStatus,
        owners_or_renters: ownerStatus,
      })
      if (income) params.set('income', income)
      if (panelConfig) {
        params.set('panel_count', panelConfig.panelCount)
        params.set('solar_production_kwh', panelConfig.yearlyKwh)
        if (panelConfig.panelCapacityWatts)
          params.set('panel_capacity_watts', panelConfig.panelCapacityWatts)
      }
      const res = await fetch(`${API}/api/report?${params}`)
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()
      setReport(data)
      setIncentives(data.incentives ?? null)
    } catch (e) {
      setError(e.message)
    } finally {
      setIncentivesLoading(false)
    }
  }

  function handleAddressChange(loc) {
    setLocation(loc)
    setPanelConfig(null)
    setAllConfigs(null)
    setSolarReady(false)
    setReport(null)
    setIncentives(null)
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg, #10b981, #0ea5e9)' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
                </svg>
              </div>
              <div>
                <span className="text-sm font-bold text-white tracking-tight leading-none block">Home Energy Roadmap</span>
                <span className="text-[10px] text-[var(--text-muted)] leading-none">Solar · Wind · Geothermal · Incentives</span>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[11px] font-semibold text-emerald-400 tracking-wide">Live Data</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">

        {/* Hero */}
        <section className="pt-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
            What's your home's{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">energy potential?</span>
          </h1>
          <p className="mt-3 text-[var(--text-secondary)] text-base leading-relaxed max-w-lg">
            Get a full renewable energy analysis with real payback projections and incentives for your address.
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
            <MapPreview lat={location.lat} lng={location.lng} address={addressStr} className="w-full" onPanelConfigChange={setPanelConfig} onAllConfigsReady={setAllConfigs} onSolarReady={setSolarReady} />
          </section>
        )}

        {/* Analyze (address + panels only) */}
        {location && (
          <section className="flex flex-col items-center gap-3 p-5 rounded-2xl border border-[var(--border-muted)] bg-[var(--bg-card)]">
            <p className="text-sm font-medium text-[var(--text-secondary)] text-center">
              Calculate renewable energy potential for this address
            </p>
            <button
              onClick={() => fetchReport(location, panelConfig)}
              disabled={loading || !solarReady}
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
              ) : !solarReady ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Loading solar data…
                </span>
              ) : (
                'Analyze'
              )}
            </button>
          </section>
        )}

        {loading && <Skeleton />}
        {incentivesLoading && report && (
          <p className="text-sm text-[var(--text-muted)] flex items-center gap-2">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Updating costs with incentives…
          </p>
        )}

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
            <CarbonCard report={report} className="stagger-2" />
            <SavingsGraph simulation={report.simulation} deterministic={report.deterministic} className="stagger-3" />
            {allConfigs && <PanelComparisonChart allConfigs={allConfigs} report={report} className="stagger-4" />}
            <FinancingCard
              netCost={report.deterministic?.net_cost}
              monthlySavings={report.solar?.price_per_kwh && report.solar_production_kwh
                ? (report.solar_production_kwh * report.solar.price_per_kwh) / 12
                : null}
              className="stagger-5"
            />

            {/* Incentives */}
            <section className="rounded-2xl border border-[var(--border-muted)] bg-[var(--bg-card)] shadow-xl shadow-black/10 overflow-hidden stagger-6">
              <div className="p-5 sm:p-6 space-y-4">
                <div>
                  <h2 className="text-base font-bold text-slate-100">Incentives</h2>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    Enter your household income and eligibility to see rebates and tax credits for this location.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Household income</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] text-sm font-semibold">$</span>
                      <input
                        type="number"
                        value={income}
                        onChange={(e) => setIncome(e.target.value)}
                        placeholder="Annual income"
                        className="input-base w-full pl-7 text-sm"
                        style={{ colorScheme: 'dark' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Owner status</label>
                    <select
                      value={ownerStatus}
                      onChange={(e) => setOwnerStatus(e.target.value)}
                      className="input-base w-full text-sm"
                      style={{ colorScheme: 'dark' }}
                    >
                      <option value="homeowner">Homeowner</option>
                      <option value="renter">Renter</option>
                    </select>
                    <p className="text-[10px] text-slate-500 mt-1">Renters can&apos;t claim rooftop solar credits</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Tax filing</label>
                    <select
                      value={filingStatus}
                      onChange={(e) => setFilingStatus(e.target.value)}
                      className="input-base w-full text-sm"
                      style={{ colorScheme: 'dark' }}
                    >
                      <option value="single">Single</option>
                      <option value="joint">Joint</option>
                      <option value="hoh">Head of household</option>
                      <option value="married_filing_separately">Married filing separately</option>
                    </select>
                    <p className="text-[10px] text-slate-500 mt-1">Affects income-bracket thresholds</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Household size</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={householdSize}
                      onChange={(e) => setHouseholdSize(Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)))}
                      className="input-base w-full text-sm"
                      style={{ colorScheme: 'dark' }}
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Affects AMI & state rebate eligibility</p>
                  </div>
                </div>
                <button
                  onClick={fetchIncentives}
                  disabled={incentivesLoading || !income}
                  className="btn-primary"
                >
                  {incentivesLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Calculating…
                    </span>
                  ) : !income ? (
                    'Enter income to calculate incentives'
                  ) : (
                    'Calculate incentives →'
                  )}
                </button>
              </div>
              {incentives !== null && (
                <div className="border-t border-[var(--border-subtle)]">
                  <IncentivesPanel incentives={incentives} hasIncome={!!income} ownerStatus={ownerStatus} />
                </div>
              )}
            </section>

            <div className="grid sm:grid-cols-2 gap-4">
              <WindCard wind={report.wind} className="stagger-7" />
              <GeothermalCard geothermal={report.geothermal} className="stagger-8" />
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
