import { execFileSync } from 'node:child_process';

const targetEnvironment = process.argv[2] ?? 'production';
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

let output;

try {
  output = execFileSync('npx', ['vercel', 'env', 'ls', targetEnvironment], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch (error) {
  const stderr = error instanceof Error && 'stderr' in error ? String(error.stderr) : '';
  console.error(`Vercel environment verification failed: could not list ${targetEnvironment} env vars.`);

  if (stderr.trim()) {
    console.error(stderr.trim());
  }

  process.exit(1);
}

const missingKeys = requiredEnvKeys.filter((key) => !new RegExp(`\\b${key}\\b`).test(output));

for (const key of requiredEnvKeys) {
  console.log(`${missingKeys.includes(key) ? 'FAIL' : 'PASS'} Vercel ${targetEnvironment} env has ${key}`);
}

if (missingKeys.length > 0) {
  console.error(`Missing Vercel ${targetEnvironment} env vars: ${missingKeys.join(', ')}`);
  process.exit(1);
}

console.log(`Vercel ${targetEnvironment} environment verification passed.`);
