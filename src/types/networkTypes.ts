// 🎯 シンプルな棋譜データ構造（チーム情報を追加）
export interface GameMove {
  id: string;
  turn: number;
  team: 'player' | 'enemy'; // 🔧 チーム情報を追加
  action: 'move' | 'attack' | 'skill' | 'end_turn' | 'surrender' | 'forced_end_turn';
  from: { x: number; y: number };  // 移動前の座標
  to?: { x: number; y: number };   // 移動先（移動の場合）
  timestamp: number;
}

// 🆕 タイマー同期専用データ（movesとは別管理）
export interface TimerSync {
  id: string;
  turn: number;
  team: 'player' | 'enemy';
  timeLeft: number;
  timestamp: number;
}

// 🆕 最適化された初期盤面データ（必要最小限の情報のみ）
export interface InitialGameState {
  // キャラクター情報（カードIDとチームのみ）
  hostDeck: {
    master: string;
    monsters: string[];
  };
  guestDeck: {
    master: string;
    monsters: string[];
  };
  // ゲーム設定
  startingPlayer: 'host' | 'guest'; // 🆕 先攻プレイヤー
  hasTimeLimit: boolean;
  timeLimitSeconds: number;
  // メタデータ
  uploadedAt: number;
  uploadedBy: string;
}

// ルーム情報
export interface SimpleRoom {
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
  timer?: TimerSync; // 🆕 最新のタイマー同期情報のみ保持
  initialState?: InitialGameState;
  createdAt: number;
}