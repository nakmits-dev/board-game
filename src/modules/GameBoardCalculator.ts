// 2️⃣ 現在の盤面状態に対して操作を適用し、新しい盤面状態を計算するモジュール

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
   * 現在の盤面状態に対して操作を適用し、新しい盤面状態を返す
   */
  static calculateNewBoardState(currentState: GameState, command: MoveCommand): GameState {
    // 現在の状態を完全にディープコピーしてベースにする
    let newState: GameState = {
      ...currentState,
      characters: currentState.characters.map(char => ({ ...char })),
      pendingAnimations: [...currentState.pendingAnimations],
    };
    
    let newCharacters = newState.characters;
    let animations: AnimationSequence[] = [];

    // 操作の妥当性チェック
    if (!this.validateCommand(newState, command)) {
      return currentState;
    }

    // 操作タイプ別の処理
    switch (command.type) {
      case 'move':
        ({ characters: newCharacters, animations } = this.calculateMoveAction(newCharacters, command));
        break;

      case 'attack':
        ({ 
          characters: newCharacters, 
          animations,
          gamePhase: newState.gamePhase 
        } = this.calculateAttackAction(newCharacters, command, newState.gamePhase));
        break;

      case 'skill':
        ({ 
          characters: newCharacters, 
          animations,
          playerCrystals: newState.playerCrystals,
          enemyCrystals: newState.enemyCrystals,
          gamePhase: newState.gamePhase 
        } = this.calculateSkillAction(newCharacters, command, newState.playerCrystals, newState.enemyCrystals, newState.gamePhase));
        break;

      case 'end_turn':
      case 'forced_end_turn':
        ({ 
          characters: newCharacters, 
          animations,
          currentTeam: newState.currentTeam,
          currentTurn: newState.currentTurn,
          playerCrystals: newState.playerCrystals,
          enemyCrystals: newState.enemyCrystals 
        } = this.calculateEndTurnAction(newCharacters, command, newState.currentTeam, newState.currentTurn, newState.playerCrystals, newState.enemyCrystals));
        break;

      case 'surrender':
        ({ 
          characters: newCharacters, 
          gamePhase: newState.gamePhase 
        } = this.calculateSurrenderAction(newCharacters, command));
        break;
    }

    // ゲーム終了チェック
    if (newState.gamePhase !== 'result') {
      const { hostMasterAlive, guestMasterAlive } = this.checkMasterStatus(newCharacters);
      if (!hostMasterAlive || !guestMasterAlive) {
        newState.gamePhase = 'result';
      }
    }

    // 現在の状態をベースに、変更された部分のみを更新
    return {
      ...newState,
      characters: newCharacters,
      pendingAnimations: animations,
      animationTarget: null,
      // 他プレイヤーの操作による更新なので選択状態はクリア
      selectedCharacter: null,
      selectedAction: null,
      selectedSkill: null,
      pendingAction: { type: null },
    };
  }

  /**
   * 操作の妥当性チェック
   */
  private static validateCommand(currentState: GameState, command: MoveCommand): boolean {
    if (command.turn < 0 || !command.team || !command.type) {
      return false;
    }

    if (currentState.gamePhase === 'result' && command.type !== 'surrender') {
      return false;
    }

    if (['move', 'attack', 'skill'].includes(command.type)) {
      const character = currentState.characters.find(char => 
        char.position.x === command.from.x && 
        char.position.y === command.from.y &&
        char.team === command.team
      );
      
      if (!character) {
        return false;
      }
    }

    return true;
  }

  /**
   * 移動操作の計算
   */
  private static calculateMoveAction(characters: Character[], command: MoveCommand) {
    const character = characters.find(char => 
      char.position.x === command.from.x && 
      char.position.y === command.from.y &&
      char.team === command.team
    );
    
    const animations: AnimationSequence[] = [];
    
    if (character && command.to) {
      animations.push({ id: character.id, type: 'move' });
      
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
              remainingActions: Math.max(0, char.remainingActions - 1),
            }
          : char
      );
      
      return { characters: newCharacters, animations };
    }
    
    return { characters, animations };
  }

  /**
   * 攻撃操作の計算
   */
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
    
    const damage = Math.max(0, attacker.attack - target.defense);
    const newHp = Math.max(0, target.hp - damage);
    
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
        return { ...char, remainingActions: Math.max(0, char.remainingActions - 1) };
      }
      if (char.id === target.id) {
        return { ...char, hp: newHp };
      }
      return char;
    });

    const newGamePhase = (newHp === 0 && target.type === 'master') ? 'result' : gamePhase;

    return { characters: newCharacters, animations, gamePhase: newGamePhase };
  }

  /**
   * スキル操作の計算
   */
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
      newPlayerCrystals = Math.max(0, newPlayerCrystals - skill.crystalCost);
    } else {
      newEnemyCrystals = Math.max(0, newEnemyCrystals - skill.crystalCost);
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
        return { ...char, remainingActions: Math.max(0, char.remainingActions - 1) };
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

  /**
   * ターン終了操作の計算
   */
  private static calculateEndTurnAction(
    characters: Character[], 
    command: MoveCommand, 
    currentTeam: Team, 
    currentTurn: number, 
    playerCrystals: number, 
    enemyCrystals: number
  ) {
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

  /**
   * 降参操作の計算
   */
  private static calculateSurrenderAction(characters: Character[], command: MoveCommand) {
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

  /**
   * マスター生存チェック
   */
  private static checkMasterStatus(characters: Character[]): { hostMasterAlive: boolean; guestMasterAlive: boolean } {
    const hostMaster = characters.find(char => char.team === 'player' && char.type === 'master');
    const guestMaster = characters.find(char => char.team === 'enemy' && char.type === 'master');
    
    return {
      hostMasterAlive: !!hostMaster,
      guestMasterAlive: !!guestMaster
    };
  }

  /**
   * 進化タイプ取得
   */
  private static getEvolvedMonsterType(type: string): string | null {
    return monsterData[type]?.evolution || null;
  }
}