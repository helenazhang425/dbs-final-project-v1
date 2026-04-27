import type { HobbyCategory } from '@/lib/types';

export type HobbyStatus = 'empty' | 'active' | 'dormant';

export interface HobbySlot {
  category: HobbyCategory;
  status: HobbyStatus;
  hobby?: string;
  starterTask?: string;
  restartTask?: string;
  nextTask?: string;
  progress?: number;
  streak?: number;
}

export interface DashboardState {
  slots: HobbySlot[];
  completionHistory: Partial<Record<HobbyCategory, string>>;
}

export const DASHBOARD_STATE_KEY = 'trio-dashboard-state';

export const initialSlots: HobbySlot[] = [
  {
    category: 'physical',
    status: 'active',
    hobby: 'Running',
    starterTask: 'Today: 10-minute walk-run',
    restartTask: 'Restart gently: 5-minute walk-run',
    nextTask: 'Next up: 12-minute walk-run tomorrow',
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

export function formatCategoryLabel(category: HobbyCategory) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function buildSlotFromSuggestion(
  category: HobbyCategory,
  hobbyName: string,
  firstTask: string,
  frequency: string,
  duration: string
): HobbySlot {
  return {
    category,
    status: 'active',
    hobby: hobbyName,
    starterTask: `Today: ${firstTask}`,
    restartTask: `Restart gently: ${firstTask}`,
    nextTask: `Next up: ${duration.toLowerCase()} ${frequency.toLowerCase()} for ${hobbyName}`,
    progress: 10,
    streak: 0,
  };
}

export function readDashboardState(): DashboardState {
  if (typeof window === 'undefined') {
    return {
      slots: initialSlots,
      completionHistory: {},
    };
  }

  try {
    const savedState = window.localStorage.getItem(DASHBOARD_STATE_KEY);

    if (!savedState) {
      return {
        slots: initialSlots,
        completionHistory: {},
      };
    }

    const parsedState = JSON.parse(savedState) as Partial<DashboardState> & {
      lastCompletedDate?: string | null;
    };
    const slots = parsedState.slots ?? initialSlots;
    const completionHistory =
      parsedState.completionHistory && typeof parsedState.completionHistory === 'object'
        ? parsedState.completionHistory
        : {};
    const legacyCompletedDate =
      typeof parsedState.lastCompletedDate === 'string' ? parsedState.lastCompletedDate : null;
    const migratedCategory = slots.find((slot) => slot.status === 'active')?.category;

    return {
      slots,
      completionHistory:
        legacyCompletedDate && migratedCategory
          ? {
              ...completionHistory,
              [migratedCategory]: completionHistory[migratedCategory] ?? legacyCompletedDate,
            }
          : completionHistory,
    };
  } catch {
    return {
      slots: initialSlots,
      completionHistory: {},
    };
  }
}

export function persistDashboardState(state: DashboardState) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(DASHBOARD_STATE_KEY, JSON.stringify(state));
}
