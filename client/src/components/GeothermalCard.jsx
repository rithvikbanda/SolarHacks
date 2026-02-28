import React from 'react'

export default function GeothermalCard({ data, className = '' }) {
  if (!data) return null
  const gradientId = React.useId().replace(/:/g, '')
  const { score, suitability, climateZone, note } = data
  const circumference = 2 * Math.PI * 36
  const strokeDash = (score / 100) * circumference

  return (
    <article className={`glass-card p-6 transition-transform duration-300 hover:border-slate-600/80 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-400/15">
            <svg className="h-6 w-6 text-teal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-white">Geothermal</h2>
            <p className="text-xs text-slate-500">Suitability</p>
          </div>
        </div>
        <div className="relative h-16 w-16 shrink-0">
          <svg className="h-16 w-16 -rotate-90" viewBox="0 0 100 100">
            <defs>
              <linearGradient id={`geo-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#2dd4bf" />
                <stop offset="100%" stopColor="#14b8a6" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-700" />
            <circle
              cx="50"
              cy="50"
              r="36"
              fill="none"
              stroke={`url(#geo-${gradientId})`}
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
        <Row label="Suitability" value={suitability} />
        <Row label="Climate zone" value={climateZone} />
        <p className="rounded-lg bg-slate-700/30 px-3 py-2.5 text-xs leading-relaxed text-slate-400">
          {note}
        </p>
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
