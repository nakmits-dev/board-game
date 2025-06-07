import { Position, MonsterType, Skill } from './gameTypes';

export interface GameAction {
  id: string;
  turn: number;
  team: 'player' | 'enemy';
  type: 'move' | 'attack' | 'skill' | 'end_turn' | 'surrender';
  characterId: string;
  targetId?: string;
  position?: Position;
  skillId?: string;
  timestamp: number;
  playerId: string;
}

export interface GameRoom {
  id: string;
  status: 'waiting' | 'playing' | 'finished';
  players: {
    [playerId: string]: {
      id: string;
      name: string;
      team: 'player' | 'enemy';
      deck: {
        master: string;
        monsters: MonsterType[];
      };
      ready: boolean;
      connected: boolean;
      lastSeen: number;
    };
  };
  gameState: {
    currentTurn: number;
    currentTeam: 'player' | 'enemy';
    startTime: number;
    winner?: 'player' | 'enemy';
  };
  actions: GameAction[];
  createdAt: number;
  updatedAt: number;
}

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  team: 'player' | 'enemy';
  deck?: {
    master: string;
    monsters: MonsterType[];
  };
  ready: boolean;
  connected: boolean;
}

export interface NetworkGameState {
  isOnline: boolean;
  roomId: string | null;
  playerId: string | null;
  isHost: boolean;
  opponent: Player | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  gameActions: GameAction[];
  lastSyncedTurn: number;
}