import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useSimpleGameSync } from '../hooks/useSimpleGameSync';
import { useGame } from './GameContext';
import { GameMove } from '../types/networkTypes';

interface SimpleNetworkContextType {
  isConnected: boolean;
}

const SimpleNetworkContext = createContext<SimpleNetworkContextType | undefined>(undefined);

interface SimpleNetworkProviderProps {
  children: React.ReactNode;
}

export const SimpleNetworkProvider: React.FC<SimpleNetworkProviderProps> = ({ children }) => {
  const { sendMove, setOnMove, setOnGameStart, setOnInitialState, startRoomMonitoring, isConnected } = useSimpleGameSync();
  const { state, dispatch } = useGame();
  const lastProcessedMoveId = useRef<string>('');
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

  // 🎯 統一された棋譜送信処理（ターンプレイヤーのみ）
  useEffect(() => {
    if (state.isNetworkGame && state.roomId) {
      const syncCallback = async (action: any) => {
        if (!state.roomId || !isConnected) {
          console.error('❌ ルームIDまたは接続が確立されていません');
          return;
        }

        // 🎯 重要: 自分のターンの場合のみ棋譜を送信
        const isMyTurn = state.isHost ? state.currentTeam === 'player' : state.currentTeam === 'enemy';
        if (!isMyTurn) {
          console.log('⏭️ 自分のターンではないため棋譜送信をスキップ:', {
            currentTeam: state.currentTeam,
            isHost: state.isHost,
            isMyTurn
          });
          return;
        }
        
        try {
          // 🔧 基本的な棋譜データを作成
          const move: Omit<GameMove, 'id' | 'timestamp' | 'player'> = {
            turn: action.turn,
            action: action.type,
            from: { x: 0, y: 0 } // デフォルト値
          };

          // 🔧 アクションタイプに応じて座標情報を設定
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
                attackerPos: attacker.position,
                target: target.name,
                targetPos: target.position
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
                casterPos: caster.position,
                target: target.name,
                targetPos: target.position,
                skill: action.skillId
              });
            } else {
              console.error('❌ スキル: 使用者または対象が見つかりません');
              return;
            }
          } else if (action.type === 'end_turn' || action.type === 'forced_end_turn') {
            move.from = { x: 0, y: 0 };
            console.log('🔄 ターン終了棋譜作成:', action.type);
          } else if (action.type === 'timer_sync') {
            move.from = { x: 0, y: 0 };
            move.timeLeft = action.timeLeft;
            console.log('⏰ タイマー同期棋譜作成:', { timeLeft: action.timeLeft });
          } else {
            console.warn('⚠️ 未対応のアクションタイプ:', action.type);
            return;
          }

          console.log('📤 棋譜送信（ターンプレイヤー）:', move);
          await sendMove(state.roomId, move, state.isHost);
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
  }, [state.isNetworkGame, state.roomId, sendMove, dispatch, state.characters, state.isHost, state.currentTeam, isConnected]);

  // 🎯 統一された棋譜受信処理（非ターンプレイヤー）
  useEffect(() => {
    if (state.isNetworkGame && state.roomId) {
      const moveCallback = (move: GameMove) => {
        if (move.id === lastProcessedMoveId.current) {
          return;
        }

        // 🎯 重要: 相手のターンの手のみ処理
        const isOpponentMove = state.isHost ? move.player === 'guest' : move.player === 'host';
        if (!isOpponentMove) {
          console.log('⏭️ 自分の手なのでスキップ:', {
            movePlayer: move.player,
            isHost: state.isHost,
            isOpponentMove
          });
          return;
        }

        console.log('📥 相手の手を受信（非ターンプレイヤー）:', {
          action: move.action,
          from: move.from,
          to: move.to,
          player: move.player,
          isHost: state.isHost
        });

        // 🎯 統一されたチーム変換: host→player、guest→enemy
        const moveData = {
          turn: move.turn,
          team: move.player === 'host' ? 'player' : 'enemy',
          type: move.action,
          from: move.from,
          to: move.to,
          timeLeft: move.timeLeft,
          skillId: move.action === 'skill' ? 'rage-strike' : undefined // 🔧 スキルIDは別途実装が必要
        };

        console.log('🔄 棋譜適用:', {
          original: { player: move.player, action: move.action },
          converted: { team: moveData.team, type: moveData.type },
          isHost: state.isHost,
          explanation: `${move.player} → ${moveData.team} (host=青チーム, guest=赤チーム)`
        });

        // 🎯 統一された棋譜適用処理を使用
        dispatch({ type: 'APPLY_MOVE', move: moveData });
        lastProcessedMoveId.current = move.id;
      };

      setOnMove(moveCallback);
    } else {
      setOnMove(() => {});
    }
  }, [state.isNetworkGame, state.isHost, setOnMove, dispatch, state.roomId]);

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