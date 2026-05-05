'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  buildNextTaskPreview,
  buildRestartTaskPreview,
  buildStarterTaskPreview,
  formatCadenceSummary,
  formatCategoryLabel,
  formatPreferredDays,
  formatRecoveryDate,
  formatSessionFrequency,
  getDateKey,
  getHabitProgress,
  getMissedDayCount,
  PREFERRED_TIME_OPTIONS,
  persistDashboardState,
  pushRecoveryHistoryEntry,
  readDashboardState,
  type HobbySlot,
  type PreferredTimeOfDay,
  type RecoveryNote,
  type Weekday,
  WEEKDAY_OPTIONS,
} from '@/lib/dashboard-state';
import type { HobbyCategory } from '@/lib/types';

const HOBBY_CATEGORIES: HobbyCategory[] = ['physical', 'intellectual', 'creative'];
const RESTART_RECOMMENDATION_DAYS = 3;
const SWITCH_SUGGESTION_DAYS = 7;

function parseCategory(category: string): HobbyCategory | null {
  if (HOBBY_CATEGORIES.includes(category as HobbyCategory)) {
    return category as HobbyCategory;
  }

  return null;
}

function getWeekdayIndex(day: Weekday) {
  return WEEKDAY_OPTIONS.indexOf(day);
}

function formatRelativeDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function getUpcomingSessionDates(preferredDays: Weekday[], count: number) {
  const today = new Date();
  const allowedDays = preferredDays.length === 0 ? WEEKDAY_OPTIONS : preferredDays;
  const dates: Date[] = [];

  for (let offset = 0; dates.length < count && offset < 21; offset += 1) {
    const candidate = new Date(today);
    candidate.setDate(today.getDate() + offset);
    const candidateIndex = (candidate.getDay() + 6) % 7;

    if (allowedDays.some((day) => getWeekdayIndex(day) === candidateIndex)) {
      dates.push(candidate);
    }
  }

  return dates;
}

function getSessionCardCopy(slot: HobbySlot, index: number) {
  if (index === 0) {
    return slot.starterTask?.replace(/^Today:\s*/i, '') ?? 'Show up for today in a way that still feels easy.';
  }

  return slot.nextTask ?? 'Repeat the next small session and keep the habit realistic.';
}

function getUpcomingSessionTitle(index: number, recoveryNote: RecoveryNote | null) {
  if (index === 0 && recoveryNote && !recoveryNote.resolvedDate) {
    switch (recoveryNote.action) {
      case 'pause':
        return 'Return session';
      case 'swap':
        return 'Better-fit re-entry';
      default:
        return 'Smaller reset session';
    }
  }

  return index === 0 ? 'Next up' : `Session ${index + 1}`;
}

function getUpcomingSessionCopy(slot: HobbySlot, index: number, recoveryNote: RecoveryNote | null) {
  const baseCopy = getSessionCardCopy(slot, index);

  if (!recoveryNote || recoveryNote.resolvedDate) {
    return baseCopy;
  }

  if (index === 0) {
    switch (recoveryNote.action) {
      case 'pause':
        return `${baseCopy} Treat this as your first session back, not a test of whether you are behind.`;
      case 'swap':
        return `${baseCopy} This is your easier re-entry into the new hobby, so the goal is fit, not intensity.`;
      default:
        return `${baseCopy} Keep this version intentionally smaller than the old plan so momentum can restart.`;
    }
  }

  if (index === 1) {
    return `If the re-entry session feels manageable, repeat the same low-pressure version once more before you raise the bar.`;
  }

  return baseCopy;
}

function getRecoveryActionLabel(action: RecoveryNote['action']) {
  switch (action) {
    case 'pause':
      return 'Pause or restart';
    case 'swap':
      return 'Hobby swap';
    default:
      return 'Smaller reset';
  }
}

export default function PlanCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: rawCategory } = use(params);
  const category = parseCategory(rawCategory);
  const [slot, setSlot] = useState<HobbySlot | null>(null);
  const [completedDate, setCompletedDate] = useState<string | null>(null);
  const [completionLog, setCompletionLog] = useState<string[]>([]);
  const [recoveryNote, setRecoveryNote] = useState<RecoveryNote | null>(null);
  const [recoveryHistory, setRecoveryHistory] = useState<RecoveryNote[]>([]);
  const [sessionMinutes, setSessionMinutes] = useState(10);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [preferredTime, setPreferredTime] = useState<PreferredTimeOfDay>('Flexible');
  const [preferredDays, setPreferredDays] = useState<Weekday[]>([]);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const hydrateState = window.setTimeout(() => {
      const state = readDashboardState();
      const nextSlot = state.slots.find((currentSlot) => currentSlot.category === category) ?? null;
      const cadence = nextSlot?.cadence;

      setSlot(nextSlot);
      setCompletedDate(category ? state.completionHistory[category] ?? null : null);
      setCompletionLog(category ? state.completionLog[category] ?? [] : []);
      setRecoveryNote(category ? state.recoveryNotes[category] ?? null : null);
      setRecoveryHistory(category ? state.recoveryHistory[category] ?? [] : []);
      setSessionMinutes(cadence?.sessionMinutes ?? 10);
      setSessionsPerWeek(cadence?.sessionsPerWeek ?? 3);
      setPreferredTime(cadence?.preferredTime ?? 'Flexible');
      setPreferredDays(cadence?.preferredDays ?? []);
      setIsHydrated(true);
    }, 0);

    return () => window.clearTimeout(hydrateState);
  }, [category]);

  useEffect(() => {
    if (!flashMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => setFlashMessage(null), 2600);
    return () => window.clearTimeout(timeoutId);
  }, [flashMessage]);

  if (!category) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Plan not found</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">That plan category does not exist.</h1>
            <Link
              href="/dashboard"
              className="mt-6 inline-flex rounded-lg bg-olive-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-olive-700"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
    );
  }

  if (!isHydrated) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-4 text-center">
          <p className="text-base font-medium text-slate-600">Loading your plan...</p>
        </div>
    );
  }

  if (!slot || slot.status === 'empty') {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
          <div className="rounded-2xl border border-olive-200 bg-[linear-gradient(135deg,#f7f9ef,#edf3de)] p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-olive-700">
              {formatCategoryLabel(category)} plan
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">No hobby is active in this slot yet.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700">
              Choose a {category} hobby first, and Trio will turn the first step into a plan that feels easy to repeat.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/discover?category=${category}`}
                className="inline-flex rounded-lg bg-olive-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-olive-700"
              >
                Discover a {category} hobby
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex rounded-lg border border-olive-200 bg-white px-4 py-3 text-sm font-medium text-olive-800 transition-colors hover:bg-olive-50"
              >
                Back to dashboard
              </Link>
            </div>
          </div>
        </div>
    );
  }

  const todayKey = getDateKey(new Date());
  const completedToday = completedDate === todayKey;
  const missedDays = completedToday ? 0 : getMissedDayCount(todayKey, completedDate);
  const missedDay = missedDays > 0;
  const restartRecommended = missedDays >= RESTART_RECOMMENDATION_DAYS;
  const switchSuggested = missedDays >= SWITCH_SUGGESTION_DAYS;
  const cadence = {
    sessionMinutes,
    sessionsPerWeek,
    preferredTime,
    preferredDays: preferredDays.length > 0 ? preferredDays : WEEKDAY_OPTIONS.slice(0, sessionsPerWeek),
  };
  const progressPercent = getHabitProgress(slot.streak, slot.progress);
  const upcomingSessions = getUpcomingSessionDates(cadence.preferredDays, 3);
  const currentStatusLabel =
    slot.status === 'dormant'
      ? 'Paused'
      : completedToday
        ? 'Completed today'
        : switchSuggested
          ? 'Needs reset'
          : missedDay
            ? 'Restart day'
            : 'Ready';

  const updateStoredState = (
    updater: (currentSlot: HobbySlot) => HobbySlot,
    message: string,
    options?: {
      clearCompletionHistory?: boolean;
      recoveryAction?: 'pause' | 'reset';
      recoveryDetail?: string;
    }
  ) => {
    if (!category || !slot) {
      return;
    }

    const currentState = readDashboardState();
    const nextSlots = currentState.slots.map((currentSlot) =>
      currentSlot.category === category ? updater(currentSlot) : currentSlot
    );
    const nextSlot = nextSlots.find((currentSlot) => currentSlot.category === category) ?? null;

    const nextCompletionHistory = { ...currentState.completionHistory };
    const nextRecoveryNotes = { ...currentState.recoveryNotes };
    const nextRecoveryHistory = { ...currentState.recoveryHistory };

    if (options?.clearCompletionHistory) {
      delete nextCompletionHistory[category];
    }

    if (options?.recoveryAction && options.recoveryDetail) {
      const nextRecoveryNote = {
        action: options.recoveryAction,
        date: getDateKey(new Date()),
        detail: options.recoveryDetail,
      };
      nextRecoveryNotes[category] = nextRecoveryNote;
      Object.assign(nextRecoveryHistory, pushRecoveryHistoryEntry(nextRecoveryHistory, category, nextRecoveryNote));
    }

    persistDashboardState({
      slots: nextSlots,
      completionHistory: nextCompletionHistory,
      completionLog: currentState.completionLog,
      recoveryNotes: nextRecoveryNotes,
      recoveryHistory: nextRecoveryHistory,
    });
    setSlot(nextSlot);
    setCompletedDate(options?.clearCompletionHistory ? null : currentState.completionHistory[category] ?? null);
    setRecoveryNote(nextRecoveryNotes[category] ?? null);
    setRecoveryHistory(nextRecoveryHistory[category] ?? []);
    setFlashMessage(message);
  };

  const handleToggleDay = (day: Weekday) => {
    setPreferredDays((currentDays) => {
      if (currentDays.includes(day)) {
        if (currentDays.length === 1) {
          return currentDays;
        }

        return currentDays.filter((currentDay) => currentDay !== day);
      }

      return [...currentDays, day].sort((left, right) => getWeekdayIndex(left) - getWeekdayIndex(right));
    });
  };

  const handleTimelineSave = () => {
    updateStoredState(
      (currentSlot) => {
        const nextCadence = {
          sessionMinutes,
          sessionsPerWeek,
          preferredDays: preferredDays.length > 0 ? preferredDays : WEEKDAY_OPTIONS.slice(0, sessionsPerWeek),
          preferredTime,
        };
        const slotForPreview = {
          ...currentSlot,
          cadence: nextCadence,
        };

        return {
          ...currentSlot,
          cadence: nextCadence,
          starterTask: buildStarterTaskPreview(slotForPreview, nextCadence),
          restartTask: buildRestartTaskPreview(slotForPreview, nextCadence),
          nextTask: buildNextTaskPreview(slotForPreview, nextCadence),
        };
      },
      'Timeline updated.'
    );
  };

  const handlePauseToggle = () => {
    updateStoredState(
      (currentSlot) => ({
        ...currentSlot,
        status: currentSlot.status === 'dormant' ? 'active' : 'dormant',
      }),
      slot.status === 'dormant' ? 'Plan reactivated.' : 'Plan paused.',
      {
        clearCompletionHistory: true,
        recoveryAction: 'pause',
        recoveryDetail:
          slot.status === 'dormant'
            ? `Reactivated ${slot.hobby ?? 'this hobby'} with the same cadence and a fresh restart.`
            : `Paused ${slot.hobby ?? 'this hobby'} and froze missed-day pressure for now.`,
      }
    );
  };

  const handleResetPlan = () => {
    const nextCadence = {
      sessionMinutes: Math.max(5, sessionMinutes - 5),
      sessionsPerWeek: Math.max(1, sessionsPerWeek - (sessionsPerWeek > 4 ? 2 : 1)),
      preferredDays: preferredDays.slice(0, Math.max(1, sessionsPerWeek - (sessionsPerWeek > 4 ? 2 : 1))),
      preferredTime,
    };

    setSessionMinutes(nextCadence.sessionMinutes);
    setSessionsPerWeek(nextCadence.sessionsPerWeek);
    setPreferredDays(nextCadence.preferredDays.length > 0 ? nextCadence.preferredDays : ['Mon']);

    updateStoredState(
      (currentSlot) => {
        const slotForPreview = {
          ...currentSlot,
          cadence: nextCadence,
        };

        return {
          ...currentSlot,
          status: 'active',
          streak: 0,
          progress: 0,
          cadence: nextCadence,
          starterTask: buildStarterTaskPreview(slotForPreview, nextCadence),
          restartTask: buildRestartTaskPreview(slotForPreview, nextCadence),
          nextTask: buildNextTaskPreview(slotForPreview, nextCadence),
        };
      },
      'Plan reset to a smaller step.',
      {
        clearCompletionHistory: true,
        recoveryAction: 'reset',
        recoveryDetail: `Lowered the plan to ${nextCadence.sessionMinutes} minutes, ${formatSessionFrequency(nextCadence.sessionsPerWeek).toLowerCase()}.`,
      }
    );
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard" className="text-sm font-medium text-olive-700 transition-colors hover:text-olive-800">
            ← Back to dashboard
          </Link>
          {flashMessage ? (
            <p className="rounded-full bg-olive-100 px-4 py-2 text-sm font-medium text-olive-800">{flashMessage}</p>
          ) : null}
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-olive-200 bg-[linear-gradient(135deg,#f7f9ef,#edf3de)] shadow-sm">
          <div className="grid gap-6 px-6 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-olive-700">
                {formatCategoryLabel(category)} plan
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-950">{slot.hobby}</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700">
                {slot.status === 'dormant'
                  ? 'This hobby is paused. Keep the plan visible, then restart with a small enough session that you would actually do it this week.'
                  : completedToday
                    ? 'Today is complete. Leave the bar low enough that tomorrow feels easy to start again.'
                    : missedDay
                      ? slot.restartTask ?? 'Restart with a smaller step today.'
                      : slot.starterTask ?? 'Take one small step today.'}
              </p>

              {recoveryNote ? (
                <div className="mt-5 inline-flex max-w-2xl items-start gap-3 rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-sm">
                  <span className="mt-0.5 inline-flex rounded-full bg-olive-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-olive-800">
                    {recoveryNote.resolvedDate ? 'Recovery completed' : 'Recovery note'}
                  </span>
                  <p className="leading-6">
                    {recoveryNote.resolvedDate
                      ? `${recoveryNote.detail} You completed the adjusted plan on ${formatRecoveryDate(recoveryNote.resolvedDate)}.`
                      : `${recoveryNote.detail} Updated ${formatRecoveryDate(recoveryNote.date)}.`}
                  </p>
                </div>
              ) : null}

              {recoveryHistory.length > 1 ? (
                <div className="mt-5 max-w-2xl rounded-2xl border border-white/80 bg-white/70 p-4 text-sm text-slate-700 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Recent recovery history</p>
                  <div className="mt-3 space-y-3">
                    {recoveryHistory.slice(0, 3).map((note, index) => (
                      <div
                        key={`${note.action}-${note.date}-${index}`}
                        className="rounded-xl border border-slate-200 bg-white/90 px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-olive-700">
                            {getRecoveryActionLabel(note.action)}
                          </p>
                          <p className="text-xs text-slate-500">{formatRecoveryDate(note.date)}</p>
                        </div>
                        <p className="mt-2 leading-6 text-slate-700">{note.detail}</p>
                        <p className="mt-2 text-xs text-slate-500">
                          {note.resolvedDate
                            ? `Completed on ${formatRecoveryDate(note.resolvedDate)}.`
                            : 'Still in progress.'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {restartRecommended ? (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950 shadow-sm">
                  <p className="font-semibold">
                    {switchSuggested ? 'This hobby may not fit your week right now.' : 'Trio recommends a smaller restart this week.'}
                  </p>
                  <p className="mt-2 leading-6 text-amber-900/90">
                    {switchSuggested
                      ? `You have missed ${missedDays} days. Keep the slot if you still want this hobby, or switch to a different ${category} option that feels easier to return to.`
                      : `You have missed ${missedDays} days. Lower the plan before asking yourself for more consistency.`}
                  </p>
                </div>
              ) : null}

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/80 bg-white/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Status</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{currentStatusLabel}</p>
                </div>
                <div className="rounded-xl border border-white/80 bg-white/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Cadence</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{formatCadenceSummary(cadence)}</p>
                </div>
                <div className="rounded-xl border border-white/80 bg-white/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Preferred days</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{formatPreferredDays(cadence.preferredDays)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/80 bg-white/80 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-olive-700">Progress</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Current streak</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{slot.streak ?? 0} days</p>
                </div>
                <div className="rounded-xl bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">60-day progress</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{progressPercent}%</p>
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                <div className="h-2 rounded-full bg-olive-600 transition-all" style={{ width: `${progressPercent}%` }} />
              </div>
              <div className="mt-5 rounded-xl bg-slate-950 p-4 text-sm text-white">
                <p className="font-semibold">Recent completions</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {completionLog.length > 0 ? (
                    completionLog.slice(0, 5).map((entry) => (
                      <span key={entry} className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
                        {entry}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-300">No completions yet. The first small session counts.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-olive-700">Timeline</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">Adjust the rhythm without blowing up the habit.</h2>
              </div>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Session length</span>
                <select
                  value={sessionMinutes}
                  onChange={(event) => setSessionMinutes(Number(event.target.value))}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-olive-400 focus:outline-none"
                >
                  {[5, 10, 15, 20, 30, 45].map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes} minutes
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Frequency</span>
                <select
                  value={sessionsPerWeek}
                  onChange={(event) => {
                    const nextValue = Number(event.target.value);
                    setSessionsPerWeek(nextValue);
                    setPreferredDays((currentDays) =>
                      currentDays.length > nextValue ? currentDays.slice(0, nextValue) : currentDays
                    );
                  }}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-olive-400 focus:outline-none"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((count) => (
                    <option key={count} value={count}>
                      {formatSessionFrequency(count)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Preferred time window</span>
                <select
                  value={preferredTime}
                  onChange={(event) => setPreferredTime(event.target.value as PreferredTimeOfDay)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-olive-400 focus:outline-none"
                >
                  {PREFERRED_TIME_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <div className="md:col-span-2">
                <p className="text-sm font-medium text-slate-700">Preferred days</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {WEEKDAY_OPTIONS.map((day) => {
                    const isSelected = preferredDays.includes(day);
                    const disableRemoval = isSelected && preferredDays.length === 1;

                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleToggleDay(day)}
                        disabled={disableRemoval}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                          isSelected
                            ? 'bg-olive-600 text-white hover:bg-olive-700'
                            : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        } ${disableRemoval ? 'cursor-not-allowed opacity-70' : ''}`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-sm text-slate-500">
                  Pick up to {sessionsPerWeek} anchor days. Trio will use them to preview the next sessions.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleTimelineSave}
                className="inline-flex rounded-lg bg-olive-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-olive-700"
              >
                Save timeline
              </button>
              <p className="self-center text-sm text-slate-500">
                Updates today’s task, restart step, and the next-session preview.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-olive-700">Upcoming plan</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">What the next few sessions look like.</h2>

            <div className="mt-6 space-y-3">
              {upcomingSessions.map((date, index) => (
                <div key={`${date.toISOString()}-${index}`} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-950">
                      {getUpcomingSessionTitle(index, recoveryNote)}
                    </p>
                    <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                      {formatRelativeDate(date)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    {getUpcomingSessionCopy(slot, index, recoveryNote)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl bg-slate-950 p-4 text-sm text-white">
              <p className="font-semibold">Why this plan is small on purpose</p>
              <p className="mt-2 leading-6 text-slate-200">
                Most habits take about 60 days of repetition to stick, so Trio treats consistency as the real win.
                The task only needs to be realistic enough that you will still want to do it on an ordinary day.
              </p>
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-olive-700">Plan controls</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Slow down, pause, or switch directions without losing the slot.</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <button
              type="button"
              onClick={handlePauseToggle}
              className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-left transition-colors hover:bg-amber-100"
            >
              <p className="text-sm font-semibold text-amber-900">{slot.status === 'dormant' ? 'Reactivate plan' : 'Pause plan'}</p>
              <p className="mt-2 text-sm leading-6 text-amber-800">
                {slot.status === 'dormant'
                  ? 'Bring this hobby back into the dashboard with the same cadence and a fresh restart.'
                  : 'Hide the pressure for now. Trio will stop counting missed days while this plan is paused.'}
              </p>
            </button>

            <button
              type="button"
              onClick={handleResetPlan}
              className={`rounded-xl px-5 py-4 text-left transition-colors ${
                restartRecommended
                  ? 'border border-amber-300 bg-amber-100 hover:bg-amber-200'
                  : 'border border-olive-200 bg-olive-50 hover:bg-olive-100'
              }`}
            >
              <p className={`text-sm font-semibold ${restartRecommended ? 'text-amber-950' : 'text-olive-900'}`}>
                Reset to a smaller step
              </p>
              <p className={`mt-2 text-sm leading-6 ${restartRecommended ? 'text-amber-900' : 'text-olive-800'}`}>
                {restartRecommended
                  ? 'Recommended now: shorten the session and lower the weekly load before trying to force consistency.'
                  : 'Shorten the session and lower the weekly load so restarting feels realistic.'}
              </p>
            </button>

            <Link
              href={`/discover?category=${category}&mode=switch&current=${encodeURIComponent(slot.hobby ?? '')}`}
              className={`rounded-xl px-5 py-4 text-left transition-colors ${
                switchSuggested
                  ? 'border border-amber-300 bg-amber-50 hover:bg-amber-100'
                  : 'border border-slate-200 bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <p className={`text-sm font-semibold ${switchSuggested ? 'text-amber-950' : 'text-slate-900'}`}>
                Swap this hobby
              </p>
              <p className={`mt-2 text-sm leading-6 ${switchSuggested ? 'text-amber-900' : 'text-slate-700'}`}>
                {switchSuggested
                  ? 'Suggested now: keep the category slot, but go back through discovery and choose a hobby that fits better.'
                  : 'Keep the category slot, but go back to discovery and choose a different hobby.'}
              </p>
            </Link>
          </div>
        </section>
    </div>
  );
}
