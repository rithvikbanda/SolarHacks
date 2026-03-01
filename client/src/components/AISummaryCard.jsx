import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export default function AISummaryCard({ report, state, className = '' }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!report) return
    setSummary(null)
    setError(null)
    setLoading(true)

    const body = {
      system_size_kw: report.system_size_kw ?? null,
      panel_count: report.panel_count ?? null,
      solar_production_kwh: report.solar_production_kwh ?? null,
      price_per_kwh: report.solar?.price_per_kwh ?? null,
      gross_cost: report.deterministic?.gross_cost ?? null,
      net_cost: report.deterministic?.net_cost ?? null,
      payback_years: report.deterministic?.payback_years ?? null,
      incentives_total: report.incentives?.total_value ?? null,
      wind_feasible: report.wind?.feasible ?? null,
      wind_classification: report.wind?.classification ?? null,
      geothermal_score: report.geothermal?.score ?? null,
      geothermal_suitability: report.geothermal?.suitability ?? null,
      carbon_offset_tons: report.deterministic?.carbon_offset_tons ?? null,
      state: state ?? null,
    }

    fetch(`${API}/api/ai-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`Status ${r.status}`)
        return r.json()
      })
      .then((data) => setSummary(data.summary))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [report, state])

  return (
    <div
      className={`rounded-2xl overflow-hidden ${className}`}
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-muted)' }}
    >
      <div
        className="h-0.5 w-full"
        style={{ background: 'linear-gradient(90deg, #818cf8, #a78bfa, transparent)' }}
      />

      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(129,140,248,0.15)', border: '1px solid rgba(129,140,248,0.25)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 leading-none">AI Recommendation</h2>
            <p className="text-sm text-slate-500 mt-1">Personalized analysis powered by GPT-4o</p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-3 py-2">
            <svg className="animate-spin w-4 h-4 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span className="text-sm text-slate-400">Generating your personalized recommendation…</span>
          </div>
        )}

        {error && !loading && (
          <p className="text-sm text-red-400">Could not generate summary — check that OPENAI_API_KEY is set.</p>
        )}

        {summary && !loading && (
          <div className="text-base text-slate-300 leading-relaxed">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="m-0">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold text-slate-100">{children}</strong>,
              }}
            >
              {summary}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}