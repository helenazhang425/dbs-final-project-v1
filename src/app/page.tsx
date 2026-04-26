import AuthCTA from '@/components/ui/AuthCTA';

const barriers = [
  {
    title: 'Too many options',
    body: "You want a fuller life, but the list of possible hobbies gets so long that choosing one becomes the task.",
  },
  {
    title: 'The expert trap',
    body: "Starting feels pointless if you cannot already imagine being good, consistent, and impressive at it.",
  },
  {
    title: 'Decision paralysis',
    body: "Picking piano, ceramics, running, or Spanish can feel like a six-month bet you have to get right.",
  },
  {
    title: 'All-or-nothing thinking',
    body: "If you cannot commit four nights a week, the first ten minutes never get counted.",
  },
];

const dimensions = [
  {
    name: 'Physical',
    description: 'A hobby that keeps your body awake: walk-runs, lifting, sports, yoga, dance.',
    color: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  {
    name: 'Intellectual',
    description: 'A hobby that keeps your mind sharp: languages, reading, chess, coding, deep study.',
    color: 'border-sky-200 bg-sky-50 text-sky-700',
  },
  {
    name: 'Creative',
    description: 'A hobby that gives you a way to make: music, drawing, cooking, writing, ceramics.',
    color: 'border-purple-200 bg-purple-50 text-purple-700',
  },
];

export default function Home() {
  return (
    <div className="bg-olive-50 text-slate-900">
      <section className="border-b border-olive-200 bg-olive-50">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 sm:py-20 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
          <div className="max-w-2xl">
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-olive-700">
              Trio for hobby-poor adults
            </p>
            <h1 className="text-5xl font-bold leading-[1.02] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
              Create a <span className="text-olive-600">balanced</span> life
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-700">
              Find one physical, one intellectual, and one creative hobby, then start with tiny plans that fit real life.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <AuthCTA
                authMode="sign-up"
                signedOutLabel="Sign up"
                signedInLabel="Go to dashboard"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-olive-600 px-7 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-olive-700"
              />
              <AuthCTA
                signedOutLabel="Sign in"
                signedInLabel="Continue planning"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-olive-300 bg-white px-7 py-3 text-base font-semibold text-olive-800 shadow-sm transition-colors hover:bg-olive-100"
              />
            </div>
          </div>

          <div className="rounded-[2rem] border border-olive-200 bg-white p-3 shadow-2xl shadow-olive-900/10">
            <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-olive-600">Today</p>
                  <p className="text-lg font-bold text-slate-950">Balanced life dashboard</p>
                </div>
                <div className="rounded-full bg-olive-100 px-3 py-1 text-sm font-semibold text-olive-700">
                  1 active
                </div>
              </div>

              <div className="grid gap-4 p-5 sm:grid-cols-3">
                {dimensions.map((dimension, index) => (
                  <div
                    key={dimension.name}
                    className="min-h-40 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className={`mb-4 h-2 rounded-full ${index === 0 ? 'bg-emerald-400' : index === 1 ? 'bg-sky-300' : 'bg-purple-300'}`} />
                    <p className="text-sm font-bold text-slate-950">{dimension.name}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {index === 0 ? 'Morning walk-run' : 'Ready when you are'}
                    </p>
                    <div className="mt-5 h-2 rounded-full bg-slate-100">
                      <div
                        className={`h-2 rounded-full ${index === 0 ? 'w-3/5 bg-olive-600' : 'w-1/5 bg-slate-300'}`}
                      />
                    </div>
                    <p className="mt-3 text-xs font-medium text-slate-500">
                      {index === 0 ? '10 minutes today' : 'Discover next'}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 bg-white p-5">
                <div className="rounded-2xl bg-olive-50 p-4">
                  <p className="text-sm font-semibold text-olive-800">Starter plan</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    Start one slot now. Add the next after the first habit feels steady.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-olive-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-olive-700">
              The barriers
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              People do not fail hobbies because they are lazy.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-700">
              The first two weeks are full of friction: choosing, starting small, and believing a tiny first step counts.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {barriers.map((barrier) => (
              <div key={barrier.title} className="rounded-lg border border-olive-200 bg-olive-50 p-6">
                <h3 className="text-lg font-bold text-slate-950">{barrier.title}</h3>
                <p className="mt-3 leading-7 text-slate-700">{barrier.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-olive-200 bg-olive-100">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-olive-800">
                The solution
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Trio makes the three-hobby thesis actionable.
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-700">
                A balanced life needs physical, intellectual, and creative outlets. Trio helps you discover the right hobby for each slot, then coaches you into one beginner-aware plan at a time.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {dimensions.map((dimension) => (
                <div key={dimension.name} className={`rounded-lg border p-5 ${dimension.color}`}>
                  <h3 className="text-xl font-bold text-slate-950">{dimension.name}</h3>
                  <p className="mt-4 text-sm leading-6 text-slate-700">{dimension.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-950">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-6 py-14 text-white sm:flex-row sm:items-center lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-olive-300">
              Start small
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Sign up and choose the first missing piece.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-300">
              Begin with one category today. Ten minutes counts.
            </p>
          </div>
          <AuthCTA
            authMode="sign-up"
            signedOutLabel="Create your Trio"
            signedInLabel="Open dashboard"
            className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-olive-400 px-7 py-3 text-base font-bold text-slate-950 shadow-sm transition-colors hover:bg-olive-300"
          />
        </div>
      </section>
    </div>
  );
}
