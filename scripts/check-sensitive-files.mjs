import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { extname } from 'node:path';

const repoRoot = process.cwd();
const maxFileBytes = 1024 * 1024;
const skippedExtensions = new Set([
  '.ico',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.pdf',
  '.woff',
  '.woff2',
]);
const skippedFiles = new Set(['package-lock.json', 'skills-lock.json']);

const sensitiveRules = [
  {
    name: 'private key block',
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  },
  {
    name: 'Google API key',
    pattern: /AIza[0-9A-Za-z_-]{35}/,
  },
  {
    name: 'Clerk secret key',
    pattern: /sk_(?:test|live)_[0-9A-Za-z_-]{20,}/,
  },
  {
    name: 'service-role JWT',
    pattern: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/,
  },
  {
    name: 'database URL with password',
    pattern: /(?:postgres|postgresql):\/\/[^:\s]+:[^@\s]+@/i,
  },
  {
    name: 'hard-coded service role assignment',
    pattern: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*(?!<supabase_service_role_key>)[^\s#]+/,
  },
  {
    name: 'hard-coded OAuth client secret assignment',
    pattern: /OAUTH_[A-Z0-9_]*SECRET\s*=\s*(?!<[^>]+>)[^\s#]+/,
  },
];

function listTrackedFiles() {
  return execFileSync('git', ['ls-files'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  })
    .split(/\r?\n/)
    .filter(Boolean);
}

function shouldSkip(filePath) {
  return skippedFiles.has(filePath) || skippedExtensions.has(extname(filePath).toLowerCase());
}

const violations = [];

for (const filePath of listTrackedFiles()) {
  if (!existsSync(filePath) || shouldSkip(filePath)) {
    continue;
  }

  const source = readFileSync(filePath, 'utf8');

  if (Buffer.byteLength(source, 'utf8') > maxFileBytes) {
    continue;
  }

  for (const rule of sensitiveRules) {
    if (rule.pattern.test(source)) {
      violations.push(`${filePath}: ${rule.name}`);
    }
  }
}

if (violations.length > 0) {
  console.error('Sensitive-file check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Sensitive-file check passed.');
