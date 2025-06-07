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

  // ネットワーク同期コールバックを設定
  useEffect(() => {
    if (state.isNetworkGame && state.roomId) {
      const syncCallback = (action: any) => {
        // ゲームアクションを棋譜形式に変換
        const move = {
          turn: action.turn,
          action: action.type,
          from: action.characterId ? state.characters.find(c => c.id === action.characterId)?.position : undefined,
          to: action.position,
          target: action.targetId,
          skill: action.skillId
        };

        sendMove(move).catch((error) => {
          console.error('手の送信失敗:', error);
        });
      };
      dispatch({ type: 'SET_NETWORK_SYNC_CALLBACK', callback: syncCallback });
    } else {
      dispatch({ type: 'SET_NETWORK_SYNC_CALLBACK', callback: null });
    }
  }, [state.isNetworkGame, state.roomId, sendMove, dispatch, state.characters]);

  // 手の受信コールバックを設定
  useEffect(() => {
    if (state.isNetworkGame) {
      const moveCallback = (move: any) => {
        // 既に処理済みの手はスキップ
        if (move.id === lastProcessedMoveId.current) {
          return;
        }

        // 相手の手を同期
        const networkAction = {
          turn: move.turn,
          team: state.isHost ? 'enemy' : 'player',
          type: move.action,
          characterId: '', // 棋譜から復元
          targetId: move.target,
          position: move.to,
          skillId: move.skill
        };

        dispatch({ type: 'SYNC_NETWORK_ACTION', action: networkAction });
        lastProcessedMoveId.current = move.id;
      };

      setOnMove(moveCallback);
    } else {
      setOnMove(() => {});
    }
  }, [state.isNetworkGame, state.isHost, setOnMove, dispatch]);

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