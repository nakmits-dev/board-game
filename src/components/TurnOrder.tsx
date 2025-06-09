import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Flag } from 'lucide-react';

const TurnOrder: React.FC = () => {
  const { state, dispatch } = useGame();
  const { currentTeam, gamePhase } = state;
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);

  if (gamePhase === 'preparation' || gamePhase === 'result') return null;

  const handleSurrender = () => {
    if (showSurrenderConfirm) {
      dispatch({ type: 'SURRENDER', team: currentTeam });
      setShowSurrenderConfirm(false);
    } else {
      setShowSurrenderConfirm(true);
    }
  };

  const handleEndTurn = () => {
    dispatch({ type: 'END_TURN' });
    setShowSurrenderConfirm(false);
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-lg border border-blue-100">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        {/* Turn Info */}
        <div className="flex items-center gap-3">
          <h3 className={`text-xl font-bold ${
            currentTeam === 'player' ? 'text-blue-600' : 'text-red-600'
          }`}>
            {currentTeam === 'player' ? '青チームのターン' : '赤チームのターン'}
          </h3>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSurrender}
            className={`px-3 py-2 font-bold rounded transform transition text-sm sm:text-base ${
              showSurrenderConfirm
                ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                : 'bg-gray-600 hover:bg-gray-700 text-white'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Flag size={16} />
              <span>{showSurrenderConfirm ? '降参する' : '降参'}</span>
            </div>
          </button>
          
          <button
            onClick={handleEndTurn}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded transform transition hover:scale-105 text-sm sm:text-base"
          >
            ターン終了
          </button>
        </div>
      </div>
    </div>
  );
};

export default TurnOrder;