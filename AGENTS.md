<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Final Version Safety Rules

- Treat the project proposal's "Final Version" as the production-readiness milestone; do not invent a V4 milestone unless the proposal is updated.
- Never read, print, commit, or paste real secrets from `.env*`, `.clerk/`, `.vercel/`, `secrets/`, `*.pem`, provider exports, production database URLs, OAuth client secrets, or service-role keys.
- `.env.example` is the only env file that should be tracked, and it must contain placeholders only.
- `SUPABASE_SERVICE_ROLE_KEY` must stay server-only. Do not import `src/lib/supabase/server.ts` or `createServiceRoleClient` into Client Components.
- Before final-version handoff, run `npm run lint`, `npm run build`, and `npm run verify:final`. Run `npm run verify:final:live` only when the local environment has safe development Supabase credentials.
