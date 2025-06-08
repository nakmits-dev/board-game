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
    try {
      await auth.signOut();
      const result = await signInAnonymously(auth);
      return result.user.uid;
    } catch (error) {
      console.error('🔧 ユーザー生成エラー:', error);
      throw error;
    }
  }, []);

  // Firebase認証
  useEffect(() => {
    setGameState(prev => ({ ...prev, connectionStatus: 'connecting' }));

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        setGameState(prev => ({ ...prev, connectionStatus: 'connected' }));
      } else {
        setGameState(prev => ({ ...prev, connectionStatus: 'connecting' }));
        signInAnonymously(auth)
          .then((result) => {
            setGameState(prev => ({ ...prev, connectionStatus: 'connected' }));
          })
          .catch((error) => {
            console.error('❌ 匿名認証失敗:', error);
            setGameState(prev => ({ ...prev, connectionStatus: 'disconnected' }));
          });
      }
    });
    return unsubscribe;
  }, []);

  // ハートビート機能
  const startHeartbeat = useCallback((roomId: string, isHost: boolean) => {
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
      } catch (error) {
        console.error('💔 ハートビート送信失敗:', error);
      }
    };

    // 即座に実行
    updatePresence();
    
    // 5秒間隔でハートビート
    heartbeatInterval.current = setInterval(updatePresence, 5000);
  }, [user]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
  }, []);

  // ルームIDの有効性をチェックする関数
  const validateRoomId = (roomId: string): { isValid: boolean; error?: string } => {
    if (!roomId || roomId.trim().length === 0) {
      return { isValid: false, error: 'ルームIDが空です' };
    }

    const trimmedId = roomId.trim();

    // 長さチェック（3-20文字）
    if (trimmedId.length < 3) {
      return { isValid: false, error: 'ルームIDは3文字以上で入力してください' };
    }
    if (trimmedId.length > 20) {
      return { isValid: false, error: 'ルームIDは20文字以下で入力してください' };
    }

    // 使用可能文字チェック（英数字、ハイフン、アンダースコア）
    const validPattern = /^[a-zA-Z0-9_-]+$/;
    if (!validPattern.test(trimmedId)) {
      return { isValid: false, error: 'ルームIDは英数字、ハイフン、アンダースコアのみ使用できます' };
    }

    // 先頭・末尾の特殊文字チェック
    if (trimmedId.startsWith('-') || trimmedId.startsWith('_') || 
        trimmedId.endsWith('-') || trimmedId.endsWith('_')) {
      return { isValid: false, error: 'ルームIDの先頭・末尾にハイフンやアンダースコアは使用できません' };
    }

    return { isValid: true };
  };

  // ルーム作成（カスタムルームID対応）
  const createRoom = useCallback(async (playerName: string, customRoomId?: string): Promise<string> => {
    if (!user) {
      throw new Error('認証が必要です');
    }

    let roomId: string;

    if (customRoomId) {
      // カスタムルームIDの場合
      const validation = validateRoomId(customRoomId);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      roomId = customRoomId.trim();
      console.log('🎯 ルーム作成 - カスタムID:', roomId);

      // ルームIDの重複チェック
      const existingRoomRef = ref(database, `simple_rooms/${roomId}`);
      const existingSnapshot = await get(existingRoomRef);
      
      if (existingSnapshot.exists()) {
        throw new Error('このルームIDは既に使用されています');
      }
    } else {
      // 自動生成の場合
      const roomsRef = ref(database, 'simple_rooms');
      const newRoomRef = push(roomsRef);
      roomId = newRoomRef.key!;
      console.log('🎲 ルーム作成 - 自動生成ID:', roomId);
    }

    try {
      const roomRef = ref(database, `simple_rooms/${roomId}`);
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

      await set(roomRef, roomData);
      console.log('✅ ルーム作成成功:', roomId);

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
      console.error('❌ ルーム作成エラー:', error);
      throw new Error(`ルーム作成に失敗しました: ${error.message}`);
    }
  }, [user, startHeartbeat, validateRoomId]);

  // ルーム参加
  const joinRoom = useCallback(async (roomId: string, playerName: string): Promise<void> => {
    if (!user) {
      throw new Error('認証が必要です');
    }

    const trimmedRoomId = roomId.trim();
    console.log('🚪 ルーム参加:', trimmedRoomId);

    try {
      const roomRef = ref(database, `simple_rooms/${trimmedRoomId}`);
      
      // ルーム存在確認
      const snapshot = await get(roomRef);
      const roomData = snapshot.val() as SimpleRoom;
      
      if (!roomData) {
        throw new Error('ルームが見つかりません');
      }

      if (roomData.guest) {
        throw new Error('ルームは満員です');
      }

      await update(roomRef, {
        guest: {
          name: playerName,
          ready: true,
          connected: true,
          lastSeen: Date.now(),
          userId: user.uid // デバッグ用
        }
      });

      console.log('✅ ルーム参加成功:', trimmedRoomId);

      // 状態を即座に更新
      setGameState(prev => ({
        ...prev,
        roomId: trimmedRoomId,
        isHost: false,
        playerName,
        status: 'waiting'
      }));

      // ハートビート開始
      startHeartbeat(trimmedRoomId, false);
    } catch (error: any) {
      console.error('❌ ルーム参加エラー:', error);
      throw new Error(`ルーム参加に失敗しました: ${error.message}`);
    }
  }, [user, startHeartbeat]);

  // ゲーム開始
  const startGame = useCallback(async () => {
    if (!gameState.roomId || !gameState.isHost) {
      return;
    }

    console.log('🎮 ゲーム開始:', gameState.roomId);

    try {
      const roomRef = ref(database, `simple_rooms/${gameState.roomId}`);
      await update(roomRef, { status: 'playing' });
      console.log('✅ ゲーム開始成功');
      
      // ローカル状態も即座に更新
      setGameState(prev => ({ ...prev, status: 'playing' }));
    } catch (error: any) {
      console.error('❌ ゲーム開始エラー:', error);
      throw new Error(`ゲーム開始に失敗しました: ${error.message}`);
    }
  }, [gameState.roomId, gameState.isHost]);

  // 手を送信（改善版）
  const sendMove = useCallback(async (move: Omit<GameMove, 'id' | 'timestamp' | 'player'>) => {
    const currentRoomId = gameState.roomId;
    
    if (!currentRoomId) {
      console.error('❌ ルームに接続されていません - roomId:', currentRoomId);
      throw new Error('ルームに接続されていません');
    }

    if (!user) {
      throw new Error('認証が必要です');
    }

    const moveData: GameMove = {
      ...move,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      player: gameState.isHost ? 'host' : 'guest',
      timestamp: Date.now()
    };

    try {
      const movesRef = ref(database, `simple_rooms/${currentRoomId}/moves`);
      const newMoveRef = push(movesRef);
      await set(newMoveRef, moveData);
    } catch (error: any) {
      console.error('❌ 手の送信エラー:', error);
      throw new Error(`手の送信に失敗しました: ${error.message}`);
    }
  }, [gameState.roomId, gameState.isHost, user]);

  // ルーム監視を開始する関数
  const startRoomMonitoring = useCallback((roomId: string) => {
    console.log('👀 ルーム監視開始:', roomId);

    // 既存の監視を停止
    if (roomUnsubscribe.current) {
      roomUnsubscribe.current();
      roomUnsubscribe.current = null;
    }

    const roomRef = ref(database, `simple_rooms/${roomId}`);
    
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const roomData = snapshot.val() as SimpleRoom;
      
      if (!roomData) {
        console.log('🗑️ ルームが削除されました');
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

      console.log('📊 ルームデータ更新:', {
        roomId: roomData.id,
        status: roomData.status,
        hostConnected: roomData.host.connected,
        guestConnected: roomData.guest?.connected,
        movesCount: roomData.moves ? Object.keys(roomData.moves).length : 0
      });

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
        console.log('🎮 ゲーム開始検出');
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
            console.log('📥 相手の手を検出:', move.action);
            onMoveCallback.current(move);
          }
          
          // 処理済みとしてマーク
          processedMoves.current.add(move.id);
        });
      }
    }, (error) => {
      console.error('❌ ルーム監視エラー:', error);
      setGameState(prev => ({ ...prev, status: 'disconnected' }));
    });

    roomUnsubscribe.current = unsubscribe;
    return unsubscribe;
  }, [gameState.isHost, gameState.status, stopHeartbeat, user]);

  // ルーム監視（gameState.roomIdの変化を監視）
  useEffect(() => {
    if (!gameState.roomId) {
      if (roomUnsubscribe.current) {
        console.log('🛑 ルーム監視停止 - ルームIDなし');
        roomUnsubscribe.current();
        roomUnsubscribe.current = null;
      }
      return;
    }

    // ルーム監視を開始
    startRoomMonitoring(gameState.roomId);

    return () => {
      if (roomUnsubscribe.current) {
        roomUnsubscribe.current();
        roomUnsubscribe.current = null;
      }
    };
  }, [gameState.roomId, startRoomMonitoring]);

  // ルーム退出
  const leaveRoom = useCallback(async () => {
    if (!gameState.roomId) return;

    console.log('🚪 ルーム退出:', gameState.roomId);

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
      } else {
        // ゲストの場合は自分の情報を削除
        await remove(ref(database, path));
      }
    } catch (error) {
      console.error('❌ ルーム退出エラー:', error);
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

    console.log('✅ ルーム退出完了');
  }, [gameState.roomId, gameState.isHost, gameState.connectionStatus, stopHeartbeat, user]);

  // 外部からルーム監視を開始する関数を追加
  const connectToRoom = useCallback((roomId: string, isHost: boolean, playerName: string) => {
    console.log('🔗 外部からルーム接続:', { roomId, isHost, playerName });
    
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
    connectToRoom,
    setOnMove,
    setOnGameStart,
    forceNewUser, // デバッグ用
    validateRoomId, // ルームID検証関数を追加
    isConnected: gameState.connectionStatus === 'connected',
    currentUserId: user?.uid // デバッグ用
  };
};