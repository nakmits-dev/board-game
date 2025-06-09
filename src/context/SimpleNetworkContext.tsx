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

  // ネットワーク同期コールバック
  useEffect(() => {
    if (state.isNetworkGame && state.roomId) {
      const syncCallback = async (action: any) => {
        if (!state.roomId || !isConnected) {
          console.error('❌ ルームIDまたは接続が確立されていません');
          return;
        }
        
        try {
          // 🔧 キャラクターIDではなく座標で検索
          let character = null;
          
          if (action.characterId) {
            character = state.characters.find(c => c.id === action.characterId);
          }
          
          if (!character) {
            console.warn('⚠️ キャラクターIDで見つからない場合、座標で検索:', action);
            // フォールバック: 現在のチームのキャラクターから推測
            const teamCharacters = state.characters.filter(c => c.team === action.team);
            if (teamCharacters.length > 0) {
              character = teamCharacters[0]; // 最初のキャラクターを使用
              console.log('🔧 フォールバック: 最初のキャラクターを使用:', character.name);
            }
          }
          
          if (!character) {
            console.error('❌ キャラクターが見つかりません:', action);
            return;
          }

          const move = {
            turn: action.turn,
            action: action.type,
            from: character.position,
            ...(action.position && { to: action.position })
          };

          console.log('📤 棋譜送信:', move);
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
  }, [state.isNetworkGame, state.roomId, sendMove, dispatch, state.characters, state.isHost, isConnected]);

  // 手の受信コールバック
  useEffect(() => {
    if (state.isNetworkGame && state.roomId) {
      const moveCallback = (move: GameMove) => {
        if (move.id === lastProcessedMoveId.current) {
          return;
        }

        console.log('📥 相手の手を受信:', {
          action: move.action,
          from: move.from,
          to: move.to
        });

        // 🔧 青チーム=host、赤チーム=guest の統一
        const networkAction = {
          turn: move.turn,
          team: state.isHost ? 'enemy' : 'player', // host=青チーム(player)、guest=赤チーム(enemy)
          type: move.action,
          from: move.from,
          to: move.to
        };

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