# Trio

Trio helps people build a balanced life across three hobby categories: physical, intellectual, and creative. The app guides a signed-in user through category discovery, suggests beginner-friendly hobbies, generates tiny starter plans, and keeps the three-slot dashboard visible as the durable source of progress.

This repository is at the proposal's **Final Version** milestone. There is no V4 milestone unless `PROJECT_PROPOSAL.md` is updated.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Clerk authentication
- Supabase persistence
- Gemini hobby recommendations
- Vercel deployment target

## Local Development

Install dependencies:

```bash
npm ci
```

Create a local env file from `.env.example` and fill it with development-only credentials. Do not commit real `.env*` files.

Start the app:

```bash
npm run dev
```

Open http://localhost:3000.

## Required Environment

Documented in `.env.example`:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `AI_DAILY_USER_REQUEST_LIMIT`
- `AI_DAILY_IP_REQUEST_LIMIT`
- `AI_DAILY_USER_TOKEN_BUDGET`
- `AI_RATE_LIMIT_SALT`

Use separate credentials for development, preview, and production in Clerk, Supabase, Gemini, and Vercel. `SUPABASE_SERVICE_ROLE_KEY` is server-only and must not be imported into Client Components.

## Supabase

Apply the schema in `src/lib/supabase/schema.sql` to the target Supabase project before running the live persistence checks. The schema enables RLS for user-data tables and stores AI usage events as operational metadata only.

AI usage logging must not store prompts, raw discovery answers, model outputs, or raw IP addresses. The app records feature, category, model, source, status, estimated token counts, latency, error type, and salted IP fingerprint.

## Verification Gates

Run the local final-version gates before handoff:

```bash
npm run lint
npm run build
npm run verify:secrets
npm run verify:final
npm audit --omit=dev --audit-level=high
```

Run the live Supabase verifier only when the local environment points to a safe development Supabase project:

```bash
npm run verify:final:live
```

`npm audit --audit-level=moderate` currently reports a nested PostCSS advisory through Next. The high-severity production gate passes on Next `16.2.6`; npm's forced fix suggests a breaking downgrade, so track the next safe Next patch instead of forcing it.

## Final-Version Operations

Before opening public signups:

- Configure provider-side development, preview, and production environment separation.
- Confirm `src/lib/supabase/schema.sql` has been applied to the intended Supabase project.
- Confirm RLS remains enabled on user-data tables.
- Configure uptime monitoring against `/api/health`.
- Configure provider-side error monitoring.
- Review AI usage and fallback rates without storing sensitive prompt content.

## Repository Map

```text
src/app/                         App Router pages and routes
src/app/api/health/route.ts      Uptime health endpoint
src/components/                  React UI components
src/lib/actions/                 Server actions
src/lib/supabase/                Supabase clients and schema
src/lib/ai-usage.ts              AI budget and usage logging
scripts/                         Local final-version verification
FINAL_VERSION_CHECKLIST.md       Production-readiness checklist
PROJECT_PROPOSAL.md              Product and milestone definition
```
