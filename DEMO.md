# Trio Demo Runbook

Use this for the final-version presentation and post-deploy sanity check. Do not put real provider secrets, test passwords, API keys, exported configs, or production database URLs in this file.

## Before Demo

- Confirm the latest commit is deployed to production.
- Run `npm run verify:public -- https://trio-balance.vercel.app`.
- Sign in with a safe demo account that does not contain real user data.
- Open `https://trio-balance.vercel.app/dashboard?demo=1` and use **Reset demo state** if the account has stale progress.
- Keep a fallback note ready: if Gemini is unavailable or budget-blocked, Trio still creates deterministic starter plans and labels them as fallback plans.

## Core Flow

1. Open `https://trio-balance.vercel.app`.
2. Sign in and go to the dashboard.
3. Show the three-slot balance model: physical, intellectual, creative.
4. Start with the physical slot and open discovery.
5. Type a custom hobby such as `climbing`.
6. Create a starter plan.
7. Click **Try another plan** to show that regeneration changes the first task or cadence.
8. Use the plan and return to the dashboard.
9. Mark today complete.
10. Open the plan page and show cadence controls, regeneration, pause/restart, and the upcoming sessions.

## What Success Looks Like

- The app never depends on local-only state for the demo account after sign-in.
- The generated or fallback plan is concrete enough to do today.
- Regenerating a custom plan produces a visibly different task or cadence.
- The dashboard reflects the selected hobby and completion state after navigation.
- `/api/health` reports `status: "ok"` and `requiredEnvironment: "ok"` in production.

## Recovery If Something Fails

- If AI generation fails, use the fallback plan and explicitly note that Trio keeps the user moving instead of blocking the flow.
- If the account has stale data, go to `/dashboard?demo=1` and reset the demo state.
- If production health fails, stop and check provider environment configuration before opening public signups.
