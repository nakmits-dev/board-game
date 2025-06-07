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
  const roomRef = useRef<any>(null);
  const actionsRef = useRef<any>(null);

  // Firebase認証
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        setNetworkState(prev => ({
          ...prev,
          playerId: user.uid,
          connectionStatus: 'connected'
        }));
      } else {
        // 匿名ログイン
        signInAnonymously(auth).catch(console.error);
      }
    });

    return unsubscribe;
  }, []);

  // ルーム作成
  const createRoom = useCallback(async (
    playerName: string,
    deck: { master: string; monsters: MonsterType[] }
  ): Promise<string> => {
    if (!user) throw new Error('ユーザーが認証されていません');

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

    setNetworkState(prev => ({
      ...prev,
      isOnline: true,
      roomId,
      isHost: true,
      connectionStatus: 'connected'
    }));

    return roomId;
  }, [user]);

  // ルーム参加
  const joinRoom = useCallback(async (
    roomId: string,
    playerName: string,
    deck: { master: string; monsters: MonsterType[] }
  ): Promise<void> => {
    if (!user) throw new Error('ユーザーが認証されていません');

    const roomRef = ref(database, `rooms/${roomId}`);
    
    // ルームの存在確認
    return new Promise((resolve, reject) => {
      onValue(roomRef, (snapshot) => {
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

        // プレイヤーを追加
        const playerData = {
          id: user.uid,
          name: playerName,
          team: 'enemy' as const,
          deck,
          ready: true,
          connected: true,
          lastSeen: Date.now(),
        };

        update(ref(database, `rooms/${roomId}/players/${user.uid}`), playerData);

        setNetworkState(prev => ({
          ...prev,
          isOnline: true,
          roomId,
          isHost: false,
          connectionStatus: 'connected'
        }));

        resolve();
      }, { onlyOnce: true });
    });
  }, [user]);

  // ゲーム開始
  const startGame = useCallback(async () => {
    if (!networkState.roomId || !networkState.isHost) return;

    const updates = {
      [`rooms/${networkState.roomId}/status`]: 'playing',
      [`rooms/${networkState.roomId}/gameState/startTime`]: Date.now(),
      [`rooms/${networkState.roomId}/updatedAt`]: Date.now(),
    };

    await update(ref(database), updates);
  }, [networkState.roomId, networkState.isHost]);

  // アクション送信
  const sendAction = useCallback(async (action: Omit<GameAction, 'id' | 'timestamp' | 'playerId'>) => {
    if (!networkState.roomId || !user) return;

    const actionData: GameAction = {
      ...action,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      playerId: user.uid,
    };

    const actionsRef = ref(database, `rooms/${networkState.roomId}/actions`);
    await push(actionsRef, actionData);
  }, [networkState.roomId, user]);

  // ルーム監視
  useEffect(() => {
    if (!networkState.roomId) return;

    roomRef.current = ref(database, `rooms/${networkState.roomId}`);
    
    const unsubscribe = onValue(roomRef.current, (snapshot) => {
      const roomData = snapshot.val() as GameRoom;
      
      if (!roomData) {
        setNetworkState(prev => ({
          ...prev,
          isOnline: false,
          roomId: null,
          connectionStatus: 'error'
        }));
        return;
      }

      // 対戦相手の情報を更新
      const players = Object.values(roomData.players);
      const opponent = players.find(p => p.id !== user?.uid);

      setNetworkState(prev => ({
        ...prev,
        opponent: opponent || null,
      }));
    });

    return unsubscribe;
  }, [networkState.roomId, user]);

  // アクション監視
  useEffect(() => {
    if (!networkState.roomId) return;

    actionsRef.current = ref(database, `rooms/${networkState.roomId}/actions`);
    
    const unsubscribe = onValue(actionsRef.current, (snapshot) => {
      const actionsData = snapshot.val();
      
      if (actionsData) {
        const actions = Object.values(actionsData) as GameAction[];
        const sortedActions = actions.sort((a, b) => a.timestamp - b.timestamp);
        
        setNetworkState(prev => ({
          ...prev,
          gameActions: sortedActions,
        }));
      }
    });

    return unsubscribe;
  }, [networkState.roomId]);

  // 接続状態管理
  useEffect(() => {
    if (!networkState.roomId || !user) return;

    const playerRef = ref(database, `rooms/${networkState.roomId}/players/${user.uid}`);
    
    // 接続状態を更新
    update(playerRef, {
      connected: true,
      lastSeen: Date.now(),
    });

    // 切断時の処理
    onDisconnect(playerRef).update({
      connected: false,
      lastSeen: Date.now(),
    });

    // 定期的にlastSeenを更新
    const interval = setInterval(() => {
      update(playerRef, { lastSeen: Date.now() });
    }, 30000); // 30秒ごと

    return () => clearInterval(interval);
  }, [networkState.roomId, user]);

  // ルーム退出
  const leaveRoom = useCallback(async () => {
    if (!networkState.roomId || !user) return;

    const playerRef = ref(database, `rooms/${networkState.roomId}/players/${user.uid}`);
    await remove(playerRef);

    setNetworkState({
      isOnline: false,
      roomId: null,
      playerId: null,
      isHost: false,
      opponent: null,
      connectionStatus: 'disconnected',
      gameActions: [],
      lastSyncedTurn: 0,
    });
  }, [networkState.roomId, user]);

  return {
    networkState,
    createRoom,
    joinRoom,
    startGame,
    sendAction,
    leaveRoom,
    isConnected: !!user && networkState.connectionStatus === 'connected',
  };
};