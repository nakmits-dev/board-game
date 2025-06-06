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

// コスト8以下でチーム編成を行う関数（マスター必須、モンスター任意）
const generateTeamWithMaxCost8 = (): { master: keyof typeof masterData; monsters: MonsterType[] } => {
  const MAX_COST = 8;
  const MAX_ATTEMPTS = 1000;
  
  // 利用可能なマスターと進化前のモンスターのみのリスト
  const availableMasters = Object.keys(masterData) as Array<keyof typeof masterData>;
  const availableMonsters = getBaseMonsters();
  
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // ランダムにマスターを選択
    const masterType = availableMasters[Math.floor(Math.random() * availableMasters.length)];
    const masterCost = masterData[masterType].cost;
    const remainingCost = MAX_COST - masterCost;
    
    // 残りコストでモンスターを選択（0〜3体）
    const monsters: MonsterType[] = [];
    let currentCost = masterCost;
    
    // 最大3体のモンスターを選択（コストが許す限り）
    for (let i = 0; i < 3; i++) {
      const validMonsters = availableMonsters.filter(monster => 
        monsterData[monster].cost <= remainingCost - (currentCost - masterCost) &&
        !monsters.includes(monster) // 重複を避ける
      );
      
      if (validMonsters.length === 0) break;
      
      // ランダムに選択するか、コストを節約するかを決める
      if (Math.random() < 0.8) { // 80%の確率でモンスターを追加
        const selectedMonster = validMonsters[Math.floor(Math.random() * validMonsters.length)];
        const monsterCost = monsterData[selectedMonster].cost;
        
        if (currentCost + monsterCost <= MAX_COST) {
          monsters.push(selectedMonster);
          currentCost += monsterCost;
        }
      }
    }
    
    // コストが8以下であれば成功
    if (currentCost <= MAX_COST) {
      return { master: masterType, monsters };
    }
  }
  
  // フォールバック: 確実にコスト8以下になる組み合わせ
  return {
    master: 'normal', // コスト1
    monsters: ['slime', 'slime'] // 各コスト1、合計2、マスターと合わせて3
  };
};

export { createMonster, createMaster, getEvolvedMonsterType, monsterData };

export const createInitialGameState = (
  playerDeck?: { master: keyof typeof masterData; monsters: MonsterType[] },
  enemyDeck?: { master: keyof typeof masterData; monsters: MonsterType[] }
): GameState => {
  // プレイヤーチームの生成（指定されていない場合はランダム）
  const playerTeam = playerDeck || generateTeamWithMaxCost8();
  // 敵チームの生成（指定されていない場合はランダム）
  const enemyTeam = enemyDeck || generateTeamWithMaxCost8();

  const characters: Character[] = [];

  // プレイヤーチーム
  const playerPositions = [
    { x: 0, y: 3 }, // 左前
    { x: 1, y: 3 }, // 中央前（マスター）
    { x: 2, y: 3 }, // 右前
    { x: 1, y: 2 }  // 中央後
  ];

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
  const enemyPositions = [
    { x: 0, y: 0 }, // 左前
    { x: 1, y: 0 }, // 中央前（マスター）
    { x: 2, y: 0 }, // 右前
    { x: 1, y: 1 }  // 中央後
  ];

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