'use client';

import {
  getInitialDashboardState,
  persistDashboardState,
  readDashboardState,
  type DashboardState,
} from '@/lib/dashboard-state';
import {
  getDashboardStateLoadResultAction,
  saveDashboardStateAction,
} from '@/lib/actions/dashboard-state';

function isSameDashboardState(left: DashboardState, right: DashboardState) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export async function readSyncedDashboardState() {
  const localState = readDashboardState();

  try {
    const remoteResult = await getDashboardStateLoadResultAction();

    if (!remoteResult.exists && !isSameDashboardState(localState, getInitialDashboardState())) {
      const seededRemoteState = await saveDashboardStateAction(localState);
      persistDashboardState(seededRemoteState);
      return seededRemoteState;
    }

    persistDashboardState(remoteResult.state);
    return remoteResult.state;
  } catch (error) {
    console.error(error);
    return localState;
  }
}

export async function persistSyncedDashboardStateNow(state: DashboardState) {
  persistDashboardState(state);

  try {
    await saveDashboardStateAction(state);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}
