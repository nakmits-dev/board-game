import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useSimpleGameSync } from '../hooks/useSimpleGameSync';
import { useGame } from './GameContext';
import { GameMove } from '../types/networkTypes';

interface SimpleNetworkContextType {
  isConnected: boolean;
  currentTimeLeft: number;
  setCurrentTimeLeft: (time: number | ((prev: number) => number)) => void;
}

const SimpleNetworkContext = createContext<SimpleNetworkContextType | undefined>(undefined);

interface SimpleNetworkProviderProps {
  children: React.ReactNode;
}

export const SimpleNetworkProvider: React.FC<SimpleNetworkProviderProps> = ({ children }) => {
  const { 
    sendMove, 
    setOnMove, 
    setOnGameStart, 
    setOnInitialState, 
    startRoomMonitoring, 
    isConnected 
  } = useSimpleGameSync();
  const { state, dispatch } = useGame();
  const [currentTimeLeft, setCurrentTimeLeft] = React.useState(30);
  const isInitialized = useRef(false);
  const initialGameState = useRef<any>(null);
  
  const lastProcessedTimestamp = useRef<number>(0);

  // sendMove関数を設定
  useEffect(() => {
    console.log('🔗 [SimpleNetworkContext] sendMove関数設定:', {
      roomId: state.roomId,
      sendMoveExists: !!sendMove
    });
    
    if (state.roomId) {
      dispatch({ type: 'SET_SEND_MOVE_FUNCTION', sendMoveFunction: sendMove });
    } else {
      dispatch({ type: 'SET_SEND_MOVE_FUNCTION', sendMoveFunction: null });
    }
  }, [state.roomId, sendMove, dispatch]);

  // ネットワークゲーム開始時の監視開始
  useEffect(() => {
    if (state.roomId && isConnected) {
      if (isInitialized.current) {
        return;
      }

      console.log('🔗 [SimpleNetworkContext] ルーム監視開始:', state.roomId);
      startRoomMonitoring(state.roomId, state.isHost);
      isInitialized.current = true;
    }
  }, [state.roomId, state.isHost, isConnected, startRoomMonitoring]);

  // 初期状態受信処理
  useEffect(() => {
    if (state.roomId) {
      const initialStateCallback = (initialState: any) => {
        console.log('📥 [SimpleNetworkContext] 初期状態受信:', initialState);
        initialGameState.current = initialState;
        
        dispatch({
          type: 'START_NETWORK_GAME',
          roomId: state.roomId!,
          isHost: state.isHost,
          hasTimeLimit: initialState.hasTimeLimit,
          timeLimitSeconds: initialState.timeLimitSeconds,
          hostDeck: initialState.hostDeck,
          guestDeck: initialState.guestDeck
        });

        setCurrentTimeLeft(initialState.timeLimitSeconds || 30);
      };

      setOnInitialState(initialStateCallback);
    } else {
      setOnInitialState(() => {});
    }
  }, [state.roomId, setOnInitialState, dispatch, state.isHost]);

  // 棋譜受信処理
  useEffect(() => {
    if (state.roomId) {
      const moveCallback = (allMoves: GameMove[]) => {
        console.log('📋 [SimpleNetworkContext] 棋譜受信チェック:', {
          totalMoves: allMoves.length,
          lastProcessedTimestamp: lastProcessedTimestamp.current
        });

        const newMoves = allMoves.filter(move => move.timestamp > lastProcessedTimestamp.current);
        
        if (newMoves.length === 0) {
          console.log('📋 [SimpleNetworkContext] 新しい棋譜なし - スキップ');
          return;
        }

        console.log('📋 [SimpleNetworkContext] 新しい棋譜を検出:', {
          newMovesCount: newMoves.length,
          moves: newMoves.map(m => ({ 
            action: m.action, 
            team: m.team, 
            turn: m.turn,
            timestamp: m.timestamp
          }))
        });

        newMoves.sort((a, b) => a.timestamp - b.timestamp);

        newMoves.forEach((move, index) => {
          console.log(`📋 [SimpleNetworkContext] 棋譜適用 ${index + 1}/${newMoves.length}:`, {
            action: move.action,
            team: move.team,
            turn: move.turn,
            timestamp: move.timestamp
          });

          const moveData = {
            turn: move.turn,
            team: move.team,
            type: move.action,
            from: move.from,
            to: move.to,
            skillId: move.action === 'skill' ? 'rage-strike' : undefined
          };

          dispatch({ type: 'APPLY_MOVE', move: moveData });
          
          lastProcessedTimestamp.current = Math.max(lastProcessedTimestamp.current, move.timestamp);
        });

        console.log('✅ [SimpleNetworkContext] 新しい棋譜処理完了:', {
          processedCount: newMoves.length,
          latestTimestamp: lastProcessedTimestamp.current
        });
      };

      setOnMove(moveCallback);
    } else {
      setOnMove(() => {});
    }
  }, [state.roomId, setOnMove, dispatch]);

  // ターン変更時にタイマーをリセット
  useEffect(() => {
    if (state.gamePhase === 'action') {
      setCurrentTimeLeft(state.timeLimitSeconds);
    }
  }, [state.currentTeam, state.gamePhase, state.timeLimitSeconds]);

  // ゲーム終了時のクリーンアップ
  useEffect(() => {
    if (!state.roomId && isInitialized.current) {
      console.log('🧹 [SimpleNetworkContext] ネットワークゲーム終了 - クリーンアップ');
      isInitialized.current = false;
      initialGameState.current = null;
      lastProcessedTimestamp.current = 0;
    }
  }, [state.roomId]);

  return (
    <SimpleNetworkContext.Provider 
      value={{ 
        isConnected,
        currentTimeLeft,
        setCurrentTimeLeft
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