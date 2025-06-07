import React, { createContext, useContext, useEffect, useRef } from 'react';
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
  const { networkState, sendAction, setOnActionReceived, isConnected } = useFirebaseGame();
  const { state, dispatch } = useGame();
  const lastProcessedActionId = useRef<string>('');

  // ネットワーク同期コールバックを設定
  useEffect(() => {
    if (state.isNetworkGame) {
      const syncCallback = (action: any) => {
        console.log('ネットワークアクション送信:', action);
        sendAction(action).catch(console.error);
      };
      dispatch({ type: 'SET_NETWORK_SYNC_CALLBACK', callback: syncCallback });
    } else {
      dispatch({ type: 'SET_NETWORK_SYNC_CALLBACK', callback: null });
    }
  }, [state.isNetworkGame, sendAction, dispatch]);

  // アクション受信コールバックを設定
  useEffect(() => {
    if (state.isNetworkGame) {
      const actionCallback = (action: GameAction) => {
        console.log('アクション受信コールバック実行:', action);
        
        // 既に処理済みのアクションはスキップ
        if (action.id === lastProcessedActionId.current) {
          console.log('既に処理済みのアクション:', action.id);
          return;
        }
        
        // 自分のアクションは無視（既にローカルで処理済み）
        const isMyAction = state.isHost ? 
          action.team === 'player' : 
          action.team === 'enemy';
        
        if (isMyAction) {
          console.log('自分のアクションなので無視:', action.type);
          lastProcessedActionId.current = action.id;
          return;
        }

        console.log('相手のアクションを同期処理:', action.type);
        
        // 相手のアクションを同期
        dispatch({ type: 'SYNC_NETWORK_ACTION', action });
        lastProcessedActionId.current = action.id;
      };

      setOnActionReceived(actionCallback);
    } else {
      setOnActionReceived(() => {});
    }
  }, [state.isNetworkGame, state.isHost, setOnActionReceived, dispatch]);

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