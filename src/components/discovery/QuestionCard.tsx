'use client';

import { useState } from 'react';

export interface Question {
  id: string;
  text: string;
  type: 'text' | 'radio' | 'textarea';
  options?: string[];
}

interface QuestionCardProps {
  question: Question;
  onAnswer: (answer: string) => void;
}

export default function QuestionCard({ question, onAnswer }: QuestionCardProps) {
  const [answer, setAnswer] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answer.trim()) {
      onAnswer(answer);
      setAnswer('');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <label className="block mb-4">
          <span className="text-lg font-medium text-gray-900">
            {question.text}
          </span>
        </label>

        {question.type === 'text' && (
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Type your answer..."
            required
          />
        )}

        {question.type === 'textarea' && (
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Tell us more..."
            rows={4}
            required
          />
        )}

        {question.type === 'radio' && question.options && (
          <div className="space-y-3">
            {question.options.map((option) => (
              <label key={option} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  value={option}
                  checked={answer === option}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="mr-3"
                />
                <span className="text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!answer && question.type !== 'textarea'}
        className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        Next →
      </button>
    </div>
  );
}
