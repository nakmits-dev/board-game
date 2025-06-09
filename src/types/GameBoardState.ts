// 1️⃣ ボード状態を管理するデータ型定義

export interface GameBoardState {
  characters: Character[];
  currentTurn: number;
  currentTeam: Team;
  gamePhase: 'preparation' | 'action' | 'result';
  playerCrystals: number;
  enemyCrystals: number;
  pendingAnimations: AnimationSequence[];
  animationTarget?: { id: string; type: string } | null;
}

export interface Character {
  id: string;
  name: string;
  team: Team;
  position: Position;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  actions: number;
  remainingActions: number;
  type: 'monster' | 'master';
  image: string;
  skillId: string;
  cost: number;
  // モンスター固有
  monsterType?: MonsterType;
  canEvolve?: boolean;
  isEvolved?: boolean;
  // マスター固有
  masterType?: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface AnimationSequence {
  id: string;
  type: 'move' | 'attack' | 'damage' | 'heal' | 'ko' | 'crystal-gain' | 'turn-start' | 'evolve';
}

export type Team = 'player' | 'enemy';
export type MonsterType = string; // 実際の型定義は省略