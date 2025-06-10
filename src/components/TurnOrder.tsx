import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { Flag, Play, Pause } from 'lucide-react';

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
  const hasTriggeredEndTurn = useRef(false); // 🔧 重複実行防止フラグ

  // ゲームフェーズまたはチームが変わったときにタイマーをリセット
  useEffect(() => {
    if (gamePhase === 'action') {
      // チームが変わった場合のみリセット
      if (lastTeamRef.current !== currentTeam) {
        setTimeLeft(30);
        setIsPaused(false);
        setIsWarning(false);
        hasTriggeredEndTurn.current = false; // 🔧 フラグもリセット
        lastTeamRef.current = currentTeam;
      }
    } else {
      // ゲームが終了した場合はタイマーを停止
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      lastTeamRef.current = null;
      hasTriggeredEndTurn.current = false; // 🔧 フラグもリセット
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
          
          // 🔧 時間切れで強制ターン終了（重複実行防止）
          if (newTime <= 0 && !hasTriggeredEndTurn.current) {
            hasTriggeredEndTurn.current = true; // フラグを立てて重複実行を防止
            
            // タイマーを即座に停止
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            
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

  const getProgressPercentage = () => {
    return (timeLeft / 30) * 100;
  };

  const getBarColor = () => {
    if (timeLeft <= 5) return 'bg-red-500';
    if (timeLeft <= 10) return 'bg-yellow-500';
    return currentTeam === 'player' ? 'bg-blue-500' : 'bg-red-500';
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
            <h3 className={`text-xl font-bold ${
              currentTeam === 'player' ? 'text-blue-600' : 'text-red-600'
            }`}>
              {currentTeam === 'player' ? '青チーム' : '赤チーム'}
            </h3>
            
            {/* ストップボタンのみ */}
            <button
              onClick={togglePause}
              className={`p-1.5 rounded transition-colors ${
                isPaused 
                  ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={isPaused ? '再開' : '一時停止'}
            >
              {isPaused ? <Play size={14} /> : <Pause size={14} />}
            </button>
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
        
        {/* プログレスバーのみ（色の変化で時間を表現） */}
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ease-linear ${getBarColor()} ${
              isWarning ? 'animate-pulse' : ''
            }`}
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
        
        {/* 一時停止表示のみ */}
        {isPaused && (
          <div className="text-center text-xs text-gray-500">
            ⏸️ 一時停止中
          </div>
        )}
      </div>
    </div>
  );
};

export default TurnOrder;