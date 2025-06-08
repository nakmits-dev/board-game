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
  const { gameState, sendMove, uploadInitialState, setOnMove, setOnGameStart, setOnInitialState, connectToRoom, isConnected } = useSimpleGameSync();
  const { state, dispatch } = useGame();
  const lastProcessedMoveId = useRef<string>('');
  const syncCallbackRef = useRef<((action: any) => void) | null>(null);
  const isInitialized = useRef(false);
  const previousNetworkRoomId = useRef<string | null>(null);
  const initialStateUploaded = useRef(false);

  // ネットワークルームIDの変化を監視してログ出力
  useEffect(() => {
    const currentNetworkRoomId = gameState.roomId;
    const previousRoomId = previousNetworkRoomId.current;

    if (currentNetworkRoomId !== previousRoomId) {
      if (currentNetworkRoomId && !previousRoomId) {
        // ネットワークルームIDが設定された
        console.log('🔗 ネットワークルームID設定:', {
          networkRoomId: currentNetworkRoomId,
          gameRoomId: state.roomId,
          isHost: state.isHost,
          timestamp: new Date().toISOString()
        });
      } else if (!currentNetworkRoomId && previousRoomId) {
        // ネットワークルームIDがクリアされた（接続切断）
        console.log('🔌 ネットワークルームID切断:', {
          previousNetworkRoomId: previousRoomId,
          gameRoomId: state.roomId,
          isHost: state.isHost,
          timestamp: new Date().toISOString()
        });
      }

      // 前回の値を更新
      previousNetworkRoomId.current = currentNetworkRoomId;
    }
  }, [gameState.roomId, state.roomId, state.isHost]);

  // 🔥 修正: ネットワークゲーム開始時の同期を強化
  useEffect(() => {
    if (state.isNetworkGame && state.roomId && isConnected) {
      // 既に初期化済みで、ルームIDが一致している場合はスキップ
      if (isInitialized.current && gameState.roomId === state.roomId) {
        console.log('✅ 既に同期済み:', state.roomId);
        return;
      }

      console.log('🔗 ルーム接続を確立:', {
        gameRoomId: state.roomId,
        networkRoomId: gameState.roomId,
        isHost: state.isHost,
        isInitialized: isInitialized.current
      });

      // ネットワーク層でルーム監視を開始
      connectToRoom(state.roomId, state.isHost, state.isHost ? 'ホスト' : 'ゲスト');
      isInitialized.current = true;
    }
  }, [state.isNetworkGame, state.roomId, state.isHost, isConnected, connectToRoom, gameState.roomId]);

  // 🆕 初期盤面のアップロード（ホストのみ、ゲーム開始時に1回だけ）
  useEffect(() => {
    if (state.isNetworkGame && state.isHost && state.gamePhase === 'action' && 
        gameState.roomId && !initialStateUploaded.current && isConnected) {
      
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
            monsterType: char.monsterType
          }),
          ...(char.type === 'master' && {
            masterType: char.masterType
          })
        })),
        playerCrystals: state.playerCrystals,
        enemyCrystals: state.enemyCrystals,
        currentTeam: state.currentTeam,
        currentTurn: state.currentTurn,
        gamePhase: state.gamePhase
      };

      uploadInitialState(initialState)
        .then(() => {
          console.log('✅ 初期盤面アップロード完了');
          initialStateUploaded.current = true;
        })
        .catch((error) => {
          console.error('❌ 初期盤面アップロード失敗:', error);
        });
    }
  }, [state.isNetworkGame, state.isHost, state.gamePhase, gameState.roomId, 
      state.characters, state.playerCrystals, state.enemyCrystals, 
      state.currentTeam, state.currentTurn, uploadInitialState, isConnected]);

  // 🆕 初期盤面の受信（ゲストのみ）
  useEffect(() => {
    if (state.isNetworkGame && !state.isHost) {
      const handleInitialState = (initialState: any) => {
        console.log('📥 初期盤面データを受信:', initialState);
        
        // ゲスト側でゲーム状態を初期盤面に同期
        // 注意: これは実装によって調整が必要
        // 現在のGameContextでは直接的な状態同期メソッドがないため、
        // 必要に応じて新しいアクションタイプを追加する必要があります
        
        console.log('🔄 ゲスト側での初期盤面同期は今後実装予定');
      };

      setOnInitialState(handleInitialState);
    }
  }, [state.isNetworkGame, state.isHost, setOnInitialState]);

  // 🔥 修正: ルームデータの変化を監視して状態を同期
  useEffect(() => {
    if (state.isNetworkGame && gameState.roomId) {
      console.log('📊 ルームデータ同期チェック:', {
        gameRoomId: state.roomId,
        networkRoomId: gameState.roomId,
        networkStatus: gameState.status,
        opponent: gameState.opponent?.name,
        opponentConnected: gameState.opponent?.connected,
        hasInitialState: !!gameState.initialState
      });

      // 相手の接続状態をリアルタイムで確認
      if (gameState.opponent) {
        console.log('👥 相手の状態:', {
          name: gameState.opponent.name,
          ready: gameState.opponent.ready,
          connected: gameState.opponent.connected,
          isHost: state.isHost
        });
      } else {
        console.log('❌ 相手が見つかりません');
      }
    }
  }, [gameState.roomId, gameState.status, gameState.opponent, gameState.initialState, 
      state.isNetworkGame, state.roomId, state.isHost]);

  // ネットワーク同期コールバックを設定（改善版）
  useEffect(() => {
    if (state.isNetworkGame && state.roomId) {
      const syncCallback = async (action: any) => {
        // 🔥 修正: ルームIDの確認を強化
        const currentRoomId = gameState.roomId || state.roomId;
        if (!currentRoomId) {
          console.error('❌ ルームIDが設定されていません:', { 
            gameStateRoomId: state.roomId,
            networkStateRoomId: gameState.roomId 
          });
          return;
        }
        
        if (!isConnected) {
          console.error('❌ Firebase接続が確立されていません');
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

          console.log('📤 アクション送信:', move);
          await sendMove(move);
        } catch (error) {
          console.error('❌ アクション送信失敗:', error);
        }
      };
      
      syncCallbackRef.current = syncCallback;
      dispatch({ type: 'SET_NETWORK_SYNC_CALLBACK', callback: syncCallback });
    } else if (!state.isNetworkGame) {
      syncCallbackRef.current = null;
      dispatch({ type: 'SET_NETWORK_SYNC_CALLBACK', callback: null });
    }
  }, [state.isNetworkGame, state.roomId, gameState.roomId, sendMove, dispatch, state.characters, isConnected]);

  // 手の受信コールバックを設定
  useEffect(() => {
    if (state.isNetworkGame && (gameState.roomId || state.roomId)) {
      const moveCallback = (move: any) => {
        // 既に処理済みの手はスキップ
        if (move.id === lastProcessedMoveId.current) {
          return;
        }

        console.log('📥 相手の手を受信:', move);

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

        dispatch({ type: 'SYNC_NETWORK_ACTION', action: networkAction });
        lastProcessedMoveId.current = move.id;
      };

      setOnMove(moveCallback);
    } else {
      setOnMove(() => {});
    }
  }, [state.isNetworkGame, state.isHost, setOnMove, dispatch, gameState.roomId, state.roomId]);

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