import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useSimpleGameSync } from '../hooks/useSimpleGameSync';
import { useGame } from './GameContext';

interface SimpleNetworkContextType {
  isConnected: boolean;
}

const SimpleNetworkContext = createContext<SimpleNetworkContextType | undefined>(undefined);

interface SimpleNetworkProviderProps {
  children: React.ReactNode;
}

export const SimpleNetworkProvider: React.FC<SimpleNetworkProviderProps> = ({ children }) => {
  const { gameState, sendMove, setOnMove, isConnected } = useSimpleGameSync();
  const { state, dispatch } = useGame();
  const lastProcessedMoveId = useRef<string>('');
  const syncCallbackRef = useRef<((action: any) => void) | null>(null);

  // ネットワーク同期コールバックを設定
  useEffect(() => {
    if (state.isNetworkGame && state.roomId) {
      console.log('ネットワーク同期コールバック設定:', { roomId: state.roomId, isHost: state.isHost });
      
      const syncCallback = async (action: any) => {
        console.log('アクション送信:', action);
        console.log('送信先ルーム:', state.roomId);
        
        if (!state.roomId) {
          console.error('ルームIDが設定されていません:', state.roomId);
          return;
        }
        
        try {
          // ゲームアクションを棋譜形式に変換
          const move = {
            turn: action.turn,
            action: action.type,
            characterId: action.characterId || '',
            from: action.characterId ? state.characters.find(c => c.id === action.characterId)?.position : undefined,
            to: action.position,
            target: action.targetId,
            skill: action.skillId
          };

          console.log('送信する手:', move);
          await sendMove(move);
          console.log('手の送信成功');
        } catch (error) {
          console.error('アクション送信失敗:', error);
        }
      };
      
      syncCallbackRef.current = syncCallback;
      dispatch({ type: 'SET_NETWORK_SYNC_CALLBACK', callback: syncCallback });
    } else {
      console.log('ネットワーク同期コールバック解除');
      syncCallbackRef.current = null;
      dispatch({ type: 'SET_NETWORK_SYNC_CALLBACK', callback: null });
    }
  }, [state.isNetworkGame, state.roomId, sendMove, dispatch, state.characters]);

  // 手の受信コールバックを設定
  useEffect(() => {
    if (state.isNetworkGame) {
      console.log('手の受信コールバック設定');
      
      const moveCallback = (move: any) => {
        console.log('手を受信:', move);
        
        // 既に処理済みの手はスキップ
        if (move.id === lastProcessedMoveId.current) {
          console.log('既に処理済みの手をスキップ:', move.id);
          return;
        }

        // 相手の手を同期
        const networkAction = {
          turn: move.turn,
          team: state.isHost ? 'enemy' : 'player',
          type: move.action,
          characterId: move.characterId || '',
          targetId: move.target,
          position: move.to,
          skillId: move.skill
        };

        console.log('ネットワークアクション同期:', networkAction);
        dispatch({ type: 'SYNC_NETWORK_ACTION', action: networkAction });
        lastProcessedMoveId.current = move.id;
      };

      setOnMove(moveCallback);
    } else {
      console.log('手の受信コールバック解除');
      setOnMove(() => {});
    }
  }, [state.isNetworkGame, state.isHost, setOnMove, dispatch]);

  // ゲーム状態の変化をログ出力
  useEffect(() => {
    console.log('ゲーム状態変化:', {
      isNetworkGame: state.isNetworkGame,
      roomId: state.roomId,
      isHost: state.isHost,
      gamePhase: state.gamePhase,
      currentTeam: state.currentTeam
    });
  }, [state.isNetworkGame, state.roomId, state.isHost, state.gamePhase, state.currentTeam]);

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