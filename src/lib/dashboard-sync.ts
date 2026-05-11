'use client';

import {
  persistDashboardState,
  readDashboardState,
  type DashboardState,
} from '@/lib/dashboard-state';
import {
  getDashboardStateAction,
  saveDashboardStateAction,
} from '@/lib/actions/dashboard-state';

export async function readSyncedDashboardState() {
  const localState = readDashboardState();

  try {
    const remoteState = await getDashboardStateAction();
    persistDashboardState(remoteState);
    return remoteState;
  } catch (error) {
    console.error(error);
    return localState;
  }
}

export function persistSyncedDashboardState(state: DashboardState) {
  persistDashboardState(state);
  void saveDashboardStateAction(state).catch((error) => {
    console.error(error);
  });
}

export async function persistSyncedDashboardStateNow(state: DashboardState) {
  persistDashboardState(state);

  try {
    await saveDashboardStateAction(state);
  } catch (error) {
    console.error(error);
  }
}
