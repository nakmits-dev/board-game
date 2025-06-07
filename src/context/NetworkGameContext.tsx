import React, { createContext, useContext, useEffect } from 'react';
import { useFirebaseGame } from '../hooks/useFirebaseGame';
import { useGame } from './GameContext';
import { GameAction } from '../types/networkTypes';

interface NetworkGameContextType {
  isConnected: boolean;
  sendGameAction: (action: Omit<GameAction, 'id' | 'timestamp' | 'playerId'>) => Promise<void>;
}

const NetworkGameContext = createContext<NetworkGameContextType | undefined>(undefined);

interface NetworkGameProviderProps {
  children: React.ReactNode;
}

export const NetworkGameProvider: React.FC<NetworkGameProviderProps> = ({ children }) => {
  const { networkState, sendAction, isConnected } = useFirebaseGame();
  const { state, dispatch } = useGame();

  // ネットワーク同期コールバックを設定
  useEffect(() => {
    if (state.isNetworkGame) {
      const syncCallback = (action: any) => {
        sendAction(action).catch(console.error);
      };
      dispatch({ type: 'SET_NETWORK_SYNC_CALLBACK', callback: syncCallback });
    } else {
      dispatch({ type: 'SET_NETWORK_SYNC_CALLBACK', callback: null });
    }
  }, [state.isNetworkGame, sendAction, dispatch]);

  // ネットワークアクションの監視と同期
  useEffect(() => {
    if (!state.isNetworkGame || networkState.gameActions.length === 0) return;

    // 最新のアクションを取得
    const latestAction = networkState.gameActions[networkState.gameActions.length - 1];
    
    // 自分のアクションは無視（既にローカルで処理済み）
    const isMyAction = state.isHost ? 
      latestAction.team === 'player' : 
      latestAction.team === 'enemy';
    
    if (isMyAction) return;

    // 相手のアクションを同期
    dispatch({ type: 'SYNC_NETWORK_ACTION', action: latestAction });
  }, [networkState.gameActions, state.isNetworkGame, state.isHost, dispatch]);

  const sendGameAction = async (action: Omit<GameAction, 'id' | 'timestamp' | 'playerId'>) => {
    await sendAction(action);
  };

  return (
    <NetworkGameContext.Provider 
      value={{ 
        isConnected,
        sendGameAction
      }}
    >
      {children}
    </NetworkGameContext.Provider>
  );
};

export const useNetworkGame = (): NetworkGameContextType => {
  const context = useContext(NetworkGameContext);
  if (context === undefined) {
    throw new Error('useNetworkGame must be used within a NetworkGameProvider');
  }
  return context;
};