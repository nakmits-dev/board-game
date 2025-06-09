import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useSimpleGameSync } from '../hooks/useSimpleGameSync';
import { useGame } from './GameContext';
import { GameMove } from '../types/networkTypes';
import { createInitialGameState } from '../data/initialGameState';

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

  // 🆕 初期盤面データ受信時の処理（ゲスト用）
  useEffect(() => {
    if (state.isNetworkGame && !state.isHost) {
      setOnInitialState((initialState) => {
        console.log('📥 初期盤面データ受信（ゲスト）:', initialState);
        
        // 🆕 座標情報を含む完全な初期状態を再構築
        const fullGameState = createInitialGameState(
          {
            master: initialState.playerDeck.master as any,
            monsters: initialState.playerDeck.monsters as any[]
          },
          {
            master: initialState.enemyDeck.master as any,
            monsters: initialState.enemyDeck.monsters as any[]
          }
        );

        // ゲーム状態を更新（時間制限設定も含む）
        dispatch({
          type: 'START_NETWORK_GAME',
          roomId: state.roomId!,
          isHost: false,
          hasTimeLimit: initialState.hasTimeLimit,
          timeLimitSeconds: initialState.timeLimitSeconds,
          playerDeck: {
            master: initialState.playerDeck.master as any,
            monsters: initialState.playerDeck.monsters as any[]
          },
          enemyDeck: {
            master: initialState.enemyDeck.master as any,
            monsters: initialState.enemyDeck.monsters as any[]
          }
        });

        // 🔧 キャラクター配置を正確に反映
        dispatch({
          type: 'UPDATE_PREVIEW',
          playerDeck: {
            master: initialState.playerDeck.master as any,
            monsters: initialState.playerDeck.monsters as any[]
          },
          enemyDeck: {
            master: initialState.enemyDeck.master as any,
            monsters: initialState.enemyDeck.monsters as any[]
          }
        });
      });
    }
  }, [state.isNetworkGame, state.isHost, state.roomId, setOnInitialState, dispatch]);

  // 🎯 ターンプレイヤー用：ローカル処理後の結果を棋譜として送信
  useEffect(() => {
    if (state.isNetworkGame && state.roomId) {
      const syncCallback = async (action: any) => {
        if (!state.roomId || !isConnected) {
          console.error('❌ ルームIDまたは接続が確立されていません');
          return;
        }

        // 🎯 自分のターンの場合のみ棋譜を送信（ターンプレイヤーのみ）
        const isMyTurn = state.isHost ? state.currentTeam === 'player' : state.currentTeam === 'enemy';
        if (!isMyTurn) {
          console.log('⏭️ 自分のターンではないため棋譜送信をスキップ');
          return;
        }
        
        try {
          // 🎯 ローカル処理完了後の結果を棋譜として送信
          const move: Omit<GameMove, 'id' | 'timestamp' | 'player'> = {
            turn: action.turn,
            action: action.type,
            from: { x: 0, y: 0 }, // デフォルト値
            // 🆕 処理結果データを追加
            result: {
              type: action.type,
              characterId: action.characterId,
              targetId: action.targetId,
              position: action.position,
              skillId: action.skillId,
              // 🆕 処理結果の詳細情報
              damage: action.damage,
              newHp: action.newHp,
              crystalChange: action.crystalChange,
              evolved: action.evolved,
              defeated: action.defeated
            }
          };

          // 🔧 アクションタイプに応じて座標情報を設定
          if (action.type === 'move') {
            const character = state.characters.find(c => c.id === action.characterId);
            if (character && action.position) {
              move.from = character.position;
              move.to = action.position;
              console.log('🚶 移動結果送信:', {
                character: character.name,
                from: character.position,
                to: action.position
              });
            }
          } else if (action.type === 'attack') {
            const attacker = state.characters.find(c => c.id === action.characterId);
            const target = state.characters.find(c => c.id === action.targetId);
            if (attacker && target) {
              move.from = attacker.position;
              move.to = target.position;
              console.log('⚔️ 攻撃結果送信:', {
                attacker: attacker.name,
                target: target.name,
                damage: action.damage,
                newHp: action.newHp
              });
            }
          } else if (action.type === 'skill') {
            const caster = state.characters.find(c => c.id === action.characterId);
            const target = state.characters.find(c => c.id === action.targetId);
            if (caster && target) {
              move.from = caster.position;
              move.to = target.position;
              console.log('✨ スキル結果送信:', {
                caster: caster.name,
                target: target.name,
                skill: action.skillId
              });
            }
          } else if (action.type === 'end_turn' || action.type === 'forced_end_turn') {
            move.from = { x: 0, y: 0 };
            console.log('🔄 ターン終了結果送信:', action.type);
          } else if (action.type === 'timer_sync') {
            move.from = { x: 0, y: 0 };
            move.timeLeft = action.timeLeft;
            console.log('⏰ タイマー同期送信:', { timeLeft: action.timeLeft });
          }

          console.log('📤 処理結果送信:', move);
          await sendMove(state.roomId, move, state.isHost);
        } catch (error) {
          console.error('❌ 処理結果送信失敗:', error);
        }
      };
      
      syncCallbackRef.current = syncCallback;
      dispatch({ type: 'SET_NETWORK_SYNC_CALLBACK', callback: syncCallback });
    } else if (!state.isNetworkGame) {
      syncCallbackRef.current = null;
      dispatch({ type: 'SET_NETWORK_SYNC_CALLBACK', callback: null });
    }
  }, [state.isNetworkGame, state.roomId, sendMove, dispatch, state.characters, state.isHost, state.currentTeam, isConnected]);

  // 🎯 非ターンプレイヤー用：棋譜を元にボードに計算・反映
  useEffect(() => {
    if (state.isNetworkGame && state.roomId) {
      const moveCallback = (move: GameMove) => {
        if (move.id === lastProcessedMoveId.current) {
          return;
        }

        console.log('📥 相手の処理結果を受信:', {
          action: move.action,
          from: move.from,
          to: move.to,
          result: move.result
        });

        // 🎯 非ターンプレイヤーは棋譜の結果データを元にボードを更新
        const networkAction = {
          turn: move.turn,
          team: move.player === 'host' ? 'player' : 'enemy',
          type: move.action,
          from: move.from,
          to: move.to,
          timeLeft: move.timeLeft,
          // 🆕 処理結果データを含める
          result: move.result
        };

        console.log('🔄 棋譜結果を反映:', {
          original: { player: move.player, action: move.action },
          converted: { team: networkAction.team, type: networkAction.type },
          result: move.result
        });

        dispatch({ type: 'SYNC_NETWORK_ACTION', action: networkAction });
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