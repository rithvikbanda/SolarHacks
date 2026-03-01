const CLASS_META = {
  Excellent: { color: '#10b981', label: 'Excellent' },
  Good:      { color: '#60a5fa', label: 'Good'      },
  Marginal:  { color: '#f59e0b', label: 'Marginal'  },
  Poor:      { color: '#94a3b8', label: 'Poor'       },
}

export default function WindCard({ wind, className = '' }) {
  const speed          = wind?.avg_wind_speed_ms
  const classification = wind?.classification ?? 'Unknown'
  const feasible       = wind?.feasible
  const note           = wind?.note

  const meta  = CLASS_META[classification] ?? CLASS_META.Poor
  const barPct = speed == null ? 0 : Math.min(100, (speed / 10) * 100)

  return (
    <div className={`rounded-2xl overflow-hidden flex flex-col ${className || ''}`}
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-muted)' }}>

      {/* Accent */}
      <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, #60a5fa, #93c5fd, transparent)' }} />

      <div className="p-4 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.2)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round">
                <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>
              </svg>
            </div>
            <span className="text-sm font-bold text-slate-200">Wind</span>
          </div>
          {feasible != null && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: feasible ? 'rgba(16,185,129,0.12)' : 'rgba(148,163,184,0.08)',
                color:      feasible ? '#34d399'               : '#64748b',
                border:     `1px solid ${feasible ? 'rgba(16,185,129,0.25)' : 'rgba(148,163,184,0.15)'}`,
              }}>
              {feasible ? 'Viable' : 'Not viable'}
            </span>
          )}
        </div>

        {/* Main metric — centered */}
        <div className="flex flex-col items-center py-3">
          <span className="text-5xl font-extrabold text-slate-100 leading-none tabular-nums">
            {speed == null ? '—' : speed.toFixed(1)}
          </span>
          <span className="text-sm text-slate-500 mt-1">m/s avg speed</span>
        </div>

        {/* Speed bar */}
        <div className="mt-3 mb-4">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${barPct}%`,
                background: `linear-gradient(90deg, ${meta.color}66, ${meta.color})`,
              }} />
          </div>
          <div className="flex justify-between text-[10px] text-slate-600 mt-1">
            <span>0</span><span>10 m/s</span>
          </div>
        </div>

        {/* Classification centered */}
        <div className="flex justify-center">
          <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
            style={{
              background: `${meta.color}18`,
              color: meta.color,
              border: `1px solid ${meta.color}40`,
            }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
            {meta.label}
          </span>
        </div>

        {/* Note */}
        {note && (
          <p className="text-[10px] text-slate-500 text-center leading-relaxed mt-3 border-t pt-3"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {note}
          </p>
        )}
      </div>
    </div>
  )
}
