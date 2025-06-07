import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useSimpleGameSync } from '../hooks/useSimpleGameSync';
import { useGame } from './GameContext';

interface SimpleNetworkContextType {
  isConnected: boolean;
}

const SimpleNetworkContext = createContext<SimpleNetworkContextType | undefined>(undefined);

interface SimpleNetworkProviderProps {
  children: React.ReactNode;
}

export const SimpleNetworkProvider: React.FC<SimpleNetworkProviderProps> = ({ children }) => {
  const { gameState, sendMove, setOnMove, connectToRoom, isConnected } = useSimpleGameSync();
  const { state, dispatch } = useGame();
  const lastProcessedMoveId = useRef<string>('');
  const syncCallbackRef = useRef<((action: any) => void) | null>(null);
  const isInitialized = useRef(false);

  // ネットワークゲーム開始時にルーム接続を確立
  useEffect(() => {
    if (state.isNetworkGame && state.roomId && !isInitialized.current) {
      console.log('🔄 ネットワークゲーム初期化開始:', {
        gameRoomId: state.roomId,
        networkRoomId: gameState.roomId,
        isHost: state.isHost,
        isConnected
      });
      
      if (isConnected) {
        // ネットワーク層でルーム監視を開始
        console.log('🔗 ルーム接続を確立:', state.roomId);
        connectToRoom(state.roomId, state.isHost, state.isHost ? 'ホスト' : 'ゲスト');
        isInitialized.current = true;
      } else {
        console.log('⏳ Firebase接続待機中...');
      }
    }
  }, [state.isNetworkGame, state.roomId, state.isHost, gameState.roomId, connectToRoom, isConnected]);

  // Firebase接続が確立された時の再初期化
  useEffect(() => {
    if (state.isNetworkGame && state.roomId && isConnected && !gameState.roomId) {
      console.log('🔄 Firebase接続確立後の再初期化:', {
        gameRoomId: state.roomId,
        isHost: state.isHost
      });
      
      connectToRoom(state.roomId, state.isHost, state.isHost ? 'ホスト' : 'ゲスト');
      isInitialized.current = true;
    }
  }, [isConnected, state.isNetworkGame, state.roomId, state.isHost, gameState.roomId, connectToRoom]);

  // ネットワーク同期コールバックを設定
  useEffect(() => {
    if (state.isNetworkGame && state.roomId && gameState.roomId) {
      console.log('📡 ネットワーク同期コールバック設定:', { 
        roomId: state.roomId, 
        isHost: state.isHost,
        networkRoomId: gameState.roomId
      });
      
      const syncCallback = async (action: any) => {
        console.log('📤 アクション送信:', action);
        console.log('📤 送信先ルーム:', gameState.roomId);
        
        if (!gameState.roomId) {
          console.error('❌ ルームIDが設定されていません:', gameState.roomId);
          return;
        }
        
        try {
          // ゲームアクションを棋譜形式に変換
          const move = {
            turn: action.turn,
            action: action.type,
            characterId: action.characterId || '',
            from: action.characterId ? state.characters.find(c => c.id === action.characterId)?.position : undefined,
            to: action.position,
            target: action.targetId,
            skill: action.skillId
          };

          console.log('📤 送信する手:', move);
          await sendMove(move);
          console.log('✅ 手の送信成功');
        } catch (error) {
          console.error('❌ アクション送信失敗:', error);
        }
      };
      
      syncCallbackRef.current = syncCallback;
      dispatch({ type: 'SET_NETWORK_SYNC_CALLBACK', callback: syncCallback });
    } else if (!state.isNetworkGame) {
      console.log('🔌 ネットワーク同期コールバック解除');
      syncCallbackRef.current = null;
      dispatch({ type: 'SET_NETWORK_SYNC_CALLBACK', callback: null });
    }
  }, [state.isNetworkGame, state.roomId, gameState.roomId, sendMove, dispatch, state.characters]);

  // 手の受信コールバックを設定
  useEffect(() => {
    if (state.isNetworkGame && gameState.roomId) {
      console.log('📥 手の受信コールバック設定');
      
      const moveCallback = (move: any) => {
        console.log('📥 手を受信:', move);
        
        // 既に処理済みの手はスキップ
        if (move.id === lastProcessedMoveId.current) {
          console.log('⏭️ 既に処理済みの手をスキップ:', move.id);
          return;
        }

        // 相手の手を同期
        const networkAction = {
          turn: move.turn,
          team: state.isHost ? 'enemy' : 'player',
          type: move.action,
          characterId: move.characterId || '',
          targetId: move.target,
          position: move.to,
          skillId: move.skill
        };

        console.log('🔄 ネットワークアクション同期:', networkAction);
        dispatch({ type: 'SYNC_NETWORK_ACTION', action: networkAction });
        lastProcessedMoveId.current = move.id;
      };

      setOnMove(moveCallback);
    } else {
      console.log('🔌 手の受信コールバック解除');
      setOnMove(() => {});
    }
  }, [state.isNetworkGame, state.isHost, setOnMove, dispatch, gameState.roomId]);

  // ゲーム状態とネットワーク状態の同期を改善
  useEffect(() => {
    if (state.isNetworkGame) {
      console.log('🔍 ゲーム状態とネットワーク状態の同期チェック');
      console.log('🎮 ゲーム状態:', {
        isNetworkGame: state.isNetworkGame,
        roomId: state.roomId,
        isHost: state.isHost,
        gamePhase: state.gamePhase,
        currentTeam: state.currentTeam
      });
      console.log('🌐 ネットワーク状態:', {
        roomId: gameState.roomId,
        isHost: gameState.isHost,
        status: gameState.status,
        connectionStatus: gameState.connectionStatus,
        hasOpponent: !!gameState.opponent,
        opponentName: gameState.opponent?.name,
        opponentConnected: gameState.opponent?.connected
      });

      // ネットワークゲーム中にルーム情報が不整合の場合は修正
      if (state.roomId && gameState.roomId !== state.roomId && isConnected) {
        console.warn('⚠️ ルームID不整合を検出:', { 
          gameStateRoomId: state.roomId, 
          networkStateRoomId: gameState.roomId 
        });
        // ネットワーク層でルーム接続を再確立
        console.log('🔄 ルーム接続を再確立します');
        connectToRoom(state.roomId, state.isHost, state.isHost ? 'ホスト' : 'ゲスト');
      }

      // ネットワーク状態が'playing'でゲーム状態がネットワークゲームでない場合
      if (gameState.status === 'playing' && !state.isNetworkGame && gameState.roomId) {
        console.log('🔄 ネットワークゲーム状態の復元が必要');
        // この場合は既にゲームが開始されているので、状態を復元する必要がある
      }
    }
  }, [state.isNetworkGame, state.roomId, state.isHost, state.gamePhase, state.currentTeam, gameState, connectToRoom, isConnected]);

  // ゲーム終了時のクリーンアップ
  useEffect(() => {
    if (!state.isNetworkGame && isInitialized.current) {
      console.log('🧹 ネットワークゲーム終了 - 初期化フラグをリセット');
      isInitialized.current = false;
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