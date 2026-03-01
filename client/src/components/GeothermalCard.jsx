const SUIT_META = {
  Excellent: { color: '#10b981' },
  Good:      { color: '#fb923c' },
  Moderate:  { color: '#f59e0b' },
  Poor:      { color: '#94a3b8' },
}

export default function GeothermalCard({ geothermal, className = '' }) {
  const score      = geothermal?.score ?? 0
  const suitability = geothermal?.suitability ?? 'Unknown'
  const climate    = geothermal?.climate_zone
  const hdd        = geothermal?.heating_degree_days
  const cdd        = geothermal?.cooling_degree_days
  const note       = geothermal?.note

  const meta = SUIT_META[suitability] ?? { color: '#94a3b8' }

  return (
    <div className={`rounded-2xl overflow-hidden flex flex-col ${className || ''}`}
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-muted)' }}>

      {/* Accent */}
      <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, #f97316, #fb923c, transparent)' }} />

      <div className="p-4 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.2)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 22c-4.97 0-9-4.03-9-9 0-3.6 2.12-6.72 5.19-8.22C8.07 6.27 8.5 8 8.5 8c0 1.93 1.57 3.5 3.5 3.5S15.5 9.93 15.5 8c0 0 .43-1.73.31-3.22C18.88 6.28 21 9.4 21 13c0 4.97-4.03 9-9 9z"/>
            </svg>
          </div>
          <span className="text-base font-bold text-slate-200">Geothermal</span>
        </div>

        {/* Score — centered */}
        <div className="flex flex-col items-center py-3">
          <div className="flex items-center gap-2 mb-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="w-5 h-5 rounded-full transition-all duration-500"
                style={{
                  background: i <= score ? meta.color : 'rgba(255,255,255,0.07)',
                  boxShadow: i <= score ? `0 0 8px ${meta.color}66` : 'none',
                }} />
            ))}
          </div>
          <span className="text-xl font-bold mt-1" style={{ color: meta.color }}>{suitability}</span>
          <span className="text-xs text-slate-500 mt-0.5">suitability · {score}/5</span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          {[
            { label: 'Climate Zone', val: climate ?? '—' },
            { label: 'HDD / CDD',    val: hdd == null ? '—' : `${Math.round(hdd / 100) / 10}k / ${Math.round((cdd ?? 0) / 100) / 10}k` },
          ].map(({ label, val }) => (
            <div key={label} className="flex flex-col items-center rounded-xl py-2.5 px-2 gap-0.5"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-widest text-center">{label}</span>
              <span className="text-base font-semibold text-slate-200">{val}</span>
            </div>
          ))}
        </div>

        {/* Note */}
        {note && (
          <p className="text-xs text-slate-500 text-center leading-relaxed mt-3 border-t pt-3"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {note}
          </p>
        )}
      </div>
    </div>
  )
}
