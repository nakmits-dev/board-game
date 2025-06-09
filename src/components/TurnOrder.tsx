import React, { useEffect, useState, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { Pause, Play, Flag, RotateCcw } from 'lucide-react';

const TurnOrder: React.FC = () => {
  const { state, dispatch } = useGame();
  const { currentTeam, gamePhase, animationTarget, canUndo, isNetworkGame, isHost, hasTimeLimit, timeLimitSeconds } = state;
  const [timeLeft, setTimeLeft] = useState(timeLimitSeconds);
  const [isPaused, setIsPaused] = useState(!isNetworkGame); // 🆕 オンライン対戦ではデフォルトで開始
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);
  const endTurnButtonRef = useRef<HTMLButtonElement>(null);
  const isEndingTurn = useRef(false);
  const lastSyncTime = useRef<number>(Date.now()); // 🆕 最後の同期時刻
  const syncInterval = useRef<NodeJS.Timeout | null>(null); // 🆕 同期用インターバル

  // ネットワークゲームでの自分のターンかどうかを判定
  const isMyTurn = () => {
    if (!isNetworkGame) return true;
    return isHost ? currentTeam === 'player' : currentTeam === 'enemy';
  };

  // ターン表示のテキストを決定
  const getTurnText = () => {
    if (!isNetworkGame) {
      return currentTeam === 'player' ? 'あなたのターン' : '相手のターン';
    }
    
    if (isMyTurn()) {
      return 'あなたのターン';
    } else {
      return '相手のターン';
    }
  };

  // ターンの色を決定
  const getTurnColor = () => {
    if (!isNetworkGame) {
      return currentTeam === 'player' ? 'text-blue-600' : 'text-red-600';
    }
    
    if (isMyTurn()) {
      return 'text-blue-600';
    } else {
      return 'text-red-600';
    }
  };

  // 🆕 ネットワークゲームでの時間同期機能
  const syncTimeWithNetwork = () => {
    if (!isNetworkGame || !state.networkSyncCallback) return;

    try {
      const networkAction = {
        turn: state.currentTurn,
        team: state.currentTeam,
        type: 'timer_sync',
        timeLeft: timeLeft,
        timestamp: Date.now()
      };
      console.log('⏰ タイマー同期送信:', { timeLeft, team: state.currentTeam });
      state.networkSyncCallback(networkAction);
      lastSyncTime.current = Date.now();
    } catch (error) {
      console.error('❌ タイマー同期エラー:', error);
    }
  };

  // 🆕 強制ターン終了の処理
  const handleForcedTurnEnd = () => {
    if (isEndingTurn.current) return;
    
    isEndingTurn.current = true;
    console.log('⏰ 強制ターン終了:', { team: state.currentTeam, isMyTurn: isMyTurn() });
    
    // 自分のターンの場合は通常のターン終了処理
    if (isMyTurn()) {
      dispatch({ type: 'END_TURN' });
    } else {
      // 相手のターンの場合はネットワーク経由で強制終了を送信
      if (state.networkSyncCallback) {
        const networkAction = {
          turn: state.currentTurn,
          team: state.currentTeam,
          type: 'forced_end_turn',
          characterId: '',
          timestamp: Date.now()
        };
        console.log('📤 強制ターン終了送信:', networkAction);
        state.networkSyncCallback(networkAction);
      }
    }
    
    setTimeout(() => {
      isEndingTurn.current = false;
    }, 1000);
  };
  
  useEffect(() => {
    // 時間制限がない場合はタイマーを動作させない
    if (!hasTimeLimit) return;
    
    // ゲームフェーズが'action'でない場合は動作させない
    if (gamePhase !== 'action') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1;
        
        // 🆕 5秒ごとに時間を同期（自分のターンの場合のみ）
        if (isNetworkGame && isMyTurn() && newTime % 5 === 0 && newTime > 0) {
          syncTimeWithNetwork();
        }
        
        // 時間切れの処理
        if (newTime <= 0 && !isEndingTurn.current) {
          clearInterval(timer);
          handleForcedTurnEnd();
          return 0;
        }
        
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gamePhase, currentTeam, dispatch, isNetworkGame, isHost, hasTimeLimit, timeLeft]);

  // 🆕 ネットワークゲームでの同期インターバル設定
  useEffect(() => {
    if (isNetworkGame && hasTimeLimit && gamePhase === 'action') {
      // 3秒ごとに同期チェック
      syncInterval.current = setInterval(() => {
        if (isMyTurn() && Date.now() - lastSyncTime.current > 3000) {
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
  }, [isNetworkGame, hasTimeLimit, gamePhase, isMyTurn()]);

  useEffect(() => {
    // ターンが変わった時のみタイマーをリセット
    if (gamePhase === 'action') {
      setTimeLeft(timeLimitSeconds);
      setShowSurrenderConfirm(false);
      lastSyncTime.current = Date.now(); // 🆕 同期時刻もリセット
      // ターンが変わってもポーズ状態は維持
    }
  }, [currentTeam, gamePhase, timeLimitSeconds]);
  
  if (gamePhase === 'preparation' || gamePhase === 'result') return null;

  const progressPercentage = (timeLeft / timeLimitSeconds) * 100;
  const isLowTime = timeLeft <= 5 && !isPaused && hasTimeLimit;
  
  const handlePauseToggle = () => {
    // 時間制限がない場合はポーズボタンを無効化
    if (!hasTimeLimit) return;
    
    // ネットワークゲームでは相手のターン中はポーズできない
    if (isNetworkGame && !isMyTurn()) return;
    
    setIsPaused(!isPaused);
    setShowSurrenderConfirm(false);
  };

  const handleSurrender = () => {
    if (showSurrenderConfirm) {
      // 降参処理 - 新しいSURRENDERアクションを使用
      const surrenderTeam = isNetworkGame ? (isHost ? 'player' : 'enemy') : currentTeam;
      dispatch({ type: 'SURRENDER', team: surrenderTeam });
      setShowSurrenderConfirm(false);
    } else {
      setShowSurrenderConfirm(true);
    }
  };

  const handleUndo = () => {
    if (canUndo && !isNetworkGame) {
      dispatch({ type: 'UNDO_MOVE' });
      setShowSurrenderConfirm(false);
    }
  };

  const handleEndTurn = () => {
    // ネットワークゲームでは自分のターンでない場合は無効
    if (isNetworkGame && !isMyTurn()) return;
    
    setShowSurrenderConfirm(false);
    dispatch({ type: 'END_TURN' });
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
              {/* ネットワークゲームでは相手のターン中はポーズボタンを無効化 */}
              <button
                onClick={handlePauseToggle}
                disabled={(isNetworkGame && !isMyTurn()) || !hasTimeLimit}
                className={`p-2 rounded-lg transition-colors ${
                  (isNetworkGame && !isMyTurn()) || !hasTimeLimit
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
          {/* 待ったボタン（ローカルゲームのみ） */}
          {!isNetworkGame && (
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className={`px-3 py-2 font-bold rounded transform transition text-sm sm:text-base ${
                canUndo
                  ? 'bg-orange-600 hover:bg-orange-700 text-white hover:scale-105'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              title="1手戻る"
            >
              <div className="flex items-center gap-1.5">
                <RotateCcw size={16} />
                <span>待った</span>
              </div>
            </button>
          )}

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
            onClick={handleEndTurn}
            disabled={isNetworkGame && !isMyTurn()}
            className={`px-3 py-2 font-bold rounded transform transition text-sm sm:text-base ${
              isNetworkGame && !isMyTurn()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : currentTeam === 'player' || (isNetworkGame && isMyTurn())
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
                : isNetworkGame && isMyTurn()
                ? 'bg-blue-500'
                : isNetworkGame && !isMyTurn()
                ? 'bg-red-500'
                : currentTeam === 'player'
                ? 'bg-blue-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      )}

      {/* ネットワークゲーム用の追加情報 */}
      {isNetworkGame && (
        <div className="mt-2 text-center">
          <p className="text-xs text-gray-600">
            {isHost ? 'あなた: 青チーム' : 'あなた: 赤チーム'}
            {!isMyTurn() && ' | 相手の行動を待機中...'}
            {!hasTimeLimit && ' | 時間制限なし'}
          </p>
        </div>
      )}
    </div>
  );
};

export default TurnOrder;