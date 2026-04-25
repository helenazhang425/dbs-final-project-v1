'use client';

interface HobbySuggestionCardProps {
  hobby: {
    name: string;
    reason: string;
    category: string;
    starter_plan: {
      duration: string;
      frequency: string;
      first_task: string;
    };
  };
  onSelect: (hobby: string) => void;
}

export default function HobbySuggestionCard({ hobby, onSelect }: HobbySuggestionCardProps) {
  const getEmoji = (category: string) => {
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

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-lg transition-shadow">
      <div className="flex items-start mb-4">
        <span className="text-3xl mr-3">{getEmoji(hobby.category)}</span>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 mb-2">{hobby.name}</h3>
          <p className="text-gray-600 mb-4">{hobby.reason}</p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">🎯 Starter Plan Preview</h4>
            <div className="space-y-1 text-sm text-blue-800">
              <p>📅 <span className="font-medium">{hobby.starter_plan.frequency}</span></p>
              <p>⏱️ <span className="font-medium">{hobby.starter_plan.duration}</span></p>
              <p>📝 First task: <span className="font-medium">{hobby.starter_plan.first_task}</span></p>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => onSelect(hobby.name)}
        className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
      >
        ✓ Choose This One
      </button>
    </div>
  );
}
