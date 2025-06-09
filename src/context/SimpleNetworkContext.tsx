import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useSimpleGameSync } from '../hooks/useSimpleGameSync';
import { useGame } from './GameContext';
import { GameMove, TimerSync } from '../types/networkTypes';

interface SimpleNetworkContextType {
  isConnected: boolean;
  currentTimeLeft: number;
  setCurrentTimeLeft: (time: number) => void;
}

const SimpleNetworkContext = createContext<SimpleNetworkContextType | undefined>(undefined);

interface SimpleNetworkProviderProps {
  children: React.ReactNode;
}

export const SimpleNetworkProvider: React.FC<SimpleNetworkProviderProps> = ({ children }) => {
  const { 
    sendMove, 
    sendTimerSync, 
    setOnMove, 
    setOnGameStart, 
    setOnInitialState, 
    setOnTimerSync,
    startRoomMonitoring, 
    isConnected 
  } = useSimpleGameSync();
  const { state, dispatch } = useGame();
  const lastProcessedMoveCount = useRef<number>(0);
  const [currentTimeLeft, setCurrentTimeLeft] = React.useState(30);
  const syncCallbackRef = useRef<((action: any) => void) | null>(null);
  const timerSyncInterval = useRef<NodeJS.Timeout | null>(null);
  const isInitialized = useRef(false);
  const initialGameState = useRef<any>(null);

  // 🎯 自分のターンかどうかを判定
  const isMyTurn = () => {
    const myTeam = state.isHost ? 'player' : 'enemy';
    return state.currentTeam === myTeam;
  };

  // ネットワークゲーム開始時の監視開始
  useEffect(() => {
    if (state.isNetworkGame && state.roomId && isConnected) {
      if (isInitialized.current) {
        console.log('✅ 既に監視開始済み:', state.roomId);
        return;
      }

      console.log('🔗 ルーム監視開始:', {
        roomId: state.roomId,
        isHost: state.isHost
      });

      startRoomMonitoring(state.roomId, state.isHost);
      isInitialized.current = true;
    }
  }, [state.isNetworkGame, state.roomId, state.isHost, isConnected, startRoomMonitoring]);

  // 🎯 **ターンプレイヤー: 棋譜送信**
  useEffect(() => {
    if (state.isNetworkGame && state.roomId) {
      const syncCallback = async (action: any) => {
        if (!state.roomId || !isConnected) {
          console.error('❌ ルームIDまたは接続が確立されていません');
          return;
        }

        // 🎯 自分のターンでない場合は送信しない
        if (!isMyTurn()) {
          console.log('⏭️ 自分のターンではないため棋譜送信をスキップ');
          return;
        }
        
        try {
          // 🎯 通常の棋譜作成（盤面に影響する手のみ）
          const move: Omit<GameMove, 'id' | 'timestamp'> = {
            turn: action.turn,
            team: action.team,
            action: action.type,
            from: { x: 0, y: 0 }
          };

          // アクションタイプに応じて座標情報を設定
          if (action.type === 'move') {
            const character = state.characters.find(c => c.id === action.characterId);
            if (character && action.position) {
              move.from = character.position;
              move.to = action.position;
              console.log('🚶 移動棋譜作成:', {
                character: character.name,
                team: action.team,
                from: character.position,
                to: action.position
              });
            } else {
              console.error('❌ 移動: キャラクターまたは移動先が見つかりません');
              return;
            }
          } else if (action.type === 'attack') {
            const attacker = state.characters.find(c => c.id === action.characterId);
            const target = state.characters.find(c => c.id === action.targetId);
            if (attacker && target) {
              move.from = attacker.position;
              move.to = target.position;
              console.log('⚔️ 攻撃棋譜作成:', {
                attacker: attacker.name,
                target: target.name,
                team: action.team
              });
            } else {
              console.error('❌ 攻撃: 攻撃者または対象が見つかりません');
              return;
            }
          } else if (action.type === 'skill') {
            const caster = state.characters.find(c => c.id === action.characterId);
            const target = state.characters.find(c => c.id === action.targetId);
            if (caster && target) {
              move.from = caster.position;
              move.to = target.position;
              console.log('✨ スキル棋譜作成:', {
                caster: caster.name,
                target: target.name,
                skill: action.skillId,
                team: action.team
              });
            } else {
              console.error('❌ スキル: 使用者または対象が見つかりません');
              return;
            }
          } else if (action.type === 'end_turn' || action.type === 'forced_end_turn') {
            move.from = { x: 0, y: 0 };
            console.log('🔄 ターン終了棋譜作成:', action.type, 'team:', action.team);
          } else if (action.type === 'surrender') {
            move.from = { x: 0, y: 0 };
            console.log('🏳️ 降参棋譜作成:', action.team);
          } else {
            console.warn('⚠️ 未対応のアクションタイプ:', action.type);
            return;
          }

          console.log('📤 棋譜送信（ターンプレイヤー）:', move);
          await sendMove(state.roomId, move);
        } catch (error) {
          console.error('❌ 棋譜送信失敗:', error);
        }
      };
      
      syncCallbackRef.current = syncCallback;
      dispatch({ type: 'SET_NETWORK_SYNC_CALLBACK', callback: syncCallback });
    } else if (!state.isNetworkGame) {
      syncCallbackRef.current = null;
      dispatch({ type: 'SET_NETWORK_SYNC_CALLBACK', callback: null });
    }
  }, [state.isNetworkGame, state.roomId, sendMove, dispatch, state.characters, isConnected, state.currentTeam, state.isHost]);

  // 🎯 **ターンプレイヤー: 毎秒タイマー送信**
  useEffect(() => {
    if (state.isNetworkGame && state.roomId && state.hasTimeLimit && state.gamePhase === 'action') {
      // 自分のターンの場合のみタイマー送信
      if (isMyTurn()) {
        console.log('⏰ タイマー送信開始（ターンプレイヤー）');
        
        timerSyncInterval.current = setInterval(async () => {
          try {
            const timerSync: Omit<TimerSync, 'id' | 'timestamp'> = {
              turn: state.currentTurn,
              team: state.currentTeam,
              timeLeft: currentTimeLeft
            };
            
            console.log('⏰ タイマー同期送信:', { timeLeft: currentTimeLeft, team: state.currentTeam });
            await sendTimerSync(state.roomId!, timerSync);
          } catch (error) {
            console.error('❌ タイマー同期送信エラー:', error);
          }
        }, 1000); // 毎秒送信

        return () => {
          if (timerSyncInterval.current) {
            clearInterval(timerSyncInterval.current);
            timerSyncInterval.current = null;
          }
        };
      } else {
        console.log('⏰ タイマー送信停止（非ターンプレイヤー）');
        if (timerSyncInterval.current) {
          clearInterval(timerSyncInterval.current);
          timerSyncInterval.current = null;
        }
      }
    }
  }, [state.isNetworkGame, state.roomId, state.hasTimeLimit, state.gamePhase, state.currentTeam, state.isHost, state.currentTurn, currentTimeLeft, sendTimerSync]);

  // 🎯 初期状態受信処理
  useEffect(() => {
    if (state.isNetworkGame) {
      const initialStateCallback = (initialState: any) => {
        console.log('📥 初期状態受信:', initialState);
        initialGameState.current = initialState;
        
        // 初期状態をゲームに適用
        dispatch({
          type: 'START_NETWORK_GAME',
          roomId: state.roomId!,
          isHost: state.isHost,
          hasTimeLimit: initialState.hasTimeLimit,
          timeLimitSeconds: initialState.timeLimitSeconds,
          hostDeck: initialState.hostDeck,
          guestDeck: initialState.guestDeck
        });

        // タイマーを初期化
        setCurrentTimeLeft(initialState.timeLimitSeconds || 30);
      };

      setOnInitialState(initialStateCallback);
    } else {
      setOnInitialState(() => {});
    }
  }, [state.isNetworkGame, setOnInitialState, dispatch, state.roomId, state.isHost]);

  // 🎯 **非ターンプレイヤー: 棋譜リプレイで盤面再現**
  useEffect(() => {
    if (state.isNetworkGame && state.roomId) {
      const moveCallback = (allMoves: GameMove[]) => {
        // 🎯 新しい棋譜があるかチェック
        if (allMoves.length <= lastProcessedMoveCount.current) {
          return; // 新しい棋譜なし
        }

        console.log('🎬 棋譜リプレイ開始（非ターンプレイヤー）:', {
          totalMoves: allMoves.length,
          processedMoves: lastProcessedMoveCount.current,
          newMoves: allMoves.length - lastProcessedMoveCount.current
        });

        // 🎯 初期状態から全棋譜を再計算
        if (!initialGameState.current) {
          console.warn('⚠️ 初期状態が設定されていません');
          return;
        }

        // 🎯 初期状態を復元
        dispatch({
          type: 'START_NETWORK_GAME',
          roomId: state.roomId!,
          isHost: state.isHost,
          hasTimeLimit: initialGameState.current.hasTimeLimit,
          timeLimitSeconds: initialGameState.current.timeLimitSeconds,
          hostDeck: initialGameState.current.hostDeck,
          guestDeck: initialGameState.current.guestDeck
        });

        // 🎯 全棋譜を順番に適用（非同期で実行）
        setTimeout(() => {
          allMoves.forEach((move, index) => {
            console.log(`📋 棋譜適用 ${index + 1}/${allMoves.length}:`, {
              action: move.action,
              team: move.team,
              turn: move.turn,
              from: move.from,
              to: move.to
            });

            const moveData = {
              turn: move.turn,
              team: move.team,
              type: move.action,
              from: move.from,
              to: move.to,
              skillId: move.action === 'skill' ? 'rage-strike' : undefined // 🔧 スキルIDは別途実装が必要
            };

            dispatch({ type: 'APPLY_MOVE', move: moveData });
          });

          // 🎯 処理済み棋譜数を更新
          lastProcessedMoveCount.current = allMoves.length;
          console.log('✅ 棋譜リプレイ完了（非ターンプレイヤー）:', {
            totalMovesProcessed: allMoves.length
          });
        }, 100); // 初期状態復元後に棋譜を適用
      };

      setOnMove(moveCallback);
    } else {
      setOnMove(() => {});
    }
  }, [state.isNetworkGame, setOnMove, dispatch, state.roomId, state.isHost]);

  // 🎯 **非ターンプレイヤー: タイマー受信で画面反映**
  useEffect(() => {
    if (state.isNetworkGame && state.roomId) {
      const timerCallback = (timerSync: TimerSync) => {
        console.log('⏰ タイマー同期受信（非ターンプレイヤー）:', {
          team: timerSync.team,
          timeLeft: timerSync.timeLeft,
          turn: timerSync.turn,
          isMyTurn: isMyTurn()
        });

        // 🎯 非ターンプレイヤーの場合のみタイマーを更新
        if (!isMyTurn()) {
          setCurrentTimeLeft(timerSync.timeLeft);
          console.log('⏰ タイマー画面反映:', timerSync.timeLeft);
        }
      };

      setOnTimerSync(timerCallback);
    } else {
      setOnTimerSync(() => {});
    }
  }, [state.isNetworkGame, setOnTimerSync, state.roomId, state.currentTeam, state.isHost]);

  // ターン変更時にタイマーをリセット
  useEffect(() => {
    if (state.gamePhase === 'action') {
      setCurrentTimeLeft(state.timeLimitSeconds);
      console.log('🔄 ターン変更 - タイマーリセット:', state.timeLimitSeconds);
    }
  }, [state.currentTeam, state.gamePhase, state.timeLimitSeconds]);

  // ゲーム終了時のクリーンアップ
  useEffect(() => {
    if (!state.isNetworkGame && isInitialized.current) {
      console.log('🧹 ネットワークゲーム終了 - クリーンアップ');
      isInitialized.current = false;
      lastProcessedMoveCount.current = 0;
      initialGameState.current = null;
      
      if (timerSyncInterval.current) {
        clearInterval(timerSyncInterval.current);
        timerSyncInterval.current = null;
      }
    }
  }, [state.isNetworkGame]);

  return (
    <SimpleNetworkContext.Provider 
      value={{ 
        isConnected,
        currentTimeLeft,
        setCurrentTimeLeft
      }}
    >
      {children}
    </SimpleNetworkContext.Provider>
  );
};

export const useSimpleNetwork = (): SimpleNetworkContextType => {
  const context = useContext(SimpleNetworkContext);
  if (context === undefined) {
    throw new Error('useSimpleNetwork must be used within a SimpleNetworkProvider');
  }
  return context;
};