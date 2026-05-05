'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import QuestionCard from '@/components/discovery/QuestionCard';
import HobbySuggestionCard from '@/components/discovery/HobbySuggestionCard';
import ProgressBar from '@/components/discovery/ProgressBar';
import Link from 'next/link';
import {
  buildSlotFromSuggestion,
  formatCadenceSummary,
  getDateKey,
  persistDashboardState,
  pushRecoveryHistoryEntry,
  readDashboardState,
} from '@/lib/dashboard-state';
import type { HobbyCategory } from '@/lib/types';

interface HobbySuggestion {
  name: string;
  reason: string;
  category: HobbyCategory;
  starter_plan: {
    duration: string;
    frequency: string;
    first_task: string;
  };
}

interface Question {
  id: string;
  text: string;
  type: 'radio';
  options?: string[];
}

const HOBBY_CATEGORIES: HobbyCategory[] = ['physical', 'intellectual', 'creative'];

const GOAL_OPTIONS: Record<HobbyCategory, string[]> = {
  physical: ['Feel healthier', 'Build consistency', 'Reduce stress', 'Get stronger'],
  intellectual: ['Learn something new', 'Stay mentally sharp', 'Use free time better', 'Build a study habit'],
  creative: ['Express myself', 'Relax and unwind', 'Make something tangible', 'Build a creative routine'],
};

const ACTIVITY_STYLE_OPTIONS: Record<HobbyCategory, string[]> = {
  physical: ['Low-impact', 'Outdoors', 'Structured workouts', 'Gentle movement'],
  intellectual: ['Guided learning', 'Independent practice', 'Quick daily practice', 'Deep focus sessions'],
  creative: ['Hands-on making', 'Visual expression', 'Writing-based', 'Relaxed creative play'],
};

type SuggestionTemplate = {
  name: string;
  duration: string;
  frequency: string;
  firstTask: string;
  styleFit: string;
  environmentFit: string;
};

const SUGGESTION_TEMPLATES: Record<HobbyCategory, SuggestionTemplate[]> = {
  physical: [
    {
      name: 'Morning Walk',
      duration: '10-15 minutes',
      frequency: 'Daily',
      firstTask: 'Walk one easy loop at a conversational pace',
      styleFit: 'Low-impact or outdoors routines',
      environmentFit: 'outside or around your neighborhood',
    },
    {
      name: 'Yoga at Home',
      duration: '15 minutes',
      frequency: '3 times per week',
      firstTask: 'Try one beginner flow with a short cooldown',
      styleFit: 'Gentle movement or structured workouts',
      environmentFit: 'at home or in a quiet studio-style setting',
    },
    {
      name: 'Bodyweight Circuit',
      duration: '20 minutes',
      frequency: '3 times per week',
      firstTask: 'Complete one round of 3 beginner exercises',
      styleFit: 'Structured workouts with visible progress',
      environmentFit: 'at home, at the gym, or anywhere with open floor space',
    },
  ],
  intellectual: [
    {
      name: 'Language Learning',
      duration: '10-15 minutes',
      frequency: 'Daily',
      firstTask: 'Complete one short lesson and review five words',
      styleFit: 'Guided learning and quick daily practice',
      environmentFit: 'at home, online, or on the go',
    },
    {
      name: 'Speed Reading',
      duration: '15 minutes',
      frequency: '3 times per week',
      firstTask: 'Read one short article and practice pacing for five minutes',
      styleFit: 'Independent practice with measurable reps',
      environmentFit: 'at home or anywhere quiet enough to focus',
    },
    {
      name: 'Logic Puzzles',
      duration: '20 minutes',
      frequency: '4 times per week',
      firstTask: 'Finish one beginner puzzle and note the pattern you used',
      styleFit: 'Deep focus sessions that keep the mind engaged',
      environmentFit: 'at home or during a focused break',
    },
  ],
  creative: [
    {
      name: 'Sketching',
      duration: '10-15 minutes',
      frequency: 'Daily',
      firstTask: 'Fill one page with quick object sketches',
      styleFit: 'Visual expression and relaxed creative play',
      environmentFit: 'at home, outdoors, or anywhere you can sit and draw',
    },
    {
      name: 'Creative Writing',
      duration: '15 minutes',
      frequency: '3 times per week',
      firstTask: 'Write one scene, memory, or prompt response without editing',
      styleFit: 'Writing-based expression with low setup',
      environmentFit: 'at home, online, or in any quiet corner',
    },
    {
      name: 'Collage Making',
      duration: '20 minutes',
      frequency: '2 times per week',
      firstTask: 'Assemble one mood board from scraps, photos, or magazine cutouts',
      styleFit: 'Hands-on making that stays playful',
      environmentFit: 'at a table with a few simple materials',
    },
  ],
};

function getQuestions(category: HobbyCategory): Question[] {
  return [
    {
      id: 'schedule',
      text: 'How much time can you realistically spend per day on this hobby?',
      type: 'radio',
      options: ['5-10 minutes', '15-20 minutes', '30+ minutes'],
    },
    {
      id: 'goal',
      text: 'What do you most want from this hobby right now?',
      type: 'radio',
      options: GOAL_OPTIONS[category],
    },
    {
      id: 'environment',
      text: 'Where would you prefer to do this hobby?',
      type: 'radio',
      options: ['At home', 'Outdoors', 'Gym/studio', 'Online/virtual'],
    },
    {
      id: 'activity_style',
      text: 'What kind of activity style sounds best right now?',
      type: 'radio',
      options: ACTIVITY_STYLE_OPTIONS[category],
    },
    {
      id: 'energy',
      text: 'When do you typically have the most energy?',
      type: 'radio',
      options: ['Morning', 'Afternoon', 'Evening', 'Varies'],
    },
  ];
}

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
  const questions = getQuestions(category);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hobbySuggestions, setHobbySuggestions] = useState<HobbySuggestion[]>([]);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const answeredCount = Object.keys(responses).length;

  const handleAnswer = (answer: string) => {
    const nextResponses = { ...responses, [currentQuestion.id]: answer };
    setResponses(nextResponses);

    if (isLastQuestion) {
      completeDiscovery(nextResponses);
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const completeDiscovery = async (completedResponses: Record<string, string>) => {
    setIsLoading(true);
    setShowSuggestions(true);
    setIsLoading(false);

    const schedule = completedResponses.schedule ?? 'your available time';
    const goal = completedResponses.goal ?? 'build a routine that fits your life';
    const environment = completedResponses.environment ?? 'your preferred environment';
    const activityStyle = completedResponses.activity_style ?? 'a style that feels approachable';
    const energy = completedResponses.energy ?? 'your usual energy window';
    const suggestions = SUGGESTION_TEMPLATES[category].map((template, index) => ({
      name: template.name,
      reason:
        index === 0
          ? `This is a realistic way to ${goal.toLowerCase()} with a ${schedule.toLowerCase()} commitment during your ${energy.toLowerCase()} hours. It fits ${activityStyle.toLowerCase()} preferences and works well ${template.environmentFit}.`
          : index === 1
            ? `This option keeps the focus on ${goal.toLowerCase()} while leaning into ${template.styleFit.toLowerCase()}. It also matches ${environment.toLowerCase()} and stays manageable inside a ${schedule.toLowerCase()} routine.`
            : `This is the adjacent alternative if you still want to ${goal.toLowerCase()} but with a different rhythm. It is best for ${template.styleFit.toLowerCase()} and gives you a slightly different way to use your ${energy.toLowerCase()} energy.`,
      category,
      starter_plan: {
        duration: template.duration,
        frequency: template.frequency,
        first_task: template.firstTask,
      },
    }));

    setHobbySuggestions(suggestions);
  };

  const handleHobbySelect = (hobby: HobbySuggestion) => {
    const currentState = readDashboardState();
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

    delete nextCompletionHistory[hobby.category];
    delete nextCompletionLog[hobby.category];
    nextRecoveryNotes[hobby.category] = recoveryNote;

    persistDashboardState({
      slots: nextSlots,
      completionHistory: nextCompletionHistory,
      completionLog: nextCompletionLog,
      recoveryNotes: nextRecoveryNotes,
      recoveryHistory: pushRecoveryHistoryEntry(nextRecoveryHistory, hobby.category, recoveryNote),
    });
    router.push('/dashboard');
  };

  const goBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 font-medium mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 capitalize">
            {isSwitchFlow ? `Replace Your ${category} Hobby` : `Discover Your ${category} Hobby`}
          </h1>
          <p className="text-gray-600 mt-2">
            {isSwitchFlow
              ? `Answer ${questions.length} questions to find a ${category} hobby that may fit better than ${currentHobby || 'your current one'}.`
              : `Answer ${questions.length} questions to get personalized recommendations.`}
            {answeredCount > 0 && ` ${answeredCount} answer${answeredCount === 1 ? '' : 's'} saved so far.`}
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

        {!showSuggestions ? (
          <>
            <ProgressBar
              current={currentQuestionIndex + 1}
              total={questions.length}
            />
            <QuestionCard
              question={currentQuestion}
              onAnswer={handleAnswer}
            />
            {currentQuestionIndex > 0 && (
              <button
                onClick={goBack}
                className="mt-4 text-gray-600 hover:text-gray-800 font-medium"
              >
                ← Previous Question
              </button>
            )}
          </>
        ) : (
          <>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-lg text-gray-600">Analyzing your responses...</p>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Here are your personalized hobby suggestions:</h2>
                <div className="text-sm text-gray-600 mb-6">
                  🎉 Based on your answers, I&apos;ve found {hobbySuggestions.length} great options for you!
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
                  <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 font-medium">
                    ← Back to Dashboard
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
