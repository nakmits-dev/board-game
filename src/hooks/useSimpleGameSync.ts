import { useState, useEffect, useCallback, useRef } from 'react';
import { ref, push, onValue, set, update, remove } from 'firebase/database';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { database, auth } from '../firebase/config';

// シンプルな棋譜データ
interface GameMove {
  id: string;
  turn: number;
  player: 'host' | 'guest';
  action: 'move' | 'attack' | 'skill' | 'end_turn' | 'surrender';
  from?: { x: number; y: number };
  to?: { x: number; y: number };
  target?: string;
  skill?: string;
  timestamp: number;
}

// シンプルなルーム情報
interface SimpleRoom {
  id: string;
  host: {
    name: string;
    ready: boolean;
  };
  guest?: {
    name: string;
    ready: boolean;
  };
  status: 'waiting' | 'playing' | 'finished';
  moves: GameMove[];
  createdAt: number;
}

interface SimpleGameState {
  roomId: string | null;
  isHost: boolean;
  playerName: string;
  opponent: { name: string; ready: boolean } | null;
  status: 'disconnected' | 'waiting' | 'playing';
  moves: GameMove[];
}

export const useSimpleGameSync = () => {
  const [user, setUser] = useState<any>(null);
  const [gameState, setGameState] = useState<SimpleGameState>({
    roomId: null,
    isHost: false,
    playerName: '',
    opponent: null,
    status: 'disconnected',
    moves: []
  });

  const roomUnsubscribe = useRef<(() => void) | null>(null);
  const onMoveCallback = useRef<((move: GameMove) => void) | null>(null);
  const onGameStartCallback = useRef<((roomId: string, isHost: boolean) => void) | null>(null);

  // Firebase認証（シンプル）
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        signInAnonymously(auth).catch(console.error);
      }
    });
    return unsubscribe;
  }, []);

  // ルーム作成
  const createRoom = useCallback(async (playerName: string): Promise<string> => {
    if (!user) throw new Error('認証が必要です');

    const roomsRef = ref(database, 'simple_rooms');
    const newRoomRef = push(roomsRef);
    const roomId = newRoomRef.key!;

    const roomData: SimpleRoom = {
      id: roomId,
      host: {
        name: playerName,
        ready: true
      },
      status: 'waiting',
      moves: [],
      createdAt: Date.now()
    };

    await set(newRoomRef, roomData);

    setGameState(prev => ({
      ...prev,
      roomId,
      isHost: true,
      playerName,
      status: 'waiting'
    }));

    return roomId;
  }, [user]);

  // ルーム参加
  const joinRoom = useCallback(async (roomId: string, playerName: string): Promise<void> => {
    if (!user) throw new Error('認証が必要です');

    const roomRef = ref(database, `simple_rooms/${roomId}`);
    
    // ルーム存在確認
    return new Promise((resolve, reject) => {
      onValue(roomRef, async (snapshot) => {
        const roomData = snapshot.val() as SimpleRoom;
        
        if (!roomData) {
          reject(new Error('ルームが見つかりません'));
          return;
        }

        if (roomData.guest) {
          reject(new Error('ルームは満員です'));
          return;
        }

        try {
          await update(roomRef, {
            guest: {
              name: playerName,
              ready: true
            }
          });

          setGameState(prev => ({
            ...prev,
            roomId,
            isHost: false,
            playerName,
            status: 'waiting'
          }));

          resolve();
        } catch (error) {
          reject(error);
        }
      }, { onlyOnce: true });
    });
  }, [user]);

  // ゲーム開始
  const startGame = useCallback(async () => {
    if (!gameState.roomId || !gameState.isHost) return;

    const roomRef = ref(database, `simple_rooms/${gameState.roomId}`);
    await update(roomRef, { status: 'playing' });
  }, [gameState.roomId, gameState.isHost]);

  // 手を送信
  const sendMove = useCallback(async (move: Omit<GameMove, 'id' | 'timestamp' | 'player'>) => {
    if (!gameState.roomId) throw new Error('ルームに接続されていません');

    const moveData: GameMove = {
      ...move,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      player: gameState.isHost ? 'host' : 'guest',
      timestamp: Date.now()
    };

    const movesRef = ref(database, `simple_rooms/${gameState.roomId}/moves`);
    await push(movesRef, moveData);
  }, [gameState.roomId, gameState.isHost]);

  // ルーム監視
  useEffect(() => {
    if (!gameState.roomId) {
      if (roomUnsubscribe.current) {
        roomUnsubscribe.current();
        roomUnsubscribe.current = null;
      }
      return;
    }

    const roomRef = ref(database, `simple_rooms/${gameState.roomId}`);
    
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const roomData = snapshot.val() as SimpleRoom;
      
      if (!roomData) {
        setGameState(prev => ({ ...prev, status: 'disconnected', roomId: null }));
        return;
      }

      // 対戦相手情報を更新
      const opponent = gameState.isHost ? roomData.guest : { name: roomData.host.name, ready: roomData.host.ready };
      
      setGameState(prev => ({
        ...prev,
        opponent: opponent || null,
        moves: roomData.moves ? Object.values(roomData.moves) : []
      }));

      // ゲーム開始検出
      if (roomData.status === 'playing' && gameState.status === 'waiting') {
        setGameState(prev => ({ ...prev, status: 'playing' }));
        if (onGameStartCallback.current) {
          onGameStartCallback.current(gameState.roomId!, gameState.isHost);
        }
      }

      // 新しい手の検出
      if (roomData.moves) {
        const moves = Object.values(roomData.moves) as GameMove[];
        const latestMove = moves[moves.length - 1];
        
        if (latestMove && onMoveCallback.current) {
          // 相手の手のみ通知
          const isOpponentMove = gameState.isHost ? latestMove.player === 'guest' : latestMove.player === 'host';
          if (isOpponentMove) {
            onMoveCallback.current(latestMove);
          }
        }
      }
    });

    roomUnsubscribe.current = unsubscribe;

    return () => {
      if (roomUnsubscribe.current) {
        roomUnsubscribe.current();
        roomUnsubscribe.current = null;
      }
    };
  }, [gameState.roomId, gameState.isHost, gameState.status]);

  // ルーム退出
  const leaveRoom = useCallback(async () => {
    if (!gameState.roomId) return;

    if (roomUnsubscribe.current) {
      roomUnsubscribe.current();
      roomUnsubscribe.current = null;
    }

    // ゲストの場合は自分の情報を削除
    if (!gameState.isHost) {
      const roomRef = ref(database, `simple_rooms/${gameState.roomId}/guest`);
      await remove(roomRef);
    }

    setGameState({
      roomId: null,
      isHost: false,
      playerName: '',
      opponent: null,
      status: 'disconnected',
      moves: []
    });
  }, [gameState.roomId, gameState.isHost]);

  // コールバック設定
  const setOnMove = useCallback((callback: (move: GameMove) => void) => {
    onMoveCallback.current = callback;
  }, []);

  const setOnGameStart = useCallback((callback: (roomId: string, isHost: boolean) => void) => {
    onGameStartCallback.current = callback;
  }, []);

  return {
    gameState,
    createRoom,
    joinRoom,
    startGame,
    sendMove,
    leaveRoom,
    setOnMove,
    setOnGameStart,
    isConnected: !!user
  };
};