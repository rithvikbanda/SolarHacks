const TYPE_META = {
  federal: { color: '#60a5fa', label: 'Federal' },
  state:   { color: '#a78bfa', label: 'State'   },
  utility: { color: '#fbbf24', label: 'Utility'  },
  Federal: { color: '#60a5fa', label: 'Federal' },
  State:   { color: '#a78bfa', label: 'State'   },
  Utility: { color: '#fbbf24', label: 'Utility'  },
}

export default function IncentivesPanel({ incentives: data, hasIncome, ownerStatus, className = '' }) {
  const list  = data?.incentives ?? []
  const total = data?.total_value ?? 0
  const money = (n) => `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  const isRenter = ownerStatus === 'renter'

  return (
    <div className={`rounded-2xl overflow-hidden ${className || ''}`}
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-muted)' }}>

      {/* Accent */}
      <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, #a78bfa, #c4b5fd, transparent)' }} />

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.2)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6"/>
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-none">Incentives</h2>
            {total > 0 && (
              <p className="text-xs text-slate-500 mt-1">{list.length} program{list.length !== 1 ? 's' : ''} available</p>
            )}
          </div>
        </div>
        {total > 0 && (
          <div className="text-right">
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Total</p>
            <p className="text-2xl font-extrabold text-emerald-400 leading-none">{money(total)}</p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-5 pb-5">
        {isRenter && (
          <div className="flex items-start gap-3 rounded-xl p-3 mb-4"
            style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
            <svg className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-xs text-amber-200/90 leading-relaxed">
              Renters typically cannot claim rooftop solar tax credits or rebates. Results may show community solar or other options where applicable.
            </p>
          </div>
        )}
        {!hasIncome ? (
          <div className="flex items-start gap-3 rounded-xl p-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <svg className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
            </svg>
            <p className="text-sm text-slate-400 leading-relaxed">
              Enter your household income above to see available rebates and tax credits.
            </p>
          </div>
        ) : list.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">No incentives found for this location.</p>
        ) : (
          <div className="space-y-2">
            {list.map((item, i) => {
              const m = TYPE_META[item.type] ?? { color: '#94a3b8', label: item.type }
              return (
                <div key={i} className="flex items-center justify-between gap-4 rounded-xl px-4 py-3"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-1 h-8 rounded-full shrink-0" style={{ background: m.color }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200 leading-snug truncate">{item.name}</p>
                      <p className="text-[10px] font-semibold mt-0.5" style={{ color: m.color }}>{m.label}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-emerald-400 shrink-0">{item.amount}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
