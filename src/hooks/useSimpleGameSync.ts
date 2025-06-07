import { useState, useEffect, useCallback, useRef } from 'react';
import { ref, push, onValue, set, update, remove, get, off } from 'firebase/database';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { database, auth } from '../firebase/config';

// シンプルな棋譜データ
interface GameMove {
  id: string;
  turn: number;
  player: 'host' | 'guest';
  action: 'move' | 'attack' | 'skill' | 'end_turn' | 'surrender';
  characterId?: string;
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
    connected: boolean;
    lastSeen: number;
  };
  guest?: {
    name: string;
    ready: boolean;
    connected: boolean;
    lastSeen: number;
  };
  status: 'waiting' | 'playing' | 'finished';
  moves: GameMove[];
  createdAt: number;
}

interface SimpleGameState {
  roomId: string | null;
  isHost: boolean;
  playerName: string;
  opponent: { name: string; ready: boolean; connected: boolean } | null;
  status: 'disconnected' | 'waiting' | 'playing';
  moves: GameMove[];
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
}

export const useSimpleGameSync = () => {
  const [user, setUser] = useState<any>(null);
  const [gameState, setGameState] = useState<SimpleGameState>({
    roomId: null,
    isHost: false,
    playerName: '',
    opponent: null,
    status: 'disconnected',
    moves: [],
    connectionStatus: 'disconnected'
  });

  const roomUnsubscribe = useRef<(() => void) | null>(null);
  const onMoveCallback = useRef<((move: GameMove) => void) | null>(null);
  const onGameStartCallback = useRef<((roomId: string, isHost: boolean) => void) | null>(null);
  const processedMoves = useRef<Set<string>>(new Set());
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

  // Firebase認証
  useEffect(() => {
    console.log('Firebase認証初期化開始');
    setGameState(prev => ({ ...prev, connectionStatus: 'connecting' }));

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('認証状態変更:', user ? `ログイン済み (${user.uid})` : '未ログイン');
      if (user) {
        setUser(user);
        setGameState(prev => ({ ...prev, connectionStatus: 'connected' }));
        console.log('Firebase接続成功');
      } else {
        console.log('匿名認証を開始...');
        setGameState(prev => ({ ...prev, connectionStatus: 'connecting' }));
        signInAnonymously(auth)
          .then((result) => {
            console.log('匿名認証成功:', result.user.uid);
            setGameState(prev => ({ ...prev, connectionStatus: 'connected' }));
          })
          .catch((error) => {
            console.error('匿名認証失敗:', error);
            console.error('エラーコード:', error.code);
            console.error('エラーメッセージ:', error.message);
            setGameState(prev => ({ ...prev, connectionStatus: 'disconnected' }));
          });
      }
    });
    return unsubscribe;
  }, []);

  // ハートビート機能
  const startHeartbeat = useCallback((roomId: string, isHost: boolean) => {
    console.log('ハートビート開始:', { roomId, isHost });
    
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
    }

    const updatePresence = async () => {
      try {
        const path = isHost ? `simple_rooms/${roomId}/host` : `simple_rooms/${roomId}/guest`;
        await update(ref(database, path), {
          connected: true,
          lastSeen: Date.now()
        });
        console.log('ハートビート送信成功');
      } catch (error) {
        console.error('ハートビート送信失敗:', error);
      }
    };

    // 即座に実行
    updatePresence();
    
    // 5秒間隔でハートビート
    heartbeatInterval.current = setInterval(updatePresence, 5000);
  }, []);

  const stopHeartbeat = useCallback(() => {
    console.log('ハートビート停止');
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
  }, []);

  // ルーム作成
  const createRoom = useCallback(async (playerName: string): Promise<string> => {
    if (!user) {
      console.error('ユーザーが認証されていません');
      throw new Error('認証が必要です');
    }

    console.log('ルーム作成開始:', { playerName, userId: user.uid });

    try {
      const roomsRef = ref(database, 'simple_rooms');
      const newRoomRef = push(roomsRef);
      const roomId = newRoomRef.key!;

      const roomData: SimpleRoom = {
        id: roomId,
        host: {
          name: playerName,
          ready: true,
          connected: true,
          lastSeen: Date.now()
        },
        status: 'waiting',
        moves: [],
        createdAt: Date.now()
      };

      console.log('ルームデータ作成:', roomData);
      await set(newRoomRef, roomData);
      console.log('ルーム作成成功:', roomId);

      // 状態を即座に更新
      setGameState(prev => ({
        ...prev,
        roomId,
        isHost: true,
        playerName,
        status: 'waiting'
      }));

      // ハートビート開始
      startHeartbeat(roomId, true);

      return roomId;
    } catch (error: any) {
      console.error('ルーム作成エラー:', error);
      console.error('エラーコード:', error.code);
      console.error('エラーメッセージ:', error.message);
      throw new Error(`ルーム作成に失敗しました: ${error.message}`);
    }
  }, [user, startHeartbeat]);

  // ルーム参加
  const joinRoom = useCallback(async (roomId: string, playerName: string): Promise<void> => {
    if (!user) {
      console.error('ユーザーが認証されていません');
      throw new Error('認証が必要です');
    }

    console.log('ルーム参加開始:', { roomId, playerName, userId: user.uid });

    try {
      const roomRef = ref(database, `simple_rooms/${roomId}`);
      
      // ルーム存在確認
      const snapshot = await get(roomRef);
      const roomData = snapshot.val() as SimpleRoom;
      
      if (!roomData) {
        console.error('ルームが見つかりません:', roomId);
        throw new Error('ルームが見つかりません');
      }

      if (roomData.guest) {
        console.error('ルームは満員です:', roomId);
        throw new Error('ルームは満員です');
      }

      console.log('ルームデータ確認:', roomData);

      await update(roomRef, {
        guest: {
          name: playerName,
          ready: true,
          connected: true,
          lastSeen: Date.now()
        }
      });

      console.log('ルーム参加成功:', roomId);

      // 状態を即座に更新
      setGameState(prev => ({
        ...prev,
        roomId,
        isHost: false,
        playerName,
        status: 'waiting'
      }));

      // ハートビート開始
      startHeartbeat(roomId, false);
    } catch (error: any) {
      console.error('ルーム参加エラー:', error);
      console.error('エラーコード:', error.code);
      console.error('エラーメッセージ:', error.message);
      throw new Error(`ルーム参加に失敗しました: ${error.message}`);
    }
  }, [user, startHeartbeat]);

  // ゲーム開始
  const startGame = useCallback(async () => {
    if (!gameState.roomId || !gameState.isHost) {
      console.error('ゲーム開始条件が満たされていません');
      return;
    }

    console.log('ゲーム開始:', gameState.roomId);

    try {
      const roomRef = ref(database, `simple_rooms/${gameState.roomId}`);
      await update(roomRef, { status: 'playing' });
      console.log('ゲーム開始成功');
    } catch (error: any) {
      console.error('ゲーム開始エラー:', error);
      throw new Error(`ゲーム開始に失敗しました: ${error.message}`);
    }
  }, [gameState.roomId, gameState.isHost]);

  // 手を送信
  const sendMove = useCallback(async (move: Omit<GameMove, 'id' | 'timestamp' | 'player'>) => {
    if (!gameState.roomId) {
      console.error('ルームに接続されていません - roomId:', gameState.roomId);
      console.error('現在のゲーム状態:', gameState);
      throw new Error('ルームに接続されていません');
    }

    const moveData: GameMove = {
      ...move,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      player: gameState.isHost ? 'host' : 'guest',
      timestamp: Date.now()
    };

    console.log('手を送信:', moveData);
    console.log('送信先ルーム:', gameState.roomId);

    try {
      const movesRef = ref(database, `simple_rooms/${gameState.roomId}/moves`);
      await push(movesRef, moveData);
      console.log('手の送信成功');
    } catch (error: any) {
      console.error('手の送信エラー:', error);
      console.error('エラーコード:', error.code);
      console.error('エラーメッセージ:', error.message);
      throw new Error(`手の送信に失敗しました: ${error.message}`);
    }
  }, [gameState.roomId, gameState.isHost]);

  // ルーム監視
  useEffect(() => {
    if (!gameState.roomId) {
      if (roomUnsubscribe.current) {
        console.log('ルーム監視停止');
        roomUnsubscribe.current();
        roomUnsubscribe.current = null;
      }
      return;
    }

    console.log('ルーム監視開始:', gameState.roomId);

    const roomRef = ref(database, `simple_rooms/${gameState.roomId}`);
    
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const roomData = snapshot.val() as SimpleRoom;
      
      if (!roomData) {
        console.log('ルームが削除されました');
        setGameState(prev => ({ 
          ...prev, 
          status: 'disconnected', 
          roomId: null,
          opponent: null,
          moves: []
        }));
        stopHeartbeat();
        return;
      }

      console.log('ルームデータ更新:', roomData);

      // 対戦相手情報を更新（接続状態も含む）
      const opponent = gameState.isHost ? roomData.guest : { 
        name: roomData.host.name, 
        ready: roomData.host.ready,
        connected: roomData.host.connected || false
      };
      
      // 手の履歴を更新
      const moves = roomData.moves ? Object.values(roomData.moves) : [];
      
      setGameState(prev => ({
        ...prev,
        opponent: opponent ? {
          name: opponent.name,
          ready: opponent.ready,
          connected: opponent.connected
        } : null,
        moves: moves,
        status: roomData.status === 'playing' ? 'playing' : prev.status
      }));

      // ゲーム開始検出
      if (roomData.status === 'playing' && gameState.status === 'waiting') {
        console.log('ゲーム開始検出');
        if (onGameStartCallback.current) {
          onGameStartCallback.current(gameState.roomId!, gameState.isHost);
        }
      }

      // 新しい手の検出と処理
      if (roomData.moves) {
        const allMoves = Object.values(roomData.moves) as GameMove[];
        
        // 未処理の手のみを処理
        const newMoves = allMoves.filter(move => !processedMoves.current.has(move.id));
        
        newMoves.forEach(move => {
          // 相手の手のみ通知
          const isOpponentMove = gameState.isHost ? move.player === 'guest' : move.player === 'host';
          
          if (isOpponentMove && onMoveCallback.current) {
            console.log('相手の手を検出:', move);
            onMoveCallback.current(move);
          }
          
          // 処理済みとしてマーク
          processedMoves.current.add(move.id);
        });
      }
    }, (error) => {
      console.error('ルーム監視エラー:', error);
      console.error('エラーコード:', error.code);
      console.error('エラーメッセージ:', error.message);
      setGameState(prev => ({ ...prev, status: 'disconnected' }));
    });

    roomUnsubscribe.current = unsubscribe;

    return () => {
      if (roomUnsubscribe.current) {
        console.log('ルーム監視クリーンアップ');
        roomUnsubscribe.current();
        roomUnsubscribe.current = null;
      }
    };
  }, [gameState.roomId, gameState.isHost, gameState.status, stopHeartbeat]);

  // ルーム退出
  const leaveRoom = useCallback(async () => {
    if (!gameState.roomId) return;

    console.log('ルーム退出:', gameState.roomId);

    // ハートビート停止
    stopHeartbeat();

    if (roomUnsubscribe.current) {
      roomUnsubscribe.current();
      roomUnsubscribe.current = null;
    }

    try {
      // 接続状態を更新
      const path = gameState.isHost ? 
        `simple_rooms/${gameState.roomId}/host` : 
        `simple_rooms/${gameState.roomId}/guest`;
      
      if (gameState.isHost) {
        // ホストの場合は接続状態のみ更新（ルームは残す）
        await update(ref(database, path), {
          connected: false,
          lastSeen: Date.now()
        });
        console.log('ホスト接続状態更新完了');
      } else {
        // ゲストの場合は自分の情報を削除
        await remove(ref(database, path));
        console.log('ゲスト情報削除完了');
      }
    } catch (error) {
      console.error('ルーム退出エラー:', error);
    }

    // 処理済み手の履歴をクリア
    processedMoves.current.clear();

    setGameState({
      roomId: null,
      isHost: false,
      playerName: '',
      opponent: null,
      status: 'disconnected',
      moves: [],
      connectionStatus: gameState.connectionStatus // 接続状態は維持
    });

    console.log('ルーム退出完了');
  }, [gameState.roomId, gameState.isHost, gameState.connectionStatus, stopHeartbeat]);

  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      stopHeartbeat();
      if (roomUnsubscribe.current) {
        roomUnsubscribe.current();
      }
    };
  }, [stopHeartbeat]);

  // コールバック設定
  const setOnMove = useCallback((callback: (move: GameMove) => void) => {
    console.log('手の受信コールバック設定');
    onMoveCallback.current = callback;
  }, []);

  const setOnGameStart = useCallback((callback: (roomId: string, isHost: boolean) => void) => {
    console.log('ゲーム開始コールバック設定');
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
    isConnected: gameState.connectionStatus === 'connected'
  };
};