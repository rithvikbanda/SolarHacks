import {
  Area, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ComposedChart,
} from 'recharts'

const DEGRADATION = 0.005
const YEARS = 20

// EPA-based equivalencies per US short ton CO2 offset
// Sources: EPA GHG equivalency calculator
const EQUIVS = [
  {
    label: 'Trees grown 1 yr',
    // 1 tree absorbs ~48 lbs CO2/yr → 2000/48 ≈ 41.7 tree-years per US ton
    perTon: 41.7,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
      </svg>
    ),
  },
  {
    label: 'Car months off road',
    // EPA: avg passenger car 4.6 metric tons/yr = 5.07 US tons/yr → 12/5.07 months per US ton
    perTon: 12 / 5.07,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-3"/>
        <circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>
      </svg>
    ),
  },
  {
    label: 'Gallons of gas',
    // 1 gallon gasoline = 19.6 lbs CO2 → 2000/19.6 ≈ 102 gallons per US ton
    perTon: 102,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 22V8l9-6 9 6v14H3z"/><path d="M9 22V12h6v10"/>
      </svg>
    ),
  },
  {
    label: 'Home electricity months',
    // EPA: avg US home electricity = ~7,200 lbs CO2/yr = 3.6 US tons/yr → 12/3.6 months per US ton
    perTon: 12 / 3.6,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
  },
]

/**
 * Back-derive CO2 factor from total offset and solar production,
 * then build year-by-year cumulative data for both scenarios.
 */
function buildYearData(solarKwh, totalOffsetTons, annualUsageKwh) {
  let totalSolarKwh = 0
  for (let y = 1; y <= YEARS; y++) {
    totalSolarKwh += solarKwh * (1 - DEGRADATION) ** y
  }
  const tonsPerKwh = totalSolarKwh > 0 ? totalOffsetTons / totalSolarKwh : 0
  const baselineTonsPerYear = annualUsageKwh * tonsPerKwh

  let cumSaved = 0
  let cumBaseline = 0
  return Array.from({ length: YEARS }, (_, i) => {
    const year = i + 1
    cumSaved    += solarKwh * (1 - DEGRADATION) ** year * tonsPerKwh
    cumBaseline += baselineTonsPerYear
    return {
      year,
      offset:   +Math.max(0, cumBaseline - cumSaved).toFixed(2),
      baseline: +cumBaseline.toFixed(2),
    }
  })
}

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const offset   = payload.find(p => p.dataKey === 'offset')?.value ?? 0
  const baseline = payload.find(p => p.dataKey === 'baseline')?.value
  return (
    <div style={{
      background: 'rgba(10,18,36,0.97)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 10,
      padding: '10px 14px',
    }}>
      <p style={{ color: '#475569', fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Year {label}</p>
      {baseline != null && (
        <p style={{ color: '#475569', fontSize: 12, margin: '2px 0' }}>
          No solar: {baseline.toFixed(1)} t CO₂
        </p>
      )}
      <p style={{ color: '#10b981', fontSize: 12, margin: '2px 0' }}>
        With solar: {offset.toFixed(1)} t CO₂
      </p>
      {baseline != null && (
        <p style={{ color: '#34d399', fontSize: 12, margin: '2px 0' }}>
          Avoided: {(baseline - offset).toFixed(1)} t
        </p>
      )}
    </div>
  )
}

export default function CarbonCard({ report, className = '' }) {
  const totalOffset    = report?.deterministic?.carbon_offset_tons
  const solarKwh       = report?.solar_production_kwh
  const annualUsageKwh = report?.solar?.annual_usage_kwh ?? 10500

  if (totalOffset == null || !solarKwh) return null

  const data = buildYearData(solarKwh, totalOffset, annualUsageKwh)

  return (
    <div
      className={`rounded-2xl overflow-hidden ${className}`}
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-muted)' }}
    >
      {/* Accent */}
      <div className="h-0.5 w-full"
        style={{ background: 'linear-gradient(90deg, #10b981, #34d399, transparent)' }} />

      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
          </svg>
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-100">Carbon Impact</h2>
          <p className="text-[11px] text-slate-500">
            {totalOffset} t CO₂ avoided over 20 years · eGRID zip-specific factor
          </p>
        </div>
      </div>

      {/* Equivalency tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 pb-5">
        {EQUIVS.map(({ label, icon, perTon }) => {
          const val = Math.round(totalOffset * perTon)
          return (
            <div key={label}
              className="flex flex-col items-center gap-2 rounded-xl py-4 px-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {icon}
              <span className="text-xl font-bold text-slate-100 tabular-nums">
                {val.toLocaleString()}
              </span>
              <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest text-center leading-tight">
                {label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Chart */}
      <div className="px-5 pb-5">
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-3">
          Cumulative CO₂ over time (tons)
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="offsetAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="year"
              tick={{ fill: '#334155', fontSize: 10 }}
              tickLine={false} axisLine={false}
              tickFormatter={v => v % 5 === 0 ? `Yr ${v}` : ''}
            />
            <YAxis
              tickFormatter={v => `${v}t`}
              tick={{ fill: '#334155', fontSize: 10 }}
              tickLine={false} axisLine={false}
              width={36}
            />
            <Tooltip content={<Tip />} cursor={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: 1 }} />

            {/* Baseline (no solar) as faint dashed line */}
            <Line
              dataKey="baseline"
              stroke="rgba(148,163,184,0.3)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              name="No Solar"
            />

            {/* Solar offset as filled area */}
            <Area
              dataKey="offset"
              type="monotone"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#offsetAreaGrad)"
              dot={false}
              name="With Solar"
              style={{ filter: 'drop-shadow(0 0 4px rgba(16,185,129,0.4))' }}
            />
          </ComposedChart>
        </ResponsiveContainer>

        <div className="flex items-center gap-4 mt-2">
          <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className="w-6 h-px inline-block" style={{ background: '#10b981', boxShadow: '0 0 4px #10b981' }} />
            With solar
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className="w-6 h-px inline-block border-t border-dashed" style={{ borderColor: 'rgba(148,163,184,0.4)' }} />
            No solar (grid only)
          </span>
        </div>
      </div>
    </div>
  )
}
