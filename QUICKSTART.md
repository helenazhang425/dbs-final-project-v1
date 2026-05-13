# Trio - Balanced Life App

## 🚀 Quick Start

**Live App:** http://localhost:3000

**GitHub:** https://github.com/helenazhang425/dbs-final-project-v1

## 📖 How to Use Discovery UI

1. **Open** http://localhost:3000
2. **Sign in** (top right corner)
3. **Click** "Discover & Start" on any hobby slot
4. **Answer** 5 conversational questions about your preferences
5. **Get** personalized hobby suggestions with reasoning
6. **Select** a hobby to activate

## 🎨 Features Built

✅ Three-category dashboard (Physical/Intellectual/Creative)
✅ Clerk authentication 
✅ Conversational discovery flow
✅ Hobby suggestions with AI-generated reasoning
✅ Progress tracking
✅ Responsive UI

## 🛠️ Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Clerk Auth
- Supabase (ready to connect)
- OpenAI Codex (ready to integrate)

## 📝 Next Steps

1. Set up Supabase database (run `src/lib/supabase/schema.sql`)
2. Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and server-only `SUPABASE_SERVICE_ROLE_KEY`
3. Connect Google Calendar API
4. Add adaptive plan generation

## ✅ Final Version Readiness

The project proposal does not define a V4 milestone. After V3 persistence, the next milestone is the **Final Version**: production-readiness checks, environment separation, CI gates, dependency review, and explicit secret-handling rules.

Final-version AI calls use per-user and per-IP daily request limits plus per-user token budgets, and log only operational metadata in `ai_usage_events`: feature, category, model, source, status, estimated token counts, latency, error type, and a salted IP fingerprint. Prompts, raw discovery answers, raw IP addresses, and model outputs are not stored. The app also includes production fallback UI for global errors and not-found routes, plus `/api/health` for uptime monitoring.

Use `.env.example` for required variable names and keep real `.env*` files local. Run:

```bash
npm run lint
npm run build
npm run verify:final
```

If you have safe development Supabase credentials locally, also run:

```bash
npm run verify:final:live
```

## 🔐 V3 Persistence

Dashboard progress is saved through authenticated Next Server Actions. The app verifies the Clerk user on every load/save, writes durable state to `user_dashboard_states`, and keeps `localStorage` only as a browser cache/fallback.

Do not import the Supabase service-role client into Client Components. Server credentials belong in `src/lib/supabase/server.ts` and should only be used by server-only data access or actions.

## 📂 Repository Structure

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
