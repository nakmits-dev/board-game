// 2️⃣ 棋譜を元に計算を行い盤面状態を更新するモジュール

import { GameState, Character, Position, Team, AnimationSequence } from '../types/gameTypes';
import { monsterData } from '../data/cardData';
import { skillData } from '../data/skillData';
import { addGameHistoryMove } from '../components/GameHistory';

export interface MoveCommand {
  type: 'move' | 'attack' | 'skill' | 'end_turn' | 'forced_end_turn' | 'surrender';
  team: Team;
  turn: number;
  from: Position;
  to?: Position;
  skillId?: string;
  timestamp: number;
}

export class GameBoardCalculator {
  private static readonly MAX_CRYSTALS = 8;

  /**
   * 棋譜コマンドを受け取り、新しい盤面状態を計算して返す
   */
  static calculateNewBoardState(currentState: GameState, command: MoveCommand): GameState {
    console.log('🧮 [GameBoardCalculator] 盤面計算開始:', {
      type: command.type,
      team: command.team,
      from: command.from,
      to: command.to
    });

    let newCharacters = [...currentState.characters];
    let animations: AnimationSequence[] = [];
    let newPlayerCrystals = currentState.playerCrystals;
    let newEnemyCrystals = currentState.enemyCrystals;
    let newGamePhase = currentState.gamePhase;
    let newCurrentTeam = currentState.currentTeam;
    let newCurrentTurn = currentState.currentTurn;

    switch (command.type) {
      case 'move':
        ({ 
          characters: newCharacters, 
          animations 
        } = this.calculateMoveAction(newCharacters, command));
        break;

      case 'attack':
        ({ 
          characters: newCharacters, 
          animations,
          gamePhase: newGamePhase 
        } = this.calculateAttackAction(newCharacters, command, newGamePhase));
        break;

      case 'skill':
        ({ 
          characters: newCharacters, 
          animations,
          playerCrystals: newPlayerCrystals,
          enemyCrystals: newEnemyCrystals,
          gamePhase: newGamePhase 
        } = this.calculateSkillAction(newCharacters, command, newPlayerCrystals, newEnemyCrystals, newGamePhase));
        break;

      case 'end_turn':
      case 'forced_end_turn':
        ({ 
          characters: newCharacters, 
          animations,
          currentTeam: newCurrentTeam,
          currentTurn: newCurrentTurn,
          playerCrystals: newPlayerCrystals,
          enemyCrystals: newEnemyCrystals 
        } = this.calculateEndTurnAction(newCharacters, command, newCurrentTeam, newCurrentTurn, newPlayerCrystals, newEnemyCrystals));
        break;

      case 'surrender':
        ({ 
          characters: newCharacters, 
          gamePhase: newGamePhase 
        } = this.calculateSurrenderAction(newCharacters, command));
        break;
    }

    // ゲーム終了チェック
    if (newGamePhase !== 'result') {
      const { hostMasterAlive, guestMasterAlive } = this.checkMasterStatus(newCharacters);
      if (!hostMasterAlive || !guestMasterAlive) {
        newGamePhase = 'result';
      }
    }

    console.log('✅ [GameBoardCalculator] 盤面計算完了');

    return {
      ...currentState,
      characters: newCharacters,
      playerCrystals: newPlayerCrystals,
      enemyCrystals: newEnemyCrystals,
      gamePhase: newGamePhase,
      currentTeam: newCurrentTeam,
      currentTurn: newCurrentTurn,
      pendingAnimations: animations,
      animationTarget: null,
    };
  }

  private static calculateMoveAction(characters: Character[], command: MoveCommand) {
    const character = characters.find(char => 
      char.position.x === command.from.x && 
      char.position.y === command.from.y &&
      char.team === command.team
    );
    
    const animations: AnimationSequence[] = [];
    
    if (character && command.to) {
      console.log('📍 移動計算:', character.name, command.from, '->', command.to);
      animations.push({ id: character.id, type: 'move' });
      
      // 🎯 棋譜に追加
      addGameHistoryMove(
        command.turn,
        command.team,
        'move',
        `${character.name}が (${command.from.x},${command.from.y}) → (${command.to.x},${command.to.y}) に移動`,
        command.timestamp
      );
      
      const newCharacters = characters.map(char => 
        char.id === character.id
          ? {
              ...char,
              position: command.to!,
              remainingActions: char.remainingActions - 1,
            }
          : char
      );
      
      return { characters: newCharacters, animations };
    }
    
    return { characters, animations };
  }

  private static calculateAttackAction(characters: Character[], command: MoveCommand, gamePhase: string) {
    const attacker = characters.find(char => 
      char.position.x === command.from.x && 
      char.position.y === command.from.y &&
      char.team === command.team
    );
    
    if (!attacker || !command.to) {
      return { characters, animations: [], gamePhase };
    }
    
    const target = characters.find(char => 
      char.position.x === command.to!.x && 
      char.position.y === command.to!.y &&
      char.team !== command.team
    );
    
    if (!target) {
      return { characters, animations: [], gamePhase };
    }
    
    console.log('⚔️ 攻撃計算:', attacker.name, '->', target.name);
    const damage = Math.max(0, attacker.attack - target.defense);
    const newHp = Math.max(0, target.hp - damage);
    
    // 🎯 棋譜に追加
    addGameHistoryMove(
      command.turn,
      command.team,
      'attack',
      `${attacker.name}が${target.name}を攻撃 (ダメージ: ${damage})`,
      command.timestamp
    );
    
    const animations: AnimationSequence[] = [
      { id: attacker.id, type: 'attack' },
      { id: target.id, type: 'damage' }
    ];

    if (newHp === 0) {
      animations.push(
        { id: target.id, type: 'ko' },
        { id: target.team, type: 'crystal-gain' }
      );

      if (attacker.type === 'monster' && !attacker.isEvolved && attacker.monsterType) {
        const evolvedType = this.getEvolvedMonsterType(attacker.monsterType);
        if (evolvedType) {
          animations.push({ id: attacker.id, type: 'evolve' });
        }
      }
    }

    const newCharacters = characters.map(char => {
      if (char.id === attacker.id) {
        return { ...char, remainingActions: char.remainingActions - 1 };
      }
      if (char.id === target.id) {
        return { ...char, hp: newHp };
      }
      return char;
    });

    const newGamePhase = (newHp === 0 && target.type === 'master') ? 'result' : gamePhase;

    return { characters: newCharacters, animations, gamePhase: newGamePhase };
  }

  private static calculateSkillAction(
    characters: Character[], 
    command: MoveCommand, 
    playerCrystals: number, 
    enemyCrystals: number, 
    gamePhase: string
  ) {
    const caster = characters.find(char => 
      char.position.x === command.from.x && 
      char.position.y === command.from.y &&
      char.team === command.team
    );
    
    const target = characters.find(char => 
      char.position.x === command.to!.x && 
      char.position.y === command.to!.y
    );
    
    if (!caster || !target || !command.skillId) {
      return { characters, animations: [], playerCrystals, enemyCrystals, gamePhase };
    }

    const skill = skillData[command.skillId];
    if (!skill) {
      return { characters, animations: [], playerCrystals, enemyCrystals, gamePhase };
    }

    console.log('✨ スキル計算:', caster.name, '->', target.name, skill.name);

    // 🎯 棋譜に追加
    addGameHistoryMove(
      command.turn,
      command.team,
      'skill',
      `${caster.name}が「${skill.name}」を${target.name}に使用`,
      command.timestamp
    );

    let newPlayerCrystals = playerCrystals;
    let newEnemyCrystals = enemyCrystals;

    if (command.team === 'player') {
      newPlayerCrystals -= skill.crystalCost;
    } else {
      newEnemyCrystals -= skill.crystalCost;
    }

    const animations: AnimationSequence[] = [{ id: caster.id, type: 'attack' }];
    let newCharacters = [...characters];

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
      }

      newCharacters = newCharacters.map(char => {
        if (char.id === target.id) {
          return { ...char, hp: newHp };
        }
        return char;
      });

      if (newHp === 0 && target.type === 'master') {
        gamePhase = 'result';
      }
    }

    if (skill.effects?.some(effect => effect.type === 'evolve')) {
      if (target.type === 'monster' && !target.isEvolved && target.monsterType) {
        const evolvedType = this.getEvolvedMonsterType(target.monsterType);
        if (evolvedType) {
          animations.push({ id: target.id, type: 'evolve' });
        }
      }
    }

    newCharacters = newCharacters.map(char => {
      if (char.id === caster.id) {
        return { ...char, remainingActions: char.remainingActions - 1 };
      }
      return char;
    });

    return { 
      characters: newCharacters, 
      animations, 
      playerCrystals: newPlayerCrystals, 
      enemyCrystals: newEnemyCrystals, 
      gamePhase 
    };
  }

  private static calculateEndTurnAction(
    characters: Character[], 
    command: MoveCommand, 
    currentTeam: Team, 
    currentTurn: number, 
    playerCrystals: number, 
    enemyCrystals: number
  ) {
    console.log('🔄 ターン終了計算:', command.type);
    
    // 🎯 棋譜に追加
    const description = command.type === 'forced_end_turn' ? 'ターン終了（時間切れ）' : 'ターン終了';
    addGameHistoryMove(
      command.turn,
      command.team,
      command.type,
      description,
      command.timestamp
    );
    
    const newCurrentTeam: Team = command.team === 'player' ? 'enemy' : 'player';
    
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
      ? Math.min(this.MAX_CRYSTALS, playerCrystals + 1)
      : playerCrystals;
    
    const newEnemyCrystals = newCurrentTeam === 'enemy'
      ? Math.min(this.MAX_CRYSTALS, enemyCrystals + 1)
      : enemyCrystals;

    const newCurrentTurn = newCurrentTeam === 'player' ? currentTurn + 1 : currentTurn;

    const animations: AnimationSequence[] = [{ id: newCurrentTeam, type: 'turn-start' }];
    
    if (newCurrentTeam === 'player' && newPlayerCrystals > playerCrystals) {
      animations.push({ id: 'player-crystal', type: 'crystal-gain' });
    } else if (newCurrentTeam === 'enemy' && newEnemyCrystals > enemyCrystals) {
      animations.push({ id: 'enemy-crystal', type: 'crystal-gain' });
    }

    return { 
      characters: refreshedCharacters, 
      animations,
      currentTeam: newCurrentTeam,
      currentTurn: newCurrentTurn,
      playerCrystals: newPlayerCrystals,
      enemyCrystals: newEnemyCrystals 
    };
  }

  private static calculateSurrenderAction(characters: Character[], command: MoveCommand) {
    console.log('🏳️ 降参計算:', command.team);
    
    // 🎯 棋譜に追加
    addGameHistoryMove(
      command.turn,
      command.team,
      'surrender',
      '降参',
      command.timestamp
    );
    
    const newCharacters = characters.filter(char => 
      !(char.team === command.team && char.type === 'master')
    );
    
    return { characters: newCharacters, gamePhase: 'result' };
  }

  private static checkMasterStatus(characters: Character[]): { hostMasterAlive: boolean; guestMasterAlive: boolean } {
    const hostMaster = characters.find(char => char.team === 'player' && char.type === 'master');
    const guestMaster = characters.find(char => char.team === 'enemy' && char.type === 'master');
    
    return {
      hostMasterAlive: !!hostMaster,
      guestMasterAlive: !!guestMaster
    };
  }

  private static getEvolvedMonsterType(type: string): string | null {
    return monsterData[type]?.evolution || null;
  }
}