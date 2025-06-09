import React, { useEffect, useState, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { Pause, Play, Flag } from 'lucide-react';

const TurnOrder: React.FC = () => {
  const { state, dispatch } = useGame();
  const { currentTeam, gamePhase, animationTarget, isHost, hasTimeLimit, timeLimitSeconds } = state;
  const [timeLeft, setTimeLeft] = useState(timeLimitSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);
  const endTurnButtonRef = useRef<HTMLButtonElement>(null);
  const isEndingTurn = useRef(false);
  const lastSyncTime = useRef<number>(Date.now());
  const syncInterval = useRef<NodeJS.Timeout | null>(null);

  // 自分のターンかどうかを判定
  const isMyTurn = () => {
    return isHost ? currentTeam === 'player' : currentTeam === 'enemy';
  };

  // ターン表示のテキストを決定
  const getTurnText = () => {
    if (isMyTurn()) {
      return 'あなたのターン';
    } else {
      return '相手のターン';
    }
  };

  // ターンの色を決定
  const getTurnColor = () => {
    if (isMyTurn()) {
      return 'text-blue-600';
    } else {
      return 'text-red-600';
    }
  };

  // 🆕 ネットワークゲームでの時間同期機能（残り時間も送信）
  const syncTimeWithNetwork = () => {
    if (!state.networkSyncCallback || !isMyTurn()) return;

    try {
      const networkAction = {
        turn: state.currentTurn,
        team: state.currentTeam,
        type: 'timer_sync',
        timeLeft: timeLeft,
        timestamp: Date.now()
      };
      console.log('⏰ タイマー同期送信（残り時間含む）:', { timeLeft, team: state.currentTeam });
      state.networkSyncCallback(networkAction);
      lastSyncTime.current = Date.now();
    } catch (error) {
      console.error('❌ タイマー同期エラー:', error);
    }
  };

  // 🆕 強制ターン終了の処理（ターンプレイヤーが送信）
  const handleForcedTurnEnd = () => {
    if (isEndingTurn.current) return;
    
    isEndingTurn.current = true;
    console.log('⏰ 強制ターン終了:', { team: state.currentTeam, isMyTurn: isMyTurn() });
    
    if (isMyTurn()) {
      if (state.networkSyncCallback) {
        const networkAction = {
          turn: state.currentTurn,
          team: state.currentTeam,
          type: 'forced_end_turn',
          characterId: '',
          timeLeft: 0,
          timestamp: Date.now()
        };
        console.log('📤 強制ターン終了送信:', networkAction);
        state.networkSyncCallback(networkAction);
      }
      
      dispatch({ type: 'END_TURN' });
    }
    
    setTimeout(() => {
      isEndingTurn.current = false;
    }, 1000);
  };
  
  useEffect(() => {
    if (!hasTimeLimit) return;
    if (gamePhase !== 'action') return;
    if (isPaused) return;
    if (!isMyTurn()) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1;
        
        if (newTime % 5 === 0 && newTime > 0) {
          syncTimeWithNetwork();
        }
        
        if (newTime <= 0 && !isEndingTurn.current) {
          clearInterval(timer);
          handleForcedTurnEnd();
          return 0;
        }
        
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gamePhase, currentTeam, dispatch, hasTimeLimit, timeLeft, isPaused]);

  // 🆕 ネットワークゲームでの同期インターバル設定
  useEffect(() => {
    if (hasTimeLimit && gamePhase === 'action' && isMyTurn()) {
      syncInterval.current = setInterval(() => {
        if (Date.now() - lastSyncTime.current > 3000) {
          syncTimeWithNetwork();
        }
      }, 3000);

      return () => {
        if (syncInterval.current) {
          clearInterval(syncInterval.current);
          syncInterval.current = null;
        }
      };
    }
  }, [hasTimeLimit, gamePhase, isMyTurn()]);

  useEffect(() => {
    if (gamePhase === 'action') {
      setTimeLeft(timeLimitSeconds);
      setShowSurrenderConfirm(false);
      lastSyncTime.current = Date.now();
    }
  }, [currentTeam, gamePhase, timeLimitSeconds]);
  
  if (gamePhase === 'preparation' || gamePhase === 'result') return null;

  const progressPercentage = (timeLeft / timeLimitSeconds) * 100;
  const isLowTime = timeLeft <= 5 && !isPaused && hasTimeLimit;
  
  const handlePauseToggle = () => {
    if (!hasTimeLimit) return;
    if (!isMyTurn()) return;
    
    setIsPaused(!isPaused);
    setShowSurrenderConfirm(false);
  };

  // 🆕 降参処理（ネットワークゲームでは自分のターンのみ可能）
  const handleSurrender = () => {
    if (!isMyTurn()) {
      console.log('🚫 降参無効 - 自分のターンではありません');
      return;
    }

    if (showSurrenderConfirm) {
      // 🆕 降参棋譜を送信
      if (state.networkSyncCallback) {
        const networkAction = {
          turn: state.currentTurn,
          team: state.currentTeam,
          type: 'surrender',
          characterId: '',
          timestamp: Date.now()
        };
        console.log('📤 降参棋譜送信:', networkAction);
        state.networkSyncCallback(networkAction);
        
        setShowSurrenderConfirm(false);
        return;
      }

      const surrenderTeam = isHost ? 'player' : 'enemy';
      dispatch({ type: 'SURRENDER', team: surrenderTeam });
      setShowSurrenderConfirm(false);
    } else {
      setShowSurrenderConfirm(true);
    }
  };

  const handleEndTurn = () => {
    if (!isMyTurn()) return;
    
    setShowSurrenderConfirm(false);
    dispatch({ type: 'END_TURN' });
  };

  // 🆕 降参ボタンの活性化条件
  const canSurrender = () => {
    return isMyTurn();
  };
  
  return (
    <div className="bg-white p-4 rounded-xl shadow-lg border border-blue-100">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        {/* Turn Info */}
        <div className="flex items-center gap-3">
          <h3 className={`text-xl font-bold ${getTurnColor()} ${animationTarget?.id === currentTeam && animationTarget?.type === 'turn-start' ? 'character-turn-start' : ''}`}>
            {getTurnText()}
          </h3>
          
          {/* 時間制限がある場合のみタイマー表示 */}
          {hasTimeLimit && (
            <div className="flex items-center gap-2">
              <div className={`font-mono font-bold text-lg ${
                isLowTime ? 'text-red-600 animate-pulse' : 'text-gray-600'
              }`}>
                {String(timeLeft).padStart(2, '0')}
              </div>
              <button
                onClick={handlePauseToggle}
                disabled={!isMyTurn() || !hasTimeLimit}
                className={`p-2 rounded-lg transition-colors ${
                  (!isMyTurn()) || !hasTimeLimit
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : isPaused 
                      ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                      : 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                }`}
              >
                {isPaused ? <Play size={20} /> : <Pause size={20} />}
              </button>
            </div>
          )}
          
          {/* 時間制限がない場合の表示 */}
          {!hasTimeLimit && (
            <div className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-sm">
              時間制限なし
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* 🆕 降参ボタン（自分のターンのみ有効） */}
          <button
            onClick={handleSurrender}
            disabled={!canSurrender()}
            className={`px-3 py-2 font-bold rounded transform transition text-sm sm:text-base ${
              !canSurrender()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : showSurrenderConfirm
                ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                : 'bg-gray-600 hover:bg-gray-700 text-white'
            }`}
            title={!isMyTurn() ? '自分のターンでのみ降参可能' : ''}
          >
            <div className="flex items-center gap-1.5">
              <Flag size={16} />
              <span>{showSurrenderConfirm ? '降参する' : '降参'}</span>
            </div>
          </button>
          
          <button
            ref={endTurnButtonRef}
            onClick={handleEndTurn}
            disabled={!isMyTurn()}
            className={`px-3 py-2 font-bold rounded transform transition text-sm sm:text-base ${
              !isMyTurn()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : isMyTurn()
                ? 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105'
                : 'bg-red-600 hover:bg-red-700 text-white hover:scale-105'
            }`}
          >
            ターン終了
          </button>
        </div>
      </div>

      {/* Progress Bar - 時間制限がある場合のみ表示 */}
      {hasTimeLimit && (
        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden mt-3">
          <div
            className={`absolute left-0 top-0 h-full transition-all duration-1000 rounded-full ${
              isPaused
                ? 'bg-yellow-500'
                : isLowTime
                ? 'bg-red-500 animate-pulse'
                : isMyTurn()
                ? 'bg-blue-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      )}

      {/* ネットワークゲーム用の追加情報 */}
      <div className="mt-2 text-center">
        <p className="text-xs text-gray-600">
          {isHost ? 'あなた: 青チーム' : 'あなた: 赤チーム'}
          {!isMyTurn() && ' | 相手の行動を待機中...'}
          {!hasTimeLimit && ' | 時間制限なし'}
          {/* 🆕 降参制限の説明 */}
          {!isMyTurn() && ' | 降参は自分のターンでのみ可能'}
        </p>
      </div>
    </div>
  );
};

export default TurnOrder;