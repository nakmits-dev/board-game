import { MonsterCard, MasterCard } from '../types/gameTypes';

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
    image: 'https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%A0.png?alt=media&token=c1d2f5c4-c851-4f5c-9c2c-c3f2d5b0c9f0',
    skillId: '',
    cost: 1
  },
  'whale': {
    name: 'ホエール',
    hp: 5,
    attack: 1,
    defense: 0,
    actions: 1,
    image: 'https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%83%9B%E3%82%A8%E3%83%BC%E3%83%AB.png?alt=media&token=c1d2f5c4-c851-4f5c-9c2c-c3f2d5b0c9f0',
    evolution: 'king-whale',
    skillId: '',
    cost: 2
  },
  'king-whale': {
    name: 'キングホエール',
    hp: 5,
    attack: 2,
    defense: 0,
    actions: 1,
    image: 'https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%82%AD%E3%83%B3%E3%82%B0%E3%83%9B%E3%82%A8%E3%83%BC%E3%83%AB.png?alt=media&token=c1d2f5c4-c851-4f5c-9c2c-c3f2d5b0c9f0',
    skillId: '',
    cost: 2
  }
};

export const masterData: Record<string, MasterCard> = {
  'master': {
    type: 'master',
    name: 'マスター',
    hp: 3,
    attack: 1,
    defense: 0,
    actions: 1,
    image: 'https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%83%9E%E3%82%B9%E3%82%BF%E3%83%BC.png?alt=media&token=c1d2f5c4-c851-4f5c-9c2c-c3f2d5b0c9f0',
    skillId: '',
    cost: 1
  },
  'red-dragon': {
    type: 'red-dragon',
    name: 'レッドドラゴン',
    hp: 3,
    attack: 2,
    defense: 0,
    actions: 1,
    image: 'https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%83%AC%E3%83%83%E3%83%89%E3%83%89%E3%83%A9%E3%82%B4%E3%83%B3.png?alt=media&token=c1d2f5c4-c851-4f5c-9c2c-c3f2d5b0c9f0',
    skillId: 'rage-strike',
    cost: 3
  },
  'blue-dragon': {
    type: 'blue-dragon',
    name: 'ブルードラゴン',
    hp: 3,
    attack: 1,
    defense: 1,
    actions: 1,
    image: 'https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%83%96%E3%83%AB%E3%83%BC%E3%83%89%E3%83%A9%E3%82%B4%E3%83%B3.png?alt=media&token=c1d2f5c4-c851-4f5c-9c2c-c3f2d5b0c9f0',
    skillId: 'rage-strike',
    cost: 3
  },
  'yellow-dragon': {
    type: 'yellow-dragon',
    name: 'イエロードラゴン',
    hp: 3,
    attack: 1,
    defense: 0,
    actions: 2,
    image: 'https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%82%A4%E3%82%A8%E3%83%AD%E3%83%BC%E3%83%89%E3%83%A9%E3%82%B4%E3%83%B3.png?alt=media&token=c1d2f5c4-c851-4f5c-9c2c-c3f2d5b0c9f0',
    skillId: 'rage-strike',
    cost: 3
  },
  'green-dragon': {
    type: 'green-dragon',
    name: 'グリーンドラゴン',
    hp: 3,
    attack: 1,
    defense: 0,
    actions: 1,
    image: 'https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%82%B0%E3%83%AA%E3%83%BC%E3%83%B3%E3%83%89%E3%83%A9%E3%82%B4%E3%83%B3.png?alt=media&token=c1d2f5c4-c851-4f5c-9c2c-c3f2d5b0c9f0',
    skillId: 'heal',
    cost: 3
  },
  'white-dragon': {
    type: 'white-dragon',
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
    type: 'black-dragon',
    name: 'ブラックドラゴン',
    hp: 3,
    attack: 1,
    defense: 0,
    actions: 2,
    image: 'https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%83%96%E3%83%A9%E3%83%83%E3%82%AF%E3%83%89%E3%83%A9%E3%82%B4%E3%83%B3.png?alt=media&token=c1d2f5c4-c851-4f5c-9c2c-c3f2d5b0c9f0',
    skillId: 'curse',
    cost: 3
  }
};