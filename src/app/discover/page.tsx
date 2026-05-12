'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import HobbySuggestionCard from '@/components/discovery/HobbySuggestionCard';
import Link from 'next/link';
import {
  buildSlotFromSuggestion,
  formatCadenceSummary,
  getDateKey,
  pushRecoveryHistoryEntry,
} from '@/lib/dashboard-state';
import { persistSyncedDashboardStateNow, readSyncedDashboardState } from '@/lib/dashboard-sync';
import {
  generateHobbyRecommendationsAction,
  type DiscoveryShortAnswerInput,
  type HobbyRecommendation,
} from '@/lib/actions/hobby-recommendations';
import type { HobbyCategory } from '@/lib/types';

const HOBBY_CATEGORIES: HobbyCategory[] = ['physical', 'intellectual', 'creative'];
const CUSTOM_DURATION_OPTIONS = ['5 minutes', '10 minutes', '15 minutes', '20 minutes', '30 minutes'];
const CUSTOM_FREQUENCY_OPTIONS = [
  'Daily',
  '2 times per week',
  '3 times per week',
  '4 times per week',
  '5 times per week',
];

const parseCategory = (category: string | null): HobbyCategory => {
  if (category && HOBBY_CATEGORIES.includes(category as HobbyCategory)) {
    return category as HobbyCategory;
  }

  return 'physical';
};

function DiscoverContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const category = parseCategory(searchParams.get('category'));
  const discoveryMode = searchParams.get('mode');
  const currentHobby = searchParams.get('current')?.trim() ?? '';
  const isSwitchFlow = discoveryMode === 'switch';
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hobbySuggestions, setHobbySuggestions] = useState<HobbyRecommendation[]>([]);
  const [recommendationSource, setRecommendationSource] = useState<'ai' | 'fallback' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shortAnswers, setShortAnswers] = useState<DiscoveryShortAnswerInput>({
    category,
    goal: '',
    barriers: '',
    availability: '',
    preferences: '',
  });
  const [customHobby, setCustomHobby] = useState({
    name: '',
    duration: '10 minutes',
    frequency: '3 times per week',
    firstTask: '',
  });

  const updateAnswer = (field: keyof Omit<DiscoveryShortAnswerInput, 'category'>, value: string) => {
    setShortAnswers((currentAnswers) => ({
      ...currentAnswers,
      category,
      [field]: value,
    }));
  };

  const completeDiscovery = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await generateHobbyRecommendationsAction({
        ...shortAnswers,
        category,
      });
      setHobbySuggestions(result.recommendations);
      setRecommendationSource(result.source);
      setShowSuggestions(true);
    } catch (error) {
      console.error(error);
      setErrorMessage('Recommendations could not be generated right now. Try again in a moment.');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSelectedHobby = async (hobby: HobbyRecommendation) => {
    const currentState = await readSyncedDashboardState();
    const currentSlot = currentState.slots.find((slot) => slot.category === hobby.category) ?? null;
    const nextSlots = currentState.slots.map((slot) =>
      slot.category === hobby.category
        ? buildSlotFromSuggestion(
            hobby.category,
            hobby.name,
            hobby.starter_plan.first_task,
            hobby.starter_plan.frequency,
            hobby.starter_plan.duration
          )
        : slot
    );
    const nextCompletionHistory = { ...currentState.completionHistory };
    const nextCompletionLog = { ...currentState.completionLog };
    const nextRecoveryNotes = { ...currentState.recoveryNotes };
    const nextRecoveryHistory = { ...currentState.recoveryHistory };

    delete nextCompletionHistory[hobby.category];
    delete nextCompletionLog[hobby.category];

    if (isSwitchFlow || currentSlot?.status === 'active') {
      const recoveryNote = {
        action: 'swap' as const,
        date: getDateKey(new Date()),
        detail: `Swapped into ${hobby.name} for a better-fit restart.`,
        changes: {
          fromHobby: currentSlot?.hobby,
          toHobby: hobby.name,
          fromCadence: currentSlot?.cadence ? formatCadenceSummary(currentSlot.cadence) : undefined,
          toCadence: `${hobby.starter_plan.duration}, ${hobby.starter_plan.frequency.toLowerCase()}`,
        },
      };

      nextRecoveryNotes[hobby.category] = recoveryNote;
      Object.assign(
        nextRecoveryHistory,
        pushRecoveryHistoryEntry(nextRecoveryHistory, hobby.category, recoveryNote)
      );
    } else {
      delete nextRecoveryNotes[hobby.category];
      delete nextRecoveryHistory[hobby.category];
    }

    await persistSyncedDashboardStateNow({
      slots: nextSlots,
      completionHistory: nextCompletionHistory,
      completionLog: nextCompletionLog,
      recoveryNotes: nextRecoveryNotes,
      recoveryHistory: nextRecoveryHistory,
    });
    router.push('/dashboard');
  };

  const handleHobbySelect = async (hobby: HobbyRecommendation) => {
    await saveSelectedHobby(hobby);
  };

  const handleCustomHobbySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = customHobby.name.replace(/\s+/g, ' ').trim();
    const firstTask = customHobby.firstTask.replace(/\s+/g, ' ').trim();

    if (!name || !firstTask) {
      return;
    }

    await saveSelectedHobby({
      name,
      category,
      reason: `You already know ${name} is the hobby you want to try, so Trio is starting with a small first session instead of forcing a recommendation choice.`,
      starter_plan: {
        duration: customHobby.duration,
        frequency: customHobby.frequency,
        first_task: firstTask,
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
        <div className="mx-auto max-w-5xl px-4">
        <div className="mb-8">
          <Link href="/dashboard" className="mb-4 inline-block text-sm font-medium text-olive-700 transition-colors hover:text-olive-800">
            Back to dashboard
          </Link>
          <h1 className="text-3xl font-semibold text-slate-950 capitalize">
            {isSwitchFlow ? `Replace Your ${category} Hobby` : `Discover Your ${category} Hobby`}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            {isSwitchFlow
              ? `Share what is not fitting so Trio can suggest a ${category} hobby that may work better than ${currentHobby || 'your current one'}.`
              : `Share a few details and Trio will recommend ${category} activities with starter plans that fit your real week.`}
          </p>
        </div>

        {isSwitchFlow ? (
          <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950 shadow-sm">
            <p className="font-semibold">This keeps your {category} slot, but gives you a fresh start.</p>
            <p className="mt-2 leading-6 text-amber-900/90">
              Trio is treating this as a better-fit search, not a failure. You can replace {currentHobby || 'your current hobby'} with something that feels easier to return to this week.
            </p>
          </div>
        ) : null}

        <form
          onSubmit={handleCustomHobbySubmit}
          className="mb-8 grid gap-5 rounded-2xl border border-olive-200 bg-white p-5 shadow-sm sm:p-7"
        >
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-olive-700">
              Already have one in mind?
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Start with your own {category} hobby.</h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-900">Hobby name</span>
              <input
                type="text"
                value={customHobby.name}
                onChange={(event) =>
                  setCustomHobby((currentHobby) => ({ ...currentHobby, name: event.target.value }))
                }
                required
                maxLength={80}
                placeholder="Example: climbing, chess, watercolor"
                className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm text-slate-900 outline-none transition focus:border-olive-500 focus:ring-2 focus:ring-olive-100"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-900">First small task</span>
              <input
                type="text"
                value={customHobby.firstTask}
                onChange={(event) =>
                  setCustomHobby((currentHobby) => ({ ...currentHobby, firstTask: event.target.value }))
                }
                required
                maxLength={140}
                placeholder="Example: try one beginner lesson"
                className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm text-slate-900 outline-none transition focus:border-olive-500 focus:ring-2 focus:ring-olive-100"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-900">Session length</span>
              <select
                value={customHobby.duration}
                onChange={(event) =>
                  setCustomHobby((currentHobby) => ({ ...currentHobby, duration: event.target.value }))
                }
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-olive-500 focus:ring-2 focus:ring-olive-100"
              >
                {CUSTOM_DURATION_OPTIONS.map((duration) => (
                  <option key={duration} value={duration}>
                    {duration}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-900">Frequency</span>
              <select
                value={customHobby.frequency}
                onChange={(event) =>
                  setCustomHobby((currentHobby) => ({ ...currentHobby, frequency: event.target.value }))
                }
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-olive-500 focus:ring-2 focus:ring-olive-100"
              >
                {CUSTOM_FREQUENCY_OPTIONS.map((frequency) => (
                  <option key={frequency} value={frequency}>
                    {frequency}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="submit"
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-olive-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-olive-700 sm:w-auto"
          >
            Use this hobby
          </button>
        </form>

        {!showSuggestions ? (
          <form onSubmit={completeDiscovery} className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-900">What do you want this hobby to help with?</span>
              <textarea
                value={shortAnswers.goal}
                onChange={(event) => updateAnswer('goal', event.target.value)}
                required
                rows={3}
                maxLength={500}
                placeholder="Example: I want something calming after class that still feels productive."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-olive-500 focus:ring-2 focus:ring-olive-100"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-900">What usually gets in the way?</span>
              <textarea
                value={shortAnswers.barriers}
                onChange={(event) => updateAnswer('barriers', event.target.value)}
                required
                rows={3}
                maxLength={500}
                placeholder="Example: I lose momentum when setup takes too long or the plan is too intense."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-olive-500 focus:ring-2 focus:ring-olive-100"
              />
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-900">How much time do you realistically have?</span>
                <input
                  type="text"
                  value={shortAnswers.availability}
                  onChange={(event) => updateAnswer('availability', event.target.value)}
                  required
                  maxLength={160}
                  placeholder="Example: 15 minutes, 3 nights a week"
                  className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm text-slate-900 outline-none transition focus:border-olive-500 focus:ring-2 focus:ring-olive-100"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-900">Any preferences or constraints?</span>
                <input
                  type="text"
                  value={shortAnswers.preferences}
                  onChange={(event) => updateAnswer('preferences', event.target.value)}
                  required
                  maxLength={220}
                  placeholder="Example: at home, low cost, no equipment"
                  className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm text-slate-900 outline-none transition focus:border-olive-500 focus:ring-2 focus:ring-olive-100"
                />
              </label>
            </div>

            {errorMessage ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-olive-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-olive-700 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
            >
              {isLoading ? 'Generating recommendations...' : 'Generate recommendations'}
            </button>
          </form>
        ) : (
          <>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-olive-600"></div>
                <p className="mt-4 text-lg text-slate-600">Generating recommendations...</p>
              </div>
            ) : (
              <>
                <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold text-slate-950">Recommended activities</h2>
                    <p className="mt-2 text-sm text-slate-600">
                      {recommendationSource === 'fallback'
                        ? 'Using Trio fallback recommendations while the AI path is unavailable.'
                        : 'Generated from your short-answer profile.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSuggestions(false)}
                    className="rounded-lg border border-olive-200 bg-white px-4 py-2 text-sm font-medium text-olive-800 transition-colors hover:bg-olive-50"
                  >
                    Edit answers
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {hobbySuggestions.map((hobby, idx) => (
                    <HobbySuggestionCard
                      key={idx}
                      hobby={hobby}
                      onSelect={handleHobbySelect}
                    />
                  ))}
                </div>
                <div className="mt-8 text-center">
                  <Link href="/dashboard" className="font-medium text-olive-700 transition-colors hover:text-olive-800">
                    Back to dashboard
                  </Link>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-4 text-center">
          <p className="text-base font-medium text-slate-600">Loading discovery...</p>
        </div>
      }
    >
      <DiscoverContent />
    </Suspense>
  );
}
