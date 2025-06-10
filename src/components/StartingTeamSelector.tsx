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
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="text-sm text-gray-600">開始:</span>
      <div className="flex gap-1">
        <button
          onClick={() => onStartingTeamChange('player')}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
            startingTeam === 'player'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-blue-600 hover:bg-blue-50'
          }`}
        >
          青
        </button>
        <button
          onClick={() => onStartingTeamChange('enemy')}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
            startingTeam === 'enemy'
              ? 'bg-red-600 text-white'
              : 'bg-gray-200 text-red-600 hover:bg-red-50'
          }`}
        >
          赤
        </button>
        <button
          onClick={() => onStartingTeamChange('random')}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
            startingTeam === 'random'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-200 text-purple-600 hover:bg-purple-50'
          }`}
        >
          <Dice1 size={10} />
        </button>
      </div>
    </div>
  );
};

export default StartingTeamSelector;