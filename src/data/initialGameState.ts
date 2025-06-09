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
  hostDeck?: { master: keyof typeof masterData; monsters: MonsterType[] },
  guestDeck?: { master: keyof typeof masterData; monsters: MonsterType[] }
): GameState => {
  const characters: Character[] = [];

  // デッキが指定されている場合のみキャラクターを配置
  if (hostDeck && guestDeck) {
    // ホストチーム - 指定された配置
    // マスターを中央前に配置
    characters.push(createMaster(hostDeck.master, { x: 1, y: 3 }, 'player'));

    // モンスターを指定された位置に配置
    // 左：1番目のモンスター、右：2番目のモンスター、上：3番目のモンスター
    const hostPositions = [
      { x: 0, y: 3 }, // 左：1番目のモンスター
      { x: 2, y: 3 }, // 右：2番目のモンスター  
      { x: 1, y: 2 }  // 上：3番目のモンスター
    ];
    
    hostDeck.monsters.forEach((monster, index) => {
      if (index < hostPositions.length) {
        characters.push(createMonster(monster, hostPositions[index], 'player'));
      }
    });

    // ゲストチーム - ホストと同じ配置（左右反転なし）
    // マスターを中央前に配置
    characters.push(createMaster(guestDeck.master, { x: 1, y: 0 }, 'enemy'));

    // モンスターを同じ配置
    // 左：1番目のモンスター、右：2番目のモンスター、下：3番目のモンスター
    const guestPositions = [
      { x: 0, y: 0 }, // 左：1番目のモンスター
      { x: 2, y: 0 }, // 右：2番目のモンスター
      { x: 1, y: 1 }  // 下：3番目のモンスター
    ];
    
    guestDeck.monsters.forEach((monster, index) => {
      if (index < guestPositions.length) {
        characters.push(createMonster(monster, guestPositions[index], 'enemy'));
      }
    });
  } else {
    // デフォルト編成（ブルーマスター + ベアー、ウルフ、ゴーレム）
    const defaultHostDeck = { master: 'blue' as keyof typeof masterData, monsters: ['bear', 'wolf', 'golem'] as MonsterType[] };
    const defaultGuestDeck = { master: 'red' as keyof typeof masterData, monsters: ['bear', 'wolf', 'golem'] as MonsterType[] };
    
    // ホストチーム
    characters.push(createMaster(defaultHostDeck.master, { x: 1, y: 3 }, 'player'));
    const hostPositions = [
      { x: 0, y: 3 }, // 左：ベアー
      { x: 2, y: 3 }, // 右：ウルフ  
      { x: 1, y: 2 }  // 上：ゴーレム
    ];
    
    defaultHostDeck.monsters.forEach((monster, index) => {
      if (index < hostPositions.length) {
        characters.push(createMonster(monster, hostPositions[index], 'player'));
      }
    });

    // ゲストチーム
    characters.push(createMaster(defaultGuestDeck.master, { x: 1, y: 0 }, 'enemy'));
    const guestPositions = [
      { x: 2, y: 0 }, // 右：ベアー
      { x: 0, y: 0 }, // 左：ウルフ
      { x: 1, y: 1 }  // 下：ゴーレム
    ];
    
    defaultGuestDeck.monsters.forEach((monster, index) => {
      if (index < guestPositions.length) {
        characters.push(createMonster(monster, guestPositions[index], 'enemy'));
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