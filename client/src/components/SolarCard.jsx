function ArcGauge({ payback }) {
  const tiers = [
    { max: 8,        color: '#10b981', label: 'Excellent ROI', pct: 90 },
    { max: 12,       color: '#34d399', label: 'Good ROI',      pct: 65 },
    { max: 16,       color: '#f59e0b', label: 'Moderate ROI',  pct: 40 },
    { max: Infinity, color: '#f87171', label: 'Long payback',  pct: 20 },
  ]
  const tier  = payback == null ? null : tiers.find(t => payback <= t.max)
  const color = tier?.color ?? '#334155'
  const pct   = tier?.pct   ?? 0
  const label = tier?.label ?? '—'

  const r = 38, cx = 48, cy = 48
  const circ = 2 * Math.PI * r
  const arc  = (pct / 100) * circ * 0.75

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="96" height="78" viewBox="0 0 96 96">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8"
          strokeDasharray={`${circ * 0.75} ${circ * 0.25}`}
          strokeDashoffset={-(circ * 0.125)}
          strokeLinecap="round" transform="rotate(135 48 48)" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${arc} ${circ - arc}`}
          strokeDashoffset={-(circ * 0.125)}
          strokeLinecap="round" transform="rotate(135 48 48)"
          style={{ filter: `drop-shadow(0 0 8px ${color}99)`, transition: 'stroke-dasharray 0.8s ease' }} />
        <text x={cx} y={cy - 1} textAnchor="middle" fill="white" fontSize="17" fontWeight="800" fontFamily="Inter, sans-serif">
          {payback ?? '—'}
        </text>
        <text x={cx} y={cy + 13} textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="Inter, sans-serif">yrs</text>
      </svg>
      <span className="text-xs font-semibold" style={{ color }}>{label}</span>
    </div>
  )
}

function StatBox({ label, value, sub }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl py-3 px-2"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{label}</span>
      <span className="text-xl font-bold text-slate-100">{value}</span>
      {sub && <span className="text-[10px] text-slate-600">{sub}</span>}
    </div>
  )
}

export default function SolarCard({ solar, deterministic, className = '' }) {
  const price   = solar?.price_per_kwh
  const usage   = solar?.avg_kwh_per_household
  const gross   = deterministic?.gross_cost
  const net     = deterministic?.net_cost
  const payback = deterministic?.payback_years
  const carbon  = deterministic?.carbon_offset_tons

  const money = (n) => n == null ? '—' : `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`

  return (
    <div className={`rounded-2xl overflow-hidden ${className || ''}`}
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-muted)' }}>

      {/* Accent bar */}
      <div className="h-0.5 w-full"
        style={{ background: 'linear-gradient(90deg, #10b981, #34d399, transparent)' }} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="5"/>
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 leading-none">Solar</h2>
              <p className="text-xs text-slate-500 mt-1">8 kW system · 30% federal ITC</p>
            </div>
          </div>
          <ArcGauge payback={payback} />
        </div>

        {/* Cost stats */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <StatBox label="Gross Cost" value={money(gross)} sub="Before incentives" />
          <StatBox label="Net Cost"   value={money(net)}   sub="After 30% ITC" />
        </div>

        {/* Carbon row */}
        <div className="flex items-center justify-between rounded-xl px-4 py-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
              <path d="M7 14.5s1.5 2 5 2 5-2 5-2M9 9h.01M15 9h.01"/>
            </svg>
            <span className="text-xs text-slate-400">20-yr carbon offset</span>
          </div>
          <span className="text-sm font-bold text-emerald-400">
            {carbon == null ? '—' : `${carbon} t CO₂`}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="grid grid-cols-2 border-t"
        style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.25)' }}>
        {[
          { label: 'Rate',      val: price == null ? '—' : `$${price.toFixed(3)}/kWh` },
          { label: 'Avg Usage', val: usage == null ? '—' : `${Math.round(usage).toLocaleString()} kWh/yr` },
        ].map(({ label, val }, i) => (
          <div key={label} className={`flex flex-col items-center py-3 gap-0.5 ${i === 0 ? 'border-r' : ''}`}
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">{label}</span>
            <span className="text-sm font-semibold text-slate-300">{val}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
