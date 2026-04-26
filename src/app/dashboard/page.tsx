'use client';

import { useState } from 'react';
import Link from 'next/link';
import RequireAuth from '@/components/auth/RequireAuth';

type HobbyStatus = 'empty' | 'active' | 'dormant';

interface HobbySlot {
  category: 'physical' | 'intellectual' | 'creative';
  status: HobbyStatus;
  hobby?: string;
  progress?: number;
  streak?: number;
}

export default function Dashboard() {
  const [slots] = useState<HobbySlot[]>([
    {
      category: 'physical',
      status: 'active',
      hobby: 'Morning Walk/Run',
      progress: 60,
      streak: 5,
    },
    {
      category: 'intellectual',
      status: 'empty',
    },
    {
      category: 'creative',
      status: 'empty',
    },
  ]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'physical':
        return '💪';
      case 'intellectual':
        return '🧠';
      case 'creative':
        return '🎨';
      default:
        return '✨';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'physical':
        return 'bg-red-50 border-red-200';
      case 'intellectual':
        return 'bg-blue-50 border-blue-200';
      case 'creative':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusBadgeColor = (status: HobbyStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'dormant':
        return 'bg-yellow-100 text-yellow-800';
      case 'empty':
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionButton = (slot: HobbySlot) => {
    if (slot.status === 'active') {
      return (
        <Link
          href={`/plan/${slot.category}`}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center text-sm font-medium"
        >
          View Today&apos;s Task
        </Link>
      );
    } else if (slot.status === 'dormant') {
      return (
        <Link
          href={`/discover?category=${slot.category}`}
          className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-center text-sm font-medium"
        >
          Reactivate
        </Link>
      );
    } else {
      return (
        <Link
          href={`/discover?category=${slot.category}`}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center text-sm font-medium"
        >
          Discover & Start
        </Link>
      );
    }
  };

  return (
    <RequireAuth>
      <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Your Balanced Life Dashboard
        </h1>
        <p className="text-gray-600">
          One physical, one intellectual, one creative hobby. Start where you are.
        </p>
      </div>

      <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          🎯 Recommendation
        </h3>
        <p className="text-sm text-blue-800">
          You&apos;re doing great with your physical hobby! After 2 more weeks of consistency,
          we&apos;ll suggest adding an intellectual hobby to balance your routine.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {slots.map((slot) => (
          <div
            key={slot.category}
            className={`p-6 rounded-xl border-2 ${getCategoryColor(
              slot.category
            )} transition-all hover:shadow-lg`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <span className="text-3xl mr-3">{getCategoryIcon(slot.category)}</span>
                <h2 className="text-xl font-semibold text-gray-900 capitalize">
                  {slot.category}
                </h2>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                  slot.status
                )}`}
              >
                {slot.status === 'empty' ? 'Discover' : slot.status}
              </span>
            </div>

            <div className="min-h-24 mb-4">
              {slot.status === 'active' && slot.hobby ? (
                <div>
                  <p className="font-medium text-gray-900 mb-1">{slot.hobby}</p>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Streak: {slot.streak} days</span>
                    <span>Progress: {slot.progress}%</span>
                  </div>
                  <div className="mt-2 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${slot.progress}%` }}
                    />
                  </div>
                </div>
              ) : slot.status === 'dormant' ? (
                <p className="text-gray-600">Paused - ready to restart when you are</p>
              ) : (
                <p className="text-gray-600">
                  Discover a {slot.category} hobby tailored to your life
                </p>
              )}
            </div>

            {getActionButton(slot)}
          </div>
        ))}
      </div>

      <div className="mt-12 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          About the Three-Hobby Philosophy
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
          <div>
            <strong>Physical:</strong> Keeps your body healthy and energized.
            Running, sports, fitness, dance.
          </div>
          <div>
            <strong>Intellectual:</strong> Keeps your mind sharp curious.
            Languages, reading, learning new skills.
          </div>
          <div>
            <strong>Creative:</strong> Keeps your spirit fulfilled expressive.
            Music, art, cooking, writing.
          </div>
        </div>
      </div>
      </div>
    </RequireAuth>
  );
}
