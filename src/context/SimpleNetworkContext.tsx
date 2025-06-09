import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useSimpleGameSync } from '../hooks/useSimpleGameSync';
import { useGame } from './GameContext';

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
  const lastProcessedMoveId = useRef<string | null>(null);

  // 🔧 **修正: アップロード関数を設定**
  useEffect(() => {
    console.log('🔗 [SimpleNetworkContext] アップロード関数設定:', {
      roomId: state.roomId,
      sendMoveExists: !!sendMove
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

  // 🔧 **修正: シンプルな最新手反映処理**
  useEffect(() => {
    if (state.roomId) {
      const moveCallback = (allMoves: any[]) => {
        if (allMoves.length === 0) {
          console.log('📥 [SimpleNetworkContext] 棋譜なし');
          return;
        }

        // 🔧 **重要: 最新の手のみを取得**
        const latestMove = allMoves[allMoves.length - 1];
        
        // 🔧 **重要: 既に処理済みの手はスキップ**
        if (lastProcessedMoveId.current === latestMove.id) {
          console.log('📥 [SimpleNetworkContext] 既に処理済み - スキップ:', latestMove.id);
          return;
        }

        console.log('📥 [SimpleNetworkContext] 最新の手を反映:', {
          id: latestMove.id,
          action: latestMove.action,
          team: latestMove.team,
          turn: latestMove.turn,
          timestamp: latestMove.timestamp
        });

        // 🔧 **重要: 最新の手を現在の盤面に反映**
        const command = {
          type: latestMove.action,
          team: latestMove.team,
          turn: latestMove.turn,
          from: latestMove.from,
          to: latestMove.to,
          skillId: latestMove.action === 'skill' ? 'rage-strike' : undefined,
          timestamp: latestMove.timestamp
        };

        dispatch({ type: 'APPLY_BOARD_UPDATE', command });
        
        // 🔧 **重要: 処理済みとしてマーク**
        lastProcessedMoveId.current = latestMove.id;
        
        console.log('✅ [SimpleNetworkContext] 最新手反映完了:', latestMove.id);
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
      lastProcessedMoveId.current = null;
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