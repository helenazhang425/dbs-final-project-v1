# Trio - Balanced Life App

## Quick Start

**Live App:** http://localhost:3000

**GitHub:** https://github.com/helenazhang425/dbs-final-project-v1

## How to Use Discovery UI

1. **Open** http://localhost:3000
2. **Sign in** (top right corner)
3. **Click** "Discover & Start" on any hobby slot
4. **Answer** 5 conversational questions about your preferences
5. **Get** personalized hobby suggestions with reasoning
6. **Select** a hobby to activate

## Features Built

- Three-category dashboard (Physical/Intellectual/Creative)
- Clerk authentication
- Conversational discovery flow
- Hobby suggestions with AI-generated reasoning
- Supabase-backed dashboard persistence
- AI usage budgets and operational metadata logging
- Progress tracking
- Responsive UI

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Clerk Auth
- Supabase persistence
- Gemini recommendations

## Final Setup

1. Apply `src/lib/supabase/schema.sql` to a safe development Supabase project.
2. Configure the required variables listed in `.env.example`.
3. Keep development, preview, and production provider credentials separated.
4. Use live Clerk keys in production, not `pk_test` / `sk_test` keys.
5. Configure uptime monitoring for `/api/health`.
   - It returns HTTP 503 until all required configuration is present, numeric AI budgets are valid, and Vercel production uses live Clerk keys.
6. Confirm the Supabase project is not on Postgres 14, which Supabase support deprecates on July 1, 2026.
7. Confirm the applied schema has explicit authenticated grants, owner-scoped RLS policies, and anonymous access revoked for private user data.
8. Configure provider-side error monitoring before public signups.

## Final Version Readiness

The project proposal does not define a V4 milestone. After V3 persistence, the next milestone is the **Final Version**: production-readiness checks, environment separation, CI gates, dependency review, and explicit secret-handling rules.

Final-version AI calls use per-user and per-IP daily request limits plus per-user token budgets, and log only operational metadata in `ai_usage_events`: feature, category, model, source, status, estimated token counts, latency, error type, and a salted IP fingerprint. Prompts, raw discovery answers, raw IP addresses, and model outputs are not stored. The app also includes production fallback UI for global errors and not-found routes, plus a configuration-aware `/api/health` endpoint for uptime monitoring.

Use `.env.example` for required variable names and keep real `.env*` files local. Run:

```bash
npm run lint
npm run build
npm run verify:final
```

After Vercel Production env vars are configured, verify the names without reading their values:

```bash
npm run verify:vercel-env -- production
```

If you have safe development Supabase credentials locally, also run:

```bash
npm run verify:final:live
```

## V3 Persistence

Dashboard progress is saved through authenticated Next Server Actions. The app verifies the Clerk user on every load/save, writes durable state to `user_dashboard_states`, and keeps `localStorage` only as a browser cache/fallback.

Do not import the Supabase service-role client into Client Components. Server credentials belong in `src/lib/supabase/server.ts` and should only be used by server-only data access or actions.

## Repository Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── dashboard/        # Main dashboard
│   ├── discover/         # Discovery UI flow
│   └── page.tsx          # Homepage
├── components/           # React components
│   ├── ui/              # Header, etc.
│   └── discovery/       # Discovery flow components
└── lib/                 # Utilities
    ├── supabase/        # DB client & schema
    └── types/           # TypeScript types
```
