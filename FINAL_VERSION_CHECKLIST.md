# Final Version Checklist

The project proposal does not define a V4. After V3 persistence, this is the final-version production readiness checklist.

## Code Gates

- Run `npm run lint`.
- Run `npm run build`.
- Run `npm run verify:secrets`.
- Run `npm run verify:final`.
- Run `npm audit --omit=dev --audit-level=high`.
- Run `npm run verify:public -- https://trio-balance.vercel.app` after production env vars are configured.
- Run `npm run verify:final:live` only against a safe development Supabase project.

## Environment Separation

Configure separate development, preview, and production credentials in each provider:

- Clerk publishable and secret keys
- Supabase project URL, anon key, and service-role key
- Gemini API key and model
- AI daily request and token budgets
- AI rate-limit hash salt

Production should use live provider credentials. The public deployment check fails if the production HTML still exposes Clerk test wiring such as a `pk_test` publishable key or `clerk.accounts.dev`.

Only `.env.example` should be committed. Real `.env*`, `.clerk/`, `.vercel/`, provider exports, service-role keys, OAuth secrets, production database URLs, and `*.pem` files stay local or in provider-managed secret stores.

## Supabase

- Apply `src/lib/supabase/schema.sql` to the target project.
- Confirm RLS is enabled on user-data tables.
- Confirm `ai_usage_events` stores operational metadata only: feature, category, model, source, status, estimated token counts, latency, error type, and salted IP fingerprint.
- Confirm prompts, raw discovery answers, and model outputs are not stored in AI usage logs.
- Confirm service-role access remains server-only.

## AI Safety

- Set `AI_DAILY_USER_REQUEST_LIMIT`.
- Set `AI_DAILY_IP_REQUEST_LIMIT`.
- Set `AI_DAILY_USER_TOKEN_BUDGET`.
- Set `AI_RATE_LIMIT_SALT` to a stable random value per environment.
- Keep Gemini max output token caps in the server action layer.

## Monitoring

- Configure uptime monitoring against `/api/health`.
- Configure provider-side error monitoring before opening public signups.
- Review AI usage and fallback/error rates without storing sensitive prompt content.

## Known Residual

`npm audit --audit-level=moderate` currently reports a nested PostCSS advisory through Next. The high-severity production gate passes on Next `16.2.6`; npm's forced fix suggests a breaking downgrade, so track the next safe Next patch instead of forcing it.
