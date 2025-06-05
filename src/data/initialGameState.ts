import { Character, GameState, Position, Team, MonsterType } from '../types/gameTypes';
import { monsterData, masterData } from './cardData';

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

const createMonster = (type: MonsterType, position: Position, team: Team): Character => {
  const stats = monsterData[type];
  
  return {
    id: generateId(),
    name: stats.name,
    type: 'monster',
    monsterType: type,
    team,
    position,
    hp: stats.hp,
    maxHp: stats.hp,
    attack: stats.attack,
    defense: stats.defense,
    actions: stats.actions,
    remainingActions: 0,
    image: stats.baseImage,
    skills: [],
    canEvolve: !!stats.evolution,
    isEvolved: false
  };
};

const createMaster = (position: Position, team: Team): Character => {
  const data = team === 'player' ? masterData.player : masterData.enemy;
  
  return {
    id: generateId(),
    name: data.name,
    type: 'master',
    team,
    position,
    hp: data.hp,
    maxHp: data.hp,
    attack: data.attack,
    defense: data.defense,
    actions: data.actions,
    remainingActions: 0,
    image: data.image,
    skills: data.skills.map(skill => ({
      id: generateId(),
      ...skill
    })),
  };
};

const getEvolvedMonsterType = (type: MonsterType): MonsterType | null => {
  return monsterData[type].evolution || null;
};

const getRandomMonsterTypes = (): MonsterType[] => {
  const baseTypes: MonsterType[] = ['wolf', 'golem', 'bear'];
  const shuffled = [...baseTypes].sort(() => Math.random() - 0.5);
  return shuffled;
};

export { createMonster, createMaster, getEvolvedMonsterType, monsterData };

export const createInitialGameState = (): GameState => {
  const playerMonsters = getRandomMonsterTypes();
  const enemyMonsters = getRandomMonsterTypes();

  const characters: Character[] = [
    createMonster(playerMonsters[0], { x: 0, y: 3 }, 'player'),
    createMaster({ x: 1, y: 3 }, 'player'),
    createMonster(playerMonsters[1], { x: 2, y: 3 }, 'player'),
    createMonster(playerMonsters[2], { x: 1, y: 2 }, 'player'),
    
    createMonster(enemyMonsters[0], { x: 0, y: 0 }, 'enemy'),
    createMaster({ x: 1, y: 0 }, 'enemy'),
    createMonster(enemyMonsters[1], { x: 2, y: 0 }, 'enemy'),
    createMonster(enemyMonsters[2], { x: 1, y: 1 }, 'enemy'),
  ];

  return {
    characters,
    currentTurn: 0,
    selectedCharacter: null,
    selectedAction: null,
    selectedSkill: null,
    gamePhase: 'preparation',
    turnOrder: characters,
    actionPoints: 2,
    maxActionPoints: 2,
    currentTeam: 'player',
    pendingAction: { type: null },
    playerCrystals: 0,
    enemyCrystals: 0,
    pendingAnimations: [],
    animationTarget: null,
  };
};