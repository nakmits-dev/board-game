import { useState, useEffect, useCallback, useRef } from 'react';
import { ref, push, onValue, set, update, remove, serverTimestamp, onDisconnect } from 'firebase/database';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { database, auth } from '../firebase/config';
import { GameRoom, GameAction, Player, NetworkGameState } from '../types/networkTypes';
import { MonsterType } from '../types/gameTypes';

export const useFirebaseGame = () => {
  const [networkState, setNetworkState] = useState<NetworkGameState>({
    isOnline: false,
    roomId: null,
    playerId: null,
    isHost: false,
    opponent: null,
    connectionStatus: 'disconnected',
    gameActions: [],
    lastSyncedTurn: 0,
  });

  const [user, setUser] = useState<any>(null);
  const gameStartCallbackRef = useRef<((roomId: string, isHost: boolean) => void) | null>(null);
  const actionCallbackRef = useRef<((action: GameAction) => void) | null>(null);
  const roomRef = useRef<any>(null);
  const actionsRef = useRef<any>(null);
  const unsubscribeRoom = useRef<(() => void) | null>(null);
  const unsubscribeActions = useRef<(() => void) | null>(null);
  const gameStartedRef = useRef(false);
  
  // Add refs to track current values for sendAction
  const networkStateRef = useRef(networkState);
  const userRef = useRef(user);

  // Keep refs updated with current values
  useEffect(() => {
    networkStateRef.current = networkState;
  }, [networkState]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Firebase認証
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('Firebase認証成功:', user.uid);
        setUser(user);
        setNetworkState(prev => ({
          ...prev,
          playerId: user.uid,
          connectionStatus: 'connected'
        }));
      } else {
        console.log('Firebase匿名ログイン開始');
        signInAnonymously(auth).catch(console.error);
      }
    });

    return unsubscribe;
  }, []);

  // ゲーム開始コールバックを設定
  const setOnGameStart = useCallback((callback: (roomId: string, isHost: boolean) => void) => {
    console.log('ゲーム開始コールバックを設定:', !!callback);
    gameStartCallbackRef.current = callback;
  }, []);

  // アクションコールバックを設定
  const setOnActionReceived = useCallback((callback: (action: GameAction) => void) => {
    console.log('アクション受信コールバックを設定:', !!callback);
    actionCallbackRef.current = callback;
  }, []);

  // ルーム作成
  const createRoom = useCallback(async (
    playerName: string,
    deck: { master: string; monsters: MonsterType[] }
  ): Promise<string> => {
    if (!user) throw new Error('ユーザーが認証されていません');

    console.log('ルーム作成開始:', { playerName, deck });

    const roomsRef = ref(database, 'rooms');
    const newRoomRef = push(roomsRef);
    const roomId = newRoomRef.key!;

    const roomData: GameRoom = {
      id: roomId,
      status: 'waiting',
      players: {
        [user.uid]: {
          id: user.uid,
          name: playerName,
          team: 'player',
          deck,
          ready: true,
          connected: true,
          lastSeen: Date.now(),
        }
      },
      gameState: {
        currentTurn: 0,
        currentTeam: 'player',
        startTime: 0,
      },
      actions: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await set(newRoomRef, roomData);
    console.log('ルーム作成完了:', roomId);

    setNetworkState(prev => ({
      ...prev,
      isOnline: true,
      roomId,
      isHost: true,
      connectionStatus: 'connected'
    }));

    gameStartedRef.current = false;
    return roomId;
  }, [user]);

  // ルーム参加
  const joinRoom = useCallback(async (
    roomId: string,
    playerName: string,
    deck: { master: string; monsters: MonsterType[] }
  ): Promise<void> => {
    if (!user) throw new Error('ユーザーが認証されていません');

    console.log('ルーム参加開始:', { roomId, playerName, deck });

    const roomRef = ref(database, `rooms/${roomId}`);
    
    return new Promise((resolve, reject) => {
      onValue(roomRef, async (snapshot) => {
        const roomData = snapshot.val() as GameRoom;
        
        if (!roomData) {
          reject(new Error('ルームが見つかりません'));
          return;
        }

        if (roomData.status !== 'waiting') {
          reject(new Error('ルームは既に開始されています'));
          return;
        }

        const playerCount = Object.keys(roomData.players).length;
        if (playerCount >= 2) {
          reject(new Error('ルームは満員です'));
          return;
        }

        try {
          const playerData = {
            id: user.uid,
            name: playerName,
            team: 'enemy' as const,
            deck,
            ready: true,
            connected: true,
            lastSeen: Date.now(),
          };

          await update(ref(database, `rooms/${roomId}/players/${user.uid}`), playerData);
          await update(ref(database, `rooms/${roomId}`), { updatedAt: Date.now() });

          console.log('ルーム参加完了:', roomId);

          setNetworkState(prev => ({
            ...prev,
            isOnline: true,
            roomId,
            isHost: false,
            connectionStatus: 'connected'
          }));

          gameStartedRef.current = false;
          resolve();
        } catch (error) {
          reject(error);
        }
      }, { onlyOnce: true });
    });
  }, [user]);

  // 準備状態を更新
  const updateReadyStatus = useCallback(async (ready: boolean) => {
    if (!networkState.roomId || !user) return;

    try {
      const playerRef = ref(database, `rooms/${networkState.roomId}/players/${user.uid}`);
      await update(playerRef, { 
        ready,
        lastSeen: Date.now()
      });
      
      await update(ref(database, `rooms/${networkState.roomId}`), { 
        updatedAt: Date.now() 
      });
    } catch (error) {
      console.error('準備状態の更新に失敗:', error);
    }
  }, [networkState.roomId, user]);

  // ゲーム開始
  const startGame = useCallback(async () => {
    if (!networkState.roomId || !networkState.isHost) return;

    try {
      console.log('ホストがゲーム開始処理を実行');
      const updates = {
        [`rooms/${networkState.roomId}/status`]: 'playing',
        [`rooms/${networkState.roomId}/gameState/startTime`]: Date.now(),
        [`rooms/${networkState.roomId}/updatedAt`]: Date.now(),
      };

      await update(ref(database), updates);
      console.log('Firebaseにゲーム開始状態を送信完了');
    } catch (error) {
      console.error('ゲーム開始に失敗:', error);
      throw error;
    }
  }, [networkState.roomId, networkState.isHost]);

  // アクション送信 - より堅牢なエラーハンドリング
  const sendAction = useCallback(async (action: Omit<GameAction, 'id' | 'timestamp' | 'playerId'>) => {
    const currentNetworkState = networkStateRef.current;
    const currentUser = userRef.current;
    
    console.log('sendAction呼び出し:', {
      actionType: action.type,
      roomId: currentNetworkState.roomId,
      userId: currentUser?.uid,
      isOnline: currentNetworkState.isOnline,
      connectionStatus: currentNetworkState.connectionStatus,
      isHost: currentNetworkState.isHost
    });
    
    // より詳細なエラーチェック
    if (!currentNetworkState.roomId) {
      console.error('アクション送信失敗: ルームIDが未設定', {
        networkState: currentNetworkState,
        user: currentUser
      });
      throw new Error('ルームIDが設定されていません');
    }
    
    if (!currentUser?.uid) {
      console.error('アクション送信失敗: ユーザーが未設定', {
        networkState: currentNetworkState,
        user: currentUser
      });
      throw new Error('ユーザーが認証されていません');
    }

    // オンライン状態のチェック
    if (!currentNetworkState.isOnline) {
      console.error('アクション送信失敗: オフライン状態', {
        networkState: currentNetworkState
      });
      throw new Error('オフライン状態です');
    }

    try {
      const actionData: GameAction = {
        ...action,
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        playerId: currentUser.uid,
      };

      console.log('アクション送信開始:', actionData);

      const actionsRef = ref(database, `rooms/${currentNetworkState.roomId}/actions`);
      await push(actionsRef, actionData);
      
      console.log('アクション送信完了');
    } catch (error) {
      console.error('アクション送信に失敗:', error);
      throw error;
    }
  }, []); // 依存配列を空にして、refを通じて最新の値にアクセス

  // ルーム監視のクリーンアップ
  const cleanupRoomSubscription = useCallback(() => {
    if (unsubscribeRoom.current) {
      unsubscribeRoom.current();
      unsubscribeRoom.current = null;
    }
  }, []);

  // アクション監視のクリーンアップ
  const cleanupActionsSubscription = useCallback(() => {
    if (unsubscribeActions.current) {
      unsubscribeActions.current();
      unsubscribeActions.current = null;
    }
  }, []);

  // ルーム監視
  useEffect(() => {
    if (!networkState.roomId || !user) {
      cleanupRoomSubscription();
      return;
    }

    cleanupRoomSubscription();

    roomRef.current = ref(database, `rooms/${networkState.roomId}`);
    
    const unsubscribe = onValue(roomRef.current, (snapshot) => {
      const roomData = snapshot.val() as GameRoom;
      
      if (!roomData) {
        console.log('ルームデータが見つかりません');
        setNetworkState(prev => ({
          ...prev,
          isOnline: false,
          roomId: null,
          connectionStatus: 'error',
          opponent: null,
        }));
        return;
      }

      console.log('ルーム状態更新:', {
        status: roomData.status,
        isHost: networkState.isHost,
        gameStarted: gameStartedRef.current,
        hasCallback: !!gameStartCallbackRef.current
      });

      // 対戦相手の情報を更新
      const players = Object.values(roomData.players);
      const opponent = players.find(p => p.id !== user.uid);

      setNetworkState(prev => ({
        ...prev,
        opponent: opponent ? {
          id: opponent.id,
          name: opponent.name,
          isHost: opponent.team === 'player',
          team: opponent.team,
          deck: opponent.deck,
          ready: opponent.ready,
          connected: opponent.connected,
        } : null,
      }));

      // ゲーム開始の検出
      if (roomData.status === 'playing' && !gameStartedRef.current && gameStartCallbackRef.current) {
        console.log('ゲーム開始を検出 - コールバック実行');
        
        gameStartedRef.current = true;
        
        setTimeout(() => {
          if (gameStartCallbackRef.current) {
            console.log('ゲーム開始コールバックを実行');
            gameStartCallbackRef.current(networkState.roomId!, networkState.isHost);
          }
        }, 100);
      }
    }, (error) => {
      console.error('ルーム監視エラー:', error);
      setNetworkState(prev => ({
        ...prev,
        connectionStatus: 'error'
      }));
    });

    unsubscribeRoom.current = unsubscribe;

    return () => {
      cleanupRoomSubscription();
    };
  }, [networkState.roomId, user, cleanupRoomSubscription, networkState.isHost]);

  // アクション監視
  useEffect(() => {
    if (!networkState.roomId) {
      cleanupActionsSubscription();
      return;
    }

    cleanupActionsSubscription();

    actionsRef.current = ref(database, `rooms/${networkState.roomId}/actions`);
    
    console.log('アクション監視開始:', networkState.roomId);
    
    const unsubscribe = onValue(actionsRef.current, (snapshot) => {
      const actionsData = snapshot.val();
      
      console.log('アクションデータ受信:', actionsData);
      
      if (actionsData) {
        const actions = Object.values(actionsData) as GameAction[];
        const sortedActions = actions.sort((a, b) => a.timestamp - b.timestamp);
        
        console.log('ソート済みアクション:', sortedActions.length, '件');
        
        setNetworkState(prev => ({
          ...prev,
          gameActions: sortedActions,
        }));

        // 最新のアクションをコールバックで通知
        if (sortedActions.length > 0 && actionCallbackRef.current) {
          const latestAction = sortedActions[sortedActions.length - 1];
          console.log('最新アクションをコールバックで通知:', latestAction);
          actionCallbackRef.current(latestAction);
        }
      } else {
        console.log('アクションデータなし');
        setNetworkState(prev => ({
          ...prev,
          gameActions: [],
        }));
      }
    }, (error) => {
      console.error('アクション監視エラー:', error);
    });

    unsubscribeActions.current = unsubscribe;

    return () => {
      cleanupActionsSubscription();
    };
  }, [networkState.roomId, cleanupActionsSubscription]);

  // 接続状態管理
  useEffect(() => {
    if (!networkState.roomId || !user) return;

    const playerRef = ref(database, `rooms/${networkState.roomId}/players/${user.uid}`);
    
    update(playerRef, {
      connected: true,
      lastSeen: Date.now(),
    }).catch(console.error);

    onDisconnect(playerRef).update({
      connected: false,
      lastSeen: Date.now(),
    }).catch(console.error);

    const interval = setInterval(() => {
      update(playerRef, { lastSeen: Date.now() }).catch(console.error);
    }, 30000);

    return () => clearInterval(interval);
  }, [networkState.roomId, user]);

  // ルーム退出
  const leaveRoom = useCallback(async () => {
    if (!networkState.roomId || !user) return;

    try {
      cleanupRoomSubscription();
      cleanupActionsSubscription();

      const playerRef = ref(database, `rooms/${networkState.roomId}/players/${user.uid}`);
      await remove(playerRef);

      setNetworkState({
        isOnline: false,
        roomId: null,
        playerId: user?.uid || null,
        isHost: false,
        opponent: null,
        connectionStatus: user ? 'connected' : 'disconnected',
        gameActions: [],
        lastSyncedTurn: 0,
      });

      gameStartCallbackRef.current = null;
      actionCallbackRef.current = null;
      gameStartedRef.current = false;
    } catch (error) {
      console.error('ルーム退出に失敗:', error);
    }
  }, [networkState.roomId, user, cleanupRoomSubscription, cleanupActionsSubscription]);

  // コンポーネントのアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      cleanupRoomSubscription();
      cleanupActionsSubscription();
    };
  }, [cleanupRoomSubscription, cleanupActionsSubscription]);

  return {
    networkState,
    createRoom,
    joinRoom,
    updateReadyStatus,
    startGame,
    sendAction,
    leaveRoom,
    setOnGameStart,
    setOnActionReceived,
    isConnected: !!user && networkState.connectionStatus === 'connected',
  };
};