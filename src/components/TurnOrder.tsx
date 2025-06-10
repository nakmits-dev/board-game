import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { Flag, Clock, Play, Pause } from 'lucide-react';

const TurnOrder: React.FC = () => {
  const { state, dispatch } = useGame();
  const { currentTeam, gamePhase } = state;
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);
  
  // タイマー関連の状態
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
            // 強制ターン終了を実行
            dispatch({ type: 'FORCE_END_TURN' });
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
      <div className="flex flex-col gap-3">
        {/* ターン情報とタイマー */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className={`text-xl font-bold ${getTextColor()}`}>
              {currentTeam === 'player' ? '青チームのターン' : '赤チームのターン'}
            </h3>
            
            {/* コンパクトなタイマー表示 */}
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1">
              <Clock size={14} className={getTextColor()} />
              <span className={`text-sm font-bold ${getTextColor()} ${isWarning ? 'animate-pulse' : ''}`}>
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
                {isPaused ? <Play size={12} /> : <Pause size={12} />}
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
              onClick={handleEndTurn}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded transform transition hover:scale-105 text-sm sm:text-base"
            >
              ターン終了
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
        
        {/* 警告メッセージまたは一時停止表示 */}
        {isPaused ? (
          <div className="text-center text-xs text-gray-500">
            ⏸️ 一時停止中
          </div>
        ) : timeLeft <= 10 && timeLeft > 0 ? (
          <div className={`text-center text-xs font-medium ${
            timeLeft <= 5 ? 'text-red-600' : 'text-yellow-600'
          } animate-pulse`}>
            {timeLeft <= 5 ? '⚠️ 時間切れ間近！' : '⏰ 残り時間わずか'}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default TurnOrder;