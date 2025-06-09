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
    console.log('🔧 [SimpleNetworkContext] OperationReceiver コールバック設定');
    operationReceiver.setOnBoardUpdateCallback((command) => {
      console.log('📤 [SimpleNetworkContext] 盤面更新ディスパッチ:', {
        commandType: command.type,
        team: command.team,
        turn: command.turn
      });
      dispatch({ type: 'APPLY_BOARD_UPDATE', command });
    });
  }, [dispatch]);

  // アップロード関数を設定
  useEffect(() => {
    console.log('🔧 [SimpleNetworkContext] アップロード関数設定:', {
      hasRoomId: !!state.roomId,
      hasSendMove: !!sendMove
    });

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
        console.log('🔧 [SimpleNetworkContext] 既に初期化済み - スキップ');
        return;
      }

      console.log('🔗 [SimpleNetworkContext] ルーム監視開始:', {
        roomId: state.roomId,
        isHost: state.isHost,
        isConnected
      });
      
      startRoomMonitoring(state.roomId, state.isHost);
      isInitialized.current = true;
    }
  }, [state.roomId, state.isHost, isConnected, startRoomMonitoring]);

  // 初期状態受信処理（修正）
  useEffect(() => {
    if (state.roomId) {
      const initialStateCallback = (initialState: any) => {
        console.log('📥 [SimpleNetworkContext] 初期状態受信:', {
          hasTimeLimit: initialState.hasTimeLimit,
          timeLimitSeconds: initialState.timeLimitSeconds,
          startingPlayer: initialState.startingPlayer,
          hostDeck: initialState.hostDeck,
          guestDeck: initialState.guestDeck,
          alreadyInitialized: !!initialGameState.current
        });

        // 重複初期化を防ぐ
        if (initialGameState.current) {
          console.log('🔧 [SimpleNetworkContext] 既に初期化済み - 初期状態受信スキップ');
          return;
        }
        
        initialGameState.current = initialState;
        
        console.log('🎮 [SimpleNetworkContext] ゲーム開始ディスパッチ実行');
        dispatch({
          type: 'START_NETWORK_GAME',
          roomId: state.roomId!,
          isHost: state.isHost,
          hasTimeLimit: initialState.hasTimeLimit,
          timeLimitSeconds: initialState.timeLimitSeconds,
          startingPlayer: initialState.startingPlayer, // 🔧 先攻プレイヤー情報を追加
          hostDeck: initialState.hostDeck,
          guestDeck: initialState.guestDeck
        });

        // タイマーを正しく設定
        const timeLimit = initialState.timeLimitSeconds || 30;
        console.log('⏰ [SimpleNetworkContext] タイマー設定:', timeLimit);
        setCurrentTimeLeft(timeLimit);
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
        console.log('📥 [SimpleNetworkContext] 操作受信:', {
          totalMoves: allMoves.length,
          roomId: state.roomId
        });

        // OperationReceiver に処理を委譲
        operationReceiver.processReceivedOperations(allMoves);
      };

      setOnMove(moveCallback);
    } else {
      setOnMove(() => {});
    }
  }, [state.roomId, setOnMove]);

  // ターン変更時にタイマーをリセット（修正）
  useEffect(() => {
    if (state.gamePhase === 'action' && state.timeLimitSeconds > 0) {
      console.log('⏰ [SimpleNetworkContext] ターン変更によるタイマーリセット:', {
        currentTeam: state.currentTeam,
        timeLimitSeconds: state.timeLimitSeconds
      });
      setCurrentTimeLeft(state.timeLimitSeconds);
    }
  }, [state.currentTeam, state.gamePhase, state.timeLimitSeconds]);

  // ゲーム終了時のクリーンアップ
  useEffect(() => {
    if (!state.roomId && isInitialized.current) {
      console.log('🧹 [SimpleNetworkContext] ゲーム終了 - クリーンアップ実行');
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