import { MonsterType } from '../types/gameTypes';

export const monsterData: Record<MonsterType, {
  name: string;
  hp: number;
  attack: number;
  defense: number;
  actions: number;
  baseImage: string;
  evolution?: MonsterType;
}> = {
  'wolf': {
    name: 'ウルフ',
    hp: 3,
    attack: 1,
    defense: 0,
    actions: 2,
    baseImage: 'https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%82%A6%E3%83%AB%E3%83%95.png?alt=media&token=15418287-edda-486e-9815-1ebb4b2da203',
    evolution: 'star-wolf'
  },
  'golem': {
    name: 'ゴーレム',
    hp: 2,
    attack: 1,
    defense: 1,
    actions: 1,
    baseImage: 'https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%82%B3%E3%82%99%E3%83%BC%E3%83%AC%E3%83%A0.png?alt=media&token=868ad28d-288a-4041-999b-4efde6460400',
    evolution: 'iron-golem'
  },
  'bear': {
    name: 'ベアー',
    hp: 3,
    attack: 2,
    defense: 0,
    actions: 1,
    baseImage: 'https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%83%98%E3%82%99%E3%82%A2%E3%83%BC.png?alt=media&token=d186d7fc-8c38-4b3d-bc86-0eb1f2932cc8',
    evolution: 'white-bear'
  },
  'star-wolf': {
    name: 'スターウルフ',
    hp: 3,
    attack: 2,
    defense: 0,
    actions: 2,
    baseImage: 'https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%82%B9%E3%82%BF%E3%83%BC%E3%82%A6%E3%83%AB%E3%83%95.png?alt=media&token=222f5b7e-49a5-489b-86f8-3d529e9cd0fa'
  },
  'iron-golem': {
    name: 'アイアンゴーレム',
    hp: 2,
    attack: 2,
    defense: 1,
    actions: 1,
    baseImage: 'https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%82%A2%E3%82%A4%E3%82%A2%E3%83%B3%E3%82%B3%E3%82%99%E3%83%BC%E3%83%AC%E3%83%A0.png?alt=media&token=5117d52b-3b4d-48fa-8cfa-a650e0a930e0'
  },
  'white-bear': {
    name: 'ホワイトベアー',
    hp: 3,
    attack: 3,
    defense: 0,
    actions: 1,
    baseImage: 'https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%83%9B%E3%83%AF%E3%82%A4%E3%83%88%E3%83%98%E3%82%99%E3%82%A2%E3%83%BC.png?alt=media&token=ac221df6-cffa-43b0-9ef5-1e41d920c280'
  }
};

export const masterData = {
  player: {
    name: 'マスター',
    hp: 3,
    attack: 1,
    defense: 1,
    actions: 1,
    image: 'https://1.bp.blogspot.com/-IS0LxJHJ_Uk/VCOJAcpVgKI/AAAAAAAAm3o/oKxjcjyIgTg/s800/animal_penguin.png',
    skills: [{
      name: 'いかりのいちげき',
      description: 'ちかくのてきにこうげき（+1）をあたえる',
      damage: 1,
      range: 1,
      crystalCost: 3
    }]
  },
  enemy: {
    name: 'てきマスター',
    hp: 3,
    attack: 1,
    defense: 1,
    actions: 1,
    image: 'https://4.bp.blogspot.com/-6t-gBJZyKj8/VCOJAjK_XXI/AAAAAAAAm3w/WS5XxT9frSE/s800/animal_owl.png',
    skills: [{
      name: 'いかりのいちげき',
      description: 'ちかくのてきにこうげき（+1）をあたえる',
      damage: 1,
      range: 1,
      crystalCost: 3
    }]
  }
};