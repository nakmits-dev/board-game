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
    userId?: string; // デバッグ用
  };
  guest?: {
    name: string;
    ready: boolean;
    connected: boolean;
    lastSeen: number;
    userId?: string; // デバッグ用
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

  // デバッグ用: 強制的に新しいユーザーIDを生成
  const forceNewUser = useCallback(async () => {
    console.log('🔧 デバッグ: 新しいユーザーIDを強制生成');
    try {
      await auth.signOut();
      const result = await signInAnonymously(auth);
      console.log('🔧 新しいユーザーID:', result.user.uid);
      return result.user.uid;
    } catch (error) {
      console.error('🔧 ユーザー生成エラー:', error);
      throw error;
    }
  }, []);

  // Firebase認証
  useEffect(() => {
    console.log('Firebase認証初期化開始');
    setGameState(prev => ({ ...prev, connectionStatus: 'connecting' }));

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('認証状態変更:', user ? `ログイン済み (${user.uid})` : '未ログイン');
      if (user) {
        setUser(user);
        setGameState(prev => ({ ...prev, connectionStatus: 'connected' }));
        console.log('Firebase接続成功 - ユーザーID:', user.uid);
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
    console.log('ハートビート開始:', { roomId, isHost, userId: user?.uid });
    
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
    }

    const updatePresence = async () => {
      try {
        const path = isHost ? `simple_rooms/${roomId}/host` : `simple_rooms/${roomId}/guest`;
        await update(ref(database, path), {
          connected: true,
          lastSeen: Date.now(),
          userId: user?.uid // デバッグ用
        });
        console.log('ハートビート送信成功 - ユーザーID:', user?.uid);
      } catch (error) {
        console.error('ハートビート送信失敗:', error);
      }
    };

    // 即座に実行
    updatePresence();
    
    // 5秒間隔でハートビート
    heartbeatInterval.current = setInterval(updatePresence, 5000);
  }, [user]);

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
          lastSeen: Date.now(),
          userId: user.uid // デバッグ用
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

      // 同じユーザーIDでの重複参加をチェック（デバッグ用）
      if (roomData.host.userId === user.uid) {
        console.warn('🔧 デバッグ警告: 同じユーザーIDでの参加を検出:', user.uid);
        console.warn('🔧 これは同じブラウザの異なるタブからの接続の可能性があります');
      }

      console.log('ルームデータ確認:', roomData);

      await update(roomRef, {
        guest: {
          name: playerName,
          ready: true,
          connected: true,
          lastSeen: Date.now(),
          userId: user.uid // デバッグ用
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
      
      // ローカル状態も即座に更新
      setGameState(prev => ({ ...prev, status: 'playing' }));
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
    console.log('送信者ユーザーID:', user?.uid);

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
  }, [gameState.roomId, gameState.isHost, user]);

  // ルーム監視を開始する関数
  const startRoomMonitoring = useCallback((roomId: string) => {
    console.log('ルーム監視開始:', roomId, 'ユーザーID:', user?.uid);

    // 既存の監視を停止
    if (roomUnsubscribe.current) {
      console.log('既存のルーム監視を停止');
      roomUnsubscribe.current();
      roomUnsubscribe.current = null;
    }

    const roomRef = ref(database, `simple_rooms/${roomId}`);
    
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
      console.log('🔧 デバッグ - ホストユーザーID:', roomData.host.userId);
      console.log('🔧 デバッグ - ゲストユーザーID:', roomData.guest?.userId);
      console.log('🔧 デバッグ - 現在のユーザーID:', user?.uid);

      // 対戦相手情報を更新（接続状態も含む）
      const opponent = gameState.isHost ? roomData.guest : { 
        name: roomData.host.name, 
        ready: roomData.host.ready,
        connected: roomData.host.connected || false
      };
      
      // 手の履歴を更新
      const moves = roomData.moves ? Object.values(roomData.moves) : [];
      
      // 状態を更新（ルームのstatusを反映）
      setGameState(prev => ({
        ...prev,
        roomId: roomId, // ルームIDを確実に設定
        opponent: opponent ? {
          name: opponent.name,
          ready: opponent.ready,
          connected: opponent.connected
        } : null,
        moves: moves,
        status: roomData.status === 'playing' ? 'playing' : 
                roomData.status === 'waiting' ? 'waiting' : 
                prev.status
      }));

      // ゲーム開始検出
      if (roomData.status === 'playing' && gameState.status !== 'playing') {
        console.log('ゲーム開始検出');
        if (onGameStartCallback.current) {
          onGameStartCallback.current(roomId, gameState.isHost);
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
    return unsubscribe;
  }, [gameState.isHost, gameState.status, stopHeartbeat, user]);

  // ルーム監視（gameState.roomIdの変化を監視）
  useEffect(() => {
    if (!gameState.roomId) {
      if (roomUnsubscribe.current) {
        console.log('ルーム監視停止 - ルームIDなし');
        roomUnsubscribe.current();
        roomUnsubscribe.current = null;
      }
      return;
    }

    // ルーム監視を開始
    startRoomMonitoring(gameState.roomId);

    return () => {
      if (roomUnsubscribe.current) {
        console.log('ルーム監視クリーンアップ');
        roomUnsubscribe.current();
        roomUnsubscribe.current = null;
      }
    };
  }, [gameState.roomId, startRoomMonitoring]);

  // ルーム退出
  const leaveRoom = useCallback(async () => {
    if (!gameState.roomId) return;

    console.log('ルーム退出:', gameState.roomId, 'ユーザーID:', user?.uid);

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
  }, [gameState.roomId, gameState.isHost, gameState.connectionStatus, stopHeartbeat, user]);

  // 外部からルーム監視を開始する関数を追加
  const connectToRoom = useCallback((roomId: string, isHost: boolean, playerName: string) => {
    console.log('外部からルーム接続:', { roomId, isHost, playerName, userId: user?.uid });
    
    setGameState(prev => ({
      ...prev,
      roomId,
      isHost,
      playerName,
      status: 'waiting'
    }));

    // ハートビート開始
    startHeartbeat(roomId, isHost);
  }, [startHeartbeat, user]);

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
    connectToRoom,
    setOnMove,
    setOnGameStart,
    forceNewUser, // デバッグ用
    isConnected: gameState.connectionStatus === 'connected',
    currentUserId: user?.uid // デバッグ用
  };
};