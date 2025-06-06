export type CharacterType = 'monster' | 'master';
export type Team = 'player' | 'enemy';
export type MonsterType = 'wolf' | 'golem' | 'bear' | 'star-wolf' | 'iron-golem' | 'white-bear' | 'slime' | 'whale' | 'king-whale' | 'red-dragon' | 'blue-dragon' | 'yellow-dragon' | 'green-dragon' | 'white-dragon' | 'black-dragon';

export interface Position {
  x: number;
  y: number;
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

export interface GameState {
  characters: Character[];
  currentTurn: number;
  selectedCharacter: Character | null;
  selectedAction: ActionType;
  selectedSkill: Skill | null;
  gamePhase: 'preparation' | 'action' | 'result';
  turnOrder: Character[];
  actionPoints: number;
  maxActionPoints: number;
  currentTeam: Team;
  pendingAction: PendingAction;
  playerCrystals: number;
  enemyCrystals: number;
  animationTarget?: { id: string; type: 'move' | 'attack' | 'damage' | 'heal' | 'ko' | 'crystal-gain' | 'turn-start' | 'evolve' } | null;
  pendingAnimations: AnimationSequence[];
}