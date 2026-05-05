import type { HobbyCategory } from '@/lib/types';

export type HobbyStatus = 'empty' | 'active' | 'dormant';
export type PreferredTimeOfDay = 'Morning' | 'Afternoon' | 'Evening' | 'Flexible';
export type Weekday = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export const HABIT_FORMATION_DAYS = 60;
export const WEEKDAY_OPTIONS: Weekday[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const PREFERRED_TIME_OPTIONS: PreferredTimeOfDay[] = ['Morning', 'Afternoon', 'Evening', 'Flexible'];

export interface PlanCadence {
  sessionMinutes: number;
  sessionsPerWeek: number;
  preferredDays: Weekday[];
  preferredTime: PreferredTimeOfDay;
}

export interface HobbySlot {
  category: HobbyCategory;
  status: HobbyStatus;
  hobby?: string;
  starterTask?: string;
  restartTask?: string;
  nextTask?: string;
  progress?: number;
  streak?: number;
  cadence?: PlanCadence;
}

export type RecoveryAction = 'pause' | 'reset' | 'swap';

export interface RecoveryChangeSummary {
  fromHobby?: string;
  toHobby?: string;
  fromCadence?: string;
  toCadence?: string;
}

export interface RecoveryNote {
  action: RecoveryAction;
  date: string;
  detail: string;
  resolvedDate?: string;
  changes?: RecoveryChangeSummary;
}

export interface DashboardState {
  slots: HobbySlot[];
  completionHistory: Partial<Record<HobbyCategory, string>>;
  completionLog: Partial<Record<HobbyCategory, string[]>>;
  recoveryNotes: Partial<Record<HobbyCategory, RecoveryNote>>;
  recoveryHistory: Partial<Record<HobbyCategory, RecoveryNote[]>>;
}

export const DASHBOARD_STATE_KEY = 'trio-dashboard-state';

export const initialSlots: HobbySlot[] = [
  {
    category: 'physical',
    status: 'active',
    hobby: 'Running',
    starterTask: 'Today: 10-minute walk-run',
    restartTask: 'Restart gently: 5-minute walk-run',
    nextTask: '12-minute walk-run',
    progress: Math.round((5 / HABIT_FORMATION_DAYS) * 100),
    streak: 5,
    cadence: {
      sessionMinutes: 12,
      sessionsPerWeek: 4,
      preferredDays: ['Mon', 'Wed', 'Fri', 'Sun'],
      preferredTime: 'Morning',
    },
  },
  {
    category: 'intellectual',
    status: 'empty',
  },
  {
    category: 'creative',
    status: 'empty',
  },
];

export function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function getDayDifference(laterDateKey: string, earlierDateKey: string) {
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  return Math.round(
    (parseDateKey(laterDateKey).getTime() - parseDateKey(earlierDateKey).getTime()) / millisecondsPerDay
  );
}

export function getMissedDayCount(todayKey: string, lastCompletedDate?: string | null) {
  if (!lastCompletedDate) {
    return 0;
  }

  return Math.max(getDayDifference(todayKey, lastCompletedDate) - 1, 0);
}

export function formatCategoryLabel(category: HobbyCategory) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function formatRecoveryDate(dateKey: string) {
  const date = parseDateKey(dateKey);

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function pushRecoveryHistoryEntry(
  history: Partial<Record<HobbyCategory, RecoveryNote[]>>,
  category: HobbyCategory,
  note: RecoveryNote
) {
  const existingHistory = history[category] ?? [];

  return {
    ...history,
    [category]: [note, ...existingHistory].slice(0, 3),
  };
}

export function getHabitProgress(streak?: number | null, fallbackProgress?: number | null) {
  if (typeof streak === 'number') {
    return Math.min(Math.round((streak / HABIT_FORMATION_DAYS) * 100), 100);
  }

  return fallbackProgress ?? 0;
}

function stripNextUpPrefix(value?: string) {
  if (!value) {
    return value;
  }

  return value.replace(/^Next up:\s*/i, '').replace(/\s+tomorrow\.?$/i, '');
}

function parseSessionMinutes(value?: string) {
  if (!value) {
    return 10;
  }

  const [firstMatch] = value.match(/\d+/) ?? [];

  if (!firstMatch) {
    return 10;
  }

  return Number(firstMatch);
}

function parseSessionsPerWeek(value?: string) {
  if (!value) {
    return 3;
  }

  if (/daily/i.test(value)) {
    return 7;
  }

  const [firstMatch] = value.match(/\d+/) ?? [];

  if (!firstMatch) {
    return 3;
  }

  return Math.min(Math.max(Number(firstMatch), 1), 7);
}

function getDefaultPreferredDays(sessionsPerWeek: number): Weekday[] {
  if (sessionsPerWeek >= 7) {
    return [...WEEKDAY_OPTIONS];
  }

  const spacedDays: Weekday[] = ['Mon', 'Wed', 'Fri', 'Sun', 'Tue', 'Thu', 'Sat'];
  return spacedDays.slice(0, sessionsPerWeek);
}

function inferCadence(slot: HobbySlot): PlanCadence {
  const currentCadence = slot.cadence;

  if (currentCadence) {
    return {
      sessionMinutes: Math.max(currentCadence.sessionMinutes, 5),
      sessionsPerWeek: Math.min(Math.max(currentCadence.sessionsPerWeek, 1), 7),
      preferredDays:
        currentCadence.preferredDays.length > 0
          ? currentCadence.preferredDays.filter((day) => WEEKDAY_OPTIONS.includes(day))
          : getDefaultPreferredDays(currentCadence.sessionsPerWeek),
      preferredTime: PREFERRED_TIME_OPTIONS.includes(currentCadence.preferredTime)
        ? currentCadence.preferredTime
        : 'Flexible',
    };
  }

  const sessionMinutes = parseSessionMinutes(slot.nextTask ?? slot.starterTask);
  const sessionsPerWeek = parseSessionsPerWeek(slot.nextTask);

  return {
    sessionMinutes,
    sessionsPerWeek,
    preferredDays: getDefaultPreferredDays(sessionsPerWeek),
    preferredTime: 'Flexible',
  };
}

function buildSessionLabel(slot: HobbySlot, cadence: PlanCadence) {
  const hobby = slot.hobby?.trim() || 'practice session';
  return `${cadence.sessionMinutes}-minute ${hobby}`;
}

export function formatSessionFrequency(sessionsPerWeek: number) {
  if (sessionsPerWeek === 7) {
    return 'Daily';
  }

  if (sessionsPerWeek === 1) {
    return '1 time per week';
  }

  return `${sessionsPerWeek} times per week`;
}

export function formatPreferredDays(days: Weekday[]) {
  if (days.length === 0 || days.length === 7) {
    return 'Any day';
  }

  return days.join(', ');
}

export function formatCadenceSummary(cadence: PlanCadence) {
  return `${cadence.sessionMinutes} minutes, ${formatSessionFrequency(cadence.sessionsPerWeek)}, ${cadence.preferredTime.toLowerCase()}`;
}

export function buildNextTaskPreview(slot: HobbySlot, cadence: PlanCadence = inferCadence(slot)) {
  const sessionLabel = buildSessionLabel(slot, cadence);
  return `${sessionLabel}, ${formatSessionFrequency(cadence.sessionsPerWeek).toLowerCase()}`;
}

export function buildStarterTaskPreview(slot: HobbySlot, cadence: PlanCadence = inferCadence(slot)) {
  return `Today: ${buildSessionLabel(slot, cadence)}`;
}

export function buildRestartTaskPreview(slot: HobbySlot, cadence: PlanCadence = inferCadence(slot)) {
  const restartMinutes = Math.max(5, cadence.sessionMinutes - 5);
  const hobby = slot.hobby?.trim() || 'practice session';
  return `Restart gently: ${restartMinutes}-minute ${hobby}`;
}

function sanitizeSlot(slot: HobbySlot): HobbySlot {
  const cadence = inferCadence(slot);

  return {
    ...slot,
    starterTask: stripNextUpPrefix(slot.starterTask),
    restartTask: stripNextUpPrefix(slot.restartTask),
    nextTask: stripNextUpPrefix(slot.nextTask),
    cadence,
  };
}

export function buildSlotFromSuggestion(
  category: HobbyCategory,
  hobbyName: string,
  firstTask: string,
  frequency: string,
  duration: string
): HobbySlot {
  const cadence = {
    sessionMinutes: parseSessionMinutes(duration),
    sessionsPerWeek: parseSessionsPerWeek(frequency),
    preferredDays: getDefaultPreferredDays(parseSessionsPerWeek(frequency)),
    preferredTime: 'Flexible' as PreferredTimeOfDay,
  };

  return {
    category,
    status: 'active',
    hobby: hobbyName,
    starterTask: `Today: ${firstTask}`,
    restartTask: `Restart gently: ${firstTask}`,
    nextTask: `${duration.toLowerCase()} ${frequency.toLowerCase()} for ${hobbyName}`,
    progress: 0,
    streak: 0,
    cadence,
  };
}

export function readDashboardState(): DashboardState {
  if (typeof window === 'undefined') {
    return {
      slots: initialSlots,
      completionHistory: {},
      completionLog: {},
      recoveryNotes: {},
      recoveryHistory: {},
    };
  }

  try {
    const savedState = window.localStorage.getItem(DASHBOARD_STATE_KEY);

    if (!savedState) {
      return {
        slots: initialSlots,
        completionHistory: {},
        completionLog: {},
        recoveryNotes: {},
        recoveryHistory: {},
      };
    }

    const parsedState = JSON.parse(savedState) as Partial<DashboardState> & {
      lastCompletedDate?: string | null;
    };
    const slots = (parsedState.slots ?? initialSlots).map(sanitizeSlot);
    const completionHistory =
      parsedState.completionHistory && typeof parsedState.completionHistory === 'object'
        ? parsedState.completionHistory
        : {};
    const completionLog =
      parsedState.completionLog && typeof parsedState.completionLog === 'object' ? parsedState.completionLog : {};
    const recoveryNotes =
      parsedState.recoveryNotes && typeof parsedState.recoveryNotes === 'object' ? parsedState.recoveryNotes : {};
    const recoveryHistory =
      parsedState.recoveryHistory && typeof parsedState.recoveryHistory === 'object'
        ? parsedState.recoveryHistory
        : {};
    const legacyCompletedDate =
      typeof parsedState.lastCompletedDate === 'string' ? parsedState.lastCompletedDate : null;
    const migratedCategory = slots.find((slot) => slot.status === 'active')?.category;

    return {
      slots: slots.map(sanitizeSlot),
      completionHistory:
        legacyCompletedDate && migratedCategory
          ? {
              ...completionHistory,
              [migratedCategory]: completionHistory[migratedCategory] ?? legacyCompletedDate,
            }
          : completionHistory,
      completionLog:
        legacyCompletedDate && migratedCategory
          ? {
              ...completionLog,
              [migratedCategory]: completionLog[migratedCategory] ?? [legacyCompletedDate],
            }
          : completionLog,
      recoveryNotes,
      recoveryHistory,
    };
  } catch {
    return {
      slots: initialSlots,
      completionHistory: {},
      completionLog: {},
      recoveryNotes: {},
      recoveryHistory: {},
    };
  }
}

export function persistDashboardState(state: DashboardState) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(DASHBOARD_STATE_KEY, JSON.stringify(state));
}
