import { MonsterCard, MasterCard, MonsterType } from '../types/gameTypes';

export const monsterData: Record<string, MonsterCard> = {
  'wolf': {
    name: 'ウルフ',
    hp: 3,
    attack: 1,
    defense: 0,
    actions: 2,
    image: 'https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%82%A6%E3%83%AB%E3%83%95.png?alt=media&token=15418287-edda-486e-9815-1ebb4b2da203',
    evolution: 'star-wolf',
    skillId: '',
    cost: 2
  },
  'golem': {
    name: 'ゴーレム',
    hp: 2,
    attack: 1,
    defense: 1,
    actions: 1,
    image: 'https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%82%B3%E3%82%99%E3%83%BC%E3%83%AC%E3%83%A0.png?alt=media&token=868ad28d-288a-4041-999b-4efde6460400',
    evolution: 'iron-golem',
    skillId: '',
    cost: 2
  },
  'bear': {
    name: 'ベアー',
    hp: 3,
    attack: 2,
    defense: 0,
    actions: 1,
    image: 'https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%83%98%E3%82%99%E3%82%A2%E3%83%BC.png?alt=media&token=d186d7fc-8c38-4b3d-bc86-0eb1f2932cc8',
    evolution: 'white-bear',
    skillId: '',
    cost: 2
  },
  'star-wolf': {
    name: 'スターウルフ',
    hp: 3,
    attack: 2,
    defense: 0,
    actions: 2,
    image: 'https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%82%B9%E3%82%BF%E3%83%BC%E3%82%A6%E3%83%AB%E3%83%95.png?alt=media&token=222f5b7e-49a5-489b-86f8-3d529e9cd0fa',
    skillId: '',
    cost: 2
  },
  'iron-golem': {
    name: 'アイアンゴーレム',
    hp: 2,
    attack: 2,
    defense: 1,
    actions: 1,
    image: 'https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%82%A2%E3%82%A4%E3%82%A2%E3%83%B3%E3%82%B3%E3%82%99%E3%83%BC%E3%83%AC%E3%83%A0.png?alt=media&token=5117d52b-3b4d-48fa-8cfa-a650e0a930e0',
    skillId: '',
    cost: 2
  },
  'white-bear': {
    name: 'ホワイトベアー',
    hp: 3,
    attack: 3,
    defense: 0,
    actions: 1,
    image: 'https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%83%9B%E3%83%AF%E3%82%A4%E3%83%88%E3%83%98%E3%82%99%E3%82%A2%E3%83%BC.png?alt=media&token=ac221df6-cffa-43b0-9ef5-1e41d920c280',
    skillId: '',
    cost: 2
  },
  'slime': {
    name: 'スライム',
    hp: 3,
    attack: 1,
    defense: 0,
    actions: 1,
    image: 'https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%A0.png?alt=media&token=7fc5b636-fd93-4049-83f2-a9644dcc01f1',
    evolution: 'red-slime',
    skillId: '',
    cost: 1
  },
  'red-slime': {
    name: 'レッドスライム',
    hp: 3,
    attack: 2,
    defense: 0,
    actions: 1,
    image: 'https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%83%AC%E3%83%83%E3%83%88%E3%82%99%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%A0.png?alt=media&token=4c2daebc-8929-4911-8f99-cbd4a26fc02e',
    skillId: '',
    cost: 1
  },
  'whale': {
    name: 'ホエール',
    hp: 4,
    attack: 1,
    defense: 0,
    actions: 1,
    image: 'https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%83%9B%E3%82%A8%E3%83%BC%E3%83%AB.png?alt=media&token=cc1ee78b-acca-45cc-b2f6-c5e5d5e05fde',
    evolution: 'king-whale',
    skillId: '',
    cost: 2
  },
  'king-whale': {
    name: 'キングホエール',
    hp: 4,
    attack: 2,
    defense: 0,
    actions: 1,
    image: 'https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%82%AD%E3%83%B3%E3%82%AF%E3%82%99%E3%83%9B%E3%82%A8%E3%83%BC%E3%83%AB.png?alt=media&token=c5acebcd-a4cb-43a8-a346-1c077b9f1fcc',
    skillId: '',
    cost: 2
  },
  'red-dragon': {
    name: 'レッドドラゴン',
    hp: 3,
    attack: 2,
    defense: 0,
    actions: 1,
    image: 'https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%83%AC%E3%83%83%E3%83%88%E3%82%99%E3%83%88%E3%82%99%E3%83%A9%E3%82%B3%E3%82%99%E3%83%B3.png?alt=media&token=19659ad8-cb12-466b-be2d-6561d66da478',
    skillId: 'rage-strike',
    cost: 3
  },
  'blue-dragon': {
    name: 'ブルードラゴン',
    hp: 2,
    attack: 1,
    defense: 1,
    actions: 1,
    image: 'https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%83%95%E3%82%99%E3%83%AB%E3%83%BC%E3%83%88%E3%82%99%E3%83%A9%E3%82%B3%E3%82%99%E3%83%B3.png?alt=media&token=9fd92c08-291d-47de-a114-cfb193cbb7a8',
    skillId: 'rage-strike',
    cost: 3
  },
  'yellow-dragon': {
    name: 'イエロードラゴン',
    hp: 3,
    attack: 1,
    defense: 0,
    actions: 2,
    image: 'https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%82%A4%E3%82%A8%E3%83%AD%E3%83%BC%E3%83%88%E3%82%99%E3%83%A9%E3%82%B3%E3%82%99%E3%83%B3.png?alt=media&token=3336ee4b-1641-4d24-bcd0-b115d481f55c',
    skillId: 'rage-strike',
    cost: 3
  },
  'green-dragon': {
    name: 'グリーンドラゴン',
    hp: 3,
    attack: 1,
    defense: 0,
    actions: 1,
    image: 'https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%82%AF%E3%82%99%E3%83%AA%E3%83%BC%E3%83%B3%E3%83%88%E3%82%99%E3%83%A9%E3%82%B3%E3%82%99%E3%83%B3.png?alt=media&token=b52f9674-b161-4dae-9ff5-8abda7198a49',
    skillId: 'heal',
    cost: 3
  },
  'white-dragon': {
    name: 'ホワイトドラゴン',
    hp: 3,
    attack: 1,
    defense: 0,
    actions: 1,
    image: 'https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%83%9B%E3%83%AF%E3%82%A4%E3%83%88%E3%83%89%E3%83%A9%E3%82%B4%E3%83%B3.png?alt=media&token=c1d2f5c4-c851-4f5c-9c2c-c3f2d5b0c9f0',
    skillId: 'evolve',
    cost: 3
  },
  'black-dragon': {
    name: 'ブラックドラゴン',
    hp: 3,
    attack: 1,
    defense: 0,
    actions: 1,
    image: 'https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%83%96%E3%83%A9%E3%83%83%E3%82%AF%E3%83%89%E3%83%A9%E3%82%B4%E3%83%B3.png?alt=media&token=c1d2f5c4-c851-4f5c-9c2c-c3f2d5b0c9f0',
    skillId: 'curse',
    cost: 3
  }
};

export const masterData: Record<string, MasterCard> = {
  'normal': {
    type: 'normal',
    name: 'マスター',
    hp: 3,
    attack: 1,
    defense: 0,
    actions: 1,
    image: 'https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%83%9E%E3%82%B9%E3%82%BF%E3%83%BC.png?alt=media&token=16df62e1-4321-4e44-9f9d-9b3ca7a87881',
    skillId: '',
    cost: 1
  },
  'red': {
    type: 'red',
    name: 'レッドマスター',
    hp: 4,
    attack: 2,
    defense: 0,
    actions: 1,
    image: 'https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%83%AC%E3%83%83%E3%83%88%E3%82%99%E3%83%9E%E3%82%B9%E3%82%BF%E3%83%BC.png?alt=media&token=fd69b68f-1b5c-4567-9366-390075721d0a',
    skillId: 'rage-strike',
    cost: 2
  },
  'blue': {
    type: 'blue',
    name: 'ブルーマスター',
    hp: 2,
    attack: 1,
    defense: 1,
    actions: 1,
    image: 'https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%83%95%E3%82%99%E3%83%AB%E3%83%BC%E3%83%9E%E3%82%B9%E3%82%BF%E3%83%BC.png?alt=media&token=dd68a34b-6faf-46e2-9811-618817775bf6',
    skillId: 'rage-strike',
    cost: 2
  },
  'green': {
    type: 'green',
    name: 'グリーンマスター',
    hp: 3,
    attack: 1,
    defense: 0,
    actions: 1,
    image: 'https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%82%AF%E3%82%99%E3%83%AA%E3%83%BC%E3%83%B3%E3%83%9E%E3%82%B9%E3%82%BF%E3%83%BC.png?alt=media&token=aa048204-d0cf-4c65-b82d-6610c5e470d9',
    skillId: 'heal',
    cost: 2
  },
  'yellow': {
    type: 'yellow',
    name: 'イエローマスター',
    hp: 3,
    attack: 1,
    defense: 0,
    actions: 2,
    image: 'https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%82%A4%E3%82%A8%E3%83%AD%E3%83%BC%E3%83%9E%E3%82%B9%E3%82%BF%E3%83%BC.png?alt=media&token=c5ddeab9-f3d5-4a64-aa06-b5a6aad15c20',
    skillId: 'rage-strike',
    cost: 2
  },
  'black': {
    type: 'black',
    name: 'ブラックマスター',
    hp: 3,
    attack: 1,
    defense: 0,
    actions: 1,
    image: 'https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%83%95%E3%82%99%E3%83%A9%E3%83%83%E3%82%AF%E3%83%9E%E3%82%B9%E3%82%BF%E3%83%BC.png?alt=media&token=0a217249-76a4-4004-9522-fd9a6e249d93',
    skillId: 'curse',
    cost: 2
  },
  'white': {
    type: 'white',
    name: 'ホワイトマスター',
    hp: 3,
    attack: 1,
    defense: 0,
    actions: 1,
    image: 'https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%83%9B%E3%83%AF%E3%82%A4%E3%83%88%E3%83%9E%E3%82%B9%E3%82%BF%E3%83%BC.png?alt=media&token=6b6ed683-2bed-44fa-be70-94230c7bda16',
    skillId: 'evolve',
    cost: 2
  }
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
export const generateTeamWithCost8 = (): { master: keyof typeof masterData; monsters: MonsterType[] } => {
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