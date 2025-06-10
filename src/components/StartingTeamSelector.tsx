import React from 'react';
import { Dice1 } from 'lucide-react';

interface StartingTeamSelectorProps {
  startingTeam: 'player' | 'enemy' | 'random';
  onStartingTeamChange: (team: 'player' | 'enemy' | 'random') => void;
  className?: string;
}

const StartingTeamSelector: React.FC<StartingTeamSelectorProps> = ({
  startingTeam,
  onStartingTeamChange,
  className = ''
}) => {
  return (
    <div className={`bg-gray-50 rounded-lg p-3 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-gray-700">開始チーム:</span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onStartingTeamChange('player')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            startingTeam === 'player'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-blue-600 hover:bg-blue-50'
          }`}
        >
          青チーム
        </button>
        <button
          onClick={() => onStartingTeamChange('enemy')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            startingTeam === 'enemy'
              ? 'bg-red-600 text-white'
              : 'bg-white text-red-600 hover:bg-red-50'
          }`}
        >
          赤チーム
        </button>
        <button
          onClick={() => onStartingTeamChange('random')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
            startingTeam === 'random'
              ? 'bg-purple-600 text-white'
              : 'bg-white text-purple-600 hover:bg-purple-50'
          }`}
        >
          <Dice1 size={14} />
          ランダム
        </button>
      </div>
    </div>
  );
};

export default StartingTeamSelector;