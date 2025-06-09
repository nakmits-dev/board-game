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
   * 🔧 **修正: 現在の盤面状態に対して棋譜コマンドを適用し、新しい盤面状態を返す（増分更新）**
   */
  static calculateNewBoardState(currentState: GameState, command: MoveCommand): GameState {
    console.log('🧮 [GameBoardCalculator] 増分盤面更新開始:', {
      type: command.type,
      team: command.team,
      turn: command.turn,
      from: command.from,
      to: command.to,
      currentTurn: currentState.currentTurn,
      currentTeam: currentState.currentTeam,
      charactersCount: currentState.characters.length,
      timestamp: command.timestamp
    });

    // 🔧 **重要: 現在の状態を完全にディープコピーしてベースにする**
    let newState: GameState = {
      ...currentState,
      characters: currentState.characters.map(char => ({ ...char })), // ディープコピー
      pendingAnimations: [...currentState.pendingAnimations],
    };
    
    let newCharacters = newState.characters;
    let animations: AnimationSequence[] = [];

    // 🔧 **重要: 操作の妥当性チェック（現在の盤面状態に対して）**
    if (!this.validateCommand(newState, command)) {
      console.warn('⚠️ [GameBoardCalculator] 無効な操作 - スキップ:', command);
      return currentState; // 変更なしで現在の状態を返す
    }

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

    console.log('✅ [GameBoardCalculator] 増分盤面更新完了:', {
      charactersCount: newCharacters.length,
      newTurn: newState.currentTurn,
      newTeam: newState.currentTeam,
      newPhase: newState.gamePhase,
      playerCrystals: newState.playerCrystals,
      enemyCrystals: newState.enemyCrystals,
      animationsCount: animations.length
    });

    // 🔧 **修正: 現在の状態をベースに、変更された部分のみを更新**
    return {
      ...newState,
      characters: newCharacters,
      pendingAnimations: animations,
      animationTarget: null,
      // 🔧 **重要: 他プレイヤーの操作による更新なので選択状態はクリア**
      selectedCharacter: null,
      selectedAction: null,
      selectedSkill: null,
      pendingAction: { type: null },
    };
  }

  /**
   * 🔧 **新機能: 操作の妥当性チェック**
   */
  private static validateCommand(currentState: GameState, command: MoveCommand): boolean {
    // 基本的な妥当性チェック
    if (command.turn < 0 || !command.team || !command.type) {
      console.warn('⚠️ [GameBoardCalculator] 基本パラメータが無効:', command);
      return false;
    }

    // ゲーム終了後の操作は無効
    if (currentState.gamePhase === 'result' && command.type !== 'surrender') {
      console.warn('⚠️ [GameBoardCalculator] ゲーム終了後の操作:', command);
      return false;
    }

    // 移動・攻撃・スキルの場合、対象キャラクターの存在チェック
    if (['move', 'attack', 'skill'].includes(command.type)) {
      const character = currentState.characters.find(char => 
        char.position.x === command.from.x && 
        char.position.y === command.from.y &&
        char.team === command.team
      );
      
      if (!character) {
        console.warn('⚠️ [GameBoardCalculator] 操作対象キャラクターが見つかりません:', command);
        return false;
      }
    }

    return true;
  }

  private static calculateMoveAction(characters: Character[], command: MoveCommand) {
    const character = characters.find(char => 
      char.position.x === command.from.x && 
      char.position.y === command.from.y &&
      char.team === command.team
    );
    
    const animations: AnimationSequence[] = [];
    
    if (character && command.to) {
      console.log('📍 [GameBoardCalculator] 移動計算:', character.name, command.from, '->', command.to);
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
              remainingActions: Math.max(0, char.remainingActions - 1),
            }
          : char
      );
      
      return { characters: newCharacters, animations };
    }
    
    console.warn('⚠️ [GameBoardCalculator] 移動対象キャラクターが見つかりません:', command);
    return { characters, animations };
  }

  private static calculateAttackAction(characters: Character[], command: MoveCommand, gamePhase: string) {
    const attacker = characters.find(char => 
      char.position.x === command.from.x && 
      char.position.y === command.from.y &&
      char.team === command.team
    );
    
    if (!attacker || !command.to) {
      console.warn('⚠️ [GameBoardCalculator] 攻撃者が見つかりません:', command);
      return { characters, animations: [], gamePhase };
    }
    
    const target = characters.find(char => 
      char.position.x === command.to!.x && 
      char.position.y === command.to!.y &&
      char.team !== command.team
    );
    
    if (!target) {
      console.warn('⚠️ [GameBoardCalculator] 攻撃対象が見つかりません:', command);
      return { characters, animations: [], gamePhase };
    }
    
    console.log('⚔️ [GameBoardCalculator] 攻撃計算:', attacker.name, '->', target.name);
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
      console.warn('⚠️ [GameBoardCalculator] スキル実行に必要な要素が不足:', command);
      return { characters, animations: [], playerCrystals, enemyCrystals, gamePhase };
    }

    const skill = skillData[command.skillId];
    if (!skill) {
      console.warn('⚠️ [GameBoardCalculator] スキルが見つかりません:', command.skillId);
      return { characters, animations: [], playerCrystals, enemyCrystals, gamePhase };
    }

    console.log('✨ [GameBoardCalculator] スキル計算:', caster.name, '->', target.name, skill.name);

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

  private static calculateEndTurnAction(
    characters: Character[], 
    command: MoveCommand, 
    currentTeam: Team, 
    currentTurn: number, 
    playerCrystals: number, 
    enemyCrystals: number
  ) {
    console.log('🔄 [GameBoardCalculator] ターン終了計算:', command.type);
    
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
    console.log('🏳️ [GameBoardCalculator] 降参計算:', command.team);
    
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