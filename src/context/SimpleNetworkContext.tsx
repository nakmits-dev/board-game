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
  const syncCallbackRef = useRef<((action: any) => void) | null>(null);
  const isInitialized = useRef(false);
  const initialGameState = useRef<any>(null);
  
  // 🔧 **修正: 最後に処理した棋譜のタイムスタンプを記録**
  const lastProcessedTimestamp = useRef<number>(0);

  // 🎯 自分のターンかどうかを判定
  const isMyTurn = () => {
    const myTeam = state.isHost ? 'player' : 'enemy';
    return state.currentTeam === myTeam;
  };

  // ネットワークゲーム開始時の監視開始
  useEffect(() => {
    if (state.isNetworkGame && state.roomId && isConnected) {
      if (isInitialized.current) {
        return;
      }

      console.log('🔗 ルーム監視開始:', state.roomId);
      startRoomMonitoring(state.roomId, state.isHost);
      isInitialized.current = true;
    }
  }, [state.isNetworkGame, state.roomId, state.isHost, isConnected, startRoomMonitoring]);

  // 🎯 **修正: 棋譜送信のみ（画面反映なし）**
  useEffect(() => {
    if (state.isNetworkGame && state.roomId) {
      const syncCallback = async (action: any) => {
        if (!state.roomId || !isConnected || !isMyTurn()) {
          return;
        }
        
        try {
          const move: Omit<GameMove, 'id' | 'timestamp'> = {
            turn: action.turn,
            team: action.team,
            action: action.type,
            from: { x: 0, y: 0 }
          };

          // アクションタイプに応じて座標情報を設定
          if (action.type === 'move') {
            const character = state.characters.find(c => c.id === action.characterId);
            if (character && action.position) {
              move.from = character.position;
              move.to = action.position;
            }
          } else if (action.type === 'attack') {
            const attacker = state.characters.find(c => c.id === action.characterId);
            const target = state.characters.find(c => c.id === action.targetId);
            if (attacker && target) {
              move.from = attacker.position;
              move.to = target.position;
            }
          } else if (action.type === 'skill') {
            const caster = state.characters.find(c => c.id === action.characterId);
            const target = state.characters.find(c => c.id === action.targetId);
            if (caster && target) {
              move.from = caster.position;
              move.to = target.position;
            }
          } else if (action.type === 'end_turn' || action.type === 'forced_end_turn' || action.type === 'surrender') {
            move.from = { x: 0, y: 0 };
          }

          console.log('📤 棋譜送信のみ（画面反映なし）:', move);
          await sendMove(state.roomId, move);
        } catch (error) {
          console.error('❌ 棋譜送信失敗:', error);
        }
      };
      
      dispatch({ type: 'SET_NETWORK_SYNC_CALLBACK', callback: syncCallback });
    } else {
      dispatch({ type: 'SET_NETWORK_SYNC_CALLBACK', callback: null });
    }
  }, [state.isNetworkGame, state.roomId, sendMove, dispatch, state.characters, isConnected, state.currentTeam, state.isHost]);

  // 🎯 初期状態受信処理
  useEffect(() => {
    if (state.isNetworkGame) {
      const initialStateCallback = (initialState: any) => {
        console.log('📥 初期状態受信:', initialState);
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

  // 🔧 **修正: 新しい棋譜のみを処理（タイムスタンプベース）**
  useEffect(() => {
    if (state.isNetworkGame && state.roomId) {
      const moveCallback = (allMoves: GameMove[]) => {
        // 🔧 **重要: 新しい棋譜のみをフィルタリング**
        const newMoves = allMoves.filter(move => move.timestamp > lastProcessedTimestamp.current);
        
        if (newMoves.length === 0) {
          return; // 新しい棋譜がない場合は何もしない
        }

        console.log('📋 新しい棋譜を検出:', {
          newMovesCount: newMoves.length,
          moves: newMoves.map(m => ({ 
            action: m.action, 
            team: m.team, 
            turn: m.turn,
            timestamp: m.timestamp
          }))
        });

        // 🔧 **重要: タイムスタンプ順でソート**
        newMoves.sort((a, b) => a.timestamp - b.timestamp);

        // 🔧 **新しい棋譜のみを順番に処理**
        newMoves.forEach((move, index) => {
          console.log(`📋 棋譜適用 ${index + 1}/${newMoves.length}:`, {
            action: move.action,
            team: move.team,
            turn: move.turn
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
          
          // 🔧 **重要: 最新のタイムスタンプを更新**
          lastProcessedTimestamp.current = Math.max(lastProcessedTimestamp.current, move.timestamp);
        });

        console.log('✅ 新しい棋譜処理完了:', {
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
      console.log('🧹 ネットワークゲーム終了 - クリーンアップ');
      isInitialized.current = false;
      initialGameState.current = null;
      lastProcessedTimestamp.current = 0; // タイムスタンプもリセット
    }
  }, [state.isNetworkGame]);

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