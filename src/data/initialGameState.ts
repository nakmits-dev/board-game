import { Character, GameState, Position, Team, MonsterType, MasterCard, BoardState, BoardCell } from '../types/gameTypes';
import { monsterData, masterData } from './cardData';
import { skillData } from './skillData';
import { createEmptyBoard, updateBoardWithCharacters, PLACEMENT_POSITIONS } from '../utils/boardUtils';

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

// 🔧 統一された配置座標定義（チーム編成と対戦画面で完全一致）
const TEAM_POSITIONS = PLACEMENT_POSITIONS;

// 🔧 ボードからキャラクターを抽出する関数
const extractCharactersFromBoard = (board: BoardCell[][]): Character[] => {
  const characters: Character[] = [];
  
  for (let y = 0; y < board.length; y++) {
    for (let x = 0; x < board[y].length; x++) {
      const cell = board[y][x];
      if (cell.character) {
        characters.push(cell.character);
      }
    }
  }
  
  return characters;
};

export { createMonster, createMaster, getEvolvedMonsterType, monsterData, generateTeamWithCost8, TEAM_POSITIONS };

export const createInitialGameState = (
  hostBoard?: BoardCell[][],
  guestBoard?: BoardCell[][]
): GameState => {
  let characters: Character[] = [];
  
  // 🔧 空のボードを作成
  const board = createEmptyBoard();

  // ボードが指定されている場合のみキャラクターを配置
  if (hostBoard && guestBoard) {
    // 🔧 ボードからキャラクターを抽出
    const hostCharacters = extractCharactersFromBoard(hostBoard);
    const guestCharacters = extractCharactersFromBoard(guestBoard);
    
    characters = [...hostCharacters, ...guestCharacters];
  } else {
    // デフォルト編成
    const defaultHostDeck = { master: 'blue' as keyof typeof masterData, monsters: ['wolf', 'bear', 'golem'] as MonsterType[] };
    const defaultGuestDeck = { master: 'red' as keyof typeof masterData, monsters: ['bear', 'wolf', 'golem'] as MonsterType[] };
    
    // 🔧 デフォルト編成も同じ座標システムを使用
    characters.push(createMaster(defaultHostDeck.master, TEAM_POSITIONS.player.master, 'player'));
    defaultHostDeck.monsters.forEach((monster, index) => {
      if (index < TEAM_POSITIONS.player.monsters.length) {
        characters.push(createMonster(monster, TEAM_POSITIONS.player.monsters[index], 'player'));
      }
    });

    characters.push(createMaster(defaultGuestDeck.master, TEAM_POSITIONS.enemy.master, 'enemy'));
    defaultGuestDeck.monsters.forEach((monster, index) => {
      if (index < TEAM_POSITIONS.enemy.monsters.length) {
        characters.push(createMonster(monster, TEAM_POSITIONS.enemy.monsters[index], 'enemy'));
      }
    });
  }

  // 🔧 ボードにキャラクターを配置
  const updatedBoard = updateBoardWithCharacters(board, characters);

  return {
    // 🔧 ボード状態を追加
    board: updatedBoard,
    
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