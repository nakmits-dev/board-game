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

// 統一されたルーム情報（Firebaseと同じ構造）
interface SimpleRoom {
  id: string;
  host: {
    name: string;
    ready: boolean;
    connected: boolean;
    lastSeen: number;
    userId?: string;
  };
  guest?: {
    name: string;
    ready: boolean;
    connected: boolean;
    lastSeen: number;
    userId?: string;
  };
  status: 'waiting' | 'playing' | 'finished';
  moves: GameMove[];
  createdAt: number;
}

export const useSimpleGameSync = () => {
  const [user, setUser] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  
  // 🎯 重要: Firebaseのルームデータをそのまま使用
  const [roomData, setRoomData] = useState<SimpleRoom | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [playerName, setPlayerName] = useState('');

  const roomUnsubscribe = useRef<(() => void) | null>(null);
  const onMoveCallback = useRef<((move: GameMove) => void) | null>(null);
  const onGameStartCallback = useRef<((roomId: string, isHost: boolean) => void) | null>(null);
  const processedMoves = useRef<Set<string>>(new Set());
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

  // 🔥 シンプル化: 計算プロパティでゲーム状態を取得
  const gameState = {
    roomId: roomData?.id || null,
    isHost,
    playerName,
    opponent: isHost ? roomData?.guest : (roomData?.host ? {
      name: roomData.host.name,
      ready: roomData.host.ready,
      connected: roomData.host.connected
    } : null),
    status: roomData ? (roomData.status === 'playing' ? 'playing' : 'waiting') : 'disconnected',
    moves: roomData?.moves || [],
    connectionStatus
  };

  // Firebase認証
  useEffect(() => {
    setConnectionStatus('connecting');

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('connecting');
        signInAnonymously(auth)
          .then((result) => {
            setConnectionStatus('connected');
          })
          .catch((error) => {
            console.error('❌ 匿名認証失敗:', error);
            setConnectionStatus('disconnected');
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
          userId: user?.uid
        });
      } catch (error) {
        console.error('💔 ハートビート送信失敗:', error);
      }
    };

    updatePresence();
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

    if (trimmedId.length < 3) {
      return { isValid: false, error: 'ルームIDは3文字以上で入力してください' };
    }
    if (trimmedId.length > 20) {
      return { isValid: false, error: 'ルームIDは20文字以下で入力してください' };
    }

    const validPattern = /^[a-zA-Z0-9_-]+$/;
    if (!validPattern.test(trimmedId)) {
      return { isValid: false, error: 'ルームIDは英数字、ハイフン、アンダースコアのみ使用できます' };
    }

    if (trimmedId.startsWith('-') || trimmedId.startsWith('_') || 
        trimmedId.endsWith('-') || trimmedId.endsWith('_')) {
      return { isValid: false, error: 'ルームIDの先頭・末尾にハイフンやアンダースコアは使用できません' };
    }

    return { isValid: true };
  };

  // ルーム作成
  const createRoom = useCallback(async (playerName: string, customRoomId?: string): Promise<string> => {
    if (!user) {
      throw new Error('認証が必要です');
    }

    let roomId: string;

    if (customRoomId) {
      const validation = validateRoomId(customRoomId);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      roomId = customRoomId.trim();
      console.log('🎯 ルーム作成 - カスタムID:', roomId);

      const existingRoomRef = ref(database, `simple_rooms/${roomId}`);
      const existingSnapshot = await get(existingRoomRef);
      
      if (existingSnapshot.exists()) {
        throw new Error('このルームIDは既に使用されています');
      }
    } else {
      const roomsRef = ref(database, 'simple_rooms');
      const newRoomRef = push(roomsRef);
      roomId = newRoomRef.key!;
      console.log('🎲 ルーム作成 - 自動生成ID:', roomId);
    }

    try {
      const roomRef = ref(database, `simple_rooms/${roomId}`);
      const newRoomData: SimpleRoom = {
        id: roomId,
        host: {
          name: playerName,
          ready: true,
          connected: true,
          lastSeen: Date.now(),
          userId: user.uid
        },
        status: 'waiting',
        moves: [],
        createdAt: Date.now()
      };

      await set(roomRef, newRoomData);
      console.log('✅ ルーム作成成功:', roomId);

      // 🔥 シンプル化: 状態を直接設定
      setIsHost(true);
      setPlayerName(playerName);
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
      
      const snapshot = await get(roomRef);
      const existingRoomData = snapshot.val() as SimpleRoom;
      
      if (!existingRoomData) {
        throw new Error('ルームが見つかりません');
      }

      if (existingRoomData.guest) {
        throw new Error('ルームは満員です');
      }

      await update(roomRef, {
        guest: {
          name: playerName,
          ready: true,
          connected: true,
          lastSeen: Date.now(),
          userId: user.uid
        }
      });

      console.log('✅ ルーム参加成功:', trimmedRoomId);

      // 🔥 シンプル化: 状態を直接設定
      setIsHost(false);
      setPlayerName(playerName);
      startHeartbeat(trimmedRoomId, false);
    } catch (error: any) {
      console.error('❌ ルーム参加エラー:', error);
      throw new Error(`ルーム参加に失敗しました: ${error.message}`);
    }
  }, [user, startHeartbeat]);

  // ゲーム開始
  const startGame = useCallback(async () => {
    if (!roomData?.id || !isHost) {
      return;
    }

    console.log('🎮 ゲーム開始:', roomData.id);

    try {
      const roomRef = ref(database, `simple_rooms/${roomData.id}`);
      await update(roomRef, { status: 'playing' });
      console.log('✅ ゲーム開始成功');
    } catch (error: any) {
      console.error('❌ ゲーム開始エラー:', error);
      throw new Error(`ゲーム開始に失敗しました: ${error.message}`);
    }
  }, [roomData?.id, isHost]);

  // 手を送信
  const sendMove = useCallback(async (move: Omit<GameMove, 'id' | 'timestamp' | 'player'>) => {
    const currentRoomId = roomData?.id;
    
    if (!currentRoomId) {
      console.error('❌ ルームに接続されていません');
      throw new Error('ルームに接続されていません');
    }

    if (!user) {
      throw new Error('認証が必要です');
    }

    const moveData: GameMove = {
      ...move,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      player: isHost ? 'host' : 'guest',
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
  }, [roomData?.id, isHost, user]);

  // 🔥 シンプル化: ルーム監視（1つのFirebaseリスナーのみ）
  const startRoomMonitoring = useCallback((roomId: string) => {
    console.log('👀 ルーム監視開始:', roomId);

    if (roomUnsubscribe.current) {
      roomUnsubscribe.current();
      roomUnsubscribe.current = null;
    }

    const roomRef = ref(database, `simple_rooms/${roomId}`);
    
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const newRoomData = snapshot.val() as SimpleRoom;
      
      if (!newRoomData) {
        console.log('🗑️ ルームが削除されました');
        setRoomData(null);
        stopHeartbeat();
        return;
      }

      console.log('📊 ルームデータ更新:', {
        roomId: newRoomData.id,
        status: newRoomData.status,
        hostConnected: newRoomData.host.connected,
        guestConnected: newRoomData.guest?.connected,
        movesCount: newRoomData.moves ? Object.keys(newRoomData.moves).length : 0
      });

      // 🔥 重要: Firebaseデータをそのまま設定
      setRoomData(newRoomData);

      // ゲーム開始検出
      if (newRoomData.status === 'playing' && roomData?.status !== 'playing') {
        console.log('🎮 ゲーム開始検出');
        if (onGameStartCallback.current) {
          onGameStartCallback.current(roomId, isHost);
        }
      }

      // 新しい手の検出と処理
      if (newRoomData.moves) {
        const allMoves = Object.values(newRoomData.moves) as GameMove[];
        const newMoves = allMoves.filter(move => !processedMoves.current.has(move.id));
        
        newMoves.forEach(move => {
          const isOpponentMove = isHost ? move.player === 'guest' : move.player === 'host';
          
          if (isOpponentMove && onMoveCallback.current) {
            console.log('📥 相手の手を検出:', move.action);
            onMoveCallback.current(move);
          }
          
          processedMoves.current.add(move.id);
        });
      }
    }, (error) => {
      console.error('❌ ルーム監視エラー:', error);
      setRoomData(null);
    });

    roomUnsubscribe.current = unsubscribe;
    return unsubscribe;
  }, [roomData?.status, isHost, stopHeartbeat]);

  // ルーム監視（roomDataの変化を監視）
  useEffect(() => {
    if (!roomData?.id) {
      if (roomUnsubscribe.current) {
        console.log('🛑 ルーム監視停止 - ルームIDなし');
        roomUnsubscribe.current();
        roomUnsubscribe.current = null;
      }
      return;
    }

    startRoomMonitoring(roomData.id);

    return () => {
      if (roomUnsubscribe.current) {
        roomUnsubscribe.current();
        roomUnsubscribe.current = null;
      }
    };
  }, [roomData?.id, startRoomMonitoring]);

  // ルーム退出
  const leaveRoom = useCallback(async () => {
    if (!roomData?.id) return;

    console.log('🚪 ルーム退出:', roomData.id);

    stopHeartbeat();

    if (roomUnsubscribe.current) {
      roomUnsubscribe.current();
      roomUnsubscribe.current = null;
    }

    try {
      const path = isHost ? 
        `simple_rooms/${roomData.id}/host` : 
        `simple_rooms/${roomData.id}/guest`;
      
      if (isHost) {
        await update(ref(database, path), {
          connected: false,
          lastSeen: Date.now()
        });
      } else {
        await remove(ref(database, path));
      }
    } catch (error) {
      console.error('❌ ルーム退出エラー:', error);
    }

    processedMoves.current.clear();
    setRoomData(null);
    setIsHost(false);
    setPlayerName('');

    console.log('✅ ルーム退出完了');
  }, [roomData?.id, isHost, stopHeartbeat]);

  // 外部からルーム監視を開始する関数
  const connectToRoom = useCallback((roomId: string, isHost: boolean, playerName: string) => {
    console.log('🔗 外部からルーム接続:', { roomId, isHost, playerName });
    
    setIsHost(isHost);
    setPlayerName(playerName);
    startHeartbeat(roomId, isHost);
    
    // ルーム監視を開始
    startRoomMonitoring(roomId);
  }, [startHeartbeat, startRoomMonitoring]);

  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      stopHeartbeat();
      if (roomUnsubscribe.current) {
        roomUnsubscribe.current();
      }
    };
  }, [stopHeartbeat]);

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

  // コールバック設定
  const setOnMove = useCallback((callback: (move: GameMove) => void) => {
    onMoveCallback.current = callback;
  }, []);

  const setOnGameStart = useCallback((callback: (roomId: string, isHost: boolean) => void) => {
    onGameStartCallback.current = callback;
  }, []);

  return {
    gameState, // 🔥 計算プロパティで統一されたインターフェース
    createRoom,
    joinRoom,
    startGame,
    sendMove,
    leaveRoom,
    connectToRoom,
    setOnMove,
    setOnGameStart,
    forceNewUser,
    validateRoomId,
    isConnected: connectionStatus === 'connected',
    currentUserId: user?.uid
  };
};