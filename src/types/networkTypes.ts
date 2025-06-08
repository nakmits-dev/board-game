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

// 初期盤面データ（1回だけアップロード）
export interface InitialGameState {
  characters: Array<{
    id: string;
    name: string;
    type: 'master' | 'monster';
    team: 'player' | 'enemy';
    position: { x: number; y: number };
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
    actions: number;
    cost: number;
    image: string;
    skillId?: string;
    monsterType?: string;
    masterType?: string;
    canEvolve?: boolean;
    isEvolved?: boolean;
  }>;
  playerCrystals: number;
  enemyCrystals: number;
  currentTeam: 'player' | 'enemy';
  currentTurn: number;
  gamePhase: 'preparation' | 'action' | 'result';
  startingTeam: 'player' | 'enemy';
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