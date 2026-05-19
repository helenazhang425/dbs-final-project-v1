'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import DimensionIcon from '@/components/ui/DimensionIcon';
import {
  formatCategoryLabel,
  formatRecoveryDate,
  getHabitProgress,
  getDateKey,
  getInitialDashboardState,
  getMissedDayCount,
  initialSlots,
  type RecoveryNote,
  type HobbySlot,
  type HobbyStatus,
} from '@/lib/dashboard-state';
import { persistSyncedDashboardStateNow, readSyncedDashboardState } from '@/lib/dashboard-sync';
import type { HobbyCategory } from '@/lib/types';

const CATEGORY_SEQUENCE: HobbyCategory[] = ['physical', 'intellectual', 'creative'];
const NEXT_SLOT_UNLOCK_PROGRESS = 50;
const RESTART_RECOMMENDATION_DAYS = 3;
const SWITCH_SUGGESTION_DAYS = 7;

type ActiveHobbyCardProps = {
  slot: HobbySlot;
  todayKey: string;
  completionDate: string | null;
  recoveryNote?: RecoveryNote | null;
  celebrationToken: number | null;
  onComplete: (category: HobbyCategory) => void;
  onReset: (category: HobbyCategory) => void;
};

type CrossCategoryInsight = {
  title: string;
  body: string;
  pairing: string;
  href: string;
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

function normalizeTaskText(value?: string) {
  if (!value) {
    return value;
  }

  return value
    .replace(/^Today:\s*/i, '')
    .replace(/^Restart gently:\s*/i, '')
    .replace(/\s+tomorrow\.?$/i, '')
    .trim();
}

function getSlotTaskCopy(
  slot: HobbySlot,
  completedToday: boolean,
  missedDay: boolean,
  recoveryNote?: RecoveryNote | null
) {
  if (completedToday) {
    return 'Hooray, you showed up today!';
  }

  if (recoveryNote && !recoveryNote.resolvedDate) {
    const starterTask = normalizeTaskText(slot.starterTask);
    const recoveryTask = starterTask ?? 'Take one small step today.';

    switch (recoveryNote.action) {
      case 'pause':
        return `Your return session: ${recoveryTask}.`;
      case 'swap':
        return `Your better-fit restart: ${recoveryTask}.`;
      default:
        return `Your smaller reset: ${recoveryTask}.`;
    }
  }

  if (missedDay) {
    const restartTask = normalizeTaskText(slot.restartTask);

    return restartTask
      ? `Ease back in with ${restartTask}.`
      : 'Ease back in with a smaller step today.';
  }

  const starterTask = normalizeTaskText(slot.starterTask);

  return starterTask ? `Your move today: ${starterTask}.` : 'Take one small step today.';
}

function getSeededValue(seed: number, offset: number) {
  const raw = Math.sin(seed * 12.9898 + offset * 78.233) * 43758.5453;
  return raw - Math.floor(raw);
}

function getCrossCategoryInsight(
  slots: HobbySlot[],
  completionHistory: Partial<Record<HobbyCategory, string>>,
  todayKey: string
): CrossCategoryInsight | null {
  const activeSlots = CATEGORY_SEQUENCE.map((category) =>
    slots.find((slot) => slot.category === category && slot.status === 'active')
  ).filter((slot): slot is HobbySlot => Boolean(slot));

  if (activeSlots.length < 2) {
    return null;
  }

  const physicalSlot = activeSlots.find((slot) => slot.category === 'physical');
  const creativeSlot = activeSlots.find((slot) => slot.category === 'creative');
  const intellectualSlot = activeSlots.find((slot) => slot.category === 'intellectual');
  const firstIncompleteSlot =
    activeSlots.find((slot) => completionHistory[slot.category] !== todayKey) ?? activeSlots[0];

  if (physicalSlot && creativeSlot) {
    return {
      title: 'Pair movement with making.',
      body: `Try ${creativeSlot.hobby ?? 'your creative hobby'} after ${physicalSlot.hobby ?? 'your physical hobby'} once this week. A short movement session can make the creative start feel less cold.`,
      pairing: `${physicalSlot.hobby ?? 'Physical'} + ${creativeSlot.hobby ?? 'Creative'}`,
      href: `/plan/${creativeSlot.category}`,
    };
  }

  if (physicalSlot && intellectualSlot) {
    return {
      title: 'Use movement as a mental warm-up.',
      body: `Try ${intellectualSlot.hobby ?? 'your intellectual hobby'} after ${physicalSlot.hobby ?? 'your physical hobby'} on one low-pressure day. The goal is a smoother start, not a longer routine.`,
      pairing: `${physicalSlot.hobby ?? 'Physical'} + ${intellectualSlot.hobby ?? 'Intellectual'}`,
      href: `/plan/${intellectualSlot.category}`,
    };
  }

  if (creativeSlot && intellectualSlot) {
    return {
      title: 'Alternate input and output.',
      body: `Pair ${intellectualSlot.hobby ?? 'your intellectual hobby'} with ${creativeSlot.hobby ?? 'your creative hobby'} this week: learn a little, then make something small from it.`,
      pairing: `${intellectualSlot.hobby ?? 'Intellectual'} + ${creativeSlot.hobby ?? 'Creative'}`,
      href: `/plan/${creativeSlot.category}`,
    };
  }

  return {
    title: 'Protect the next unfinished category.',
    body: `${firstIncompleteSlot.hobby ?? `Your ${firstIncompleteSlot.category} hobby`} is the next useful anchor today. Keep the session short so the full balance stays realistic.`,
    pairing: activeSlots.map((slot) => slot.hobby ?? formatCategoryLabel(slot.category)).join(' + '),
    href: `/plan/${firstIncompleteSlot.category}`,
  };
}

function ActiveHobbyCard({
  slot,
  todayKey,
  completionDate,
  recoveryNote,
  celebrationToken,
  onComplete,
  onReset,
}: ActiveHobbyCardProps) {
  const completedToday = completionDate === todayKey;
  const missedDays = completedToday ? 0 : getMissedDayCount(todayKey, completionDate);
  const restartRecommended = missedDays >= RESTART_RECOMMENDATION_DAYS;
  const switchSuggested = missedDays >= SWITCH_SUGGESTION_DAYS;
  const hasActiveRecovery = Boolean(recoveryNote && !recoveryNote.resolvedDate);
  const taskCopy = getSlotTaskCopy(slot, completedToday, missedDays > 0, recoveryNote);

  const confettiPieces = useMemo(() => {
    if (!celebrationToken || !completedToday) {
      return [];
    }

    const palette = ['bg-emerald-400', 'bg-lime-400', 'bg-amber-400', 'bg-white', 'bg-olive-500'];
    const seed = celebrationToken;

    return Array.from({ length: 18 }, (_, index) => ({
      left: getSeededValue(seed, index + 1) * 100,
      delay: index * 18,
      size: 6 + getSeededValue(seed, index + 21) * 5,
      color: palette[index % palette.length],
      drift: (getSeededValue(seed, index + 41) - 0.5) * 60,
    }));
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
            <p className="text-xl font-semibold text-slate-950 sm:text-2xl">{slot.hobby}</p>
          </div>
        </div>
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeColor(slot.status)}`}>
          {completedToday ? 'Completed today' : switchSuggested ? 'Needs reset' : restartRecommended ? 'Restart mode' : 'Active'}
        </span>
      </div>

      <div className="mt-5 space-y-3">
        <div className="rounded-[1.4rem] border border-white/90 bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Today</p>
          <p className="mt-3 text-2xl leading-[1.45] text-slate-900 sm:text-[1.65rem]">{taskCopy}</p>
        </div>
        {recoveryNote ? (
          <div className="rounded-[1.2rem] border border-white/90 bg-white/90 px-4 py-4 text-sm text-slate-700 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-olive-700">
              {recoveryNote.resolvedDate ? 'Recovery completed' : 'Latest recovery adjustment'}
            </p>
            <p className="mt-2 leading-6">
              {recoveryNote.resolvedDate
                ? `${recoveryNote.detail} You completed the adjusted plan on ${formatRecoveryDate(recoveryNote.resolvedDate)}.`
                : `${recoveryNote.detail} Updated ${formatRecoveryDate(recoveryNote.date)}.`}
            </p>
          </div>
        ) : null}
        {restartRecommended && !hasActiveRecovery ? (
          <div className="rounded-[1.2rem] border border-amber-200 bg-amber-50/95 p-5 text-sm text-amber-950">
            <p className="font-semibold">
              {switchSuggested ? 'This hobby may need a reset.' : 'Trio recommends a smaller restart.'}
            </p>
            <p className="mt-2 leading-6 text-amber-900/90">
              {switchSuggested
                ? `You have missed ${missedDays} days. Shrink the plan or switch to a different ${slot.category} hobby if this one is not fitting real life right now.`
                : `You have missed ${missedDays} days. Lower the bar for this week so showing up again feels realistic.`}
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/plan/${slot.category}`}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-amber-600 px-4 text-sm font-medium text-white transition-colors hover:bg-amber-700"
              >
                Adjust this plan
              </Link>
              {switchSuggested ? (
                <Link
                  href={`/discover?category=${slot.category}&mode=switch&current=${encodeURIComponent(slot.hobby ?? '')}`}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-amber-300 bg-white px-4 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-100"
                >
                  Try a different hobby
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/80 bg-white/80 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Streak</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">{slot.streak ?? 0} days</p>
        </div>
        <div className="rounded-xl border border-white/80 bg-white/80 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Progress: {getHabitProgress(slot.streak, slot.progress)}%
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
            <div
              className="h-2 rounded-full bg-olive-600 transition-all"
              style={{ width: `${getHabitProgress(slot.streak, slot.progress)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => (completedToday ? onReset(slot.category) : onComplete(slot.category))}
          className={`inline-flex h-10 w-full items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors sm:w-auto ${
            completedToday
              ? 'bg-olive-200 text-olive-800 hover:bg-olive-300'
              : 'bg-olive-600 text-white hover:bg-olive-700'
          }`}
        >
          {completedToday ? 'Reset today' : 'Mark today complete'}
        </button>
        <Link
          href={`/plan/${slot.category}`}
          className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-olive-200 bg-white px-4 text-sm font-medium text-olive-800 transition-colors hover:bg-olive-50 sm:w-auto"
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

function getPrerequisiteCategory(category: HobbyCategory) {
  const categoryIndex = CATEGORY_SEQUENCE.indexOf(category);

  if (categoryIndex <= 0) {
    return null;
  }

  return CATEGORY_SEQUENCE[categoryIndex - 1];
}

function isSlotUnlocked(slots: HobbySlot[], category: HobbyCategory) {
  const prerequisiteCategory = getPrerequisiteCategory(category);

  if (!prerequisiteCategory) {
    return true;
  }

  const prerequisiteSlot = slots.find((slot) => slot.category === prerequisiteCategory);

  if (!prerequisiteSlot || prerequisiteSlot.status === 'empty') {
    return false;
  }

  return getHabitProgress(prerequisiteSlot.streak, prerequisiteSlot.progress) >= NEXT_SLOT_UNLOCK_PROGRESS;
}

function getLockedSlotCopy(slots: HobbySlot[], category: HobbyCategory) {
  const prerequisiteCategory = getPrerequisiteCategory(category);

  if (!prerequisiteCategory) {
    return null;
  }

  const prerequisiteSlot = slots.find((slot) => slot.category === prerequisiteCategory);
  const prerequisiteProgress = prerequisiteSlot
    ? getHabitProgress(prerequisiteSlot.streak, prerequisiteSlot.progress)
    : 0;

  return `Recommended: build your ${prerequisiteCategory} habit to ${NEXT_SLOT_UNLOCK_PROGRESS}% first. You're currently at ${prerequisiteProgress}%, but you can still start this now if it matters more to you.`;
}

type CrossCategoryGuidance = {
  title: string;
  body: string;
  ctaLabel: string;
  href: string;
  tone: 'amber' | 'blue' | 'emerald' | 'slate';
  checklist: Array<{
    label: string;
    state: 'done' | 'next' | 'caution';
    href?: string;
  }>;
};

function getCrossCategoryGuidance(
  slots: HobbySlot[],
  completionHistory: Partial<Record<HobbyCategory, string>>,
  recoveryNotes: Partial<Record<HobbyCategory, RecoveryNote>>,
  todayKey: string
): CrossCategoryGuidance {
  const completedRecoverySlot = slots.find((slot) => {
    if (slot.status !== 'active') {
      return false;
    }

    const recoveryNote = recoveryNotes[slot.category];
    return recoveryNote?.resolvedDate === todayKey;
  });

  if (completedRecoverySlot) {
    const recoveryNote = recoveryNotes[completedRecoverySlot.category];

    if (recoveryNote?.resolvedDate) {
      return {
        title: `Nice recovery on ${completedRecoverySlot.hobby ?? `your ${completedRecoverySlot.category} hobby`}.`,
        body: `${recoveryNote.detail} You successfully completed the adjusted plan today. Protect that momentum before you make the week more complicated.`,
        ctaLabel: 'Keep this rhythm',
        href: `/plan/${completedRecoverySlot.category}`,
        tone: 'emerald' as const,
        checklist: [
          {
            label: `Recovery step completed on ${formatRecoveryDate(recoveryNote.resolvedDate)}.`,
            state: 'done',
            href: `/plan/${completedRecoverySlot.category}`,
          },
          {
            label: 'Repeat the adjusted version once more before raising the bar.',
            state: 'next',
            href: `/plan/${completedRecoverySlot.category}`,
          },
          {
            label: 'Momentum matters more than intensity right after a restart.',
            state: 'done',
            href: `/dashboard`,
          },
        ],
      };
    }
  }

  const recoverySlot = slots.find((slot) => {
    if (slot.status !== 'active') {
      return false;
    }

    const missedDays = getMissedDayCount(todayKey, completionHistory[slot.category] ?? null);
    return missedDays >= SWITCH_SUGGESTION_DAYS;
  });

  if (recoverySlot) {
    const missedDays = getMissedDayCount(todayKey, completionHistory[recoverySlot.category] ?? null);
    return {
      title: `Reset your ${recoverySlot.category} slot before adding more.`,
      body: `You have fallen away from ${recoverySlot.hobby ?? 'this hobby'} for a full week. Shrink the plan or switch to a better-fit option before trying to expand into another category.`,
      ctaLabel: 'Review recovery plan',
      href: `/plan/${recoverySlot.category}`,
      tone: 'amber' as const,
      checklist: [
        {
          label: `${recoverySlot.hobby ?? 'This hobby'} has been inactive for ${missedDays} days.`,
          state: 'caution',
          href: `/plan/${recoverySlot.category}`,
        },
        {
          label: 'Recovery should come before expanding into another category.',
          state: 'next',
          href: `/plan/${recoverySlot.category}`,
        },
        {
          label: 'Switching is allowed if the current fit feels wrong.',
          state: 'done',
          href: `/discover?category=${recoverySlot.category}&mode=switch&current=${encodeURIComponent(recoverySlot.hobby ?? '')}`,
        },
      ],
    };
  }

  const restartSlot = slots.find((slot) => {
    if (slot.status !== 'active') {
      return false;
    }

    const missedDays = getMissedDayCount(todayKey, completionHistory[slot.category] ?? null);
    return missedDays >= RESTART_RECOMMENDATION_DAYS;
  });

  if (restartSlot) {
    const missedDays = getMissedDayCount(todayKey, completionHistory[restartSlot.category] ?? null);
    return {
      title: `Stabilize ${restartSlot.hobby ?? `your ${restartSlot.category} hobby`} first.`,
      body: `Trio recommends a smaller restart before you add more. A balanced life is easier to build when the current habit still fits an ordinary week.`,
      ctaLabel: 'Adjust this plan',
      href: `/plan/${restartSlot.category}`,
      tone: 'amber' as const,
      checklist: [
        {
          label: `${restartSlot.hobby ?? 'This hobby'} has been missed for ${missedDays} days.`,
          state: 'caution',
          href: `/plan/${restartSlot.category}`,
        },
        {
          label: 'A smaller version of the plan is recommended now.',
          state: 'next',
          href: `/plan/${restartSlot.category}`,
        },
        {
          label: 'Adding another category can wait until this feels doable again.',
          state: 'done',
          href: `/dashboard`,
        },
      ],
    };
  }

  const nextSuggestedSlot = slots.find(
    (slot) => slot.status === 'empty' && !isSlotUnlocked(slots, slot.category)
  );

  if (nextSuggestedSlot) {
    const previousCategory = getPrerequisiteCategory(nextSuggestedSlot.category);
    const previousSlot = previousCategory
      ? slots.find((slot) => slot.category === previousCategory)
      : null;
    const previousProgress = previousSlot
      ? getHabitProgress(previousSlot.streak, previousSlot.progress)
      : 0;

    return {
      title: `Keep leaning into ${previousCategory ?? 'your current'} before adding ${nextSuggestedSlot.category}.`,
      body: `Trio suggests waiting until your ${previousCategory ?? 'current'} habit reaches about ${NEXT_SLOT_UNLOCK_PROGRESS}%. You are at ${previousProgress}% now, but you still have the freedom to start ${nextSuggestedSlot.category} earlier if you want to.`,
      ctaLabel: previousCategory ? `Focus on ${previousCategory}` : 'Stay with this habit',
      href: previousCategory ? `/plan/${previousCategory}` : '/dashboard',
      tone: 'blue' as const,
      checklist: [
        {
          label: `${formatCategoryLabel(previousCategory ?? 'physical')} progress is ${previousProgress}% today.`,
          state: previousProgress >= NEXT_SLOT_UNLOCK_PROGRESS ? 'done' : 'caution',
          href: previousCategory ? `/plan/${previousCategory}` : '/dashboard',
        },
        {
          label: `Trio's suggested milestone is ${NEXT_SLOT_UNLOCK_PROGRESS}% before adding ${nextSuggestedSlot.category}.`,
          state: 'next',
          href: previousCategory ? `/plan/${previousCategory}` : '/dashboard',
        },
        {
          label: `You can still start ${nextSuggestedSlot.category} now if you want the broader mix sooner.`,
          state: 'done',
          href: `/discover?category=${nextSuggestedSlot.category}`,
        },
      ],
    };
  }

  const availableEmptySlot = slots.find((slot) => slot.status === 'empty');

  if (availableEmptySlot) {
    return {
      title: `You are ready to add your ${availableEmptySlot.category} slot.`,
      body: `Your current habit looks steady enough that Trio would support expanding the life mix. Add one more category without trying to become a new person overnight.`,
      ctaLabel: `Explore ${availableEmptySlot.category}`,
      href: `/discover?category=${availableEmptySlot.category}`,
      tone: 'emerald' as const,
      checklist: [
        { label: 'Your current habit is stable enough to expand.', state: 'done', href: '/dashboard' },
        {
          label: `The next open category is ${availableEmptySlot.category}.`,
          state: 'next',
          href: `/discover?category=${availableEmptySlot.category}`,
        },
        { label: 'Trio still recommends adding only one new slot at a time.', state: 'done', href: '/dashboard' },
      ],
    };
  }

  return {
    title: 'Keep the balance realistic.',
    body: 'All three categories are active or in motion. Protect consistency before you chase intensity, and use the plan pages whenever one hobby starts to drift.',
    ctaLabel: 'Review dashboard',
    href: '/dashboard',
    tone: 'slate' as const,
    checklist: [
      { label: 'All three categories are already active or represented.', state: 'done', href: '/dashboard' },
      { label: 'Consistency matters more than adding more complexity.', state: 'next', href: '/dashboard' },
      { label: 'Use recovery tools whenever one slot starts slipping.', state: 'done', href: '/dashboard' },
    ],
  };
}

function getActionButton(slot: HobbySlot, isUnlocked: boolean) {
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
        href={`/plan/${slot.category}`}
        className="w-full rounded-lg bg-amber-600 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-amber-700"
      >
        Manage plan
      </Link>
    );
  } else {
    const startLabel =
      slot.category === 'physical'
        ? 'Explore movement'
        : slot.category === 'intellectual'
          ? isUnlocked
            ? 'Explore intellect'
            : 'Explore intellect anyway'
          : isUnlocked
            ? 'Explore creativity'
            : 'Explore creativity anyway';

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
  slots: HobbySlot[];
  todayKey: string;
  completionDate: string | null;
  recoveryNote?: RecoveryNote | null;
  celebrationToken: number | null;
  onComplete: (category: HobbyCategory) => void;
  onReset: (category: HobbyCategory) => void;
};

function CategoryPanel({
  slot,
  slots,
  todayKey,
  completionDate,
  recoveryNote,
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
        recoveryNote={recoveryNote}
        celebrationToken={celebrationToken}
        onComplete={onComplete}
        onReset={onReset}
      />
    );
  }

  const unlocked = slot.status !== 'empty' || isSlotUnlocked(slots, slot.category);

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
              {slot.status === 'dormant' ? 'Ready when you are' : unlocked ? 'Ready when you are' : 'Suggested later'}
            </p>
          </div>
        </div>
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeColor(slot.status)}`}>
          {slot.status === 'dormant' ? 'Dormant' : unlocked ? 'Discover' : 'Wait suggested'}
        </span>
      </div>

      <div className="mt-4">
        {slot.status === 'dormant' ? (
          <p className="text-gray-500">Paused on purpose. Missed days are frozen until you decide to restart.</p>
        ) : !unlocked ? (
          <div className="space-y-2">
            <p className="text-gray-500">{getLockedSlotCopy(slots, slot.category)}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-gray-500">{getEmptySlotCopy(slot.category)}</p>
          </div>
        )}
      </div>

      <div className="mt-5">{getActionButton(slot, unlocked)}</div>
    </div>
  );
}

export default function Dashboard() {
  const [slots, setSlots] = useState<HobbySlot[]>(initialSlots);
  const [completionHistory, setCompletionHistory] = useState<Partial<Record<HobbyCategory, string>>>({});
  const [completionLog, setCompletionLog] = useState<Partial<Record<HobbyCategory, string[]>>>({});
  const [recoveryNotes, setRecoveryNotes] = useState<Partial<Record<HobbyCategory, RecoveryNote>>>({});
  const [recoveryHistory, setRecoveryHistory] = useState<Partial<Record<HobbyCategory, RecoveryNote[]>>>({});
  const [selectedTab, setSelectedTab] = useState<HobbyCategory>('physical');
  const [celebration, setCelebration] = useState<{ category: HobbyCategory; token: number } | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [demoToolsEnabled, setDemoToolsEnabled] = useState(false);

  const activeSlots = slots.filter((slot) => slot.status === 'active');
  const emptySlots = slots.filter((slot) => slot.status === 'empty');
  const todayKey = getDateKey(new Date());
  const crossCategoryGuidance = getCrossCategoryGuidance(slots, completionHistory, recoveryNotes, todayKey);
  const crossCategoryInsight = getCrossCategoryInsight(slots, completionHistory, todayKey);
  const completedActiveCount = activeSlots.filter(
    (slot) => completionHistory[slot.category] === todayKey
  ).length;

  useEffect(() => {
    const hydrateState = window.setTimeout(() => {
      setDemoToolsEnabled(new URLSearchParams(window.location.search).get('demo') === '1');
      void readSyncedDashboardState().then((savedState) => {
        setSlots(savedState.slots);
        setCompletionHistory(savedState.completionHistory);
        setCompletionLog(savedState.completionLog);
        setRecoveryNotes(savedState.recoveryNotes);
        setRecoveryHistory(savedState.recoveryHistory);
      });
    }, 0);

    return () => window.clearTimeout(hydrateState);
  }, []);

  useEffect(() => {
    if (!syncMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => setSyncMessage(null), 2600);
    return () => window.clearTimeout(timeoutId);
  }, [syncMessage]);

  const persistDashboardSnapshot = async (
    nextState: {
      slots: HobbySlot[];
      completionHistory: Partial<Record<HobbyCategory, string>>;
      completionLog: Partial<Record<HobbyCategory, string[]>>;
      recoveryNotes: Partial<Record<HobbyCategory, RecoveryNote>>;
      recoveryHistory: Partial<Record<HobbyCategory, RecoveryNote[]>>;
    },
    successMessage: string
  ) => {
    const savedRemotely = await persistSyncedDashboardStateNow(nextState);
    setSyncMessage(
      savedRemotely ? successMessage : `${successMessage} Saved on this device; cloud sync needs a retry.`
    );
  };

  const handleCompleteToday = async (category: HobbyCategory) => {
    const currentSlot = slots.find((slot) => slot.category === category && slot.status === 'active');
    const completedDate = completionHistory[category] ?? null;

    if (!currentSlot || completedDate === todayKey) {
      return;
    }

    const missedDay = getMissedDayCount(todayKey, completedDate) > 0;
    const nextStreak = missedDay ? 1 : (currentSlot.streak ?? 0) + 1;
    const nextSlots = slots.map((slot) =>
      slot.status === 'active' && slot.category === category
        ? {
            ...slot,
            starterTask: slot.nextTask ?? 'Keep the streak going with the next small step',
            streak: nextStreak,
            progress: getHabitProgress(nextStreak),
          }
        : slot
    );
    const nextCompletionHistory = {
      ...completionHistory,
      [category]: todayKey,
    };
    const nextCompletionLog = {
      ...completionLog,
      [category]: [todayKey, ...(completionLog[category] ?? []).filter((entry) => entry !== todayKey)].slice(0, 14),
    };
    const nextRecoveryNotes = { ...recoveryNotes };
    const currentRecoveryNote = nextRecoveryNotes[category];

    if (currentRecoveryNote && currentRecoveryNote.resolvedDate !== todayKey) {
      nextRecoveryNotes[category] = {
        ...currentRecoveryNote,
        resolvedDate: todayKey,
      };
    }

    const nextRecoveryHistory = {
      ...recoveryHistory,
      [category]: (recoveryHistory[category] ?? []).map((note, index) =>
        index === 0 && note.resolvedDate !== todayKey ? { ...note, resolvedDate: todayKey } : note
      ),
    };

    setSlots(nextSlots);
    setCompletionHistory(nextCompletionHistory);
    setCompletionLog(nextCompletionLog);
    setRecoveryNotes(nextRecoveryNotes);
    setRecoveryHistory(nextRecoveryHistory);
    setCelebration((currentCelebration) => ({
      category,
      token: (currentCelebration?.token ?? 0) + 1,
    }));

    await persistDashboardSnapshot(
      {
        slots: nextSlots,
        completionHistory: nextCompletionHistory,
        completionLog: nextCompletionLog,
        recoveryNotes: nextRecoveryNotes,
        recoveryHistory: nextRecoveryHistory,
      },
      currentRecoveryNote && !currentRecoveryNote.resolvedDate ? 'Recovery session completed.' : 'Today marked complete.'
    );
  };

  const handleResetToday = async (category: HobbyCategory) => {
    const currentSlot = slots.find((slot) => slot.category === category && slot.status === 'active');
    const completedDate = completionHistory[category];

    if (!currentSlot || completedDate !== todayKey) {
      return;
    }

    const nextStreak = Math.max((currentSlot.streak ?? 0) - 1, 0);
    const nextSlots = slots.map((slot) =>
      slot.status === 'active' && slot.category === category
        ? {
            ...slot,
            streak: nextStreak,
            progress: getHabitProgress(nextStreak),
          }
        : slot
    );
    const nextCompletionHistory = { ...completionHistory };
    delete nextCompletionHistory[category];

    const nextCompletionLog = {
      ...completionLog,
      [category]: (completionLog[category] ?? []).filter((entry) => entry !== todayKey),
    };
    const nextRecoveryNotes = { ...recoveryNotes };
    const currentRecoveryNote = nextRecoveryNotes[category];

    if (currentRecoveryNote?.resolvedDate === todayKey) {
      nextRecoveryNotes[category] = {
        ...currentRecoveryNote,
        resolvedDate: undefined,
      };
    }

    const nextRecoveryHistory = {
      ...recoveryHistory,
      [category]: (recoveryHistory[category] ?? []).map((note, index) =>
        index === 0 && note.resolvedDate === todayKey ? { ...note, resolvedDate: undefined } : note
      ),
    };

    setSlots(nextSlots);
    setCompletionHistory(nextCompletionHistory);
    setCompletionLog(nextCompletionLog);
    setRecoveryNotes(nextRecoveryNotes);
    setRecoveryHistory(nextRecoveryHistory);
    setCelebration((currentCelebration) =>
      currentCelebration?.category === category ? null : currentCelebration
    );

    await persistDashboardSnapshot(
      {
        slots: nextSlots,
        completionHistory: nextCompletionHistory,
        completionLog: nextCompletionLog,
        recoveryNotes: nextRecoveryNotes,
        recoveryHistory: nextRecoveryHistory,
      },
      'Today reset.'
    );
  };

  const handleDemoReset = async () => {
    const nextState = getInitialDashboardState();

    setSlots(nextState.slots);
    setCompletionHistory(nextState.completionHistory);
    setCompletionLog(nextState.completionLog);
    setRecoveryNotes(nextState.recoveryNotes);
    setRecoveryHistory(nextState.recoveryHistory);
    setSelectedTab('physical');
    setCelebration(null);

    await persistDashboardSnapshot(nextState, 'Demo dashboard reset.');
  };

  const openSlotCount = emptySlots.length;
  const categories: HobbyCategory[] = CATEGORY_SEQUENCE;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            Keep building the life you want to come back to.
          </h1>
          <p className="text-gray-600">
            One physical, one intellectual, and one creative hobby, growing at a pace that fits real life.
          </p>
          {syncMessage ? (
            <p className="mt-4 inline-flex rounded-full bg-olive-100 px-4 py-2 text-sm font-medium text-olive-800">
              {syncMessage}
            </p>
          ) : null}
          {demoToolsEnabled ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-amber-950">Demo tools</p>
                  <p className="mt-1 text-sm text-amber-900">
                    Reset this signed-in account to the starter dashboard before a presentation.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDemoReset}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-amber-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-amber-800"
                >
                  Reset demo state
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mb-8 overflow-hidden rounded-2xl border border-olive-200 bg-[linear-gradient(135deg,#f7f9ef,#edf3de)] shadow-sm">
          <div className="border-b border-olive-100 bg-white/70 px-6 py-5">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Hobbies in progress</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{activeSlots.length}</p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Completed today</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{completedActiveCount}</p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Open hobby slots</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{openSlotCount}</p>
              </div>
            </div>
          </div>

          <div
            className={`border-b px-6 py-5 ${
              crossCategoryGuidance.tone === 'amber'
                ? 'border-amber-200 bg-amber-50/80'
                : crossCategoryGuidance.tone === 'blue'
                  ? 'border-blue-200 bg-blue-50/80'
                  : crossCategoryGuidance.tone === 'emerald'
                    ? 'border-emerald-200 bg-emerald-50/80'
                    : 'border-slate-200 bg-slate-50/80'
            }`}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Trio recommendation</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">{crossCategoryGuidance.title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-700">{crossCategoryGuidance.body}</p>
              </div>
              <Link
                href={crossCategoryGuidance.href}
                className={`inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition-colors ${
                  crossCategoryGuidance.tone === 'amber'
                    ? 'bg-amber-600 text-white hover:bg-amber-700'
                    : crossCategoryGuidance.tone === 'blue'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : crossCategoryGuidance.tone === 'emerald'
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {crossCategoryGuidance.ctaLabel}
              </Link>
            </div>
          </div>

          {crossCategoryInsight ? (
            <div className="border-b border-indigo-100 bg-white/80 px-6 py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">
                    Balance insight
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950">{crossCategoryInsight.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-700">{crossCategoryInsight.body}</p>
                  <p className="mt-3 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-800">
                    {crossCategoryInsight.pairing}
                  </p>
                </div>
                <Link
                  href={crossCategoryInsight.href}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-indigo-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                >
                  Try the pairing
                </Link>
              </div>
            </div>
          ) : null}

          <div className="px-6 py-6">
            <div role="tablist" aria-label="Dashboard categories" className="grid grid-cols-3 gap-2">
              {categories.map((tab) => {
                const isSelected = selectedTab === tab;
                const recoveryNote = recoveryNotes[tab];
                const hasActiveRecovery = Boolean(recoveryNote && !recoveryNote.resolvedDate);
                const hasRecoveryWinToday = recoveryNote?.resolvedDate === todayKey;
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
                    aria-label={`${formatCategoryLabel(tab)}${
                      hasActiveRecovery ? ' recovery active' : hasRecoveryWinToday ? ' recovery win today' : ''
                    }`}
                    onClick={() => setSelectedTab(tab)}
                    className={`relative flex h-10 w-full items-center justify-center rounded-t-[1rem] border px-4 text-sm font-semibold capitalize transition-colors duration-150 ease-out ${
                      isSelected ? 'z-10 -mb-px' : ''
                    } ${tabStyles}`}
                  >
                    <span>{tab}</span>
                    {hasActiveRecovery ? (
                      <span
                        className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                          isSelected
                            ? 'bg-amber-200 text-amber-950'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        Recovery
                      </span>
                    ) : hasRecoveryWinToday ? (
                      <span
                        className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                          isSelected
                            ? 'bg-emerald-200 text-emerald-950'
                            : 'bg-emerald-100 text-emerald-900'
                        }`}
                      >
                        Win
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="relative mt-4 grid">
              {categories.map((category) => {
                const slot = slots.find((currentSlot) => currentSlot.category === category);

                if (!slot) {
                  return null;
                }

                const isSelected = selectedTab === category;

                return (
                  <div
                    key={category}
                    aria-hidden={!isSelected}
                    className={`col-start-1 row-start-1 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      isSelected
                        ? 'pointer-events-auto translate-y-0 opacity-100 scale-100 z-10'
                        : 'pointer-events-none translate-y-4 opacity-0 scale-[0.985] z-0'
                    }`}
                  >
                    <CategoryPanel
                      slot={slot}
                      slots={slots}
                      todayKey={todayKey}
                      completionDate={completionHistory[slot.category] ?? null}
                      recoveryNote={recoveryNotes[slot.category] ?? null}
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
  );
}
