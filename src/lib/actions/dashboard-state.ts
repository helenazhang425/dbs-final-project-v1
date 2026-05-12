'use server';

import { auth } from '@clerk/nextjs/server';
import {
  getInitialDashboardState,
  normalizeDashboardState,
  type DashboardState,
} from '@/lib/dashboard-state';
import { createServiceRoleClient } from '@/lib/supabase/server';

type DashboardStateRow = {
  state: DashboardState | null;
};

export type DashboardStateLoadResult = {
  state: DashboardState;
  exists: boolean;
};

async function requireUserId() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Unauthorized');
  }

  return userId;
}

export async function getDashboardStateAction(): Promise<DashboardState> {
  const result = await getDashboardStateLoadResultAction();

  return result.state;
}

export async function getDashboardStateLoadResultAction(): Promise<DashboardStateLoadResult> {
  const clerkUserId = await requireUserId();
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('user_dashboard_states')
    .select('state')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle<DashboardStateRow>();

  if (error) {
    throw new Error(`Failed to load dashboard state: ${error.message}`);
  }

  return {
    state: data?.state ? normalizeDashboardState(data.state) : getInitialDashboardState(),
    exists: Boolean(data),
  };
}

export async function saveDashboardStateAction(state: DashboardState): Promise<DashboardState> {
  const clerkUserId = await requireUserId();
  const normalizedState = normalizeDashboardState(state);
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('user_dashboard_states').upsert(
    {
      clerk_user_id: clerkUserId,
      state: normalizedState,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'clerk_user_id',
    }
  );

  if (error) {
    throw new Error(`Failed to save dashboard state: ${error.message}`);
  }

  return normalizedState;
}
