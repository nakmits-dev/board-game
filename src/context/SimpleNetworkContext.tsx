import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useSimpleGameSync } from '../hooks/useSimpleGameSync';
import { useGame } from './GameContext';
import { GameMove, TimerSync } from '../types/networkTypes';

interface SimpleNetworkContextType {
  isConnected: boolean;
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
  const lastProcessedMoveId = useRef<string>('');
  const lastProcessedTimerId = useRef<string>('');
  const syncCallbackRef = useRef<((action: any) => void) | null>(null);
  const isInitialized = useRef(false);

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

  // 🎯 シンプル化: 全プレイヤーが同じ棋譜を送信
  useEffect(() => {
    if (state.isNetworkGame && state.roomId) {
      const syncCallback = async (action: any) => {
        if (!state.roomId || !isConnected) {
          console.error('❌ ルームIDまたは接続が確立されていません');
          return;
        }
        
        try {
          // タイマー同期は別処理
          if (action.type === 'timer_sync') {
            const timerSync: Omit<TimerSync, 'id' | 'timestamp'> = {
              turn: action.turn,
              team: action.team,
              timeLeft: action.timeLeft
            };
            console.log('⏰ タイマー同期送信:', timerSync);
            await sendTimerSync(state.roomId, timerSync);
            return;
          }

          // 通常の棋譜作成（シンプル化）
          const move: Omit<GameMove, 'id' | 'timestamp'> = {
            turn: action.turn,
            action: action.type,
            from: { x: 0, y: 0 }
          };

          if (action.type === 'move') {
            const character = state.characters.find(c => c.id === action.characterId);
            if (character && action.position) {
              move.from = character.position;
              move.to = action.position;
              console.log('🚶 移動棋譜作成:', {
                character: character.name,
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
                target: target.name
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
                skill: action.skillId
              });
            } else {
              console.error('❌ スキル: 使用者または対象が見つかりません');
              return;
            }
          } else if (action.type === 'end_turn' || action.type === 'forced_end_turn') {
            move.from = { x: 0, y: 0 };
            console.log('🔄 ターン終了棋譜作成:', action.type);
          } else if (action.type === 'surrender') {
            move.from = { x: 0, y: 0 };
            console.log('🏳️ 降参棋譜作成:', action.team);
          } else {
            console.warn('⚠️ 未対応のアクションタイプ:', action.type);
            return;
          }

          console.log('📤 棋譜送信（全プレイヤー共通）:', move);
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
  }, [state.isNetworkGame, state.roomId, sendMove, sendTimerSync, dispatch, state.characters, isConnected]);

  // 🎯 シンプル化: 全プレイヤーが同じ棋譜を受信
  useEffect(() => {
    if (state.isNetworkGame && state.roomId) {
      const moveCallback = (move: GameMove) => {
        if (move.id === lastProcessedMoveId.current) {
          return;
        }

        console.log('📥 棋譜受信（全プレイヤー共通）:', {
          action: move.action,
          from: move.from,
          to: move.to
        });

        // 🎯 シンプル化: ターン数で自動的にチーム判定
        const moveData = {
          turn: move.turn,
          team: move.turn % 2 === 0 ? 'player' : 'enemy',
          type: move.action,
          from: move.from,
          to: move.to,
          skillId: move.action === 'skill' ? 'rage-strike' : undefined
        };

        console.log('🔄 棋譜適用（全プレイヤー共通）:', {
          original: { action: move.action, turn: move.turn },
          converted: { team: moveData.team, type: moveData.type },
          explanation: `ターン${move.turn} → ${moveData.team}チーム`
        });

        dispatch({ type: 'APPLY_MOVE', move: moveData });
        lastProcessedMoveId.current = move.id;
      };

      setOnMove(moveCallback);
    } else {
      setOnMove(() => {});
    }
  }, [state.isNetworkGame, setOnMove, dispatch, state.roomId]);

  // タイマー同期受信処理
  useEffect(() => {
    if (state.isNetworkGame && state.roomId) {
      const timerCallback = (timerSync: TimerSync) => {
        if (timerSync.id === lastProcessedTimerId.current) {
          return;
        }

        console.log('⏰ タイマー同期受信:', {
          team: timerSync.team,
          timeLeft: timerSync.timeLeft,
          turn: timerSync.turn
        });

        lastProcessedTimerId.current = timerSync.id;
      };

      setOnTimerSync(timerCallback);
    } else {
      setOnTimerSync(() => {});
    }
  }, [state.isNetworkGame, setOnTimerSync, state.roomId]);

  // ゲーム終了時のクリーンアップ
  useEffect(() => {
    if (!state.isNetworkGame && isInitialized.current) {
      console.log('🧹 ネットワークゲーム終了 - クリーンアップ');
      isInitialized.current = false;
    }
  }, [state.isNetworkGame]);

  return (
    <SimpleNetworkContext.Provider 
      value={{ 
        isConnected
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