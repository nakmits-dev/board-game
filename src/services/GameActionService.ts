// 🎯 Single Responsibility Principle: ゲームアクションの処理を専門に行うサービス
import { Character, Position, Team, AnimationSequence, MonsterType } from '../types/gameTypes';
import { skillData } from '../data/skillData';
import { getEvolvedMonsterType, monsterData } from '../data/initialGameState';
import { addGameHistoryMove } from '../components/GameHistory';

export interface ActionResult {
  success: boolean;
  characters: Character[];
  animations: AnimationSequence[];
  playerCrystals: number;
  enemyCrystals: number;
  gamePhase: 'preparation' | 'action' | 'result';
  message?: string;
}

export class GameActionService {
  // 🎯 移動アクションの処理
  static executeMove(
    characters: Character[],
    from: Position,
    to: Position,
    currentTeam: Team,
    currentTurn: number
  ): ActionResult {
    const character = characters.find(char => 
      char.position.x === from.x && 
      char.position.y === from.y &&
      char.team === currentTeam &&
      char.remainingActions > 0
    );

    if (!character) {
      return {
        success: false,
        characters,
        animations: [],
        playerCrystals: 0,
        enemyCrystals: 0,
        gamePhase: 'action',
        message: '移動可能なキャラクターが見つかりません'
      };
    }

    // 移動先が空いているかチェック
    const isOccupied = characters.some(char => 
      char.position.x === to.x && char.position.y === to.y
    );

    if (isOccupied) {
      return {
        success: false,
        characters,
        animations: [],
        playerCrystals: 0,
        enemyCrystals: 0,
        gamePhase: 'action',
        message: '移動先が占有されています'
      };
    }

    const newCharacters = characters.map(char => 
      char.id === character.id
        ? {
            ...char,
            position: to,
            remainingActions: Math.max(0, char.remainingActions - 1),
          }
        : char
    );

    // 棋譜に記録
    addGameHistoryMove(
      currentTurn,
      currentTeam,
      'move',
      `${character.name}が(${to.x},${to.y})に移動`
    );

    return {
      success: true,
      characters: newCharacters,
      animations: [{ id: character.id, type: 'move' }],
      playerCrystals: 0,
      enemyCrystals: 0,
      gamePhase: 'action'
    };
  }

  // 🎯 攻撃アクションの処理
  static executeAttack(
    characters: Character[],
    from: Position,
    to: Position,
    currentTeam: Team,
    currentTurn: number,
    playerCrystals: number,
    enemyCrystals: number
  ): ActionResult {
    const attacker = characters.find(char => 
      char.position.x === from.x && 
      char.position.y === from.y &&
      char.team === currentTeam &&
      char.remainingActions > 0
    );

    const target = characters.find(char => 
      char.position.x === to.x && 
      char.position.y === to.y &&
      char.team !== currentTeam
    );

    if (!attacker || !target) {
      return {
        success: false,
        characters,
        animations: [],
        playerCrystals,
        enemyCrystals,
        gamePhase: 'action',
        message: '攻撃者または対象が見つかりません'
      };
    }

    const damage = Math.max(0, attacker.attack - target.defense);
    const newHp = Math.max(0, target.hp - damage);
    
    let animations: AnimationSequence[] = [
      { id: attacker.id, type: 'attack' },
      { id: target.id, type: 'damage' }
    ];

    let newPlayerCrystals = playerCrystals;
    let newEnemyCrystals = enemyCrystals;
    let gamePhase: 'preparation' | 'action' | 'result' = 'action';

    if (newHp === 0) {
      animations.push(
        { id: target.id, type: 'ko' },
        { id: target.team, type: 'crystal-gain' }
      );

      // 進化チェック
      if (attacker.type === 'monster' && !attacker.isEvolved && attacker.monsterType) {
        const evolvedType = getEvolvedMonsterType(attacker.monsterType);
        if (evolvedType) {
          animations.push({ id: attacker.id, type: 'evolve' });
        }
      }

      // クリスタル獲得
      if (target.team === 'player') {
        newEnemyCrystals = Math.min(8, newEnemyCrystals + target.cost);
      } else {
        newPlayerCrystals = Math.min(8, newPlayerCrystals + target.cost);
      }

      // マスターが倒された場合はゲーム終了
      if (target.type === 'master') {
        gamePhase = 'result';
      }
    }

    const newCharacters = characters.map(char => {
      if (char.id === attacker.id) {
        return { ...char, remainingActions: Math.max(0, char.remainingActions - 1) };
      }
      if (char.id === target.id) {
        return { ...char, hp: newHp };
      }
      return char;
    });

    // 棋譜に記録
    addGameHistoryMove(
      currentTurn,
      currentTeam,
      'attack',
      `${attacker.name}が${target.name}を攻撃（ダメージ: ${damage}）`
    );

    return {
      success: true,
      characters: newCharacters,
      animations,
      playerCrystals: newPlayerCrystals,
      enemyCrystals: newEnemyCrystals,
      gamePhase
    };
  }

  // 🎯 スキルアクションの処理
  static executeSkill(
    characters: Character[],
    from: Position,
    to: Position,
    currentTeam: Team,
    currentTurn: number,
    playerCrystals: number,
    enemyCrystals: number
  ): ActionResult {
    const caster = characters.find(char => 
      char.position.x === from.x && 
      char.position.y === from.y &&
      char.team === currentTeam &&
      char.remainingActions > 0
    );

    const target = characters.find(char => 
      char.position.x === to.x && 
      char.position.y === to.y
    );

    if (!caster || !target || !caster.skillId) {
      return {
        success: false,
        characters,
        animations: [],
        playerCrystals,
        enemyCrystals,
        gamePhase: 'action',
        message: 'スキル使用者または対象が見つかりません'
      };
    }

    const skill = skillData[caster.skillId];
    if (!skill) {
      return {
        success: false,
        characters,
        animations: [],
        playerCrystals,
        enemyCrystals,
        gamePhase: 'action',
        message: 'スキルが見つかりません'
      };
    }

    const crystals = currentTeam === 'player' ? playerCrystals : enemyCrystals;
    if (crystals < skill.crystalCost) {
      return {
        success: false,
        characters,
        animations: [],
        playerCrystals,
        enemyCrystals,
        gamePhase: 'action',
        message: 'クリスタルが不足しています'
      };
    }

    let animations: AnimationSequence[] = [{ id: caster.id, type: 'attack' }];
    let newPlayerCrystals = playerCrystals;
    let newEnemyCrystals = enemyCrystals;
    let gamePhase: 'preparation' | 'action' | 'result' = 'action';

    // クリスタル消費
    if (currentTeam === 'player') {
      newPlayerCrystals = Math.max(0, newPlayerCrystals - skill.crystalCost);
    } else {
      newEnemyCrystals = Math.max(0, newEnemyCrystals - skill.crystalCost);
    }

    let newCharacters = [...characters];

    // スキル効果適用
    if (skill.healing) {
      animations.push({ id: target.id, type: 'heal' });
      newCharacters = newCharacters.map(char => {
        if (char.id === target.id) {
          return {
            ...char,
            hp: Math.min(char.maxHp, char.hp + skill.healing!),
          };
        }
        return char;
      });
    }

    if (skill.damage) {
      animations.push({ id: target.id, type: 'damage' });
      
      let newHp: number;
      if (skill.ignoreDefense) {
        newHp = Math.max(0, target.hp - 1);
      } else {
        const totalDamage = caster.attack + skill.damage;
        const damage = Math.max(0, totalDamage - target.defense);
        newHp = Math.max(0, target.hp - damage);
      }

      if (newHp === 0) {
        animations.push(
          { id: target.id, type: 'ko' },
          { id: target.team, type: 'crystal-gain' }
        );

        if (target.team === 'player') {
          newEnemyCrystals = Math.min(8, newEnemyCrystals + target.cost);
        } else {
          newPlayerCrystals = Math.min(8, newPlayerCrystals + target.cost);
        }

        if (target.type === 'master') {
          gamePhase = 'result';
        }
      }

      newCharacters = newCharacters.map(char => {
        if (char.id === target.id) {
          return { ...char, hp: newHp };
        }
        return char;
      });
    }

    if (skill.effects?.some(effect => effect.type === 'evolve')) {
      if (target.type === 'monster' && !target.isEvolved && target.monsterType) {
        const evolvedType = getEvolvedMonsterType(target.monsterType);
        if (evolvedType) {
          animations.push({ id: target.id, type: 'evolve' });
        }
      }
    }

    newCharacters = newCharacters.map(char => {
      if (char.id === caster.id) {
        return { ...char, remainingActions: Math.max(0, char.remainingActions - 1) };
      }
      return char;
    });

    // 棋譜に記録
    addGameHistoryMove(
      currentTurn,
      currentTeam,
      'skill',
      `${caster.name}が${target.name}に${skill.name}を使用`
    );

    return {
      success: true,
      characters: newCharacters,
      animations,
      playerCrystals: newPlayerCrystals,
      enemyCrystals: newEnemyCrystals,
      gamePhase
    };
  }

  // 🎯 ターン終了の処理
  static executeEndTurn(
    characters: Character[],
    currentTeam: Team,
    currentTurn: number,
    playerCrystals: number,
    enemyCrystals: number
  ): ActionResult {
    const newCurrentTeam: Team = currentTeam === 'player' ? 'enemy' : 'player';
    
    const refreshedCharacters = characters.map(character => {
      if (character.team === newCurrentTeam) {
        return {
          ...character,
          remainingActions: character.actions,
        };
      }
      return character;
    });

    const newPlayerCrystals = newCurrentTeam === 'player' 
      ? Math.min(8, playerCrystals + 1)
      : playerCrystals;
    
    const newEnemyCrystals = newCurrentTeam === 'enemy'
      ? Math.min(8, enemyCrystals + 1)
      : enemyCrystals;

    const newCurrentTurn = newCurrentTeam === 'player' ? currentTurn + 1 : currentTurn;

    const animations: AnimationSequence[] = [{ id: newCurrentTeam, type: 'turn-start' }];
    
    if (newCurrentTeam === 'player' && newPlayerCrystals > playerCrystals) {
      animations.push({ id: 'player-crystal', type: 'crystal-gain' });
    } else if (newCurrentTeam === 'enemy' && newEnemyCrystals > enemyCrystals) {
      animations.push({ id: 'enemy-crystal', type: 'crystal-gain' });
    }

    // 棋譜に記録
    addGameHistoryMove(
      currentTurn,
      currentTeam,
      'end_turn',
      `${currentTeam === 'player' ? '青チーム' : '赤チーム'}のターン終了`
    );

    return {
      success: true,
      characters: refreshedCharacters,
      animations,
      playerCrystals: newPlayerCrystals,
      enemyCrystals: newEnemyCrystals,
      gamePhase: 'action'
    };
  }
}