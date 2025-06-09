import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useSimpleGameSync } from '../hooks/useSimpleGameSync';
import { useGame } from './GameContext';
import { GameMove } from '../types/networkTypes';

interface SimpleNetworkContextType {
  isConnected: boolean;
  currentTimeLeft: number;
  setCurrentTimeLeft: (time: number | ((prev: number) => number)) => void;
  sendMove?: (roomId: string, move: any) => Promise<void>;
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
  
  // 🔧 **最後に処理した棋譜のタイムスタンプを記録**
  const lastProcessedTimestamp = useRef<number>(0);

  // ネットワークゲーム開始時の監視開始
  useEffect(() => {
    if (state.isNetworkGame && state.roomId && isConnected) {
      if (isInitialized.current) {
        return;
      }

      console.log('🔗 [SimpleNetworkContext] ルーム監視開始:', state.roomId);
      startRoomMonitoring(state.roomId, state.isHost);
      isInitialized.current = true;
    }
  }, [state.isNetworkGame, state.roomId, state.isHost, isConnected, startRoomMonitoring]);

  // 🎯 初期状態受信処理
  useEffect(() => {
    if (state.isNetworkGame) {
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
  }, [state.isNetworkGame, setOnInitialState, dispatch, state.roomId, state.isHost]);

  // 🔧 **棋譜受信処理（新しい棋譜のみを処理）**
  useEffect(() => {
    if (state.isNetworkGame && state.roomId) {
      const moveCallback = (allMoves: GameMove[]) => {
        console.log('📋 [SimpleNetworkContext] 棋譜受信チェック:', {
          totalMoves: allMoves.length,
          lastProcessedTimestamp: lastProcessedTimestamp.current
        });

        // 🔧 **新しい棋譜のみをフィルタリング**
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

        // 🔧 **タイムスタンプ順でソート**
        newMoves.sort((a, b) => a.timestamp - b.timestamp);

        // 🔧 **新しい棋譜のみを順番に処理**
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
          
          // 🔧 **最新のタイムスタンプを更新**
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
  }, [state.isNetworkGame, setOnMove, dispatch, state.roomId]);

  // ターン変更時にタイマーをリセット
  useEffect(() => {
    if (state.gamePhase === 'action') {
      setCurrentTimeLeft(state.timeLimitSeconds);
    }
  }, [state.currentTeam, state.gamePhase, state.timeLimitSeconds]);

  // ゲーム終了時のクリーンアップ
  useEffect(() => {
    if (!state.isNetworkGame && isInitialized.current) {
      console.log('🧹 [SimpleNetworkContext] ネットワークゲーム終了 - クリーンアップ');
      isInitialized.current = false;
      initialGameState.current = null;
      lastProcessedTimestamp.current = 0;
    }
  }, [state.isNetworkGame]);

  return (
    <SimpleNetworkContext.Provider 
      value={{ 
        isConnected,
        currentTimeLeft,
        setCurrentTimeLeft,
        sendMove
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