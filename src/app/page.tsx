import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import AuthCTA from '@/components/ui/AuthCTA';

const barriers = [
  {
    title: 'Overwhelmed',
    body: 'There are too many possible hobbies, so choosing one becomes its own exhausting project.',
  },
  {
    title: 'Perceived difficulty',
    body: 'A new hobby can feel like a huge commitment before the first ten-minute session even begins.',
  },
  {
    title: 'The expert trap',
    body: 'People assume a hobby only counts if they can already imagine becoming good, consistent, and impressive at it.',
  },
  {
    title: 'Wrong choice',
    body: 'People hesitate because every hobby can feel like a six-month bet, and they do not want to invest in the wrong one.',
  },
];

const dimensions = [
  {
    name: 'Physical',
    description: 'A hobby that wakes up the body and builds momentum through movement.',
    examples: 'Walk-runs, lifting, dance, yoga, rec sports',
    accent: 'bg-emerald-400',
    surface: 'border-emerald-200 bg-emerald-50/80',
  },
  {
    name: 'Intellectual',
    description: 'A hobby that keeps the mind sharp and gives your attention somewhere better to go.',
    examples: 'Languages, reading, chess, coding, deep study',
    accent: 'bg-blue-500',
    surface: 'border-blue-200 bg-blue-50/80',
  },
  {
    name: 'Creative',
    description: 'A hobby that helps you make, express, and leave scrolling mode behind.',
    examples: 'Music, drawing, cooking, writing, ceramics',
    accent: 'bg-amber-500',
    surface: 'border-amber-200 bg-amber-50/80',
  },
];

const journeySteps = [
  'Discover a hobby that fits your taste, schedule, environment, and energy.',
  'Start with one tiny plan instead of trying to become a new person overnight.',
  'Keep all three life dimensions visible so balance stays the goal.',
];

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect('/dashboard');
  }

  return (
    <div className="bg-[radial-gradient(circle_at_top,_#f8faef,_#eef3df_42%,_#e3ead0_100%)] text-slate-900">
      <section className="relative overflow-hidden border-b border-olive-200/80">
        <div className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgba(255,255,255,0.55),rgba(255,255,255,0))]" />
        <div className="mx-auto grid max-w-7xl gap-14 px-6 py-18 sm:py-22 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div className="relative z-10 max-w-2xl self-center">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-olive-700">
              Trio
            </p>
            <h1 className="mt-5 max-w-xl text-5xl leading-[0.96] font-semibold tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
              Create a <span className="text-olive-600">balanced</span> life
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-700 sm:text-xl">
              Build a fuller life through one physical, one intellectual, and one creative hobby,
              starting with a tiny first step that actually fits real life.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <AuthCTA
                authMode="sign-up"
                showLoadingState={false}
                signedOutLabel="Start exploring"
                signedInLabel="Start exploring"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-olive-600 px-7 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-olive-700"
              />
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {journeySteps.map((step, index) => (
                <div
                  key={step}
                  className="rounded-2xl border border-white/70 bg-white/60 p-4 backdrop-blur-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-olive-700">
                    0{index + 1}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-6 top-8 h-40 w-40 rounded-full bg-olive-300/30 blur-3xl" />
            <div className="absolute -right-2 bottom-6 h-48 w-48 rounded-full bg-emerald-300/20 blur-3xl" />

            <div className="relative rounded-[2rem] border border-olive-200 bg-[#fbfcf5]/95 p-3 shadow-[0_24px_80px_rgba(70,88,45,0.18)]">
              <div className="overflow-hidden rounded-[1.6rem] border border-olive-100 bg-white">
                <div className="flex items-center justify-between border-b border-olive-100 bg-olive-50 px-5 py-4">
                  <div>
                    <p className="text-lg font-semibold text-slate-950">Your dashboard</p>
                  </div>
                  <div className="rounded-full bg-olive-600 px-3 py-1 text-sm font-semibold text-white">
                    1 active hobby
                  </div>
                </div>

                <div className="grid gap-4 p-5 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-[1.5rem] border border-olive-100 bg-[linear-gradient(180deg,#f7f9ef,#eef4df)] p-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-olive-700">
                      Today
                    </p>
                    <h3 className="mt-3 text-2xl font-semibold text-slate-950">Morning walk-run</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      Start with ten minutes. One gentle habit counts more than a perfect plan you never begin.
                    </p>

                    <div className="mt-6 rounded-2xl border border-white/80 bg-white/80 p-4">
                      <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                        <span>Week 1 progress</span>
                        <span className="text-olive-700">3 / 5 sessions</span>
                      </div>
                      <div className="mt-3 h-3 rounded-full bg-olive-100">
                        <div className="h-3 w-3/5 rounded-full bg-olive-500" />
                      </div>
                      <p className="mt-3 text-sm text-slate-600">
                        Your second slot stays visible, but Trio keeps the first step small.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {dimensions.map((dimension, index) => (
                      <div
                        key={dimension.name}
                        className={`rounded-[1.4rem] border p-4 ${dimension.surface}`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-base font-semibold text-slate-950">{dimension.name}</p>
                            <p className="mt-1 text-sm text-slate-600">
                              {index === 0 ? 'Active now' : 'Ready when you are'}
                            </p>
                          </div>
                          <div className="w-24">
                            <div className="h-2 rounded-full bg-white/80">
                              <div
                                className={`h-2 rounded-full ${dimension.accent} ${index === 0 ? 'w-3/4' : 'w-1/4'}`}
                              />
                            </div>
                          </div>
                        </div>
                        <p className="mt-4 text-sm leading-6 text-slate-700">{dimension.examples}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-olive-100 bg-white px-5 py-4">
                  <div className="flex flex-col gap-3 rounded-2xl bg-slate-950 px-4 py-4 text-sm text-slate-200 sm:flex-row sm:items-center sm:justify-between">
                    <p>Habit formation often takes about 60 days, so Trio keeps the first step small and repeatable.</p>
                    <span className="rounded-full bg-olive-400 px-3 py-1 font-semibold text-slate-950">
                      Suggested next: Intellectual
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-olive-200 bg-white/90">
        <div className="mx-auto max-w-7xl px-6 py-18 lg:px-8">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-olive-700">Problem</p>
            <h2 className="mt-4 max-w-3xl text-4xl leading-tight font-semibold text-slate-950 sm:text-5xl">
              What&apos;s stopping you isn&apos;t laziness. It&apos;s friction at the start.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-700">
              Most hobby products begin after the hardest part is already over. The real friction comes
              earlier, when someone is still trying to choose, begin without pressure, and trust that a
              small session is still meaningful progress.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {barriers.map((barrier) => (
              <div
                key={barrier.title}
                className="rounded-[1.6rem] border border-olive-200 bg-[linear-gradient(180deg,#f8faef,#eef3df)] p-6 shadow-[0_16px_40px_rgba(90,112,56,0.08)]"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-olive-700">
                  Barrier
                </p>
                <h3 className="mt-3 text-2xl font-semibold text-slate-950">{barrier.title}</h3>
                <p className="mt-4 text-base leading-7 text-slate-700">{barrier.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-olive-200 bg-olive-100/70">
        <div className="mx-auto max-w-7xl px-6 py-18 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="max-w-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-olive-800">
                Solution
              </p>
              <h2 className="mt-4 text-4xl leading-tight font-semibold text-slate-950 sm:text-5xl">
                A balanced life has three dimensions.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-700">
                Trio helps people rediscover old interests or discover new ones across physical,
                intellectual, and creative life, without the pressure to become an expert.
              </p>
              <p className="mt-3 text-lg leading-8 text-slate-700">
                Habit formation usually takes about 60 days, so Trio focuses on a repeatable first step
                and adjusts dynamically if life gets in the way.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {dimensions.map((dimension) => (
                <div
                  key={dimension.name}
                  className={`rounded-[1.75rem] border p-6 shadow-[0_18px_40px_rgba(70,88,45,0.08)] ${dimension.surface}`}
                >
                  <div className={`h-2.5 w-20 rounded-full ${dimension.accent}`} />
                  <h3 className="mt-5 text-2xl font-semibold text-slate-950">{dimension.name}</h3>
                  <p className="mt-4 min-h-[112px] text-base leading-7 text-slate-700">{dimension.description}</p>
                  <p className="mt-4 text-sm font-medium text-slate-600">{dimension.examples}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-18 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-olive-300">Sign up</p>
            <h2 className="mt-4 text-4xl leading-tight font-semibold text-white sm:text-5xl">
              Start with the first missing piece, then let balance build from there.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              One hobby today. Three dimensions in view. A fuller life that feels realistic enough to begin.
            </p>
          </div>

          <AuthCTA
            authMode="sign-up"
            showLoadingState={false}
            signedOutLabel="Start exploring"
            signedInLabel="Start exploring"
            className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-olive-400 px-7 py-3 text-base font-semibold text-slate-950 shadow-sm transition-colors hover:bg-olive-300"
          />
        </div>
      </section>
    </div>
  );
}
