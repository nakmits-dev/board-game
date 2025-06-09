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
  
  // 🔧 初期状態の重複受信を防ぐためのフラグ
  const initialStateProcessed = useRef(false);
  const processedInitialStateId = useRef<string | null>(null);

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

  // 🔧 初期状態受信処理（重複防止機能付き）
  useEffect(() => {
    if (state.roomId) {
      const initialStateCallback = (initialState: any) => {
        // 🔧 重複チェック: 同じ初期状態IDまたは既に処理済みの場合はスキップ
        const initialStateId = `${initialState.uploadedAt}_${initialState.uploadedBy}`;
        
        if (initialStateProcessed.current || processedInitialStateId.current === initialStateId) {
          console.log('🔧 初期盤面データ重複受信 - スキップ:', initialStateId);
          return;
        }

        console.log('📥 初期盤面データ受信:', initialStateId);
        
        // 🔧 処理済みフラグを設定
        initialStateProcessed.current = true;
        processedInitialStateId.current = initialStateId;
        
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
      // 🔧 ルームIDがクリアされた場合は初期状態フラグもリセット
      initialStateProcessed.current = false;
      processedInitialStateId.current = null;
    }
  }, [state.roomId, setOnInitialState, dispatch, state.isHost]);

  // 操作受信処理
  useEffect(() => {
    if (state.roomId) {
      const moveCallback = (allMoves: any[]) => {
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

  // 🔧 ゲーム終了時のクリーンアップ（初期状態フラグもリセット）
  useEffect(() => {
    if (!state.roomId && isInitialized.current) {
      console.log('🧹 ネットワークゲーム終了 - クリーンアップ');
      isInitialized.current = false;
      initialStateProcessed.current = false;
      processedInitialStateId.current = null;
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