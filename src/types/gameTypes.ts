export type CharacterType = 'monster' | 'master';
export type Team = 'player' | 'enemy';
export type MonsterType = 'wolf' | 'golem' | 'bear' | 'star-wolf' | 'iron-golem' | 'white-bear' | 'slime' | 'red-slime' | 'whale' | 'king-whale' | 'red-dragon' | 'blue-dragon' | 'yellow-dragon' | 'green-dragon' | 'white-dragon' | 'black-dragon';

export interface Position {
  x: number;
  y: number;
}

// 🔧 ボード管理用の型定義
export interface BoardCell {
  position: Position;
  character?: Character;
  isValidPlacement?: boolean;
  team?: Team;
}

export interface BoardState {
  width: number;
  height: number;
  cells: BoardCell[][];
}

export interface SkillEffect {
  type: 'defense' | 'actions' | 'evolve';
  value?: number;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  damage?: number;
  healing?: number;
  range: number;
  crystalCost: number;
  ignoreDefense?: boolean;
  effects?: SkillEffect[];
}

export interface Card {
  name: string;
  hp: number;
  attack: number;
  defense: number;
  actions: number;
  image: string;
  skillId: string;
  cost: number;
}

export interface MonsterCard extends Card {
  evolution?: MonsterType;
}

export interface MasterCard extends Card {
  type: 'normal' | 'red' | 'blue' | 'green' | 'yellow' | 'black' | 'white';
}

export interface BaseCharacter {
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
  skillId: string;
  image: string;
  cost: number;
}

export interface Monster extends BaseCharacter {
  type: 'monster';
  monsterType: MonsterType;
  canEvolve: boolean;
  isEvolved: boolean;
}

export interface Master extends BaseCharacter {
  type: 'master';
  masterType: MasterCard['type'];
}

export type Character = Monster | Master;

export type ActionType = 'move' | 'attack' | 'skill' | 'evolve' | null;

export interface PendingAction {
  type: ActionType;
  targetId?: string;
  position?: Position;
}

export interface AnimationSequence {
  id: string;
  type: 'move' | 'attack' | 'damage' | 'heal' | 'ko' | 'crystal-gain' | 'turn-start' | 'evolve';
}

// 🔧 座標ベースのゲーム状態管理
export interface GameState {
  // ボード管理
  board: BoardState;
  
  // キャラクター管理（座標ベース）
  characters: Character[];
  
  // ゲーム進行
  currentTurn: number;
  gamePhase: 'preparation' | 'action' | 'result';
  currentTeam: Team;
  
  // 選択状態
  selectedCharacter: Character | null;
  selectedAction: ActionType;
  selectedSkill: Skill | null;
  pendingAction: PendingAction;
  
  // ターン管理
  turnOrder: Character[];
  actionPoints: number;
  maxActionPoints: number;
  
  // リソース管理
  playerCrystals: number;
  enemyCrystals: number;
  
  // アニメーション管理
  animationTarget?: { id: string; type: 'move' | 'attack' | 'damage' | 'heal' | 'ko' | 'crystal-gain' | 'turn-start' | 'evolve' } | null;
  pendingAnimations: AnimationSequence[];
  
  // デッキ管理
  savedDecks?: {
    host?: { master: keyof typeof import('../data/cardData').masterData; monsters: MonsterType[] };
    guest?: { master: keyof typeof import('../data/cardData').masterData; monsters: MonsterType[] };
  };
}

// 🔧 座標ベースのユーティリティ型
export interface CoordinateUtils {
  isValidPosition: (position: Position) => boolean;
  getAdjacentPositions: (position: Position) => Position[];
  getDistance: (pos1: Position, pos2: Position) => number;
  arePositionsEqual: (pos1: Position, pos2: Position) => boolean;
  getCharacterAt: (position: Position) => Character | undefined;
}