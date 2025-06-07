import React, { useEffect, useState, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { Pause, Play, Flag } from 'lucide-react';

const TURN_DURATION = 30; // 30 seconds per turn

const TurnOrder: React.FC = () => {
  const { state, dispatch } = useGame();
  const { currentTeam, gamePhase, animationTarget } = state;
  const [timeLeft, setTimeLeft] = useState(TURN_DURATION);
  const [isPaused, setIsPaused] = useState(true); // デフォルトでストップ状態
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);
  const endTurnButtonRef = useRef<HTMLButtonElement>(null);
  const isEndingTurn = useRef(false);
  
  useEffect(() => {
    // ゲームフェーズが'action'の時のみタイマーを動作させる
    if (gamePhase !== 'action' || isPaused) {
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1 && !isEndingTurn.current) {
          clearInterval(timer);
          isEndingTurn.current = true;
          setTimeout(() => {
            endTurnButtonRef.current?.click();
            isEndingTurn.current = false;
          }, 100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gamePhase, currentTeam, dispatch, isPaused]);

  useEffect(() => {
    // ターンが変わった時のみタイマーをリセット
    if (gamePhase === 'action') {
      setTimeLeft(TURN_DURATION);
      setShowSurrenderConfirm(false);
      // ターンが変わってもポーズ状態は維持
    }
  }, [currentTeam, gamePhase]);
  
  if (gamePhase === 'preparation' || gamePhase === 'result') return null;

  const progressPercentage = (timeLeft / TURN_DURATION) * 100;
  const isLowTime = timeLeft <= 5 && !isPaused;
  
  const handlePauseToggle = () => {
    setIsPaused(!isPaused);
    setShowSurrenderConfirm(false);
  };

  const handleSurrender = () => {
    const master = state.characters.find(char => char.team === currentTeam && char.type === 'master');
    if (!master) return;

    if (showSurrenderConfirm) {
      dispatch({ type: 'REMOVE_DEFEATED_CHARACTERS', targetId: master.id });
      setShowSurrenderConfirm(false);
    } else {
      setShowSurrenderConfirm(true);
    }
  };
  
  return (
    <div className="bg-white p-4 rounded-xl shadow-lg border border-blue-100">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        {/* Turn Info */}
        <div className="flex items-center gap-3">
          <h3 className={`text-xl font-bold ${
            currentTeam === 'player' ? 'text-blue-600' : 'text-red-600'
          } ${animationTarget?.id === currentTeam && animationTarget?.type === 'turn-start' ? 'character-turn-start' : ''}`}>
            {currentTeam === 'player' ? 'あなたのターン' : '相手のターン'}
          </h3>
          <div className="flex items-center gap-2">
            <div className={`font-mono font-bold text-lg ${
              isLowTime ? 'text-red-600 animate-pulse' : 'text-gray-600'
            }`}>
              {String(timeLeft).padStart(2, '0')}
            </div>
            <button
              onClick={handlePauseToggle}
              className={`p-2 rounded-lg transition-colors ${
                isPaused 
                  ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                  : 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
              }`}
            >
              {isPaused ? <Play size={20} /> : <Pause size={20} />}
            </button>
          </div>
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
            ref={endTurnButtonRef}
            className={`px-3 py-2 font-bold rounded transform transition hover:scale-105 text-sm sm:text-base ${
              currentTeam === 'player'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
            onClick={() => {
              setShowSurrenderConfirm(false);
              dispatch({ type: 'END_TURN' });
            }}
          >
            ターン終了
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden mt-3">
        <div
          className={`absolute left-0 top-0 h-full transition-all duration-1000 rounded-full ${
            isPaused
              ? 'bg-yellow-500'
              : isLowTime
              ? 'bg-red-500 animate-pulse'
              : currentTeam === 'player'
              ? 'bg-blue-500'
              : 'bg-red-500'
          }`}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  );
};

export default TurnOrder;