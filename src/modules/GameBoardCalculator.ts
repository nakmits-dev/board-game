// 2️⃣ 現在の盤面状態に対して操作を適用し、新しい盤面状態を計算するモジュール

import { GameState, Character, Position, Team, AnimationSequence } from '../types/gameTypes';
import { monsterData } from '../data/cardData';
import { skillData } from '../data/skillData';
import { addGameHistoryMove } from '../components/GameHistory';

export interface MoveCommand {
  type: 'move' | 'attack' | 'skill' | 'end_turn' | 'forced_end_turn' | 'surrender';
  team: 'host' | 'guest'; // 🔧 host/guest制御に変更
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
    console.log('🎯 [GameBoardCalculator] 盤面計算開始:', {
      commandType: command.type,
      team: command.team,
      turn: command.turn,
      from: command.from,
      to: command.to,
      currentGamePhase: currentState.gamePhase,
      currentTurn: currentState.currentTurn,
      currentTeam: currentState.currentTeam
    });

    // 🔧 host/guest を player/enemy に変換
    const gameTeam: Team = this.convertToGameTeam(command.team, currentState.isHost);
    
    console.log('🔄 [GameBoardCalculator] チーム変換:', {
      hostGuestTeam: command.team,
      isHost: currentState.isHost,
      gameTeam: gameTeam
    });
    
    // 現在の状態を完全にディープコピーしてベースにする
    let newState: GameState = {
      ...currentState,
      characters: currentState.characters.map(char => ({ ...char })),
      pendingAnimations: [...currentState.pendingAnimations],
    };
    
    let newCharacters = newState.characters;
    let animations: AnimationSequence[] = [];

    console.log('🔍 [GameBoardCalculator] 現在の盤面状態:', {
      characterCount: newCharacters.length,
      characters: newCharacters.map(char => ({
        id: char.id.slice(-6),
        name: char.name,
        team: char.team,
        position: char.position,
        hp: char.hp,
        remainingActions: char.remainingActions
      }))
    });

    // 操作の妥当性チェック
    const isValid = this.validateCommand(newState, command, gameTeam);
    console.log('✅ [GameBoardCalculator] 操作妥当性チェック:', {
      isValid,
      commandType: command.type,
      gameTeam
    });

    if (!isValid) {
      console.warn('❌ [GameBoardCalculator] 無効な操作 - 現在の状態を返す');
      return currentState;
    }

    // 操作タイプ別の処理
    console.log(`🎮 [GameBoardCalculator] ${command.type}操作の処理開始`);
    
    switch (command.type) {
      case 'move':
        ({ characters: newCharacters, animations } = this.calculateMoveAction(newCharacters, command, gameTeam));
        break;

      case 'attack':
        ({ 
          characters: newCharacters, 
          animations,
          gamePhase: newState.gamePhase 
        } = this.calculateAttackAction(newCharacters, command, gameTeam, newState.gamePhase));
        break;

      case 'skill':
        ({ 
          characters: newCharacters, 
          animations,
          playerCrystals: newState.playerCrystals,
          enemyCrystals: newState.enemyCrystals,
          gamePhase: newState.gamePhase 
        } = this.calculateSkillAction(newCharacters, command, gameTeam, newState.playerCrystals, newState.enemyCrystals, newState.gamePhase));
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
        } = this.calculateEndTurnAction(newCharacters, command, gameTeam, newState.currentTeam, newState.currentTurn, newState.playerCrystals, newState.enemyCrystals));
        break;

      case 'surrender':
        ({ 
          characters: newCharacters, 
          gamePhase: newState.gamePhase 
        } = this.calculateSurrenderAction(newCharacters, command, gameTeam));
        break;
    }

    console.log(`✅ [GameBoardCalculator] ${command.type}操作の処理完了:`, {
      newCharacterCount: newCharacters.length,
      animationCount: animations.length,
      newGamePhase: newState.gamePhase,
      newCurrentTeam: newState.currentTeam,
      newCurrentTurn: newState.currentTurn
    });

    // ゲーム終了チェック
    if (newState.gamePhase !== 'result') {
      const { hostMasterAlive, guestMasterAlive } = this.checkMasterStatus(newCharacters);
      console.log('🏁 [GameBoardCalculator] ゲーム終了チェック:', {
        hostMasterAlive,
        guestMasterAlive,
        currentGamePhase: newState.gamePhase
      });
      
      if (!hostMasterAlive || !guestMasterAlive) {
        console.log('🏁 [GameBoardCalculator] ゲーム終了検出');
        newState.gamePhase = 'result';
      }
    }

    // 現在の状態をベースに、変更された部分のみを更新
    const finalState = {
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

    console.log('🎯 [GameBoardCalculator] 盤面計算完了:', {
      finalGamePhase: finalState.gamePhase,
      finalCurrentTeam: finalState.currentTeam,
      finalCurrentTurn: finalState.currentTurn,
      finalCharacterCount: finalState.characters.length,
      finalAnimationCount: finalState.pendingAnimations.length
    });

    return finalState;
  }

  /**
   * 🔧 host/guest を player/enemy に変換
   */
  private static convertToGameTeam(hostGuestTeam: 'host' | 'guest', isHost: boolean): Team {
    const result = isHost 
      ? (hostGuestTeam === 'host' ? 'player' : 'enemy')
      : (hostGuestTeam === 'host' ? 'enemy' : 'player');
    
    console.log('🔄 [GameBoardCalculator] チーム変換詳細:', {
      hostGuestTeam,
      isHost,
      result
    });
    
    return result;
  }

  /**
   * 🔧 player/enemy を host/guest に変換
   */
  private static convertToHostGuest(gameTeam: Team, isHost: boolean): 'host' | 'guest' {
    const result = isHost
      ? (gameTeam === 'player' ? 'host' : 'guest')
      : (gameTeam === 'player' ? 'guest' : 'host');
    
    console.log('🔄 [GameBoardCalculator] 逆チーム変換:', {
      gameTeam,
      isHost,
      result
    });
    
    return result;
  }

  /**
   * 操作の妥当性チェック
   */
  private static validateCommand(currentState: GameState, command: MoveCommand, gameTeam: Team): boolean {
    console.log('🔍 [GameBoardCalculator] 妥当性チェック開始:', {
      commandType: command.type,
      turn: command.turn,
      team: command.team,
      gameTeam,
      currentGamePhase: currentState.gamePhase
    });

    if (command.turn < 0 || !command.team || !command.type) {
      console.warn('❌ [GameBoardCalculator] 基本パラメータが無効');
      return false;
    }

    if (currentState.gamePhase === 'result' && command.type !== 'surrender') {
      console.warn('❌ [GameBoardCalculator] ゲーム終了後の操作（降参以外）');
      return false;
    }

    if (['move', 'attack', 'skill'].includes(command.type)) {
      const character = currentState.characters.find(char => 
        char.position.x === command.from.x && 
        char.position.y === command.from.y &&
        char.team === gameTeam
      );
      
      if (!character) {
        console.warn('❌ [GameBoardCalculator] 指定位置にキャラクターが存在しない:', {
          from: command.from,
          gameTeam,
          availableCharacters: currentState.characters.map(char => ({
            id: char.id.slice(-6),
            name: char.name,
            team: char.team,
            position: char.position
          }))
        });
        return false;
      }

      console.log('✅ [GameBoardCalculator] キャラクター発見:', {
        characterId: character.id.slice(-6),
        name: character.name,
        team: character.team,
        position: character.position,
        remainingActions: character.remainingActions
      });
    }

    console.log('✅ [GameBoardCalculator] 妥当性チェック完了: 有効');
    return true;
  }

  /**
   * 移動操作の計算
   */
  private static calculateMoveAction(characters: Character[], command: MoveCommand, gameTeam: Team) {
    console.log('🚶 [GameBoardCalculator] 移動操作計算開始:', {
      from: command.from,
      to: command.to,
      gameTeam
    });

    const character = characters.find(char => 
      char.position.x === command.from.x && 
      char.position.y === command.from.y &&
      char.team === gameTeam
    );
    
    const animations: AnimationSequence[] = [];
    
    if (character && command.to) {
      console.log('🚶 [GameBoardCalculator] 移動実行:', {
        characterId: character.id.slice(-6),
        name: character.name,
        from: command.from,
        to: command.to,
        remainingActionsBefore: character.remainingActions
      });

      animations.push({ id: character.id, type: 'move' });
      
      addGameHistoryMove(
        command.turn,
        gameTeam,
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
      
      console.log('✅ [GameBoardCalculator] 移動操作完了:', {
        characterId: character.id.slice(-6),
        newPosition: command.to,
        remainingActionsAfter: Math.max(0, character.remainingActions - 1)
      });
      
      return { characters: newCharacters, animations };
    }
    
    console.warn('❌ [GameBoardCalculator] 移動操作失敗: キャラクターまたは移動先が無効');
    return { characters, animations };
  }

  /**
   * 攻撃操作の計算
   */
  private static calculateAttackAction(characters: Character[], command: MoveCommand, gameTeam: Team, gamePhase: string) {
    console.log('⚔️ [GameBoardCalculator] 攻撃操作計算開始:', {
      from: command.from,
      to: command.to,
      gameTeam,
      currentGamePhase: gamePhase
    });

    const attacker = characters.find(char => 
      char.position.x === command.from.x && 
      char.position.y === command.from.y &&
      char.team === gameTeam
    );
    
    if (!attacker || !command.to) {
      console.warn('❌ [GameBoardCalculator] 攻撃者または攻撃先が無効');
      return { characters, animations: [], gamePhase };
    }
    
    const target = characters.find(char => 
      char.position.x === command.to!.x && 
      char.position.y === command.to!.y &&
      char.team !== gameTeam
    );
    
    if (!target) {
      console.warn('❌ [GameBoardCalculator] 攻撃対象が見つからない:', {
        targetPosition: command.to,
        availableTargets: characters.filter(char => char.team !== gameTeam).map(char => ({
          id: char.id.slice(-6),
          name: char.name,
          position: char.position
        }))
      });
      return { characters, animations: [], gamePhase };
    }
    
    const damage = Math.max(0, attacker.attack - target.defense);
    const newHp = Math.max(0, target.hp - damage);
    
    console.log('⚔️ [GameBoardCalculator] 攻撃計算:', {
      attackerId: attacker.id.slice(-6),
      attackerName: attacker.name,
      attackerAttack: attacker.attack,
      targetId: target.id.slice(-6),
      targetName: target.name,
      targetDefense: target.defense,
      targetHpBefore: target.hp,
      damage,
      newHp,
      isKO: newHp === 0
    });
    
    addGameHistoryMove(
      command.turn,
      gameTeam,
      'attack',
      `${attacker.name}が${target.name}を攻撃 (ダメージ: ${damage})`,
      command.timestamp
    );
    
    const animations: AnimationSequence[] = [
      { id: attacker.id, type: 'attack' },
      { id: target.id, type: 'damage' }
    ];

    if (newHp === 0) {
      console.log('💀 [GameBoardCalculator] KO検出 - 追加処理:', {
        targetId: target.id.slice(-6),
        targetName: target.name,
        targetType: target.type
      });

      animations.push(
        { id: target.id, type: 'ko' },
        { id: target.team, type: 'crystal-gain' }
      );

      if (attacker.type === 'monster' && !attacker.isEvolved && attacker.monsterType) {
        const evolvedType = this.getEvolvedMonsterType(attacker.monsterType);
        if (evolvedType) {
          console.log('🔄 [GameBoardCalculator] 進化検出:', {
            attackerId: attacker.id.slice(-6),
            attackerName: attacker.name,
            evolvedType
          });
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
    
    if (newGamePhase === 'result') {
      console.log('🏁 [GameBoardCalculator] マスター撃破によるゲーム終了検出');
    }

    console.log('✅ [GameBoardCalculator] 攻撃操作完了:', {
      newGamePhase,
      animationCount: animations.length
    });

    return { characters: newCharacters, animations, gamePhase: newGamePhase };
  }

  /**
   * スキル操作の計算
   */
  private static calculateSkillAction(
    characters: Character[], 
    command: MoveCommand, 
    gameTeam: Team,
    playerCrystals: number, 
    enemyCrystals: number, 
    gamePhase: string
  ) {
    console.log('✨ [GameBoardCalculator] スキル操作計算開始:', {
      from: command.from,
      to: command.to,
      skillId: command.skillId,
      gameTeam,
      playerCrystals,
      enemyCrystals
    });

    const caster = characters.find(char => 
      char.position.x === command.from.x && 
      char.position.y === command.from.y &&
      char.team === gameTeam
    );
    
    const target = characters.find(char => 
      char.position.x === command.to!.x && 
      char.position.y === command.to!.y
    );
    
    if (!caster || !target || !command.skillId) {
      console.warn('❌ [GameBoardCalculator] スキル操作の必要パラメータが不足');
      return { characters, animations: [], playerCrystals, enemyCrystals, gamePhase };
    }

    const skill = skillData[command.skillId];
    if (!skill) {
      console.warn('❌ [GameBoardCalculator] 無効なスキルID:', command.skillId);
      return { characters, animations: [], playerCrystals, enemyCrystals, gamePhase };
    }

    console.log('✨ [GameBoardCalculator] スキル情報:', {
      skillName: skill.name,
      skillCost: skill.crystalCost,
      healing: skill.healing,
      damage: skill.damage,
      ignoreDefense: skill.ignoreDefense,
      casterId: caster.id.slice(-6),
      casterName: caster.name,
      targetId: target.id.slice(-6),
      targetName: target.name
    });

    addGameHistoryMove(
      command.turn,
      gameTeam,
      'skill',
      `${caster.name}が「${skill.name}」を${target.name}に使用`,
      command.timestamp
    );

    let newPlayerCrystals = playerCrystals;
    let newEnemyCrystals = enemyCrystals;

    if (gameTeam === 'player') {
      newPlayerCrystals = Math.max(0, newPlayerCrystals - skill.crystalCost);
      console.log('💎 [GameBoardCalculator] プレイヤークリスタル消費:', {
        before: playerCrystals,
        cost: skill.crystalCost,
        after: newPlayerCrystals
      });
    } else {
      newEnemyCrystals = Math.max(0, newEnemyCrystals - skill.crystalCost);
      console.log('💎 [GameBoardCalculator] 敵クリスタル消費:', {
        before: enemyCrystals,
        cost: skill.crystalCost,
        after: newEnemyCrystals
      });
    }

    const animations: AnimationSequence[] = [{ id: caster.id, type: 'attack' }];
    let newCharacters = [...characters];

    if (skill.healing) {
      console.log('💚 [GameBoardCalculator] 回復効果適用:', {
        targetId: target.id.slice(-6),
        targetName: target.name,
        hpBefore: target.hp,
        maxHp: target.maxHp,
        healAmount: skill.healing
      });

      animations.push({ id: target.id, type: 'heal' });
      newCharacters = newCharacters.map(char => {
        if (char.id === target.id) {
          const newHp = Math.min(char.maxHp, char.hp + skill.healing!);
          console.log('💚 [GameBoardCalculator] 回復計算:', {
            hpBefore: char.hp,
            hpAfter: newHp
          });
          return {
            ...char,
            hp: newHp,
          };
        }
        return char;
      });
    }

    if (skill.damage) {
      console.log('💥 [GameBoardCalculator] ダメージ効果適用:', {
        targetId: target.id.slice(-6),
        targetName: target.name,
        hpBefore: target.hp,
        skillDamage: skill.damage,
        casterAttack: caster.attack,
        targetDefense: target.defense,
        ignoreDefense: skill.ignoreDefense
      });

      animations.push({ id: target.id, type: 'damage' });
      
      let newHp: number;
      if (skill.ignoreDefense) {
        newHp = Math.max(0, target.hp - 1);
        console.log('💥 [GameBoardCalculator] 防御無視ダメージ:', {
          hpBefore: target.hp,
          hpAfter: newHp
        });
      } else {
        const totalDamage = caster.attack + skill.damage;
        const damage = Math.max(0, totalDamage - target.defense);
        newHp = Math.max(0, target.hp - damage);
        console.log('💥 [GameBoardCalculator] 通常ダメージ計算:', {
          totalDamage,
          damage,
          hpBefore: target.hp,
          hpAfter: newHp
        });
      }

      if (newHp === 0) {
        console.log('💀 [GameBoardCalculator] スキルによるKO検出');
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
        console.log('🏁 [GameBoardCalculator] スキルによるマスター撃破でゲーム終了');
        gamePhase = 'result';
      }
    }

    if (skill.effects?.some(effect => effect.type === 'evolve')) {
      if (target.type === 'monster' && !target.isEvolved && target.monsterType) {
        const evolvedType = this.getEvolvedMonsterType(target.monsterType);
        if (evolvedType) {
          console.log('🔄 [GameBoardCalculator] スキルによる進化検出:', {
            targetId: target.id.slice(-6),
            targetName: target.name,
            evolvedType
          });
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

    console.log('✅ [GameBoardCalculator] スキル操作完了:', {
      newPlayerCrystals,
      newEnemyCrystals,
      newGamePhase: gamePhase,
      animationCount: animations.length
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
    gameTeam: Team,
    currentTeam: Team, 
    currentTurn: number, 
    playerCrystals: number, 
    enemyCrystals: number
  ) {
    console.log('🔄 [GameBoardCalculator] ターン終了操作計算開始:', {
      commandType: command.type,
      gameTeam,
      currentTeam,
      currentTurn,
      playerCrystals,
      enemyCrystals
    });

    const description = command.type === 'forced_end_turn' ? 'ターン終了（時間切れ）' : 'ターン終了';
    addGameHistoryMove(
      command.turn,
      gameTeam,
      command.type,
      description,
      command.timestamp
    );
    
    const newCurrentTeam: Team = gameTeam === 'player' ? 'enemy' : 'player';
    
    console.log('🔄 [GameBoardCalculator] ターン切り替え:', {
      oldTeam: gameTeam,
      newTeam: newCurrentTeam
    });
    
    const refreshedCharacters = characters.map(character => {
      if (character.team === newCurrentTeam) {
        const refreshed = {
          ...character,
          remainingActions: character.actions,
        };
        console.log('🔄 [GameBoardCalculator] キャラクター行動回復:', {
          characterId: character.id.slice(-6),
          name: character.name,
          team: character.team,
          actions: character.actions
        });
        return refreshed;
      }
      return character;
    });

    const newPlayerCrystals = newCurrentTeam === 'player' 
      ? Math.min(this.MAX_CRYSTALS, playerCrystals + 1)
      : playerCrystals;
    
    const newEnemyCrystals = newCurrentTeam === 'enemy'
      ? Math.min(this.MAX_CRYSTALS, enemyCrystals + 1)
      : enemyCrystals;

    console.log('💎 [GameBoardCalculator] クリスタル更新:', {
      newCurrentTeam,
      playerCrystalsBefore: playerCrystals,
      playerCrystalsAfter: newPlayerCrystals,
      enemyCrystalsBefore: enemyCrystals,
      enemyCrystalsAfter: newEnemyCrystals
    });

    const newCurrentTurn = newCurrentTeam === 'player' ? currentTurn + 1 : currentTurn;

    console.log('🔄 [GameBoardCalculator] ターン番号更新:', {
      oldTurn: currentTurn,
      newTurn: newCurrentTurn
    });

    const animations: AnimationSequence[] = [{ id: newCurrentTeam, type: 'turn-start' }];
    
    if (newCurrentTeam === 'player' && newPlayerCrystals > playerCrystals) {
      animations.push({ id: 'player-crystal', type: 'crystal-gain' });
    } else if (newCurrentTeam === 'enemy' && newEnemyCrystals > enemyCrystals) {
      animations.push({ id: 'enemy-crystal', type: 'crystal-gain' });
    }

    console.log('✅ [GameBoardCalculator] ターン終了操作完了:', {
      newCurrentTeam,
      newCurrentTurn,
      newPlayerCrystals,
      newEnemyCrystals,
      animationCount: animations.length
    });

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
  private static calculateSurrenderAction(characters: Character[], command: MoveCommand, gameTeam: Team) {
    console.log('🏳️ [GameBoardCalculator] 降参操作計算開始:', {
      gameTeam,
      characterCountBefore: characters.length
    });

    addGameHistoryMove(
      command.turn,
      gameTeam,
      'surrender',
      '降参',
      command.timestamp
    );
    
    const newCharacters = characters.filter(char => {
      const shouldRemove = char.team === gameTeam && char.type === 'master';
      if (shouldRemove) {
        console.log('🏳️ [GameBoardCalculator] マスター除去:', {
          characterId: char.id.slice(-6),
          name: char.name,
          team: char.team
        });
      }
      return !shouldRemove;
    });
    
    console.log('✅ [GameBoardCalculator] 降参操作完了:', {
      characterCountAfter: newCharacters.length,
      gamePhase: 'result'
    });
    
    return { characters: newCharacters, gamePhase: 'result' };
  }

  /**
   * マスター生存チェック
   */
  private static checkMasterStatus(characters: Character[]): { hostMasterAlive: boolean; guestMasterAlive: boolean } {
    const hostMaster = characters.find(char => char.team === 'player' && char.type === 'master');
    const guestMaster = characters.find(char => char.team === 'enemy' && char.type === 'master');
    
    const result = {
      hostMasterAlive: !!hostMaster,
      guestMasterAlive: !!guestMaster
    };

    console.log('🏁 [GameBoardCalculator] マスター生存チェック:', result);
    
    return result;
  }

  /**
   * 進化タイプ取得
   */
  private static getEvolvedMonsterType(type: string): string | null {
    const result = monsterData[type]?.evolution || null;
    console.log('🔄 [GameBoardCalculator] 進化タイプ取得:', {
      originalType: type,
      evolvedType: result
    });
    return result;
  }
}