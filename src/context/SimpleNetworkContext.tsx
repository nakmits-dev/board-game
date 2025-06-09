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

  // OperationReceiver の盤面更新コールバック設定
  useEffect(() => {
    operationReceiver.setOnBoardUpdateCallback((command) => {
      console.log('🧮 [SimpleNetworkContext] 盤面更新実行:', command);
      dispatch({ type: 'APPLY_BOARD_UPDATE', command });
    });
  }, [dispatch]);

  // アップロード関数を設定
  useEffect(() => {
    console.log('🔗 [SimpleNetworkContext] アップロード関数設定:', {
      roomId: state.roomId,
      sendMoveExists: !!sendMove
    });
    
    if (state.roomId) {
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

  // 操作受信処理
  useEffect(() => {
    if (state.roomId) {
      const moveCallback = (allMoves: any[]) => {
        console.log('📥 [SimpleNetworkContext] 操作受信:', allMoves.length);
        // OperationReceiver に処理を委譲
        operationReceiver.processReceivedOperations(allMoves);
      };

      setOnMove(moveCallback);
    } else {
      setOnMove(() => {});
    }
  }, [state.roomId, setOnMove]);

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