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
    baseImage: 'https://2.bp.blogspot.com/-u7NQvEkCv6s/VCOJBdPyWEI/AAAAAAAAm4E/AQf_2vH0YWc/s800/character_golem.png',
    evolution: 'iron-golem'
  },
  'bear': {
    name: 'ベアー',
    hp: 3,
    attack: 2,
    defense: 0,
    actions: 1,
    baseImage: 'https://2.bp.blogspot.com/-UXxdKOzEzqE/VCOJAEDQn9I/AAAAAAAAm3k/wLHDAlq_q_4/s800/animal_kuma.png',
    evolution: 'white-bear'
  },
  'star-wolf': {
    name: 'スターウルフ',
    hp: 3,
    attack: 2,
    defense: 0,
    actions: 2,
    baseImage: 'https://3.bp.blogspot.com/-QGn6UqH_vgg/VCOJBODwGPI/AAAAAAAAm38/HNAaR19jFCo/s800/character_wolf.png'
  },
  'iron-golem': {
    name: 'アイアンゴーレム',
    hp: 2,
    attack: 2,
    defense: 1,
    actions: 1,
    baseImage: 'https://4.bp.blogspot.com/-ELwPVkEzN_Q/VCOJBcL3pSI/AAAAAAAAm4I/wLJ_CYp3EFI/s800/character_iron_golem.png'
  },
  'white-bear': {
    name: 'ホワイトベアー',
    hp: 3,
    attack: 3,
    defense: 0,
    actions: 1,
    baseImage: 'https://1.bp.blogspot.com/-LFh4mfdjPSQ/VCOJBBhPGEI/AAAAAAAAm4A/d4K5d2rRJUE/s800/character_shirokuma.png'
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