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
  const { sendMove, uploadInitialState, setOnMove, setOnGameStart, setOnInitialState, startRoomMonitoring, isConnected } = useSimpleGameSync();
  const { state, dispatch } = useGame();
  const lastProcessedMoveId = useRef<string>('');
  const syncCallbackRef = useRef<((action: any) => void) | null>(null);
  const isInitialized = useRef(false);
  const initialStateUploaded = useRef(false);

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

  // 初期盤面のアップロード（ホストのみ、ゲーム開始時に1回だけ）
  useEffect(() => {
    if (state.isNetworkGame && state.isHost && state.gamePhase === 'action' && 
        state.roomId && !initialStateUploaded.current && isConnected) {
      
      console.log('📤 初期盤面アップロード開始');
      
      const initialState = {
        characters: state.characters.map(char => ({
          id: char.id,
          name: char.name,
          type: char.type,
          team: char.team,
          position: char.position,
          hp: char.hp,
          maxHp: char.maxHp,
          attack: char.attack,
          defense: char.defense,
          actions: char.actions,
          cost: char.cost,
          image: char.image,
          skillId: char.skillId,
          ...(char.type === 'monster' && {
            monsterType: char.monsterType,
            canEvolve: char.canEvolve,
            isEvolved: char.isEvolved
          }),
          ...(char.type === 'master' && {
            masterType: char.masterType
          })
        })),
        playerCrystals: state.playerCrystals,
        enemyCrystals: state.enemyCrystals,
        currentTeam: state.currentTeam,
        currentTurn: state.currentTurn,
        gamePhase: state.gamePhase,
        startingTeam: state.currentTeam,
        uploadedAt: Date.now(),
        uploadedBy: 'host'
      };

      uploadInitialState(state.roomId, initialState)
        .then(() => {
          console.log('✅ 初期盤面アップロード完了');
          initialStateUploaded.current = true;
        })
        .catch((error) => {
          console.error('❌ 初期盤面アップロード失敗:', error);
        });
    }
  }, [state.isNetworkGame, state.isHost, state.gamePhase, state.roomId, 
      state.characters, state.playerCrystals, state.enemyCrystals, 
      state.currentTeam, state.currentTurn, uploadInitialState, isConnected]);

  // ネットワーク同期コールバック
  useEffect(() => {
    if (state.isNetworkGame && state.roomId) {
      const syncCallback = async (action: any) => {
        if (!state.roomId || !isConnected) {
          console.error('❌ ルームIDまたは接続が確立されていません');
          return;
        }
        
        try {
          const character = state.characters.find(c => c.id === action.characterId);
          if (!character) {
            console.error('❌ キャラクターが見つかりません:', action.characterId);
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

        const networkAction = {
          turn: move.turn,
          team: state.isHost ? 'enemy' : 'player',
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
      initialStateUploaded.current = false;
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