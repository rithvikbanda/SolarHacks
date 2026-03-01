import React, { useState } from 'react';

export default function PanelWattInput({ value, onChange }) {
  const [raw, setRaw] = useState(String(value));

  function handleChange(e) {
    const text = e.target.value;
    if (text !== '' && !/^\d+$/.test(text)) return;
    setRaw(text);
    const n = Number(text);
    if (text !== '' && n > 0) onChange(n);
  }

  function handleBlur() {
    const n = Number(raw);
    if (!raw || n <= 0) {
      setRaw(String(value));
    }
  }

  return (
    <div className="flex items-center gap-3">
      <label className="text-xs font-medium text-slate-400 whitespace-nowrap">Panel wattage</label>
      <input
        type="text"
        inputMode="numeric"
        value={raw}
        onChange={handleChange}
        onBlur={handleBlur}
        className="w-24 rounded-md border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200 font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
      />
      <span className="text-xs text-slate-500">W</span>
    </div>
  );
}
