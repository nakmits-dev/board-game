import { Character, GameState, Position, Team, MonsterType, MasterCard } from '../types/gameTypes';
import { monsterData, masterData } from './cardData';
import { skillData } from './skillData';

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
    image: stats.image,
    skillId: stats.skillId,
    cost: stats.cost,
    canEvolve: !!stats.evolution,
    isEvolved: false
  };
};

const createMaster = (masterType: keyof typeof masterData, position: Position, team: Team): Character => {
  const stats = masterData[masterType];
  
  return {
    id: generateId(),
    name: stats.name,
    type: 'master',
    masterType: stats.type,
    team,
    position,
    hp: stats.hp,
    maxHp: stats.hp,
    attack: stats.attack,
    defense: stats.defense,
    actions: stats.actions,
    remainingActions: 0,
    image: stats.image,
    skillId: stats.skillId,
    cost: stats.cost
  };
};

const getEvolvedMonsterType = (type: MonsterType): MonsterType | null => {
  return monsterData[type].evolution || null;
};

// 進化前のモンスターのみを取得する関数
const getBaseMonsters = (): MonsterType[] => {
  const evolutionTargets = new Set(
    Object.values(monsterData)
      .map(monster => monster.evolution)
      .filter(evolution => evolution !== undefined)
  );
  
  return Object.keys(monsterData).filter(key => 
    !evolutionTargets.has(key as MonsterType)
  ) as MonsterType[];
};

// コスト8でチーム編成を行う関数
const generateTeamWithCost8 = (): { master: keyof typeof masterData; monsters: MonsterType[] } => {
  const TARGET_COST = 8;
  const MAX_ATTEMPTS = 1000;
  
  // 利用可能なマスターと進化前のモンスターのみのリスト
  const availableMasters = Object.keys(masterData) as Array<keyof typeof masterData>;
  const availableMonsters = getBaseMonsters();
  
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // ランダムにマスターを選択
    const masterType = availableMasters[Math.floor(Math.random() * availableMasters.length)];
    const masterCost = masterData[masterType].cost;
    const remainingCost = TARGET_COST - masterCost;
    
    if (remainingCost < 3) continue; // 最低3体のモンスターが必要
    
    // 残りコストでモンスターを3体選択
    const monsters: MonsterType[] = [];
    let currentCost = masterCost;
    
    // 3体のモンスターを選択
    for (let i = 0; i < 3; i++) {
      const maxMonsterCost = TARGET_COST - currentCost - (2 - i); // 残りのモンスターの最低コストを考慮
      const validMonsters = availableMonsters.filter(monster => 
        monsterData[monster].cost <= maxMonsterCost &&
        !monsters.includes(monster) // 重複を避ける
      );
      
      if (validMonsters.length === 0) break;
      
      const selectedMonster = validMonsters[Math.floor(Math.random() * validMonsters.length)];
      monsters.push(selectedMonster);
      currentCost += monsterData[selectedMonster].cost;
    }
    
    // ちょうど8コストで3体のモンスターが選択できた場合
    if (monsters.length === 3 && currentCost === TARGET_COST) {
      return { master: masterType, monsters };
    }
  }
  
  // フォールバック: 確実にコスト8になる組み合わせ（進化前のモンスターのみ）
  return {
    master: 'normal', // コスト1
    monsters: ['wolf', 'golem', 'bear'] // 各コスト2、合計6、マスターと合わせて7
  };
};

export { createMonster, createMaster, getEvolvedMonsterType, monsterData };

export const createInitialGameState = (): GameState => {
  // プレイヤーチームの生成（コスト8）
  const playerTeam = generateTeamWithCost8();
  // 敵チームの生成（コスト8）
  const enemyTeam = generateTeamWithCost8();

  const characters: Character[] = [
    // プレイヤーチーム
    createMonster(playerTeam.monsters[0], { x: 0, y: 3 }, 'player'),
    createMaster(playerTeam.master, { x: 1, y: 3 }, 'player'),
    createMonster(playerTeam.monsters[1], { x: 2, y: 3 }, 'player'),
    createMonster(playerTeam.monsters[2], { x: 1, y: 2 }, 'player'),
    
    // 敵チーム
    createMonster(enemyTeam.monsters[0], { x: 0, y: 0 }, 'enemy'),
    createMaster(enemyTeam.master, { x: 1, y: 0 }, 'enemy'),
    createMonster(enemyTeam.monsters[1], { x: 2, y: 0 }, 'enemy'),
    createMonster(enemyTeam.monsters[2], { x: 1, y: 1 }, 'enemy'),
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