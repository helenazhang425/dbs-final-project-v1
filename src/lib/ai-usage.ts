import 'server-only';

import { createHash } from 'node:crypto';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { HobbyCategory } from '@/lib/types';

export type AiFeature = 'custom_hobby_plan' | 'hobby_recommendations';
export type AiUsageStatus = 'success' | 'fallback' | 'blocked' | 'error' | 'invalid_response';

type AiBudgetInput = {
  clerkUserId: string;
  ipFingerprint?: string | null;
  feature: AiFeature;
  category: HobbyCategory;
  model: string;
  estimatedInputTokens: number;
  maxOutputTokens: number;
};

type AiUsageEventInput = AiBudgetInput & {
  status: AiUsageStatus;
  source: 'ai' | 'fallback';
  latencyMs: number;
  errorType?: string;
};

type AiUsageRow = {
  estimated_input_tokens: number | null;
  max_output_tokens: number | null;
};

type AiRequestRow = {
  id: string;
};

function getNumericEnv(key: string, fallback: number) {
  const rawValue = process.env[key];

  if (!rawValue) {
    return fallback;
  }

  const value = Number(rawValue);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getUtcDayStartIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

export function estimateTokenCount(value: string) {
  return Math.ceil(value.length / 4);
}

export function fingerprintIpAddress(ipAddress: string | null) {
  if (!ipAddress) {
    return null;
  }

  const salt = process.env.AI_RATE_LIMIT_SALT ?? process.env.CLERK_SECRET_KEY ?? 'trio-local-rate-limit';
  return createHash('sha256').update(`${salt}:${ipAddress}`).digest('hex');
}

export async function checkAiBudget(input: AiBudgetInput) {
  const dailyRequestLimit = getNumericEnv('AI_DAILY_USER_REQUEST_LIMIT', 20);
  const dailyIpRequestLimit = getNumericEnv('AI_DAILY_IP_REQUEST_LIMIT', 60);
  const dailyTokenBudget = getNumericEnv('AI_DAILY_USER_TOKEN_BUDGET', 12000);
  const supabase = createServiceRoleClient();
  const dayStart = getUtcDayStartIso();
  const { data, error } = await supabase
    .from('ai_usage_events')
    .select('estimated_input_tokens,max_output_tokens')
    .eq('clerk_user_id', input.clerkUserId)
    .gte('requested_at', dayStart)
    .returns<AiUsageRow[]>();

  if (error) {
    throw new Error(`Failed to check AI usage budget: ${error.message}`);
  }

  if (input.ipFingerprint) {
    const { data: ipData, error: ipError } = await supabase
      .from('ai_usage_events')
      .select('id')
      .eq('ip_fingerprint', input.ipFingerprint)
      .gte('requested_at', dayStart)
      .returns<AiRequestRow[]>();

    if (ipError) {
      throw new Error(`Failed to check AI IP budget: ${ipError.message}`);
    }

    if (ipData.length >= dailyIpRequestLimit) {
      return {
        allowed: false,
        reason: 'daily_ip_request_limit' as const,
      };
    }
  }

  const usedRequests = data.length;
  const usedTokens = data.reduce(
    (sum, row) => sum + (row.estimated_input_tokens ?? 0) + (row.max_output_tokens ?? 0),
    0
  );
  const requestedTokens = input.estimatedInputTokens + input.maxOutputTokens;

  if (usedRequests >= dailyRequestLimit) {
    return {
      allowed: false,
      reason: 'daily_request_limit' as const,
    };
  }

  if (usedTokens + requestedTokens > dailyTokenBudget) {
    return {
      allowed: false,
      reason: 'daily_token_budget' as const,
    };
  }

  return {
    allowed: true,
    reason: null,
  };
}

export async function recordAiUsageEvent(input: AiUsageEventInput) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('ai_usage_events').insert({
    clerk_user_id: input.clerkUserId,
    ip_fingerprint: input.ipFingerprint ?? null,
    feature: input.feature,
    category: input.category,
    model: input.model,
    source: input.source,
    status: input.status,
    estimated_input_tokens: input.estimatedInputTokens,
    max_output_tokens: input.maxOutputTokens,
    latency_ms: input.latencyMs,
    error_type: input.errorType ?? null,
  });

  if (error) {
    throw new Error(`Failed to record AI usage event: ${error.message}`);
  }
}
