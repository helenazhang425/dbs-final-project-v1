import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const repoRoot = process.cwd();
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
const requiredGitignorePatterns = [
  '.env*',
  '!.env.example',
  '*.pem',
  '/.clerk/',
  '.vercel',
];
const checks = [];

function pass(label) {
  checks.push({ label, ok: true });
}

function fail(label, detail) {
  checks.push({ label, ok: false, detail });
}

function runNodeScript(scriptPath) {
  execFileSync(process.execPath, [scriptPath], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
}

function checkEnvExample() {
  const envExamplePath = join(repoRoot, '.env.example');

  if (!existsSync(envExamplePath)) {
    fail('.env.example exists', 'Create .env.example with documented placeholders.');
    return;
  }

  const source = readFileSync(envExamplePath, 'utf8');
  const missingKeys = requiredEnvKeys.filter((key) => !new RegExp(`^${key}=`, 'm').test(source));
  const suspiciousAssignments = source
    .split(/\r?\n/)
    .filter((line) => line.includes('='))
    .filter((line) => {
      const [, rawValue = ''] = line.split(/=(.*)/s);
      const value = rawValue.trim();
      return (
        value.length > 0 &&
        !/^<[^>]+>$/.test(value) &&
        !/^#/.test(line.trim()) &&
        !['gemini-2.5-flash'].includes(value)
      );
    });

  if (missingKeys.length > 0) {
    fail('.env.example documents required keys', `Missing: ${missingKeys.join(', ')}`);
  } else {
    pass('.env.example documents required keys');
  }

  if (suspiciousAssignments.length > 0) {
    fail('.env.example contains placeholders only', `Replace concrete values: ${suspiciousAssignments.join(', ')}`);
  } else {
    pass('.env.example contains placeholders only');
  }
}

function checkGitignore() {
  const gitignorePath = join(repoRoot, '.gitignore');

  if (!existsSync(gitignorePath)) {
    fail('.gitignore exists', 'Create .gitignore before production.');
    return;
  }

  const source = readFileSync(gitignorePath, 'utf8');
  const missingPatterns = requiredGitignorePatterns.filter((pattern) => !source.includes(pattern));

  if (missingPatterns.length > 0) {
    fail('.gitignore blocks secret-bearing files', `Missing: ${missingPatterns.join(', ')}`);
  } else {
    pass('.gitignore blocks secret-bearing files');
  }
}

function checkCiWorkflow() {
  const ciPath = join(repoRoot, '.github', 'workflows', 'ci.yml');

  if (!existsSync(ciPath)) {
    fail('CI workflow exists', 'Create .github/workflows/ci.yml.');
    return;
  }

  const source = readFileSync(ciPath, 'utf8');
  const requiredSnippets = [
    'npm ci',
    'npm run lint',
    'npm run build',
    'npm run verify:secrets',
    'npm run verify:final',
    'npm audit',
  ];
  const missingSnippets = requiredSnippets.filter((snippet) => !source.includes(snippet));

  if (missingSnippets.length > 0) {
    fail('CI runs final-version gates', `Missing: ${missingSnippets.join(', ')}`);
  } else {
    pass('CI runs final-version gates');
  }
}

function checkAgentRules() {
  const agentsPath = join(repoRoot, 'AGENTS.md');

  if (!existsSync(agentsPath)) {
    fail('AGENTS.md exists', 'Create AGENTS.md with repo safety rules.');
    return;
  }

  const source = readFileSync(agentsPath, 'utf8');
  const requiredSnippets = ['Final Version Safety Rules', '.env*', 'SUPABASE_SERVICE_ROLE_KEY', '.clerk/', '.vercel/'];
  const missingSnippets = requiredSnippets.filter((snippet) => !source.includes(snippet));

  if (missingSnippets.length > 0) {
    fail('AGENTS.md includes final-version secret rules', `Missing: ${missingSnippets.join(', ')}`);
  } else {
    pass('AGENTS.md includes final-version secret rules');
  }
}

function checkAiSafetyControls() {
  const actionsPath = join(repoRoot, 'src', 'lib', 'actions', 'hobby-recommendations.ts');
  const schemaPath = join(repoRoot, 'src', 'lib', 'supabase', 'schema.sql');

  if (!existsSync(actionsPath)) {
    fail('AI actions exist', 'Expected src/lib/actions/hobby-recommendations.ts.');
    return;
  }

  if (!existsSync(schemaPath)) {
    fail('Supabase schema exists', 'Expected src/lib/supabase/schema.sql.');
    return;
  }

  const actionsSource = readFileSync(actionsPath, 'utf8');
  const schemaSource = readFileSync(schemaPath, 'utf8');
  const requiredActionSnippets = ['checkAiBudget', 'recordAiUsageEvent', 'fingerprintIpAddress', 'maxOutputTokens'];
  const requiredSchemaSnippets = [
    'CREATE TABLE IF NOT EXISTS ai_usage_events',
    'ip_fingerprint TEXT',
    'ALTER TABLE ai_usage_events ENABLE ROW LEVEL SECURITY',
    'GRANT SELECT, INSERT ON TABLE ai_usage_events TO service_role',
    'REVOKE ALL ON TABLE ai_usage_events FROM anon, authenticated',
  ];
  const requiredUserDataSchemaSnippets = [
    'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE user_dashboard_states TO authenticated',
    'REVOKE ALL ON TABLE user_dashboard_states FROM anon',
    'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE discovery_responses TO authenticated',
    'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE hobbies TO authenticated',
    'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE plans TO authenticated',
    'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE plan_tasks TO authenticated',
    'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE discovery_responses TO service_role',
    'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE hobbies TO service_role',
    'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE plans TO service_role',
    'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE plan_tasks TO service_role',
    'REVOKE ALL ON TABLE discovery_responses, hobbies, plans, plan_tasks FROM anon',
    'CREATE POLICY "Users can update their own discovery responses" ON discovery_responses',
    'CREATE POLICY "Users can delete their own discovery responses" ON discovery_responses',
    'CREATE POLICY "Users can delete their own hobbies" ON hobbies',
    'CREATE POLICY "Users can insert plans for their own hobbies" ON plans',
    'CREATE POLICY "Users can update their own plans" ON plans',
    'CREATE POLICY "Users can delete their own plans" ON plans',
    'CREATE POLICY "Users can insert tasks for their own plans" ON plan_tasks',
    'CREATE POLICY "Users can update their own tasks" ON plan_tasks',
    'CREATE POLICY "Users can delete their own tasks" ON plan_tasks',
  ];
  const missingActionSnippets = requiredActionSnippets.filter((snippet) => !actionsSource.includes(snippet));
  const missingSchemaSnippets = requiredSchemaSnippets.filter((snippet) => !schemaSource.includes(snippet));
  const missingUserDataSchemaSnippets = requiredUserDataSchemaSnippets.filter((snippet) => !schemaSource.includes(snippet));

  if (missingActionSnippets.length > 0) {
    fail('AI calls have budget and usage controls', `Missing: ${missingActionSnippets.join(', ')}`);
  } else {
    pass('AI calls have budget and usage controls');
  }

  if (missingSchemaSnippets.length > 0) {
    fail('AI usage table has RLS and explicit grants', `Missing: ${missingSchemaSnippets.join(', ')}`);
  } else {
    pass('AI usage table has RLS and explicit grants');
  }

  if (missingUserDataSchemaSnippets.length > 0) {
    fail('User-data tables have complete owner-scoped RLS and explicit grants', `Missing: ${missingUserDataSchemaSnippets.join(', ')}`);
  } else {
    pass('User-data tables have complete owner-scoped RLS and explicit grants');
  }
}

function checkProductionErrorSurfaces() {
  const globalErrorPath = join(repoRoot, 'src', 'app', 'global-error.tsx');
  const notFoundPath = join(repoRoot, 'src', 'app', 'not-found.tsx');
  const healthPath = join(repoRoot, 'src', 'app', 'api', 'health', 'route.ts');

  if (existsSync(globalErrorPath)) {
    pass('Global error UI exists');
  } else {
    fail('Global error UI exists', 'Create src/app/global-error.tsx.');
  }

  if (existsSync(notFoundPath)) {
    pass('Not-found UI exists');
  } else {
    fail('Not-found UI exists', 'Create src/app/not-found.tsx.');
  }

  if (existsSync(healthPath)) {
    const source = readFileSync(healthPath, 'utf8');
    const requiredSnippets = [
      'requiredEnvKeys',
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'AI_RATE_LIMIT_SALT',
      'positiveIntegerEnvKeys',
      'VERCEL_ENV',
      'pk_live_',
      "status: isHealthy ? 200 : 503",
      'Cache-Control',
    ];
    const missingSnippets = requiredSnippets.filter((snippet) => !source.includes(snippet));

    if (missingSnippets.length > 0) {
      fail('Health check validates required configuration', `Missing: ${missingSnippets.join(', ')}`);
    } else {
      pass('Health check validates required configuration');
    }
  } else {
    fail('Health check route exists', 'Create src/app/api/health/route.ts.');
  }
}

function checkFinalChecklist() {
  const checklistPath = join(repoRoot, 'FINAL_VERSION_CHECKLIST.md');

  if (!existsSync(checklistPath)) {
    fail('Final version checklist exists', 'Create FINAL_VERSION_CHECKLIST.md.');
    return;
  }

  const source = readFileSync(checklistPath, 'utf8');
  const requiredSnippets = [
    'Environment Separation',
    'Supabase',
    'AI Safety',
    'Monitoring',
    '/api/health',
  ];
  const missingSnippets = requiredSnippets.filter((snippet) => !source.includes(snippet));

  if (missingSnippets.length > 0) {
    fail('Final version checklist covers provider setup', `Missing: ${missingSnippets.join(', ')}`);
  } else {
    pass('Final version checklist covers provider setup');
  }
}

function checkPublicDeploymentVerifier() {
  const verifierPath = join(repoRoot, 'scripts', 'verify-public-deployment.mjs');

  if (!existsSync(verifierPath)) {
    fail('Public deployment verifier exists', 'Create scripts/verify-public-deployment.mjs.');
    return;
  }

  const source = readFileSync(verifierPath, 'utf8');
  const requiredSnippets = [
    '/api/health',
    'health check responds with 2xx',
    'health check reports ok status',
    'health check validates required environment',
    'requiredEnvironment',
  ];
  const missingSnippets = requiredSnippets.filter((snippet) => !source.includes(snippet));

  if (missingSnippets.length > 0) {
    fail('Public deployment verifier checks health endpoint', `Missing: ${missingSnippets.join(', ')}`);
  } else {
    pass('Public deployment verifier checks health endpoint');
  }
}

function checkVercelEnvVerifier() {
  const packagePath = join(repoRoot, 'package.json');
  const verifierPath = join(repoRoot, 'scripts', 'verify-vercel-env.mjs');

  if (!existsSync(verifierPath)) {
    fail('Vercel env verifier exists', 'Create scripts/verify-vercel-env.mjs.');
    return;
  }

  if (!existsSync(packagePath)) {
    fail('package.json exists', 'Create package.json.');
    return;
  }

  const packageSource = readFileSync(packagePath, 'utf8');
  const verifierSource = readFileSync(verifierPath, 'utf8');
  const requiredSnippets = [
    'verify:vercel-env',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'AI_RATE_LIMIT_SALT',
    'npx',
    'vercel',
    'env',
    'ls',
  ];
  const combinedSource = `${packageSource}\n${verifierSource}`;
  const missingSnippets = requiredSnippets.filter((snippet) => !combinedSource.includes(snippet));

  if (missingSnippets.length > 0) {
    fail('Vercel env verifier checks required production names', `Missing: ${missingSnippets.join(', ')}`);
  } else {
    pass('Vercel env verifier checks required production names');
  }
}

try {
  runNodeScript('scripts/check-v3-boundaries.mjs');
  pass('V3 service-role boundary check still passes');
} catch {
  fail('V3 service-role boundary check still passes', 'Run npm run verify:v3:boundaries for details.');
}

try {
  runNodeScript('scripts/check-final-boundaries.mjs');
  pass('Final-version boundary check passes');
} catch {
  fail('Final-version boundary check passes', 'Run node scripts/check-final-boundaries.mjs for details.');
}

try {
  runNodeScript('scripts/check-sensitive-files.mjs');
  pass('Sensitive-file check passes');
} catch {
  fail('Sensitive-file check passes', 'Run npm run verify:secrets for details.');
}

checkEnvExample();
checkGitignore();
checkCiWorkflow();
checkAgentRules();
checkAiSafetyControls();
checkProductionErrorSurfaces();
checkFinalChecklist();
checkPublicDeploymentVerifier();
checkVercelEnvVerifier();

const failedChecks = checks.filter((check) => !check.ok);

for (const check of checks) {
  console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.label}${check.detail ? ` - ${check.detail}` : ''}`);
}

if (failedChecks.length > 0) {
  process.exit(1);
}

console.log('Final-version readiness verification passed.');
