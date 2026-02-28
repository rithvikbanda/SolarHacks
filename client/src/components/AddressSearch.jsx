import { useState } from 'react'

export default function AddressSearch({ onSelect, placeholder = 'Enter address', className = '' }) {
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (trimmed) onSelect(trimmed)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`group relative overflow-hidden rounded-2xl border bg-slate-800/40 backdrop-blur-xl transition-all duration-300 ${
        focused ? 'border-green-500/50 shadow-[0_0_32px_-6px_rgba(34,197,94,0.2)]' : 'border-slate-600/60 hover:border-slate-500/60'
      } ${className}`}
    >
      <div className="flex gap-0">
        <div className="relative flex flex-1">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </span>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            className="w-full bg-transparent py-4 pl-12 pr-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-0"
            aria-label="Address"
          />
        </div>
        <button
          type="submit"
          className="relative m-1.5 shrink-0 rounded-xl bg-green-600 px-6 font-semibold text-white shadow-lg shadow-green-500/20 transition-all duration-200 hover:bg-green-500 hover:shadow-green-500/30 active:scale-[0.98]"
        >
          See my roadmap
        </button>
      </div>
    </form>
  )
}
