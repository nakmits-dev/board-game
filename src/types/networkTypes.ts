// 🎯 シンプルな棋譜データ構造
export interface GameMove {
  id: string;
  turn: number;
  player: 'host' | 'guest';
  action: 'move' | 'attack' | 'skill' | 'end_turn' | 'surrender';
  from: { x: number; y: number };  // 移動前の座標
  to?: { x: number; y: number };   // 移動先（移動の場合）
  timestamp: number;
}

// 🆕 最適化された初期盤面データ（必要最小限の情報のみ）
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