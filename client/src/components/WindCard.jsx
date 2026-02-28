export default function WindCard({ data, className = '' }) {
  if (!data) return null
  const { feasible, avgWindSpeed, recommendation } = data

  return (
    <article className={`glass-card p-6 transition-transform duration-300 hover:border-slate-600/80 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-400/15">
            <svg className="h-6 w-6 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0M3 15a3 3 0 116 0M15 15a3 3 0 116 0" />
            </svg>
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-white">Wind</h2>
            <p className="text-xs text-slate-500">Feasibility</p>
          </div>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
            feasible
              ? 'bg-green-500/20 text-green-400'
              : 'bg-amber-500/20 text-amber-300'
          }`}
        >
          {feasible ? 'Recommended' : 'Not recommended'}
        </span>
      </div>

      <div className="mt-5 space-y-3 border-t border-slate-700/50 pt-5">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Avg wind speed</span>
          <span className="font-medium text-slate-200">{avgWindSpeed} m/s</span>
        </div>
        <p className="rounded-lg bg-slate-700/30 px-3 py-2.5 text-xs leading-relaxed text-slate-400">
          {recommendation}
        </p>
      </div>
    </article>
  )
}
