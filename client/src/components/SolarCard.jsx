import React from 'react'

export default function SolarCard({ data, className = '' }) {
  if (!data) return null
  const gradientId = React.useId().replace(/:/g, '')
  const { score, annualKwh, systemKw, netCost, paybackYears, annualSavings } = data
  const circumference = 2 * Math.PI * 36
  const strokeDash = (score / 100) * circumference

  return (
    <article className={`glass-card p-6 transition-transform duration-300 hover:border-slate-600/80 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400/15">
            <svg className="h-6 w-6 text-amber-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
            </svg>
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-white">Solar</h2>
            <p className="text-xs text-slate-500">Potential score</p>
          </div>
        </div>
        <div className="relative h-16 w-16 shrink-0">
          <svg className="h-16 w-16 -rotate-90" viewBox="0 0 100 100">
            <defs>
              <linearGradient id={`solar-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fcd34d" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-700" />
            <circle
              cx="50"
              cy="50"
              r="36"
              fill="none"
              stroke={`url(#solar-${gradientId})`}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${strokeDash} ${circumference}`}
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">{score}</span>
        </div>
      </div>

      <div className="mt-5 space-y-3 border-t border-slate-700/50 pt-5">
        <Row label="Annual output" value={`${annualKwh?.toLocaleString()} kWh`} />
        <Row label="System size" value={`${systemKw} kW`} />
        <Row label="Cost after incentives" value={`$${netCost?.toLocaleString()}`} />
        <div className="rounded-lg bg-green-500/10 px-3 py-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Payback</span>
            <span className="font-semibold text-green-400">{paybackYears} years</span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">About ${annualSavings?.toLocaleString()}/yr savings</p>
        </div>
      </div>
    </article>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-200">{value}</span>
    </div>
  )
}
