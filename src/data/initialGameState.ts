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
  const characters: Character[] = [];

  // デッキが指定されている場合のみキャラクターを配置
  if (playerDeck && enemyDeck) {
    // プレイヤーチーム - 指定された配置
    // マスターを中央前に配置
    characters.push(createMaster(playerDeck.master, { x: 1, y: 3 }, 'player'));

    // モンスターを指定された位置に配置
    // 左：1番目のモンスター、右：2番目のモンスター、上：3番目のモンスター
    const playerPositions = [
      { x: 0, y: 3 }, // 左：1番目のモンスター
      { x: 2, y: 3 }, // 右：2番目のモンスター  
      { x: 1, y: 2 }  // 上：3番目のモンスター
    ];
    
    playerDeck.monsters.forEach((monster, index) => {
      if (index < playerPositions.length) {
        characters.push(createMonster(monster, playerPositions[index], 'player'));
      }
    });

    // 敵チーム - プレイヤーと同じ配置（左右反転なし）
    // マスターを中央前に配置
    characters.push(createMaster(enemyDeck.master, { x: 1, y: 0 }, 'enemy'));

    // モンスターを同じ配置
    // 左：1番目のモンスター、右：2番目のモンスター、下：3番目のモンスター
    const enemyPositions = [
      { x: 0, y: 0 }, // 左：1番目のモンスター
      { x: 2, y: 0 }, // 右：2番目のモンスター
      { x: 1, y: 1 }  // 下：3番目のモンスター
    ];
    
    enemyDeck.monsters.forEach((monster, index) => {
      if (index < enemyPositions.length) {
        characters.push(createMonster(monster, enemyPositions[index], 'enemy'));
      }
    });
  } else {
    // デフォルト編成（ブルーマスター + ウルフ、ベアー、ゴーレム）
    const defaultPlayerDeck = { master: 'blue' as keyof typeof masterData, monsters: ['wolf', 'bear', 'golem'] as MonsterType[] };
    const defaultEnemyDeck = { master: 'red' as keyof typeof masterData, monsters: ['wolf', 'bear', 'golem'] as MonsterType[] };
    
    // プレイヤーチーム
    characters.push(createMaster(defaultPlayerDeck.master, { x: 1, y: 3 }, 'player'));
    const playerPositions = [
      { x: 0, y: 3 }, // 左：ウルフ
      { x: 2, y: 3 }, // 右：ベアー  
      { x: 1, y: 2 }  // 上：ゴーレム
    ];
    
    defaultPlayerDeck.monsters.forEach((monster, index) => {
      if (index < playerPositions.length) {
        characters.push(createMonster(monster, playerPositions[index], 'player'));
      }
    });

    // 敵チーム
    characters.push(createMaster(defaultEnemyDeck.master, { x: 1, y: 0 }, 'enemy'));
    const enemyPositions = [
      { x: 0, y: 0 }, // 左：ウルフ
      { x: 2, y: 0 }, // 右：ベアー
      { x: 1, y: 1 }  // 下：ゴーレム
    ];
    
    defaultEnemyDeck.monsters.forEach((monster, index) => {
      if (index < enemyPositions.length) {
        characters.push(createMonster(monster, enemyPositions[index], 'enemy'));
      }
    });
  }

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