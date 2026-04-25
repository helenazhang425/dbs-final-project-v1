'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import QuestionCard from '@/components/discovery/QuestionCard';
import HobbySuggestionCard from '@/components/discovery/HobbySuggestionCard';
import ProgressBar from '@/components/discovery/ProgressBar';
import Link from 'next/link';

interface Question {
  id: string;
  text: string;
  type: 'text' | 'radio' | 'textarea';
  options?: string[];
}

const QUESTIONS: Question[] = [
  {
    id: 'schedule',
    text: 'How much time can you realistically spend per day on this hobby?',
    type: 'radio',
    options: ['5-10 minutes', '15-20 minutes', '30+ minutes'],
  },
  {
    id: 'past_experience',
    text: 'Have you tried similar hobbies before? What did you like or dislike?',
    type: 'textarea',
  },
  {
    id: 'environment',
    text: 'Where would you prefer to do this hobby?',
    type: 'radio',
    options: ['At home', 'Outdoors', 'Gym/studio', 'Online/virtual'],
  },
  {
    id: 'interests',
    text: 'What sounds most appealing within this category?',
    type: 'text',
  },
  {
    id: 'energy',
    text: 'When do you typically have the most energy?',
    type: 'radio',
    options: ['Morning', 'Afternoon', 'Evening', 'Varies'],
  },
];

export default function DiscoverPage() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category');
  const [category, setCategory] = useState<'physical' | 'intellectual' | 'creative'>('physical');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hobbySuggestions, setHobbySuggestions] = useState<any[]>([]);

  useEffect(() => {
    if (categoryParam && ['physical', 'intellectual', 'creative'].includes(categoryParam)) {
      setCategory(categoryParam as any);
    }
  }, [categoryParam]);

  const currentQuestion = QUESTIONS[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === QUESTIONS.length - 1;

  const handleAnswer = (answer: string) => {
    setResponses(prev => ({ ...prev, [currentQuestion.id]: answer }));

    if (isLastQuestion) {
      completeDiscovery();
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const completeDiscovery = async () => {
    setIsLoading(true);
    setShowSuggestions(true);
    setIsLoading(false);

    // Temporary mock suggestions - will replace with Codex API call
    setHobbySuggestions([
      {
        name: `${category === 'physical' ? 'Morning Walk' : category === 'intellectual' ? 'Language Learning' : 'Sketching'}.${Math.random().toString(36).substr(2, 3)}`,
        reason: `Based on your responses, this hobby fits your schedule and energy pattern perfectly.`,n        category: category,
        starter_plan: {
          duration: "10-15 minutes",
          frequency: "Daily",
          first_task: "Start with a simple 5-minute warm-up"
        }
      },
      {
        name: `${category === 'physical' ? 'Yoga at Home' : category === 'intellectual' ? 'Speed Reading' : 'Creative Writing'}.${Math.random().toString(36).substr(2, 3)}`,
        reason: `This alternative hobby matches your interests and environment preferences.`,
        category: category,
        starter_plan: {
          duration: "15 minutes",
          frequency: "3 times per week",
          first_task: "Try the beginner tutorial for 5 minutes"
        }
      }
    ]);
  };

  const handleHobbySelect = (hobbyName: string) => {
    console.log('Selected hobby:', hobbyName);
    alert(`You chose: ${hobbyName}! 🎉 In a real app, this would save to your database and redirect to dashboard.`);
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
            Discover Your {category} Hobby
          </h1>
          <p className="text-gray-600 mt-2">
            Answer {QUESTIONS.length} questions to get personalized recommendations
          </p>
        </div>

        {!showSuggestions ? (
          <>
            <ProgressBar
              current={currentQuestionIndex + 1}
              total={QUESTIONS.length}
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
                  🎉 Based on your answers, I've found {hobbySuggestions.length} great options for you!
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
