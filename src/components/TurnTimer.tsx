import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { Clock, Play, Pause } from 'lucide-react';

const TurnTimer: React.FC = () => {
  const { state, dispatch } = useGame();
  const { gamePhase, currentTeam } = state;
  const [timeLeft, setTimeLeft] = useState(30);
  const [isPaused, setIsPaused] = useState(false);
  const [isWarning, setIsWarning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastTeamRef = useRef<'player' | 'enemy' | null>(null);

  // ゲームフェーズまたはチームが変わったときにタイマーをリセット
  useEffect(() => {
    if (gamePhase === 'action') {
      // チームが変わった場合のみリセット
      if (lastTeamRef.current !== currentTeam) {
        setTimeLeft(30);
        setIsPaused(false);
        setIsWarning(false);
        lastTeamRef.current = currentTeam;
      }
    } else {
      // ゲームが終了した場合はタイマーを停止
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      lastTeamRef.current = null;
    }
  }, [gamePhase, currentTeam]);

  // タイマーの実行
  useEffect(() => {
    if (gamePhase === 'action' && !isPaused && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          const newTime = prev - 1;
          
          // 10秒以下で警告状態
          if (newTime <= 10 && !isWarning) {
            setIsWarning(true);
          }
          
          // 時間切れで強制ターン終了
          if (newTime <= 0) {
            dispatch({ type: 'END_TURN' });
            return 0;
          }
          
          return newTime;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [gamePhase, isPaused, timeLeft, isWarning, dispatch]);

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    return (timeLeft / 30) * 100;
  };

  const getBarColor = () => {
    if (timeLeft <= 5) return 'bg-red-500';
    if (timeLeft <= 10) return 'bg-yellow-500';
    return currentTeam === 'player' ? 'bg-blue-500' : 'bg-red-500';
  };

  const getTextColor = () => {
    if (timeLeft <= 5) return 'text-red-600';
    if (timeLeft <= 10) return 'text-yellow-600';
    return currentTeam === 'player' ? 'text-blue-600' : 'text-red-600';
  };

  if (gamePhase !== 'action') {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Clock size={16} className={getTextColor()} />
          <span className={`text-sm font-medium ${getTextColor()}`}>
            {currentTeam === 'player' ? '青チーム' : '赤チーム'}のターン
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${getTextColor()} ${isWarning ? 'animate-pulse' : ''}`}>
            {formatTime(timeLeft)}
          </span>
          
          <button
            onClick={togglePause}
            className={`p-1 rounded transition-colors ${
              isPaused 
                ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={isPaused ? '再開' : '一時停止'}
          >
            {isPaused ? <Play size={14} /> : <Pause size={14} />}
          </button>
        </div>
      </div>
      
      {/* プログレスバー */}
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 ease-linear ${getBarColor()} ${
            isWarning ? 'animate-pulse' : ''
          }`}
          style={{ width: `${getProgressPercentage()}%` }}
        />
      </div>
      
      {/* 警告メッセージ */}
      {timeLeft <= 10 && timeLeft > 0 && (
        <div className={`mt-2 text-center text-xs font-medium ${
          timeLeft <= 5 ? 'text-red-600' : 'text-yellow-600'
        } animate-pulse`}>
          {timeLeft <= 5 ? '⚠️ 時間切れ間近！' : '⏰ 残り時間わずか'}
        </div>
      )}
      
      {isPaused && (
        <div className="mt-2 text-center text-xs text-gray-500">
          ⏸️ 一時停止中
        </div>
      )}
    </div>
  );
};

export default TurnTimer;