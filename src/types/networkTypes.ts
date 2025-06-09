// 🎯 処理結果を含む棋譜データ構造
export interface GameMove {
  id: string;
  turn: number;
  player: 'host' | 'guest';
  action: 'move' | 'attack' | 'skill' | 'end_turn' | 'surrender' | 'timer_sync' | 'forced_end_turn';
  from: { x: number; y: number };  // 移動前の座標
  to?: { x: number; y: number };   // 移動先（移動の場合）
  timeLeft?: number; // タイマー同期用
  timestamp: number;
  // 🆕 ターンプレイヤーの処理結果データ
  result?: {
    type: string;
    characterId?: string;
    targetId?: string;
    position?: { x: number; y: number };
    skillId?: string;
    // 処理結果の詳細情報
    damage?: number;
    newHp?: number;
    crystalChange?: number;
    evolved?: boolean;
    defeated?: boolean;
    // その他の結果データ
    [key: string]: any;
  };
}

// 初期盤面データ（1回だけアップロード）
export interface InitialGameState {
  // キャラクター情報（カードIDとチームのみ）
  playerDeck: {
    master: string;
    monsters: string[];
  };
  enemyDeck: {
    master: string;
    monsters: string[];
  };
  // ゲーム設定
  startingTeam: 'player' | 'enemy';
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
  initialState?: InitialGameState;
  createdAt: number;
}