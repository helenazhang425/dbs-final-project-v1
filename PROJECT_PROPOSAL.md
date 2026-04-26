# Project Proposal: Trio (working name)

## One-Line Description
A balanced life needs three hobbies — one **physical**, one **intellectual**, one **creative** — and Trio is the coach that gets you there from zero, by helping you discover what to pick and then actually do them.

## The Problem
There's a quiet philosophy that a **balanced life requires three hobbies**: one that keeps you **physically well** (running, lifting, a sport), one that keeps you **intellectually sharp** (a language, reading, a skill), and one that keeps you **creative** (an instrument, cooking, dance, visual art). When all three are present, life feels full. When one drops, something feels off; when two drop, you start scrolling for hours and wondering where your weekends went.

Even people who'd love a fuller life don't pick up new hobbies. The blockers vary:
- **Overwhelm** — "there are too many options, I don't know where to start, so I do nothing"
- **Perceived difficulty** — "running / drawing / a language sounds like a huge commitment, I can't carve that out right now"
- **The expert trap** — "I'd want to be *good* at it, and I don't have time to be good at anything new, so why bother"
- **Decision paralysis** — "I'd take up piano if I knew that was the right one, but what if I waste 6 months and then realize I'd rather have done ceramics?"
- **All-or-nothing thinking** — "if I can't go to the gym 4 times a week, what's the point of going once"

These aren't laziness. They're real friction at the start of a hobby — and they compound when you're trying to start three at once. Most products in this space ignore all of them, because most products assume you've already decided. **Trio's design philosophy is built around dismantling each of these blockers**: tiny first steps to undercut overwhelm, beginner-aware plans that don't ask for expertise, a discovery flow that does the picking-research for you, and a wholeness model that explicitly rejects all-or-nothing — 10 minutes today *counts*.

The market has plenty of *depth* tools per category — Runna for running, Duolingo for languages, Yousician for instruments, recipe apps for cooking — but those tools all assume you've already picked. **They start at week three of the journey.** Runna assumes you run. Duolingo assumes you chose Spanish. Nobody owns weeks one and two — discovery, and the gentle onboarding into a hobby you didn't know you'd love. And nobody is structured around the **wholeness goal** of all three categories at once.

Trio is built around the three-hobby thesis from the ground up. It does two things in sequence:
1. **Helps you discover** the right hobby in each of the three categories — based on your tastes, schedule, environment, history, energy
2. **Coaches you into actually starting** with a low-pressure, beginner-aware plan

**The three-category framing is always visible, but you don't have to start all three at once.** Trio's recommended path is **one hobby at a time** — pick whichever category feels most missing, get past the fragile starting phase, then add a second from a different category, then a third. The wholeness dashboard always shows all three slots — your active ones with progress, your dormant ones gently visible as "ready when you are." Users who want to start all three simultaneously can; the product nudges toward sequential as the more sustainable path.

It's the opposite of Runna/Duolingo's "we'll make you elite at one thing" pitch. Trio's pitch is **"we'll make you someone with a balanced life — physically, intellectually, creatively — even if you're starting from zero."**

## Target User
People in their 20s and 30s who feel hobby-poor — they spend their free time scrolling, watching shows, or working — and wish they were the kind of person with hobbies but don't know how to start. Specifically:
- Graduate students and early-career professionals (high agency, time-starved, status-seeking, but with collapsed leisure)
- Recent transplants to new cities (lost their old hobbies in the move)
- People emerging from a busy life phase (post-grad, post-breakup, post-startup) wanting to rebuild a fuller life
- Me — primary user and credibility check

This is a much bigger market than "people already balancing three hobbies." Most adults are in this group.

## Core Features (v1 — by Week 5)
**Scope: full discovery + starter plan loop working for one active hobby, with the three-category architecture visible from the first screen.**
1. **Three-category onboarding** — user sees the three slots (physical / intellectual / creative) immediately. Trio recommends starting with **one** active hobby and explains why (sustainable starting). Users who want to activate 2 or 3 at once can.
2. **Discovery conversation** — a guided conversation in the chosen category. Not a quiz. The meta-coach asks about your past hobbies, what you've envied in others, your schedule, your environment, your energy patterns. Suggests 2-3 candidate hobbies with reasoning. You pick one.
3. **Beginner-aware plan generation** — Claude/Gemini generates a *starter* plan calibrated to "I have never done this and I have 10-15 minutes a day." Running starts with walk-runs. Language starts with 5 words a day. Cooking starts with one technique a week. Plans are constrained by templates per hobby type to prevent LLM hallucination.
4. **Today-only view** — dashboard shows only today's tiny task. Week and full-plan views are opt-in (progressive disclosure). The bar to do today is impossibly low.
5. **Wholeness dashboard** — always shows all three category slots, with active ones tracking progress and dormant ones gently visible. After ~2 weeks of consistency on the active hobby, the dashboard suggests activating a second slot from a different category. This is the differentiator — Runna and Duolingo can't see across categories.
6. **Adaptive starter loop** — today's task stays front-and-center, and the plan can adjust when a user misses a day or needs to restart gently.

## Tech Stack
- **Frontend:** Next.js 16 (App Router) — already familiar from Assignments 2 & 3
- **Styling:** Tailwind CSS v4 — fast iteration, consistent with prior work
- **Database:** Supabase — third-party-auth integration with Clerk; row-level scoping by user_id
- **Auth:** Clerk — Google OAuth already configured
- **APIs:**
  - **Anthropic API** (Claude) for discovery conversation + plan generation — *or Google Gemini if class doesn't provide API credits* (Gemini has a generous free tier)
  - **TheMealDB** (free) for cooking recipes; spaced-repetition handled in custom logic for language; running starts walk/run only (no Strava needed in v1)
- **Deployment:** Vercel — continuous deploy from GitHub
- **MCP Servers:**
  - **Supabase MCP** — direct schema/data access while iterating (already configured)
  - **Playwright MCP** — end-to-end tests for discovery → plan-generation → dashboard loop

## Stretch Goals (Weeks 6-9)
- **Week 6:** "Add a second hobby" flow — once a user has been consistent on their first hobby for 2+ weeks, the dashboard prompts them to activate a second slot from a *different* category. Discovery + starter plan flow runs again for the second hobby.
- **Week 7:** Adaptive replanning — miss N days = plan shifts; ahead of pace = ramp difficulty. Also: "try something else" flow — if a user falls off a hobby for a week, the meta-coach gently offers to swap it for a different candidate from discovery.
- **Week 8:** Third hobby slot fully supported. Cross-category insight engine ("you do creative best after a run — schedule them together?"). Optional stakes layer (Beeminder-style $ pledge or hard deadline) — *off by default*, opt-in.
- **Week 9:** Final polish + demo prep. Ideally testimony from 2-3 classmates who've used it for a few weeks and picked up a real hobby through it. That's the demo: "this person didn't paint a month ago, and now they've made three watercolors — and they're starting Spanish next."
- **Beyond:** social discovery — see what hobbies people similar to you ended up loving. Gentle, no leaderboards.

## Biggest Risk
1. **Discovery quality is the make-or-break.** If the suggested hobbies feel generic or wrong, users won't trust the rest. Mitigation: spend Week 5 obsessing over the discovery conversation flow; test with 5 real people before finalizing.
2. **Plan quality across three domains.** v1 plans are intentionally beginner-shallow to avoid LLM hallucination — the bet is users at the start of a hobby don't need elite plans, they need *to start*. Per-category prompt engineering with templates as scaffolding.
3. **"Discovery" sounds like a quiz, but isn't.** Risk that users perceive the onboarding as a Buzzfeed quiz instead of a real coach conversation. Mitigation: make the conversation feel substantive — 5-8 minutes per category, real questions, real reasoning.
4. **The 30-minute total budget might feel insulting to users who want to go deeper.** Counter-positioning: "for users who want to go deep in one category, use Runna or Duolingo. Trio is for people who want a balanced beginner life."
5. **API costs / access** — if Anthropic API isn't covered by class and Gemini's free tier isn't enough, plan generation could become a bottleneck. Mitigation: cache aggressively, only re-generate on real changes.

## Week 5 Goal
A **working end-to-end loop for one active hobby**, with the three-category architecture visible:
- I can sign in and see all three category slots (physical / intellectual / creative) on the wholeness dashboard
- I pick one to activate (Trio recommends starting with one)
- I go through a discovery conversation in that category and end up with a hobby I might not have picked alone
- I get a beginner-aware starter plan
- Today's task appears clearly in the dashboard's today-only view
- The wholeness dashboard shows my progress on the active hobby and gently shows the two dormant slots
- Demo: a screen recording of me + 1-2 classmates going through discovery, picking a hobby, and doing it for a few days — with the dashboard visualizing where they are on the journey to a balanced life.

The class deliverable is the **discovery → starter-plan → today-view → progress loop working end-to-end** for one hobby, with the three-category architecture and wholeness dashboard already in place. The bet: "I helped a stranger pick up a real hobby in a week, with a clear path to a balanced life" is the most compelling demo for a project fair. Weeks 6-9 then add second and third active hobbies and adaptive replanning.
