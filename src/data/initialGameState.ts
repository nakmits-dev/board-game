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

// コスト8でチーム編成を行う関数（マスター必須、モンスター3体必須）
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
    
    // 3体のモンスターでちょうど残りコストになる組み合わせを探す
    const attempts = [];
    for (let i = 0; i < availableMonsters.length; i++) {
      for (let j = 0; j < availableMonsters.length; j++) {
        for (let k = 0; k < availableMonsters.length; k++) {
          // 同じモンスターが重複しないようにチェック
          if (i === j || j === k || i === k) continue;
          
          const monster1 = availableMonsters[i];
          const monster2 = availableMonsters[j];
          const monster3 = availableMonsters[k];
          
          const totalMonsterCost = monsterData[monster1].cost + monsterData[monster2].cost + monsterData[monster3].cost;
          
          if (totalMonsterCost === remainingCost) {
            attempts.push([monster1, monster2, monster3]);
          }
        }
      }
    }
    
    if (attempts.length > 0) {
      // ランダムに組み合わせを選択
      const selectedCombination = attempts[Math.floor(Math.random() * attempts.length)];
      return { master: masterType, monsters: selectedCombination };
    }
  }
  
  // フォールバック: 確実にコスト8になる組み合わせ
  return {
    master: 'red', // コスト2
    monsters: ['wolf', 'golem', 'bear'] // 各コスト2、合計6、マスターと合わせて8
  };
};

export { createMonster, createMaster, getEvolvedMonsterType, monsterData, generateTeamWithCost8 };

export const createInitialGameState = (
  playerDeck?: { master: keyof typeof masterData; monsters: MonsterType[] },
  enemyDeck?: { master: keyof typeof masterData; monsters: MonsterType[] }
): GameState => {
  // プレイヤーチームの生成（指定されていない場合はランダム）
  const playerTeam = playerDeck || generateTeamWithCost8();
  // 敵チームの生成（指定されていない場合はランダム）
  const enemyTeam = enemyDeck || generateTeamWithCost8();

  const characters: Character[] = [];

  // プレイヤーチーム
  // マスターを中央前に配置
  characters.push(createMaster(playerTeam.master, { x: 1, y: 3 }, 'player'));

  // モンスターを配置（最大3体）
  const availablePlayerPositions = [{ x: 0, y: 3 }, { x: 2, y: 3 }, { x: 1, y: 2 }];
  playerTeam.monsters.forEach((monster, index) => {
    if (index < availablePlayerPositions.length) {
      characters.push(createMonster(monster, availablePlayerPositions[index], 'player'));
    }
  });

  // 敵チーム
  // マスターを中央前に配置
  characters.push(createMaster(enemyTeam.master, { x: 1, y: 0 }, 'enemy'));

  // モンスターを配置（最大3体）
  const availableEnemyPositions = [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }];
  enemyTeam.monsters.forEach((monster, index) => {
    if (index < availableEnemyPositions.length) {
      characters.push(createMonster(monster, availableEnemyPositions[index], 'enemy'));
    }
  });

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