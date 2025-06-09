import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useSimpleGameSync } from '../hooks/useSimpleGameSync';
import { useGame } from './GameContext';
import { operationReceiver } from '../modules/OperationReceiver';

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
  const currentUserId = useRef<string | null>(null);

  // OperationReceiver の盤面更新コールバック設定
  useEffect(() => {
    operationReceiver.setOnBoardUpdateCallback((command) => {
      dispatch({ type: 'APPLY_BOARD_UPDATE', command });
    });
  }, [dispatch]);

  // アップロード関数を設定
  useEffect(() => {
    if (state.roomId && sendMove) {
      dispatch({ type: 'SET_UPLOAD_FUNCTION', uploadFunction: sendMove });
    } else {
      dispatch({ type: 'SET_UPLOAD_FUNCTION', uploadFunction: null });
    }
  }, [state.roomId, sendMove, dispatch]);

  // ネットワークゲーム開始時の監視開始
  useEffect(() => {
    if (state.roomId && isConnected) {
      if (isInitialized.current) {
        return;
      }

      startRoomMonitoring(state.roomId, state.isHost);
      isInitialized.current = true;
    }
  }, [state.roomId, state.isHost, isConnected, startRoomMonitoring]);

  // 🔧 **修正: 初期状態受信処理（重複防止）**
  useEffect(() => {
    if (state.roomId) {
      const initialStateCallback = (initialState: any) => {
        // 🔧 **重要: 自分がアップロードした初期状態は無視**
        if (initialState.uploadedBy === currentUserId.current) {
          console.log('📥 自分がアップロードした初期状態をスキップ');
          return;
        }
        
        // 重複初期化を防ぐ
        if (initialGameState.current) {
          console.log('📥 初期状態は既に処理済み');
          return;
        }
        
        console.log('📥 初期状態受信・適用');
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

        // タイマーを正しく設定
        const timeLimit = initialState.timeLimitSeconds || 30;
        setCurrentTimeLeft(timeLimit);
      };

      setOnInitialState(initialStateCallback);
    } else {
      setOnInitialState(() => {});
    }
  }, [state.roomId, setOnInitialState, dispatch, state.isHost]);

  // 🔧 **修正: 操作受信処理（自分の操作をフィルタリング）**
  useEffect(() => {
    if (state.roomId) {
      const moveCallback = (allMoves: any[]) => {
        // 🔧 **重要: 自分の操作は除外して処理**
        const otherPlayerMoves = allMoves.filter(move => {
          // 自分のチームの操作は除外
          const myTeam = state.isHost ? 'player' : 'enemy';
          return move.team !== myTeam;
        });

        if (otherPlayerMoves.length > 0) {
          console.log('📥 相手の操作受信:', `${otherPlayerMoves.length}件`);
          // OperationReceiver に処理を委譲
          operationReceiver.processReceivedOperations(otherPlayerMoves);
        }
      };

      setOnMove(moveCallback);
    } else {
      setOnMove(() => {});
    }
  }, [state.roomId, state.isHost, setOnMove]);

  // ターン変更時にタイマーをリセット（修正）
  useEffect(() => {
    if (state.gamePhase === 'action' && state.timeLimitSeconds > 0) {
      setCurrentTimeLeft(state.timeLimitSeconds);
    }
  }, [state.currentTeam, state.gamePhase, state.timeLimitSeconds]);

  // ゲーム終了時のクリーンアップ
  useEffect(() => {
    if (!state.roomId && isInitialized.current) {
      isInitialized.current = false;
      initialGameState.current = null;
      currentUserId.current = null;
      operationReceiver.resetTimestamp();
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