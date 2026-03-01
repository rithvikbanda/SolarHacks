import { useState, useMemo } from 'react'

const CREDIT_TIERS = [
  { min: 750, label: 'Excellent', color: '#10b981', apr: [4.99, 6.99] },
  { min: 700, label: 'Good',      color: '#34d399', apr: [7.49, 10.99] },
  { min: 650, label: 'Fair',      color: '#f59e0b', apr: [11.99, 16.99] },
  { min: 600, label: 'Subprime',  color: '#f97316', apr: [17.99, 23.99] },
  { min: 0,   label: 'May not qualify', color: '#ef4444', apr: [24.99, 35.99] },
]

const LOAN_TERMS = [10, 15, 20, 25]

function getTier(score) {
  return CREDIT_TIERS.find(t => score >= t.min) ?? CREDIT_TIERS[CREDIT_TIERS.length - 1]
}

function midpointApr(tier) {
  return (tier.apr[0] + tier.apr[1]) / 2
}

function monthlyPayment(principal, annualRate, years) {
  if (principal <= 0) return 0
  if (annualRate === 0) return principal / (years * 12)
  const r = annualRate / 100 / 12
  const n = years * 12
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

function CreditGauge({ score }) {
  const tier = getTier(score)
  const pct = Math.min(100, Math.max(0, ((score - 300) / 550) * 100))
  const r = 38, cx = 48, cy = 48
  const circ = 2 * Math.PI * r
  const arc = (pct / 100) * circ * 0.75

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="96" height="78" viewBox="0 0 96 96">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8"
          strokeDasharray={`${circ * 0.75} ${circ * 0.25}`}
          strokeDashoffset={-(circ * 0.125)}
          strokeLinecap="round" transform="rotate(135 48 48)" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={tier.color} strokeWidth="8"
          strokeDasharray={`${arc} ${circ - arc}`}
          strokeDashoffset={-(circ * 0.125)}
          strokeLinecap="round" transform="rotate(135 48 48)"
          style={{ filter: `drop-shadow(0 0 8px ${tier.color}99)`, transition: 'stroke-dasharray 0.6s ease' }} />
        <text x={cx} y={cy - 1} textAnchor="middle" fill="white" fontSize="22" fontWeight="800" fontFamily="Inter, sans-serif">
          {score}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="#64748b" fontSize="11" fontFamily="Inter, sans-serif">FICO</text>
      </svg>
      <span className="text-sm font-semibold" style={{ color: tier.color }}>{tier.label}</span>
    </div>
  )
}

export default function FinancingCard({ netCost, monthlySavings, className = '' }) {
  const [creditScore, setCreditScore] = useState(720)
  const [selectedTerm, setSelectedTerm] = useState(20)

  const tier = useMemo(() => getTier(creditScore), [creditScore])
  const apr = useMemo(() => midpointApr(tier), [tier])

  const loanAmount = Math.max(0, netCost ?? 0)

  const schedules = useMemo(() =>
    LOAN_TERMS.map(years => {
      const payment = monthlyPayment(loanAmount, apr, years)
      const totalPaid = payment * years * 12
      return { years, payment, totalPaid, totalInterest: totalPaid - loanAmount }
    }),
    [loanAmount, apr]
  )

  const selected = schedules.find(s => s.years === selectedTerm) ?? schedules[2]
  const cashFlowPositive = monthlySavings != null && selected.payment < monthlySavings

  const money = (n) => n == null ? '—' : `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  const moneyMo = (n) => n == null ? '—' : `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/mo`

  if (!loanAmount) return null

  return (
    <div className={`rounded-2xl overflow-hidden ${className || ''}`}
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-muted)' }}>

      <div className="h-0.5 w-full"
        style={{ background: 'linear-gradient(90deg, #3b82f6, #60a5fa, transparent)' }} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M2 10h20" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 leading-none">Financing Estimate</h2>
              <p className="text-sm text-slate-500 mt-1">Solar loan · {tier.apr[0]}%–{tier.apr[1]}% APR</p>
            </div>
          </div>
          <CreditGauge score={creditScore} />
        </div>

        {/* Credit score slider */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Credit Score</label>
            <input
              type="number"
              min={300} max={850}
              value={creditScore}
              onChange={e => setCreditScore(Math.min(850, Math.max(300, +e.target.value || 300)))}
              className="w-16 text-right text-sm font-bold text-slate-100 bg-transparent border-none outline-none"
              style={{ colorScheme: 'dark' }}
            />
          </div>
          <input
            type="range"
            min={300} max={850} step={5}
            value={creditScore}
            onChange={e => setCreditScore(+e.target.value)}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${tier.color} ${((creditScore - 300) / 550) * 100}%, rgba(255,255,255,0.08) ${((creditScore - 300) / 550) * 100}%)`,
              accentColor: tier.color,
            }}
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-slate-600">300</span>
            <span className="text-xs text-slate-600">850</span>
          </div>
        </div>

        {/* Term selector */}
        <div className="flex gap-2 mb-4">
          {LOAN_TERMS.map(years => (
            <button
              key={years}
              onClick={() => setSelectedTerm(years)}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
              style={{
                background: selectedTerm === years ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${selectedTerm === years ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.06)'}`,
                color: selectedTerm === years ? '#60a5fa' : '#64748b',
              }}
            >
              {years} yr
            </button>
          ))}
        </div>

        {/* Main payment display */}
        <div className="rounded-xl p-4 mb-3"
          style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-1">
                Est. Monthly Payment
              </p>
              <p className="text-3xl font-extrabold text-slate-100">
                {moneyMo(selected.payment)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">at {apr.toFixed(2)}% APR</p>
              <p className="text-sm text-slate-500">{selectedTerm}-year term</p>
            </div>
          </div>
        </div>

        {/* Cash flow indicator */}
        {monthlySavings != null && (
          <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-3"
            style={{
              background: cashFlowPositive ? 'rgba(16,185,129,0.06)' : 'rgba(249,115,22,0.06)',
              border: `1px solid ${cashFlowPositive ? 'rgba(16,185,129,0.15)' : 'rgba(249,115,22,0.15)'}`,
            }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke={cashFlowPositive ? '#10b981' : '#f97316'} strokeWidth="2.5" strokeLinecap="round">
              {cashFlowPositive ? (
                <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>
              ) : (
                <><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></>
              )}
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: cashFlowPositive ? '#10b981' : '#f97316' }}>
                {cashFlowPositive ? 'Cash-flow positive from day one' : 'Payment exceeds energy savings'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Est. savings: ~{moneyMo(monthlySavings)} vs. payment: ~{moneyMo(selected.payment)}
              </p>
            </div>
          </div>
        )}

        {/* Cost breakdown */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Loan Amount', value: money(loanAmount) },
            { label: 'Total Interest', value: money(selected.totalInterest) },
            { label: 'Total Paid', value: money(selected.totalPaid) },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center gap-1 rounded-xl py-3 px-2"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{label}</span>
              <span className="text-base font-bold text-slate-100">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer — all terms at a glance */}
      <div className="grid grid-cols-4 border-t"
        style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.25)' }}>
        {schedules.map((s, i) => (
          <div key={s.years}
            className={`flex flex-col items-center py-3 gap-0.5 cursor-pointer transition-colors duration-150 ${i < 3 ? 'border-r' : ''}`}
            style={{
              borderColor: 'rgba(255,255,255,0.06)',
              background: s.years === selectedTerm ? 'rgba(59,130,246,0.08)' : 'transparent',
            }}
            onClick={() => setSelectedTerm(s.years)}>
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-widest">{s.years} yr</span>
            <span className="text-base font-semibold text-slate-300">{moneyMo(s.payment)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
