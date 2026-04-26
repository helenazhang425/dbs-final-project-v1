'use client';

import { useState } from 'react';
import Link from 'next/link';
import RequireAuth from '@/components/auth/RequireAuth';

type HobbyStatus = 'empty' | 'active' | 'dormant';

interface HobbySlot {
  category: 'physical' | 'intellectual' | 'creative';
  status: HobbyStatus;
  hobby?: string;
  starterTask?: string;
  progress?: number;
  streak?: number;
}

export default function Dashboard() {
  const [slots] = useState<HobbySlot[]>([
    {
      category: 'physical',
      status: 'active',
      hobby: 'Running',
      starterTask: 'Today: 10-minute walk-run',
      progress: 60,
      streak: 5,
    },
    {
      category: 'intellectual',
      status: 'empty',
    },
    {
      category: 'creative',
      status: 'empty',
    },
  ]);

  const activeSlot = slots.find((slot) => slot.status === 'active');

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'physical':
        return '💪';
      case 'intellectual':
        return '🧠';
      case 'creative':
        return '🎨';
      default:
        return '✨';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'physical':
        return 'bg-emerald-50 border-emerald-200';
      case 'intellectual':
        return 'bg-lime-50 border-lime-200';
      case 'creative':
        return 'bg-amber-50 border-amber-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusBadgeColor = (status: HobbyStatus) => {
    switch (status) {
      case 'active':
        return 'bg-olive-100 text-olive-800';
      case 'dormant':
        return 'bg-amber-100 text-amber-800';
      case 'empty':
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionButton = (slot: HobbySlot) => {
    if (slot.status === 'active') {
      return (
        <Link
          href={`/plan/${slot.category}`}
          className="w-full rounded-lg bg-olive-600 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-olive-700"
        >
          View Today&apos;s Task
        </Link>
      );
    } else if (slot.status === 'dormant') {
      return (
        <Link
          href={`/discover?category=${slot.category}`}
          className="w-full rounded-lg bg-amber-600 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-amber-700"
        >
          Reactivate
        </Link>
      );
    } else {
      return (
        <Link
          href={`/discover?category=${slot.category}`}
          className="w-full rounded-lg bg-olive-600 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-olive-700"
        >
          Discover & Start
        </Link>
      );
    }
  };

  return (
    <RequireAuth>
      <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          Keep building the life you want to come back to.
        </h1>
        <p className="text-gray-600">
          One physical, one intellectual, and one creative hobby, growing at a pace that fits real life.
        </p>
      </div>

      {activeSlot ? (
        <div className="mb-8 overflow-hidden rounded-2xl border border-olive-200 bg-[linear-gradient(135deg,#f7f9ef,#edf3de)] shadow-sm">
          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-olive-700">
                Today
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-950">
                {activeSlot.starterTask ?? 'Take one small step today.'}
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-700">
                Your active hobby right now is <span className="font-semibold text-slate-950">{activeSlot.hobby}</span>.
                The goal is not intensity. It is consistency that feels realistic enough to repeat tomorrow.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <span className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-olive-200">
                  Category: Physical
                </span>
                <span className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-olive-200">
                  Streak: {activeSlot.streak} days
                </span>
                <span className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-olive-200">
                  Progress: {activeSlot.progress}%
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/80 bg-white/80 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-olive-700">
                Why this works
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                Today&apos;s task is intentionally small. If you miss a day, Trio adjusts the plan so
                restarting stays light instead of all-or-nothing.
              </p>
              <Link
                href={`/plan/${activeSlot.category}`}
                className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-olive-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-olive-700"
              >
                Open today&apos;s plan
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-8 rounded-lg border border-olive-200 bg-olive-50 p-4">
        <h3 className="mb-2 text-sm font-semibold text-olive-900">
          🎯 Recommendation
        </h3>
        <p className="text-sm text-olive-800">
          You&apos;re doing great with your physical hobby. After 2 more weeks of consistency,
          Trio can suggest an intellectual hobby to balance your routine.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {slots.map((slot) => (
          <div
            key={slot.category}
            className={`p-6 rounded-xl border-2 ${getCategoryColor(
              slot.category
            )} transition-all hover:shadow-lg`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <span className="text-3xl mr-3">{getCategoryIcon(slot.category)}</span>
                <h2 className="text-xl font-semibold text-gray-900 capitalize">
                  {slot.category}
                </h2>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                  slot.status
                )}`}
              >
                {slot.status === 'empty' ? 'Discover' : slot.status === 'active' ? 'Active' : 'Dormant'}
              </span>
            </div>

            <div className="min-h-24 mb-4">
              {slot.status === 'active' && slot.hobby ? (
                <div>
                  <p className="font-medium text-gray-900 mb-1">{slot.hobby}</p>
                  {slot.starterTask ? (
                    <p className="mb-2 text-sm text-gray-600">{slot.starterTask}</p>
                  ) : null}
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Streak: {slot.streak} days</span>
                    <span>Progress: {slot.progress}%</span>
                  </div>
                  <div className="mt-2 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-olive-600 transition-all"
                      style={{ width: `${slot.progress}%` }}
                    />
                  </div>
                </div>
              ) : slot.status === 'dormant' ? (
                <p className="text-gray-600">Paused - ready to restart when you are</p>
              ) : (
                <p className="text-gray-600">
                  Discover a {slot.category} hobby tailored to your life
                </p>
              )}
            </div>

            {getActionButton(slot)}
          </div>
        ))}
      </div>

      <div className="mt-12 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          About the Three-Hobby Philosophy
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
          <div>
            <strong>Physical:</strong> Keeps your body healthy and energized.
            Running, sports, fitness, dance.
          </div>
          <div>
            <strong>Intellectual:</strong> Keeps your mind sharp curious.
            Languages, reading, learning new skills.
          </div>
          <div>
            <strong>Creative:</strong> Keeps your spirit fulfilled expressive.
            Music, art, cooking, writing.
          </div>
        </div>
      </div>
      </div>
    </RequireAuth>
  );
}
