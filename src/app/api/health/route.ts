export const dynamic = 'force-dynamic';

const requiredEnvKeys = [
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GEMINI_API_KEY',
  'GEMINI_MODEL',
  'AI_DAILY_USER_REQUEST_LIMIT',
  'AI_DAILY_IP_REQUEST_LIMIT',
  'AI_DAILY_USER_TOKEN_BUDGET',
  'AI_RATE_LIMIT_SALT',
];
const positiveIntegerEnvKeys = [
  'AI_DAILY_USER_REQUEST_LIMIT',
  'AI_DAILY_IP_REQUEST_LIMIT',
  'AI_DAILY_USER_TOKEN_BUDGET',
];

function isPlaceholder(value: string) {
  return /^<[^>]+>$/.test(value.trim());
}

function isPositiveInteger(value: string) {
  return /^\d+$/.test(value) && Number(value) > 0;
}

function getRequiredEnvironmentStatus() {
  const hasMissingValue = requiredEnvKeys.some((key) => !process.env[key]);
  const hasPlaceholderValue = requiredEnvKeys.some((key) => {
    const value = process.env[key];
    return value ? isPlaceholder(value) : false;
  });
  const hasInvalidBudget = positiveIntegerEnvKeys.some((key) => {
    const value = process.env[key];
    return value ? !isPositiveInteger(value) : false;
  });
  const hasInvalidSupabaseUrl = (() => {
    const value = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!value) {
      return false;
    }

    try {
      const url = new URL(value);
      return url.protocol !== 'https:';
    } catch {
      return true;
    }
  })();
  const hasNonLiveProductionClerkKeys =
    process.env.VERCEL_ENV === 'production' &&
    (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_live_') ||
      !process.env.CLERK_SECRET_KEY?.startsWith('sk_live_'));

  return hasMissingValue ||
    hasPlaceholderValue ||
    hasInvalidBudget ||
    hasInvalidSupabaseUrl ||
    hasNonLiveProductionClerkKeys
    ? 'invalid'
    : 'ok';
}

export async function GET() {
  const requiredEnvironment = getRequiredEnvironmentStatus();
  const isHealthy = requiredEnvironment === 'ok';

  return Response.json(
    {
      status: isHealthy ? 'ok' : 'degraded',
      service: 'trio',
      checkedAt: new Date().toISOString(),
      checks: {
        requiredEnvironment,
      },
    },
    {
      status: isHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
