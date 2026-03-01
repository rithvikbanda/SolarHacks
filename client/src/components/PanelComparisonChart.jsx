import { useMemo } from 'react'
import {
  Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, ComposedChart, ReferenceLine,
} from 'recharts'

const COST_PER_WATT = 3.00
const PERMIT_COST = 600
const FEDERAL_ITC = 0.30
const PANEL_DEGRADATION = 0.005
const UTILITY_INFLATION = 0.03
const YEARS = 20

const PALETTE = [
  '#1a4a3f',
  '#1b7a6a',
  '#10b981',
  '#34d399',
  '#6ee7b7',
]

function fmt(v) {
  if (v == null) return '—'
  const abs = Math.abs(v)
  if (abs >= 1000) return `$${(v / 1000).toFixed(1)}k`
  return `$${Math.round(v)}`
}

function calcNetCost(gross, flatRebates, stateItcEntries) {
  const costBasis = Math.max(gross - flatRebates, 0)
  const federalCredit = costBasis * FEDERAL_ITC
  let stateCredit = 0
  if (stateItcEntries) {
    for (const entry of stateItcEntries) {
      let credit = costBasis * entry.pct
      if (entry.cap != null) credit = Math.min(credit, entry.cap)
      stateCredit += credit
    }
  }
  return costBasis - federalCredit - stateCredit
}

function pickEvenly(arr, count) {
  if (arr.length <= count) return arr.map((item, i) => ({ item, idx: i }))
  const picks = []
  for (let i = 0; i < count; i++) {
    const idx = Math.round((i / (count - 1)) * (arr.length - 1))
    picks.push({ item: arr[idx], idx })
  }
  return picks
}

function computeSavings(config, panelCapacityWatts, pricePerKwh, flatRebates, stateItcEntries) {
  const panelCount = config.panelsCount ?? config.panels_count ?? 0
  const yearlyKwh = config.yearlyEnergyDcKwh ?? config.yearly_energy_dc_kwh ?? 0
  const sizeKw = panelCount * (panelCapacityWatts || 250) / 1000
  const gross = sizeKw * 1000 * COST_PER_WATT + PERMIT_COST
  const net = calcNetCost(gross, flatRebates, stateItcEntries)
  const rate = pricePerKwh || 0.16

  const points = [{ year: 0, savings: -net }]
  let cumulative = -net
  for (let y = 1; y <= YEARS; y++) {
    const production = yearlyKwh * (1 - PANEL_DEGRADATION) ** y
    const effectiveRate = rate * (1 + UTILITY_INFLATION) ** y
    cumulative += production * effectiveRate
    points.push({ year: y, savings: cumulative })
  }
  return { panelCount, points, net }
}

const Tip = ({ active, payload, label, lines }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(10,18,36,0.97)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 10,
      padding: '10px 14px',
    }}>
      <p style={{ color: '#475569', fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Year {label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.stroke, fontSize: 12, margin: '2px 0' }}>
          {lines?.find(l => l.key === p.dataKey)?.label ?? p.dataKey}: {fmt(p.value)}
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

export default function PanelComparisonChart({ allConfigs, report, className = '' }) {
  const configs = allConfigs?.configs
  const panelCapacityWatts = allConfigs?.panelCapacityWatts

  const { data, lines, minPanels, maxPanels, minFinal, maxFinal } = useMemo(() => {
    if (!configs?.length || !report) return {}

    const pricePerKwh = report.solar?.price_per_kwh
    const calc = report.incentives?.for_calculations || {}
    const flatRebates = calc.flat_rebates || 0
    const stateItcEntries = calc.state_itc_entries || []

    const picked = pickEvenly(configs, 5)
    const series = picked.map(({ item }) =>
      computeSavings(item, panelCapacityWatts, pricePerKwh, flatRebates, stateItcEntries)
    )

    const linesMeta = series.map((s, i) => ({
      key: `cfg${i}`,
      label: `${s.panelCount} panels`,
      color: PALETTE[i],
      panelCount: s.panelCount,
    }))

    const chartData = Array.from({ length: YEARS + 1 }, (_, y) => {
      const row = { year: y }
      series.forEach((s, i) => { row[`cfg${i}`] = Math.round(s.points[y].savings) })
      return row
    })

    return {
      data: chartData,
      lines: linesMeta,
      minPanels: series[0].panelCount,
      maxPanels: series[series.length - 1].panelCount,
      minFinal: series[0].points[YEARS].savings,
      maxFinal: series[series.length - 1].points[YEARS].savings,
    }
  }, [configs, panelCapacityWatts, report])

  if (!data || !lines) return null

  return (
    <div className={`rounded-2xl overflow-hidden ${className}`}
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-muted)' }}>

      <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, #10b981, #6ee7b7, transparent)' }} />

      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
            </svg>
          </div>
          <h2 className="text-base font-bold text-slate-100">Savings by System Size</h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {lines.map(l => (
            <span key={l.key} className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className="w-3 h-0.5 rounded-full inline-block" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      <div className="px-2 pb-2">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="year"
              tick={{ fill: '#334155', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => v % 5 === 0 ? `Yr ${v}` : ''}
            />
            <YAxis
              tickFormatter={fmt}
              tick={{ fill: '#334155', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={50}
            />
            <Tooltip content={<Tip lines={lines} />} cursor={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: 1 }} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.07)" />

            {lines.map(l => (
              <Line
                key={l.key}
                dataKey={l.key}
                stroke={l.color}
                strokeWidth={2}
                dot={false}
                name={l.label}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex divide-x border-t"
        style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.25)' }}>
        <Stat label="Panel Range" value={`${minPanels}–${maxPanels}`} color="#34d399" />
        <Stat label={`${minPanels} Panels @ 20yr`} value={fmt(minFinal)} color="#1b7a6a" />
        <Stat label={`${maxPanels} Panels @ 20yr`} value={fmt(maxFinal)} color="#6ee7b7" />
      </div>
    </div>
  )
}
