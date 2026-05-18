import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { execFileSync } from 'node:child_process';

const repoRoot = process.cwd();
const sourceRoot = join(repoRoot, 'src');
const sourceFileExtensions = new Set(['.js', '.jsx', '.ts', '.tsx']);
const ignoredDirectoryNames = new Set([
  '.git',
  '.next',
  '.vercel',
  '.clerk',
  '.claude',
  'build',
  'coverage',
  'node_modules',
  'out',
]);
const forbiddenTrackedPathPatterns = [
  /^\.env(?!\.example$)/,
  /^\.clerk(?:\/|$)/,
  /^\.vercel(?:\/|$)/,
  /^secrets(?:\/|$)/,
  /(^|\/)[^/]*secret[^/]*$/i,
  /\.pem$/i,
];
const forbiddenPublicEnvPatterns = [
  /NEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|SERVICE|PRIVATE|TOKEN|PASSWORD|KEY)[A-Z0-9_]*/,
];
const allowedPublicEnvNames = new Set([
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
]);
const serviceRoleAccessMarkers = [
  '@/lib/supabase/server',
  'createServiceRoleClient',
];
const serviceRoleEnvMarker = 'process.env.SUPABASE_SERVICE_ROLE_KEY';
const allowedServiceRoleFiles = new Set([
  'src/lib/supabase/server.ts',
  'src/lib/ai-usage.ts',
  'src/lib/actions/dashboard-state.ts',
]);

function toRepoPath(filePath) {
  return relative(repoRoot, filePath).split(sep).join('/');
}

function listFiles(directory) {
  const files = [];

  if (!existsSync(directory)) {
    return files;
  }

  for (const entry of readdirSync(directory)) {
    if (ignoredDirectoryNames.has(entry)) {
      continue;
    }

    const fullPath = join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      files.push(...listFiles(fullPath));
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

function listTrackedFiles() {
  try {
    return execFileSync('git', ['ls-files'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .split(/\r?\n/)
      .filter(Boolean);
  } catch {
    return [];
  }
}

function isClientComponent(source) {
  const firstStatement = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !line.startsWith('//'));

  return firstStatement === "'use client';" || firstStatement === '"use client";';
}

function hasServerDirective(source) {
  const firstStatement = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !line.startsWith('//'));

  return firstStatement === "'use server';" || firstStatement === '"use server";';
}

const violations = [];

for (const trackedPath of listTrackedFiles()) {
  if (forbiddenTrackedPathPatterns.some((pattern) => pattern.test(trackedPath))) {
    violations.push(`${trackedPath}: sensitive local config or secret-like files must not be tracked.`);
  }
}

for (const filePath of listFiles(sourceRoot)) {
  if (!sourceFileExtensions.has(extname(filePath))) {
    continue;
  }

  const repoPath = toRepoPath(filePath);
  const source = readFileSync(filePath, 'utf8');
  const referencesServiceRole =
    serviceRoleAccessMarkers.some((marker) => source.includes(marker)) || source.includes(serviceRoleEnvMarker);
  const mentionsServiceRoleKey = source.includes('SUPABASE_SERVICE_ROLE_KEY');
  const publicEnvMatches = forbiddenPublicEnvPatterns
    .flatMap((pattern) => source.match(pattern) ?? [])
    .filter((envName) => !allowedPublicEnvNames.has(envName));

  if (publicEnvMatches.length > 0) {
    violations.push(`${repoPath}: public env vars must not contain secret/service/private/token/password/key names.`);
  }

  if (isClientComponent(source) && (referencesServiceRole || mentionsServiceRoleKey)) {
    violations.push(`${repoPath}: Client Components must not reference service-role Supabase code or keys.`);
  }

  if (referencesServiceRole && !allowedServiceRoleFiles.has(repoPath) && !hasServerDirective(source)) {
    violations.push(`${repoPath}: service-role Supabase access should stay in server-only modules/actions.`);
  }
}

if (violations.length > 0) {
  console.error('Final-version boundary check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Final-version boundary check passed.');
