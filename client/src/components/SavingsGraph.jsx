import {
  Area, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, ComposedChart, ReferenceLine,
} from 'recharts'

function fmt(v) {
  if (v == null) return '—'
  const abs = Math.abs(v)
  if (abs >= 1000) return `$${(v / 1000).toFixed(1)}k`
  return `$${Math.round(v)}`
}

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const entries = payload.filter(p => ['Median', 'Fixed'].includes(p.name))
  return (
    <div style={{
      background: 'rgba(10,18,36,0.97)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 10,
      padding: '10px 14px',
    }}>
      <p style={{ color: '#475569', fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Year {label}</p>
      {entries.map(p => (
        <p key={p.name} style={{ color: p.stroke, fontSize: 12, margin: '2px 0' }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div className="flex flex-col items-center gap-1 py-3 flex-1">
      <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest text-center">{label}</span>
      <span className="text-base font-bold" style={{ color: color ?? '#e2e8f0' }}>{value}</span>
    </div>
  )
}

export default function SavingsGraph({ simulation, deterministic, className = '' }) {
  const sim = simulation?.savings_by_year
  const det = deterministic?.savings_by_year
  if (!sim || !det) return null

  const years = sim.mean.length
  const data = Array.from({ length: years }, (_, i) => ({
    year: i + 1,
    p5:  sim.percentiles['5'][i],
    p25: sim.percentiles['25'][i],
    p50: sim.percentiles['50'][i],
    p75: sim.percentiles['75'][i],
    p95: sim.percentiles['95'][i],
    det: det[i]?.cumulative_savings,
  }))

  const payback  = simulation?.payback_years?.percentiles?.['50']
  const savings  = simulation?.total_savings_20yr?.percentiles?.['50']
  const carbon   = simulation?.carbon_offset_tons?.mean

  return (
    <div className={`rounded-2xl overflow-hidden ${className || ''}`}
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-muted)' }}>

      {/* Accent */}
      <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, #10b981, #34d399, transparent)' }} />

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
              <polyline points="16 7 22 7 22 13"/>
            </svg>
          </div>
          <h2 className="text-base font-bold text-slate-100">20-Year Savings</h2>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className="w-3 h-0.5 rounded-full inline-block" style={{ background: '#10b981' }} />
            Median
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className="w-3 h-0.5 rounded-full inline-block" style={{ background: 'rgba(255,255,255,0.35)' }} />
            Fixed
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className="w-3 h-3 rounded inline-block" style={{ background: 'rgba(16,185,129,0.2)' }} />
            Range
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="px-2 pb-2">
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="outerBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#10b981" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="innerBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <XAxis dataKey="year" tick={{ fill: '#334155', fontSize: 10 }} tickLine={false} axisLine={false}
              tickFormatter={v => v % 5 === 0 ? `Yr ${v}` : ''} />
            <YAxis tickFormatter={fmt} tick={{ fill: '#334155', fontSize: 10 }} tickLine={false} axisLine={false} width={44} />
            <Tooltip content={<Tip />} cursor={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: 1 }} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.07)" />

            <Area dataKey="p95" stroke="none" fill="url(#outerBand)" legendType="none" name="P95" />
            <Area dataKey="p5"  stroke="none" fill="rgba(13,24,41,1)" fillOpacity={1} legendType="none" name="P5" />
            <Area dataKey="p75" stroke="none" fill="url(#innerBand)" legendType="none" name="P75" />
            <Area dataKey="p25" stroke="none" fill="rgba(13,24,41,1)" fillOpacity={1} legendType="none" name="P25" />

            <Line dataKey="p50" stroke="#10b981" strokeWidth={2} dot={false} name="Median"
              style={{ filter: 'drop-shadow(0 0 4px rgba(16,185,129,0.5))' }} />
            <Line dataKey="det" stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} strokeDasharray="5 3" dot={false} name="Fixed" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Stats footer */}
      <div className="flex divide-x border-t"
        style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.25)' }}>
        <Stat label="Median Payback"    value={payback != null ? `${payback} yrs` : '—'} color="#34d399" />
        <Stat label="20-yr Savings"     value={fmt(savings)}                              color="#34d399" />
        <Stat label="CO₂ Offset"        value={carbon  != null ? `${carbon} t` : '—'}    color="#60a5fa" />
      </div>
    </div>
  )
}
