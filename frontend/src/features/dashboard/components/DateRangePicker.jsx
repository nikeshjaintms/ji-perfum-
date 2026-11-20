import React, { useState } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';

const PRESETS = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: 'thisMonth', label: 'This Month' },
  { id: 'lastMonth', label: 'Last Month' },
  { id: 'custom', label: 'Custom Range' },
];

export default function DateRangePicker({
  range = '30d',
  from = '',
  to = '',
  onChange,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(from || '');
  const [customTo, setCustomTo] = useState(to || '');

  const activePreset = PRESETS.find((p) => p.id === range) || PRESETS[2];

  const handleSelectPreset = (presetId) => {
    if (presetId === 'custom') {
      onChange({ range: 'custom', from: customFrom, to: customTo });
    } else {
      onChange({ range: presetId, from: null, to: null });
      setIsOpen(false);
    }
  };

  const handleApplyCustom = (e) => {
    e.preventDefault();
    if (customFrom && customTo) {
      onChange({ range: 'custom', from: customFrom, to: customTo });
      setIsOpen(false);
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 shadow-sm transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/20"
      >
        <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span>{range === 'custom' && from && to ? `${from} to ${to}` : activePreset.label}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-3 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
          <div className="space-y-1 pb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">Quick Presets</span>
            {PRESETS.filter((p) => p.id !== 'custom').map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPreset(p.id)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  range === p.id ? 'bg-amber-50 text-amber-900 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{p.label}</span>
                {range === p.id && <Check className="w-3.5 h-3.5 text-amber-600" />}
              </button>
            ))}
          </div>

          <div className="pt-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2 block">Custom Range</span>
            <form onSubmit={handleApplyCustom} className="space-y-2 px-1">
              <div>
                <label className="text-[10px] font-medium text-slate-500 block mb-1">From Date</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-500 block mb-1">To Date</label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-800"
                />
              </div>
              <button
                type="submit"
                disabled={!customFrom || !customTo}
                className="w-full mt-2 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
              >
                Apply Range
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
