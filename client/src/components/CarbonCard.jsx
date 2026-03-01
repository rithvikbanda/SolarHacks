import {
  Area, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ComposedChart,
} from 'recharts'

const DEGRADATION = 0.005
const YEARS = 20

// EPA-based equivalencies per US short ton CO2 offset
const EQUIVS = [
  { label: 'Trees grown 1 yr', perTon: 41.7 },
  { label: 'Car months off road', perTon: 12 / 5.07 },
  { label: 'Gallons of gas', perTon: 102 },
  { label: 'Home electricity months', perTon: 12 / 3.6 },
]

/**
 * Build cumulative baseline, avoided, and after-solar emissions.
 * Caps avoided so it never exceeds baseline (household usage).
 */
function buildYearData(solarKwh, totalOffsetTons, annualUsageKwh) {
  let totalSolarKwh = 0
  for (let y = 1; y <= YEARS; y++) {
    totalSolarKwh += solarKwh * (1 - DEGRADATION) ** y
  }

  const tonsPerKwh = totalSolarKwh > 0 ? totalOffsetTons / totalSolarKwh : 0
  const baselineTonsPerYear = annualUsageKwh * tonsPerKwh

  let cumBaseline = 0
  let cumAvoided = 0

  return Array.from({ length: YEARS }, (_, i) => {
    const year = i + 1

    const yearlySolarTons =
      solarKwh * (1 - DEGRADATION) ** year * tonsPerKwh

    const yearlyBaselineTons = baselineTonsPerYear

    // Cap avoided to baseline so we never "avoid" more than the household would emit
    const effectiveAvoided = Math.min(yearlySolarTons, yearlyBaselineTons)

    cumBaseline += yearlyBaselineTons
    cumAvoided += effectiveAvoided

    const after = Math.max(0, cumBaseline - cumAvoided)

    return {
      year,
      baseline: +cumBaseline.toFixed(2),
      avoided: +cumAvoided.toFixed(2),
      after: +after.toFixed(2),
    }
  })
}

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null

  const baseline = payload.find(p => p.dataKey === 'baseline')?.value ?? 0
  const avoided = payload.find(p => p.dataKey === 'avoided')?.value ?? 0
  const after = Math.max(0, baseline - avoided)

  return (
    <div
      style={{
        background: 'rgba(10,18,36,0.97)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 10,
        padding: '10px 14px',
      }}
    >
      <p style={{ color: '#475569', fontSize: 11, fontWeight: 600 }}>
        Year {label}
      </p>

      <p style={{ color: '#475569', fontSize: 12 }}>
        Baseline: {baseline.toFixed(1)} t CO₂
      </p>

      <p style={{ color: '#10b981', fontSize: 12 }}>
        Avoided (capped): {avoided.toFixed(1)} t CO₂
      </p>

      <p style={{ color: '#34d399', fontSize: 12 }}>
        Emissions after solar: {after.toFixed(1)} t CO₂
      </p>
    </div>
  )
}

export default function CarbonCard({ report, className = '' }) {
  const totalOffset = report?.deterministic?.carbon_offset_tons
  const solarKwh = report?.solar_production_kwh
  const annualUsageKwh = report?.solar?.annual_usage_kwh ?? 10500

  if (totalOffset == null || !solarKwh) return null

  const data = buildYearData(solarKwh, totalOffset, annualUsageKwh)

  // What the chart actually shows (capped to household usage)
  const effectiveOffset = data[data.length - 1]?.avoided ?? 0

  return (
    <div
      className={`rounded-2xl overflow-hidden ${className}`}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-muted)',
      }}
    >
      <div
        className="h-0.5 w-full"
        style={{
          background: 'linear-gradient(90deg, #10b981, #34d399, transparent)',
        }}
      />

      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <h2 className="text-base font-bold text-slate-100">Carbon Impact</h2>

        {/* More visible primary metric */}
        <p className="mt-1 text-sm sm:text-base font-semibold text-slate-200">
          <span className="text-emerald-400">
            {effectiveOffset.toFixed(2)} t CO₂ avoided
          </span>{' '}
          over 20 years
        </p>

        {/* Secondary context */}
        <p className="text-xs text-slate-500 mt-1">
          Capped to household usage · Solar generation estimate: {Number(totalOffset).toFixed(2)} t
        </p>
      </div>

      {/* Equivalency Tiles (use the same value as the chart) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 pb-5">
        {EQUIVS.map(({ label, perTon }) => {
          const val = Math.round(effectiveOffset * perTon)
          return (
            <div
              key={label}
              className="flex flex-col items-center gap-2 rounded-xl py-4 px-3"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <span className="text-2xl font-bold text-slate-100">
                {val.toLocaleString()}
              </span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest text-center">
                {label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Chart */}
      <div className="px-5 pb-5">
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-3">
          Cumulative CO₂ avoided (capped to household usage)
        </p>

        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={data}>
            <defs>
              <linearGradient id="offsetAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="year"
              tick={{ fill: '#334155', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => (v % 5 === 0 ? `Yr ${v}` : '')}
            />

            <YAxis
              tickFormatter={v => `${v}t`}
              tick={{ fill: '#334155', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={36}
            />

            <Tooltip content={<Tip />} />

            {/* Baseline */}
            <Line
              dataKey="baseline"
              stroke="#475569"
              strokeWidth={3}
              dot={false}
              name="Baseline (no solar)"
            />

            {/* Avoided */}
            <Area
              dataKey="avoided"
              type="monotone"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#offsetAreaGrad)"
              dot={false}
              name="CO₂ avoided (capped)"
            />
          </ComposedChart>
        </ResponsiveContainer>

        <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-6 h-px inline-block" style={{ background: '#10b981' }} />
            CO₂ avoided (capped)
          </span>

          <span className="flex items-center gap-1.5">
            <span className="w-6 h-px inline-block" style={{ background: '#475569' }} />
            Baseline (no solar)
          </span>
        </div>
      </div>
    </div>
  )
}