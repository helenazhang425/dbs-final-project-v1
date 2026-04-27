'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import DimensionIcon from '@/components/ui/DimensionIcon';
import RequireAuth from '@/components/auth/RequireAuth';
import {
  formatCategoryLabel,
  getHabitProgress,
  getDateKey,
  getDayDifference,
  initialSlots,
  persistDashboardState,
  readDashboardState,
  type HobbySlot,
  type HobbyStatus,
} from '@/lib/dashboard-state';
import type { HobbyCategory } from '@/lib/types';

type ActiveHobbyCardProps = {
  slot: HobbySlot;
  todayKey: string;
  completionDate: string | null;
  celebrationToken: number | null;
  onComplete: (category: HobbyCategory) => void;
  onReset: (category: HobbyCategory) => void;
};

function getCategoryColor(category: string) {
  switch (category) {
    case 'physical':
      return 'bg-emerald-50 border-emerald-200';
    case 'intellectual':
      return 'bg-blue-50 border-blue-200';
    case 'creative':
      return 'bg-amber-50 border-amber-200';
    default:
      return 'bg-gray-50 border-gray-200';
  }
}

function getStatusBadgeColor(status: HobbyStatus) {
  switch (status) {
    case 'active':
      return 'bg-olive-100 text-olive-800';
    case 'dormant':
      return 'bg-amber-100 text-amber-800';
    case 'empty':
      return 'bg-gray-100 text-gray-800';
  }
}

function getSlotTaskCopy(slot: HobbySlot, completedToday: boolean, missedDay: boolean) {
  if (completedToday) {
    return 'Today is complete.';
  }

  if (missedDay) {
    return slot.restartTask ?? 'Trio adjusted the task downward so restarting feels light instead of punishing.';
  }

  return slot.starterTask ?? 'Take one small step today.';
}

function ActiveHobbyCard({
  slot,
  todayKey,
  completionDate,
  celebrationToken,
  onComplete,
  onReset,
}: ActiveHobbyCardProps) {
  const [confettiPieces, setConfettiPieces] = useState<
    Array<{ left: number; delay: number; size: number; color: string; drift: number }>
  >([]);
  const completedToday = completionDate === todayKey;
  const missedDay =
    Boolean(completionDate) &&
    !completedToday &&
    Boolean(slot.streak) &&
    getDayDifference(todayKey, completionDate as string) >= 2;
  const taskCopy = getSlotTaskCopy(slot, completedToday, missedDay);

  useEffect(() => {
    if (!celebrationToken || !completedToday) {
      return;
    }

    const palette = ['bg-emerald-400', 'bg-lime-400', 'bg-amber-400', 'bg-white', 'bg-olive-500'];
    const pieces = Array.from({ length: 18 }, (_, index) => ({
      left: Math.random() * 100,
      delay: index * 18,
      size: 6 + Math.random() * 5,
      color: palette[index % palette.length],
      drift: (Math.random() - 0.5) * 60,
    }));

    setConfettiPieces(pieces);

    const clear = window.setTimeout(() => setConfettiPieces([]), 1100);
    return () => window.clearTimeout(clear);
  }, [celebrationToken, completedToday]);

  return (
    <div className={`relative overflow-hidden rounded-2xl border-2 p-5 ${getCategoryColor(slot.category)} shadow-sm`}>
      {confettiPieces.length > 0 ? (
        <div className="pointer-events-none absolute inset-0 z-20">
          {confettiPieces.map((piece) => (
            <span
              key={`${piece.left}-${piece.delay}-${piece.size}`}
              className={`absolute top-4 rounded-sm ${piece.color}`}
                style={{
                  left: `${piece.left}%`,
                  width: `${piece.size}px`,
                  height: `${piece.size * 1.6}px`,
                  opacity: 0,
                  transform: `translate3d(0, 0, 0) rotate(0deg)`,
                  animation: `dashboard-confetti-fall 900ms ease-out ${piece.delay}ms forwards`,
                  '--drift': `${piece.drift}px`,
                } as CSSProperties}
            />
          ))}
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <DimensionIcon category={slot.category} className="h-10 w-10" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-olive-700">
              {formatCategoryLabel(slot.category)}
            </p>
            <p className="text-lg font-semibold text-slate-950">{slot.hobby}</p>
          </div>
        </div>
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeColor(slot.status)}`}>
          {completedToday ? 'Completed today' : missedDay ? 'Restart mode' : 'Active'}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <div className="rounded-xl border border-white/80 bg-white/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Today</p>
          <p className="mt-2 text-sm leading-7 text-slate-700">{taskCopy}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/80 bg-white/80 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Streak</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">{slot.streak ?? 0} days</p>
        </div>
        <div className="rounded-xl border border-white/80 bg-white/80 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Progress</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">{getHabitProgress(slot.streak, slot.progress)}%</p>
        </div>
      </div>

      <div className="mt-4 bg-white/80 rounded-full h-2 overflow-hidden">
        <div
          className="h-2 rounded-full bg-olive-600 transition-all"
          style={{ width: `${getHabitProgress(slot.streak, slot.progress)}%` }}
        />
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => (completedToday ? onReset(slot.category) : onComplete(slot.category))}
          className={`inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-medium transition-colors sm:w-auto ${
            completedToday
              ? 'bg-olive-200 text-olive-800 hover:bg-olive-300'
              : 'bg-olive-600 text-white hover:bg-olive-700'
          }`}
        >
          {completedToday ? 'Reset today' : 'Mark today complete'}
        </button>
        <Link
          href={`/plan/${slot.category}`}
          className="inline-flex w-full items-center justify-center rounded-lg border border-olive-200 bg-white px-4 py-3 text-sm font-medium text-olive-800 transition-colors hover:bg-olive-50 sm:w-auto"
        >
          Manage plan
        </Link>
      </div>

      <style jsx>{`
        @keyframes dashboard-confetti-fall {
          0% {
            opacity: 0;
            transform: translate3d(0, 0, 0) rotate(0deg);
          }
          15% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate3d(var(--drift), 92px, 0) rotate(220deg);
          }
        }
      `}</style>
    </div>
  );
}

function getEmptySlotCopy(category: HobbySlot['category']) {
  switch (category) {
    case 'physical':
      return 'Start with a 10-minute physical habit. Walking, running, lifting, or yoga all count if the first step is small.';
    case 'intellectual':
      return 'Pick one mind-focused habit and keep it tiny: reading a few pages, learning a few words, or trying one new skill.';
    case 'creative':
      return 'Choose one making habit and make the first session short: music, cooking, drawing, or writing all work.';
    default:
      return 'Choose a hobby that fits your life and start small.';
  }
}

function getActionButton(slot: HobbySlot) {
  if (slot.status === 'active') {
    return (
      <Link
        href={`/plan/${slot.category}`}
        className="w-full rounded-lg bg-olive-600 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-olive-700"
      >
        View Today's Task
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
    const startLabel =
      slot.category === 'physical'
        ? 'Explore movement'
        : slot.category === 'intellectual'
          ? 'Explore intellect'
          : 'Explore creativity';

    const buttonClassName =
      slot.category === 'physical'
        ? 'bg-olive-600 text-white hover:bg-olive-700'
        : slot.category === 'intellectual'
          ? 'bg-blue-600 text-white hover:bg-blue-700'
          : 'bg-amber-600 text-white hover:bg-amber-700';

    return (
      <Link
        href={`/discover?category=${slot.category}`}
        className={`w-full rounded-lg px-4 py-2 text-center text-sm font-medium transition-colors ${buttonClassName}`}
      >
        {startLabel}
      </Link>
    );
  }
}

type CategoryPanelProps = {
  slot: HobbySlot;
  todayKey: string;
  completionDate: string | null;
  celebrationToken: number | null;
  onComplete: (category: HobbyCategory) => void;
  onReset: (category: HobbyCategory) => void;
};

function CategoryPanel({
  slot,
  todayKey,
  completionDate,
  celebrationToken,
  onComplete,
  onReset,
}: CategoryPanelProps) {
  if (slot.status === 'active') {
    return (
      <ActiveHobbyCard
        slot={slot}
        todayKey={todayKey}
        completionDate={completionDate}
        celebrationToken={celebrationToken}
        onComplete={onComplete}
        onReset={onReset}
      />
    );
  }

  return (
    <div className={`rounded-2xl border-2 p-5 ${getCategoryColor(slot.category)} shadow-sm`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <DimensionIcon category={slot.category} className="h-10 w-10" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-olive-700">
              {formatCategoryLabel(slot.category)}
            </p>
            <p className="text-lg font-semibold text-slate-950">
              {slot.status === 'dormant' ? 'Paused for now' : 'Ready to start'}
            </p>
          </div>
        </div>
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeColor(slot.status)}`}>
          {slot.status === 'empty' ? 'Discover' : 'Dormant'}
        </span>
      </div>

      <div className="mt-4">
        {slot.status === 'dormant' ? (
          <p className="text-gray-500">Paused - ready to restart when you are</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
              Ready when you are
            </p>
            <p className="text-gray-500">{getEmptySlotCopy(slot.category)}</p>
          </div>
        )}
      </div>

      <div className="mt-5">{getActionButton(slot)}</div>
    </div>
  );
}

export default function Dashboard() {
  const [slots, setSlots] = useState<HobbySlot[]>(initialSlots);
  const [completionHistory, setCompletionHistory] = useState<Partial<Record<HobbyCategory, string>>>({});
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedTab, setSelectedTab] = useState<HobbyCategory>('physical');
  const [celebration, setCelebration] = useState<{ category: HobbyCategory; token: number } | null>(null);

  const activeSlots = slots.filter((slot) => slot.status === 'active');
  const emptySlots = slots.filter((slot) => slot.status === 'empty');
  const todayKey = getDateKey(new Date());
  const completedActiveCount = activeSlots.filter(
    (slot) => completionHistory[slot.category] === todayKey
  ).length;

  useEffect(() => {
    const savedState = readDashboardState();
    setSlots(savedState.slots);
    setCompletionHistory(savedState.completionHistory);
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    persistDashboardState({
      slots,
      completionHistory,
    });
  }, [completionHistory, isHydrated, slots]);

  const handleCompleteToday = (category: HobbyCategory) => {
    const currentSlot = slots.find((slot) => slot.category === category && slot.status === 'active');
    const completedDate = completionHistory[category] ?? null;

    if (!currentSlot || completedDate === todayKey) {
      return;
    }

    const missedDay =
      Boolean(completedDate) &&
      Boolean(currentSlot.streak) &&
      getDayDifference(todayKey, completedDate as string) >= 2;

    setSlots((currentSlots) =>
      currentSlots.map((slot) =>
        slot.status === 'active' && slot.category === category
          ? {
              ...slot,
              starterTask: slot.nextTask ?? 'Next up: keep the streak going tomorrow',
              streak: missedDay ? 1 : (slot.streak ?? 0) + 1,
              progress: getHabitProgress(missedDay ? 1 : (slot.streak ?? 0) + 1),
            }
          : slot
      )
    );
    setCompletionHistory((currentHistory) => ({
      ...currentHistory,
      [category]: todayKey,
    }));
    setCelebration({ category, token: Date.now() });
  };

  const handleResetToday = (category: HobbyCategory) => {
    const currentSlot = slots.find((slot) => slot.category === category && slot.status === 'active');
    const completedDate = completionHistory[category];

    if (!currentSlot || completedDate !== todayKey) {
      return;
    }

    setSlots((currentSlots) =>
      currentSlots.map((slot) =>
        slot.status === 'active' && slot.category === category
          ? {
              ...slot,
              streak: Math.max((slot.streak ?? 0) - 1, 0),
              progress: getHabitProgress(Math.max((slot.streak ?? 0) - 1, 0)),
            }
          : slot
      )
    );
    setCompletionHistory((currentHistory) => {
      const nextHistory = { ...currentHistory };
      delete nextHistory[category];
      return nextHistory;
    });
    setCelebration((currentCelebration) =>
      currentCelebration?.category === category ? null : currentCelebration
    );
  };

  const openSlotCount = emptySlots.length;
  const categories: HobbyCategory[] = ['physical', 'intellectual', 'creative'];

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

        <div className="mb-8 overflow-hidden rounded-2xl border border-olive-200 bg-[linear-gradient(135deg,#f7f9ef,#edf3de)] shadow-sm">
          <div className="border-b border-olive-100 bg-white/70 px-6 py-5">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Hobbies in progress</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{activeSlots.length}</p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Hobbies completed today</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{completedActiveCount}</p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Open hobby slots</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{openSlotCount}</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-6">
            <div role="tablist" aria-label="Dashboard categories" className="grid grid-cols-3 gap-2">
              {categories.map((tab) => {
                const isSelected = selectedTab === tab;
                const tabStyles =
                  tab === 'physical'
                    ? isSelected
                      ? 'border-emerald-300 bg-emerald-100 text-slate-950 shadow-[0_-6px_18px_rgba(34,128,88,0.16)]'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-950 hover:bg-emerald-100'
                    : tab === 'intellectual'
                      ? isSelected
                        ? 'border-blue-300 bg-blue-100 text-slate-950 shadow-[0_-6px_18px_rgba(59,130,246,0.16)]'
                        : 'border-blue-200 bg-blue-50 text-blue-950 hover:bg-blue-100'
                      : isSelected
                        ? 'border-amber-300 bg-amber-100 text-slate-950 shadow-[0_-6px_18px_rgba(194,129,37,0.16)]'
                        : 'border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100';

                return (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setSelectedTab(tab)}
                    className={`relative flex h-10 w-full items-center justify-center rounded-t-[1rem] border px-4 text-sm font-semibold capitalize transition-colors duration-150 ease-out ${
                      isSelected ? 'z-10 -mb-px' : ''
                    } ${tabStyles}`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 min-h-[24rem]">
              {categories.map((category) => {
                const slot = slots.find((currentSlot) => currentSlot.category === category);

                if (!slot) {
                  return null;
                }

                const isSelected = selectedTab === category;

                return (
                  <div key={category} hidden={!isSelected} aria-hidden={!isSelected}>
                    <CategoryPanel
                      slot={slot}
                      todayKey={todayKey}
                      completionDate={completionHistory[slot.category] ?? null}
                      celebrationToken={celebration?.category === slot.category ? celebration.token : null}
                      onComplete={handleCompleteToday}
                      onReset={handleResetToday}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
