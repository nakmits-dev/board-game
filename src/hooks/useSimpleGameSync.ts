import { useState, useEffect, useCallback, useRef } from 'react';
import { ref, push, onValue, set, update, remove, get, off } from 'firebase/database';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { database, auth } from '../firebase/config';
import { GameMove, InitialGameState, SimpleRoom, TimerSync } from '../types/networkTypes';

export const useSimpleGameSync = () => {
  const [user, setUser] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  
  const roomUnsubscribe = useRef<(() => void) | null>(null);
  const onMoveCallback = useRef<((move: GameMove) => void) | null>(null);
  const onGameStartCallback = useRef<((roomId: string, isHost: boolean) => void) | null>(null);
  const onInitialStateCallback = useRef<((initialState: InitialGameState) => void) | null>(null);
  const onRoomUpdateCallback = useRef<((roomData: SimpleRoom) => void) | null>(null);
  const onTimerSyncCallback = useRef<((timerSync: TimerSync) => void) | null>(null);
  const processedMoves = useRef<Set<string>>(new Set());
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const currentRoomId = useRef<string | null>(null);
  const fixedUserId = useRef<string | null>(null);

  // Firebase認証
  useEffect(() => {
    setConnectionStatus('connecting');

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('🔐 Firebase認証成功:', user.uid);
        setUser(user);
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('connecting');
        signInAnonymously(auth)
          .then((result) => {
            console.log('🔐 匿名認証成功:', result.user.uid);
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

  // 🔧 固定ユニークIDを生成・取得する関数
  const getFixedUserId = () => {
    if (!fixedUserId.current) {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 9);
      fixedUserId.current = `${timestamp}_${random}`;
      console.log('🆔 固定ユーザーID生成:', fixedUserId.current);
    }
    return fixedUserId.current;
  };

  // ハートビート機能（固定IDを使用）
  const startHeartbeat = useCallback((roomId: string, isHost: boolean) => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
    }

    const updatePresence = async () => {
      try {
        const path = isHost ? `simple_rooms/${roomId}/host` : `simple_rooms/${roomId}/guest`;
        const userId = getFixedUserId();
        
        await update(ref(database, path), {
          connected: true,
          lastSeen: Date.now(),
          userId: userId
        });
        console.log('💓 ハートビート送信:', { roomId, isHost, userId });
      } catch (error) {
        console.error('💔 ハートビート送信失敗:', error);
      }
    };

    updatePresence();
    heartbeatInterval.current = setInterval(updatePresence, 2000);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
      console.log('💔 ハートビート停止');
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

  // ルーム作成（固定IDを使用）
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
      const userId = getFixedUserId();
      
      const newRoomData: SimpleRoom = {
        id: roomId,
        host: {
          name: playerName,
          ready: true,
          connected: true,
          lastSeen: Date.now(),
          userId: userId
        },
        status: 'waiting',
        moves: [],
        createdAt: Date.now()
      };

      await set(roomRef, newRoomData);
      console.log('✅ ルーム作成成功:', { roomId, hostUserId: userId });

      currentRoomId.current = roomId;
      startHeartbeat(roomId, true);

      return roomId;
    } catch (error: any) {
      console.error('❌ ルーム作成エラー:', error);
      throw new Error(`ルーム作成に失敗しました: ${error.message}`);
    }
  }, [user, startHeartbeat]);

  // 🔧 ルーム参加（再参加対応・固定IDを使用）
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

      if (existingRoomData.guest && existingRoomData.guest.connected) {
        throw new Error('ルームは満員です');
      }

      const userId = getFixedUserId();

      const guestData = {
        name: playerName,
        ready: true,
        connected: true,
        lastSeen: Date.now(),
        userId: userId
      };

      await update(roomRef, {
        guest: guestData
      });

      console.log('✅ ルーム参加成功:', { 
        roomId: trimmedRoomId, 
        guestUserId: userId,
        isReconnection: !!existingRoomData.guest
      });

      currentRoomId.current = trimmedRoomId;
      startHeartbeat(trimmedRoomId, false);
    } catch (error: any) {
      console.error('❌ ルーム参加エラー:', error);
      throw new Error(`ルーム参加に失敗しました: ${error.message}`);
    }
  }, [user, startHeartbeat]);

  // 🆕 最適化された初期盤面アップロード
  const uploadInitialState = useCallback(async (roomId: string, initialState: InitialGameState) => {
    if (!roomId) {
      console.error('❌ 初期盤面アップロード: ルームIDがありません');
      return;
    }

    console.log('📤 初期盤面アップロード開始:', roomId);

    try {
      const roomRef = ref(database, `simple_rooms/${roomId}`);
      await update(roomRef, { 
        initialState: {
          ...initialState,
          uploadedAt: Date.now(),
          uploadedBy: user?.uid
        }
      });
      console.log('✅ 初期盤面アップロード成功');
    } catch (error: any) {
      console.error('❌ 初期盤面アップロードエラー:', error);
      throw new Error(`初期盤面のアップロードに失敗しました: ${error.message}`);
    }
  }, [user]);

  // ゲーム開始
  const startGame = useCallback(async (roomId: string) => {
    if (!roomId) {
      return;
    }

    console.log('🎮 ゲーム開始:', roomId);

    try {
      const roomRef = ref(database, `simple_rooms/${roomId}`);
      await update(roomRef, { status: 'playing' });
      console.log('✅ ゲーム開始成功');
    } catch (error: any) {
      console.error('❌ ゲーム開始エラー:', error);
      throw new Error(`ゲーム開始に失敗しました: ${error.message}`);
    }
  }, []);

  // 🔧 手の送信（チーム情報を含める）
  const sendMove = useCallback(async (roomId: string, move: Omit<GameMove, 'id' | 'timestamp'>) => {
    if (!roomId) {
      console.error('❌ ルームに接続されていません');
      throw new Error('ルームに接続されていません');
    }

    if (!user) {
      throw new Error('認証が必要です');
    }

    const moveData: GameMove = {
      ...move,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    console.log('📤 棋譜送信:', {
      action: moveData.action,
      team: moveData.team,
      from: moveData.from,
      to: moveData.to
    });

    try {
      const movesRef = ref(database, `simple_rooms/${roomId}/moves`);
      const newMoveRef = push(movesRef);
      await set(newMoveRef, moveData);
      console.log('✅ 棋譜送信成功');
    } catch (error: any) {
      console.error('❌ 棋譜送信エラー:', error);
      throw new Error(`棋譜の送信に失敗しました: ${error.message}`);
    }
  }, [user]);

  // 🆕 タイマー同期送信（movesとは別管理）
  const sendTimerSync = useCallback(async (roomId: string, timerSync: Omit<TimerSync, 'id' | 'timestamp'>) => {
    if (!roomId || !user) return;

    const timerData: TimerSync = {
      ...timerSync,
      id: `timer_${Date.now()}`,
      timestamp: Date.now()
    };

    try {
      const timerRef = ref(database, `simple_rooms/${roomId}/timer`);
      await set(timerRef, timerData);
      console.log('⏰ タイマー同期送信成功:', { timeLeft: timerData.timeLeft });
    } catch (error: any) {
      console.error('❌ タイマー同期送信エラー:', error);
    }
  }, [user]);

  // 🔧 ルーム監視（再参加対応・整合性改善）
  const startRoomMonitoring = useCallback((roomId: string, isHost: boolean) => {
    console.log('👀 ルーム監視開始:', roomId);

    if (roomUnsubscribe.current) {
      roomUnsubscribe.current();
      roomUnsubscribe.current = null;
    }

    const roomRef = ref(database, `simple_rooms/${roomId}`);
    
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const roomData = snapshot.val() as SimpleRoom;
      
      if (!roomData) {
        console.log('🗑️ ルームが削除されました');
        return;
      }

      console.log('📊 ルームデータ更新:', {
        roomId: roomData.id,
        status: roomData.status,
        hostName: roomData.host.name,
        hostConnected: roomData.host.connected,
        guestExists: !!roomData.guest,
        guestName: roomData.guest?.name,
        guestConnected: roomData.guest?.connected,
        movesCount: roomData.moves ? Object.keys(roomData.moves).length : 0,
        hasInitialState: !!roomData.initialState,
        hasTimer: !!roomData.timer
      });

      // ルーム更新コールバックを呼び出し（再参加対応）
      if (onRoomUpdateCallback.current) {
        onRoomUpdateCallback.current(roomData);
      }

      // 初期盤面データの検出
      if (roomData.initialState && onInitialStateCallback.current) {
        console.log('📥 初期盤面データを受信');
        onInitialStateCallback.current(roomData.initialState);
      }

      // 🆕 タイマー同期データの検出
      if (roomData.timer && onTimerSyncCallback.current) {
        console.log('⏰ タイマー同期データを受信:', { timeLeft: roomData.timer.timeLeft });
        onTimerSyncCallback.current(roomData.timer);
      }

      // ゲーム開始検出
      if (roomData.status === 'playing' && onGameStartCallback.current) {
        console.log('🎮 ゲーム開始検出');
        onGameStartCallback.current(roomId, isHost);
      }

      // 🔧 新しい手の検出と処理（全プレイヤーが受信）
      if (roomData.moves) {
        const allMoves = Object.values(roomData.moves) as GameMove[];
        const newMoves = allMoves.filter(move => !processedMoves.current.has(move.id));
        
        newMoves.forEach(move => {
          if (onMoveCallback.current) {
            console.log('📥 新しい手を検出:', {
              action: move.action,
              team: move.team,
              from: move.from,
              to: move.to
            });
            onMoveCallback.current(move);
          }
          
          processedMoves.current.add(move.id);
        });
      }
    }, (error) => {
      console.error('❌ ルーム監視エラー:', error);
    });

    roomUnsubscribe.current = unsubscribe;
    return unsubscribe;
  }, []);

  // ルーム退出
  const leaveRoom = useCallback(async (roomId: string, isHost: boolean) => {
    if (!roomId) return;

    console.log('🚪 ルーム退出:', roomId);

    stopHeartbeat();

    if (roomUnsubscribe.current) {
      roomUnsubscribe.current();
      roomUnsubscribe.current = null;
    }

    try {
      const path = isHost ? 
        `simple_rooms/${roomId}/host` : 
        `simple_rooms/${roomId}/guest`;
      
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
    currentRoomId.current = null;
    fixedUserId.current = null;

    console.log('✅ ルーム退出完了');
  }, [stopHeartbeat]);

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
      fixedUserId.current = null;
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

  const setOnInitialState = useCallback((callback: (initialState: InitialGameState) => void) => {
    onInitialStateCallback.current = callback;
  }, []);

  const setOnRoomUpdate = useCallback((callback: (roomData: SimpleRoom) => void) => {
    onRoomUpdateCallback.current = callback;
  }, []);

  // 🆕 タイマー同期コールバック設定
  const setOnTimerSync = useCallback((callback: (timerSync: TimerSync) => void) => {
    onTimerSyncCallback.current = callback;
  }, []);

  return {
    // Firebase操作
    createRoom,
    joinRoom,
    startGame,
    sendMove,
    sendTimerSync, // 🆕 タイマー同期専用
    uploadInitialState,
    leaveRoom,
    startRoomMonitoring,
    
    // コールバック設定
    setOnMove,
    setOnGameStart,
    setOnInitialState,
    setOnRoomUpdate,
    setOnTimerSync, // 🆕 タイマー同期専用
    
    // ユーティリティ
    forceNewUser,
    validateRoomId,
    
    // 状態
    isConnected: connectionStatus === 'connected',
    currentUserId: user?.uid,
    fixedUserId: fixedUserId.current
  };
};