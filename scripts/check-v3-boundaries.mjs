import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const sourceRoot = join(process.cwd(), 'src');
const allowedServiceRoleFiles = new Set([
  'src/lib/supabase/server.ts',
  'src/lib/ai-usage.ts',
  'src/lib/actions/dashboard-state.ts',
]);
const sourceFileExtensions = new Set(['.js', '.jsx', '.ts', '.tsx']);
const serverOnlyPatterns = [
  '@/lib/supabase/server',
  'createServiceRoleClient',
  'SUPABASE_SERVICE_ROLE_KEY',
];

function getExtension(filePath) {
  const match = filePath.match(/\.[^.]+$/);
  return match ? match[0] : '';
}

function listSourceFiles(directory) {
  const files = [];

  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
      continue;
    }

    if (sourceFileExtensions.has(getExtension(fullPath))) {
      files.push(fullPath);
    }
  }

  return files;
}

function isClientComponent(source) {
  const firstStatement = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !line.startsWith('//'));

  return firstStatement === "'use client';" || firstStatement === '"use client";';
}

function toRepoPath(filePath) {
  return relative(process.cwd(), filePath).split(sep).join('/');
}

const violations = [];

for (const filePath of listSourceFiles(sourceRoot)) {
  const repoPath = toRepoPath(filePath);
  const source = readFileSync(filePath, 'utf8');
  const matchesServerOnlyPattern = serverOnlyPatterns.some((pattern) => source.includes(pattern));

  if (isClientComponent(source) && matchesServerOnlyPattern) {
    violations.push(`${repoPath}: Client Components must not import or reference service-role Supabase code.`);
  }

  if (
    matchesServerOnlyPattern &&
    !allowedServiceRoleFiles.has(repoPath) &&
    !source.includes("'use server';") &&
    !source.includes('"use server";')
  ) {
    violations.push(`${repoPath}: service-role Supabase access should stay in server-only modules/actions.`);
  }
}

if (violations.length > 0) {
  console.error('V3 boundary check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('V3 boundary check passed.');
