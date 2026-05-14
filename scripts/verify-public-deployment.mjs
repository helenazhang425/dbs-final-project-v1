const deploymentUrl = process.argv[2] ?? process.env.PUBLIC_DEPLOYMENT_URL;

if (!deploymentUrl) {
  console.error('Usage: node scripts/verify-public-deployment.mjs <deployment-url>');
  process.exit(1);
}

let url;

try {
  url = new URL(deploymentUrl);
} catch {
  console.error('Public deployment verification failed: deployment URL is invalid.');
  process.exit(1);
}

let response;

try {
  response = await fetch(url);
} catch (error) {
  console.error(
    `Public deployment verification failed: could not fetch ${url.toString()} (${error instanceof Error ? error.message : 'unknown error'}).`,
  );
  process.exit(1);
}

const body = await response.text();
const checks = [
  {
    label: 'homepage responds with 2xx',
    ok: response.ok,
    detail: `HTTP ${response.status}`,
  },
  {
    label: 'homepage contains Trio app shell',
    ok: /<title>Trio - Build a Balanced Life<\/title>|Create a .*balanced.* life/s.test(body),
  },
  {
    label: 'production does not expose Clerk test publishable key',
    ok: !body.includes('pk_test_'),
  },
  {
    label: 'production does not use Clerk development account domain',
    ok: !body.includes('clerk.accounts.dev'),
  },
  {
    label: 'homepage is not a generic runtime error',
    ok: !/Application error|Internal Server Error|This Serverless Function has crashed/i.test(body),
  },
];

for (const check of checks) {
  console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.label}${check.detail ? ` - ${check.detail}` : ''}`);
}

const failedChecks = checks.filter((check) => !check.ok);

if (failedChecks.length > 0) {
  process.exit(1);
}

console.log('Public deployment verification passed.');
