'use client';

import type { HobbyCategory } from '@/lib/types';

interface HobbySuggestionCardProps {
  hobby: {
    name: string;
    reason: string;
    category: HobbyCategory;
    starter_plan: {
      duration: string;
      frequency: string;
      first_task: string;
    };
  };
  onSelect: (hobby: HobbySuggestionCardProps['hobby']) => void;
}

function getCategoryAccent(category: HobbyCategory) {
  switch (category) {
    case 'physical':
      return {
        card: 'border-emerald-200',
        panel: 'border-emerald-200 bg-emerald-50/70',
        button: 'bg-emerald-600 hover:bg-emerald-700',
      };
    case 'intellectual':
      return {
        card: 'border-blue-200',
        panel: 'border-blue-200 bg-blue-50/70',
        button: 'bg-blue-600 hover:bg-blue-700',
      };
    case 'creative':
      return {
        card: 'border-amber-200',
        panel: 'border-amber-200 bg-amber-50/70',
        button: 'bg-amber-600 hover:bg-amber-700',
      };
    default:
      return {
        card: 'border-slate-200',
        panel: 'border-slate-200 bg-slate-50',
        button: 'bg-slate-900 hover:bg-slate-800',
      };
  }
}

export default function HobbySuggestionCard({ hobby, onSelect }: HobbySuggestionCardProps) {
  const accent = getCategoryAccent(hobby.category);

  return (
    <div className={`flex h-full flex-col rounded-2xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md ${accent.card}`}>
      <div className="grid flex-1 grid-rows-[12rem_16.5rem] gap-6">
        <div className="overflow-hidden">
          <h3 className="text-2xl font-semibold tracking-tight text-slate-950">{hobby.name}</h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">{hobby.reason}</p>
        </div>

        <div className={`flex h-[16.5rem] flex-col rounded-xl border p-5 ${accent.panel}`}>
          <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-900">Starter Plan</h4>
          <div className="mt-4 grid h-full grid-rows-[auto_auto_1fr] gap-3 text-sm text-slate-700">
            <div className="grid gap-1">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Frequency</p>
              <p className="font-medium text-slate-900">{hobby.starter_plan.frequency}</p>
            </div>
            <div className="grid gap-1">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Duration</p>
              <p className="font-medium text-slate-900">{hobby.starter_plan.duration}</p>
            </div>
            <div className="grid gap-1">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">First task</p>
              <p className="font-medium leading-6 text-slate-900">{hobby.starter_plan.first_task}</p>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => onSelect(hobby)}
        className={`mt-6 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition-colors ${accent.button}`}
      >
        Choose this plan
      </button>
    </div>
  );
}
