import { Skill } from '../types/gameTypes';

export const skillData: Record<string, Skill> = {
  'rage-strike': {
    id: 'rage-strike',
    name: 'いかりのいちげき',
    description: 'ちかくのてきにこうげき（+1）をあたえる',
    damage: 1,
    range: 1,
    crystalCost: 3
  },
  'heal': {
    id: 'heal',
    name: 'かいふく',
    description: 'みかたのたいりょくを2かいふくする',
    healing: 2,
    range: 999,
    crystalCost: 2
  },
  'curse': {
    id: 'curse',
    name: 'のろい',
    description: 'てきのたいりょくを１へらす',
    damage: 1,
    range: 999,
    crystalCost: 1,
    ignoreDefense: true
  },
  'evolve': {
    id: 'evolve',
    name: 'しんか',
    description: 'みかたモンスターをしんかさせる',
    range: 999,
    crystalCost: 3,
    effects: [{ type: 'evolve' }]
  }
};