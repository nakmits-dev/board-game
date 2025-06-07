import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { GameAction as LocalGameAction } from './GameContext';
import { GameAction, NetworkGameState } from '../types/networkTypes';
import { useFirebaseGame } from '../hooks/useFirebaseGame';

interface NetworkGameContextType {
  networkState: NetworkGameState;
  sendGameAction: (action: Omit<GameAction, 'id' | 'timestamp' | 'playerId'>) => Promise<void>;
  isNetworkGame: boolean;
  isMyTurn: boolean;
  syncWithNetwork: (localAction: LocalGameAction) => void;
}

const NetworkGameContext = createContext<NetworkGameContextType | undefined>(undefined);

interface NetworkGameProviderProps {
  children: ReactNode;
  roomId?: string;
  isHost?: boolean;
}

export const NetworkGameProvider: React.FC<NetworkGameProviderProps> = ({ 
  children, 
  roomId, 
  isHost = false 
}) => {
  const { networkState, sendAction } = useFirebaseGame();
  const isNetworkGame = !!roomId;

  // ローカルアクションをネットワークアクションに変換
  const syncWithNetwork = (localAction: LocalGameAction) => {
    if (!isNetworkGame) return;

    // ローカルアクションをネットワーク用に変換
    let networkAction: Omit<GameAction, 'id' | 'timestamp' | 'playerId'> | null = null;

    switch (localAction.type) {
      case 'CONFIRM_ACTION':
        // 実際のアクションは pendingAction から取得する必要がある
        // これは GameContext で処理される
        break;
      
      case 'USE_SKILL':
        networkAction = {
          turn: 0, // 実際のターン数は GameContext から取得
          team: 'player', // 実際のチームは GameContext から取得
          type: 'skill',
          characterId: '', // 実際のキャラクターIDは GameContext から取得
          targetId: localAction.targetId,
          skillId: '', // 実際のスキルIDは GameContext から取得
        };
        break;
      
      case 'END_TURN':
        networkAction = {
          turn: 0,
          team: 'player',
          type: 'end_turn',
          characterId: '',
        };
        break;
    }

    if (networkAction) {
      sendAction(networkAction);
    }
  };

  const sendGameAction = async (action: Omit<GameAction, 'id' | 'timestamp' | 'playerId'>) => {
    await sendAction(action);
  };

  const isMyTurn = () => {
    if (!isNetworkGame) return true;
    
    // ホストは 'player' チーム、ゲストは 'enemy' チーム
    const myTeam = isHost ? 'player' : 'enemy';
    return networkState.gameActions.length === 0 || 
           networkState.gameActions[networkState.gameActions.length - 1]?.team !== myTeam;
  };

  return (
    <NetworkGameContext.Provider 
      value={{ 
        networkState, 
        sendGameAction, 
        isNetworkGame,
        isMyTurn: isMyTurn(),
        syncWithNetwork
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