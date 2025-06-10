import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { GameState, Character, Position, ActionType, Skill, Team, AnimationSequence, MonsterType, BoardAction, GameRecord } from '../types/gameTypes';
import { createInitialGameState, getEvolvedMonsterType, monsterData } from '../data/initialGameState';
import { skillData } from '../data/skillData';
import { masterData } from '../data/cardData';
import { addGameHistoryMove } from '../components/GameHistory';

type GameAction =
  | { type: 'SELECT_CHARACTER'; character: Character | null }
  | { type: 'SET_ACTION_MODE'; mode: ActionType }
  | { type: 'SET_PENDING_ACTION'; action: { type: ActionType; targetId?: string; position?: Position } }
  | { type: 'CONFIRM_ACTION' }
  | { type: 'CANCEL_ACTION' }
  | { type: 'SELECT_SKILL'; skill: Skill }
  | { type: 'USE_SKILL'; targetId: string }
  | { type: 'END_TURN' }
  | { type: 'START_LOCAL_GAME'; hostDeck: { master: keyof typeof masterData; monsters: MonsterType[] }; guestDeck: { master: keyof typeof masterData; monsters: MonsterType[] } }
  | { type: 'RESET_GAME' }
  | { type: 'UPDATE_PREVIEW'; hostDeck?: { master: keyof typeof masterData; monsters: MonsterType[] }; guestDeck?: { master: keyof typeof masterData; monsters: MonsterType[] } }
  | { type: 'SET_SAVED_DECKS'; hostDeck: { master: keyof typeof masterData; monsters: MonsterType[] }; guestDeck: { master: keyof typeof masterData; monsters: MonsterType[] } }
  | { type: 'SET_ANIMATION_TARGET'; target: { id: string; type: 'move' | 'attack' | 'damage' | 'heal' | 'ko' | 'crystal-gain' | 'turn-start' | 'evolve' } | null }
  | { type: 'SET_PENDING_ANIMATIONS'; animations: AnimationSequence[] }
  | { type: 'REMOVE_DEFEATED_CHARACTERS'; targetId: string; killerTeam?: Team }
  | { type: 'EVOLVE_CHARACTER'; characterId: string }
  | { type: 'SURRENDER'; team: Team }
  | { type: 'APPLY_BOARD_ACTION'; boardAction: BoardAction }
  | { type: 'CREATE_GAME_RECORD'; actions: BoardAction[]; description: string }
  | { type: 'EXECUTE_GAME_RECORD'; recordId: string }
  | { type: 'SET_EXECUTION_STATE'; isExecuting: boolean; index?: number };

interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  isValidMove: (position: Position) => boolean;
  isValidAttack: (targetId: string) => boolean;
  isValidSkillTarget: (targetId: string) => boolean;
  getCharacterAt: (position: Position) => Character | undefined;
  applyBoardAction: (boardAction: BoardAction) => boolean;
  createGameRecord: (actions: BoardAction[], description: string) => string;
  executeGameRecord: (recordId: string) => Promise<boolean>;
  savedDecks: {
    host?: { master: keyof typeof masterData; monsters: MonsterType[] };
    guest?: { master: keyof typeof masterData; monsters: MonsterType[] };
  };
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const ANIMATION_DURATION = 300;

function gameReducer(state: GameState, action: GameAction): GameState {
  // 🔧 全てのアクションをログ出力
  console.log(`🎮 [GameReducer] アクション実行:`, {
    type: action.type,
    currentPhase: state.gamePhase,
    currentTeam: state.currentTeam,
    currentTurn: state.currentTurn,
    timestamp: new Date().toISOString(),
    action: action
  });

  switch (action.type) {
    case 'CREATE_GAME_RECORD': {
      console.log(`📋 [CREATE_GAME_RECORD] 棋譜作成:`, {
        description: action.description,
        actionsCount: action.actions.length,
        actions: action.actions
      });

      const newRecord: GameRecord = {
        id: `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        actions: action.actions,
        description: action.description,
        createdAt: Date.now()
      };

      return {
        ...state,
        gameRecords: [...state.gameRecords, newRecord]
      };
    }

    case 'SET_EXECUTION_STATE': {
      console.log(`⚙️ [SET_EXECUTION_STATE] 実行状態変更:`, {
        isExecuting: action.isExecuting,
        index: action.index
      });

      return {
        ...state,
        isExecutingRecord: action.isExecuting,
        executionIndex: action.index || 0
      };
    }

    case 'APPLY_BOARD_ACTION': {
      const { boardAction } = action;
      
      console.log(`🎯 [APPLY_BOARD_ACTION] ボードアクション適用:`, {
        action: boardAction.action,
        from: boardAction.from,
        to: boardAction.to,
        gamePhase: state.gamePhase,
        currentTeam: state.currentTeam
      });

      if (state.gamePhase !== 'action') {
        console.warn('⚠️ [APPLY_BOARD_ACTION] ゲームが進行中ではありません');
        return state;
      }

      let newState = { ...state };
      let newCharacters = [...state.characters];
      let animations: AnimationSequence[] = [];
      let newPlayerCrystals = state.playerCrystals;
      let newEnemyCrystals = state.enemyCrystals;
      let newGamePhase = state.gamePhase;

      if (boardAction.action === 'move' && boardAction.from && boardAction.to) {
        console.log(`🚶 [MOVE] 移動処理開始:`, { from: boardAction.from, to: boardAction.to });
        
        // 移動処理
        const character = newCharacters.find(char => 
          char.position.x === boardAction.from!.x && 
          char.position.y === boardAction.from!.y &&
          char.team === state.currentTeam &&
          char.remainingActions > 0
        );

        if (character) {
          console.log(`✅ [MOVE] 移動キャラクター発見:`, { name: character.name, id: character.id });
          
          // 移動先が空いているかチェック
          const isOccupied = newCharacters.some(char => 
            char.position.x === boardAction.to!.x && 
            char.position.y === boardAction.to!.y
          );

          if (!isOccupied) {
            console.log(`✅ [MOVE] 移動先が空いています - 移動実行`);
            animations.push({ id: character.id, type: 'move' });
            
            newCharacters = newCharacters.map(char => 
              char.id === character.id
                ? {
                    ...char,
                    position: boardAction.to!,
                    remainingActions: Math.max(0, char.remainingActions - 1),
                  }
                : char
            );

            // 棋譜に記録
            addGameHistoryMove(
              state.currentTurn,
              state.currentTeam,
              'move',
              `${character.name}が(${boardAction.to.x},${boardAction.to.y})に移動`
            );
          } else {
            console.warn(`⚠️ [MOVE] 移動先が占有されています`);
          }
        } else {
          console.warn(`⚠️ [MOVE] 移動可能なキャラクターが見つかりません`);
        }
      } else if (boardAction.action === 'attack' && boardAction.from && boardAction.to) {
        console.log(`⚔️ [ATTACK] 攻撃処理開始:`, { from: boardAction.from, to: boardAction.to });
        
        // 攻撃処理
        const attacker = newCharacters.find(char => 
          char.position.x === boardAction.from!.x && 
          char.position.y === boardAction.from!.y &&
          char.team === state.currentTeam &&
          char.remainingActions > 0
        );

        const target = newCharacters.find(char => 
          char.position.x === boardAction.to!.x && 
          char.position.y === boardAction.to!.y &&
          char.team !== state.currentTeam
        );

        if (attacker && target) {
          console.log(`✅ [ATTACK] 攻撃者と対象発見:`, { 
            attacker: attacker.name, 
            target: target.name 
          });
          
          const damage = Math.max(0, attacker.attack - target.defense);
          const newHp = Math.max(0, target.hp - damage);
          
          console.log(`💥 [ATTACK] ダメージ計算:`, { 
            damage, 
            targetOldHp: target.hp, 
            targetNewHp: newHp 
          });
          
          animations.push(
            { id: attacker.id, type: 'attack' },
            { id: target.id, type: 'damage' }
          );

          if (newHp === 0) {
            console.log(`💀 [ATTACK] 対象が倒されました:`, target.name);
            animations.push(
              { id: target.id, type: 'ko' },
              { id: target.team, type: 'crystal-gain' }
            );

            // 進化チェック
            if (attacker.type === 'monster' && !attacker.isEvolved && attacker.monsterType) {
              const evolvedType = getEvolvedMonsterType(attacker.monsterType);
              if (evolvedType) {
                console.log(`🌟 [ATTACK] 攻撃者が進化します:`, { from: attacker.monsterType, to: evolvedType });
                animations.push({ id: attacker.id, type: 'evolve' });
              }
            }

            // クリスタル獲得
            if (target.team === 'player') {
              newEnemyCrystals = Math.min(8, newEnemyCrystals + target.cost);
              console.log(`💎 [ATTACK] 敵チームがクリスタル獲得:`, { amount: target.cost, total: newEnemyCrystals });
            } else {
              newPlayerCrystals = Math.min(8, newPlayerCrystals + target.cost);
              console.log(`💎 [ATTACK] プレイヤーチームがクリスタル獲得:`, { amount: target.cost, total: newPlayerCrystals });
            }

            // マスターが倒された場合はゲーム終了
            if (target.type === 'master') {
              console.log(`👑 [ATTACK] マスターが倒されました - ゲーム終了`);
              newGamePhase = 'result';
            }
          }

          newCharacters = newCharacters.map(char => {
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
            state.currentTurn,
            state.currentTeam,
            'attack',
            `${attacker.name}が${target.name}を攻撃（ダメージ: ${damage}）`
          );
        } else {
          console.warn(`⚠️ [ATTACK] 攻撃者または対象が見つかりません:`, { 
            attackerFound: !!attacker, 
            targetFound: !!target 
          });
        }
      } else if (boardAction.action === 'skill' && boardAction.from && boardAction.to) {
        console.log(`✨ [SKILL] スキル使用処理開始:`, { from: boardAction.from, to: boardAction.to });
        
        // スキル使用処理（キャラクターのskillIdを使用）
        const caster = newCharacters.find(char => 
          char.position.x === boardAction.from!.x && 
          char.position.y === boardAction.from!.y &&
          char.team === state.currentTeam &&
          char.remainingActions > 0
        );

        const target = newCharacters.find(char => 
          char.position.x === boardAction.to!.x && 
          char.position.y === boardAction.to!.y
        );

        if (caster && target && caster.skillId) {
          const skill = skillData[caster.skillId];
          
          console.log(`✅ [SKILL] スキル使用者と対象発見:`, { 
            caster: caster.name, 
            target: target.name,
            skill: skill?.name 
          });
          
          if (skill) {
            const crystals = state.currentTeam === 'player' ? state.playerCrystals : state.enemyCrystals;
            
            console.log(`💎 [SKILL] クリスタルチェック:`, { 
              required: skill.crystalCost, 
              available: crystals 
            });
            
            if (crystals >= skill.crystalCost) {
              console.log(`✅ [SKILL] スキル実行開始:`, skill.name);
              animations.push({ id: caster.id, type: 'attack' });

              // クリスタル消費
              if (state.currentTeam === 'player') {
                newPlayerCrystals = Math.max(0, newPlayerCrystals - skill.crystalCost);
              } else {
                newEnemyCrystals = Math.max(0, newEnemyCrystals - skill.crystalCost);
              }

              // スキル効果適用
              if (skill.healing) {
                console.log(`💚 [SKILL] 回復効果適用:`, { amount: skill.healing });
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
                console.log(`💥 [SKILL] ダメージ効果適用:`, { damage: skill.damage });
                animations.push({ id: target.id, type: 'damage' });
                
                let newHp: number;
                if (skill.ignoreDefense) {
                  newHp = Math.max(0, target.hp - 1);
                  console.log(`🛡️ [SKILL] 防御無視ダメージ:`, { newHp });
                } else {
                  const totalDamage = caster.attack + skill.damage;
                  const damage = Math.max(0, totalDamage - target.defense);
                  newHp = Math.max(0, target.hp - damage);
                  console.log(`⚔️ [SKILL] 通常ダメージ:`, { totalDamage, damage, newHp });
                }

                if (newHp === 0) {
                  console.log(`💀 [SKILL] 対象が倒されました:`, target.name);
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
                    console.log(`👑 [SKILL] マスターが倒されました - ゲーム終了`);
                    newGamePhase = 'result';
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
                    console.log(`🌟 [SKILL] 対象が進化します:`, { from: target.monsterType, to: evolvedType });
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
                state.currentTurn,
                state.currentTeam,
                'skill',
                `${caster.name}が${target.name}に${skill.name}を使用`
              );
            } else {
              console.warn(`⚠️ [SKILL] クリスタルが不足しています`);
            }
          } else {
            console.warn(`⚠️ [SKILL] スキルが見つかりません:`, caster.skillId);
          }
        } else {
          console.warn(`⚠️ [SKILL] スキル使用者または対象が見つかりません:`, { 
            casterFound: !!caster, 
            targetFound: !!target,
            hasSkill: !!caster?.skillId 
          });
        }
      } else if (boardAction.action === 'end_turn') {
        console.log(`🔄 [END_TURN] ターン終了処理開始`);
        
        // ターン終了処理
        const newCurrentTeam: Team = state.currentTeam === 'player' ? 'enemy' : 'player';
        
        console.log(`🔄 [END_TURN] チーム切り替え:`, { 
          from: state.currentTeam, 
          to: newCurrentTeam 
        });
        
        const refreshedCharacters = newCharacters.map(character => {
          if (character.team === newCurrentTeam) {
            return {
              ...character,
              remainingActions: character.actions,
            };
          }
          return character;
        });

        const newPlayerCrystalsEndTurn = newCurrentTeam === 'player' 
          ? Math.min(8, newPlayerCrystals + 1)
          : newPlayerCrystals;
        
        const newEnemyCrystalsEndTurn = newCurrentTeam === 'enemy'
          ? Math.min(8, newEnemyCrystals + 1)
          : newEnemyCrystals;

        const newCurrentTurn = newCurrentTeam === 'player' ? state.currentTurn + 1 : state.currentTurn;

        console.log(`🔄 [END_TURN] ターン情報更新:`, { 
          newTurn: newCurrentTurn,
          playerCrystals: newPlayerCrystalsEndTurn,
          enemyCrystals: newEnemyCrystalsEndTurn
        });

        animations.push({ id: newCurrentTeam, type: 'turn-start' });
        
        if (newCurrentTeam === 'player' && newPlayerCrystalsEndTurn > newPlayerCrystals) {
          animations.push({ id: 'player-crystal', type: 'crystal-gain' });
        } else if (newCurrentTeam === 'enemy' && newEnemyCrystalsEndTurn > newEnemyCrystals) {
          animations.push({ id: 'enemy-crystal', type: 'crystal-gain' });
        }

        // 棋譜に記録
        addGameHistoryMove(
          state.currentTurn,
          state.currentTeam,
          'end_turn',
          `${state.currentTeam === 'player' ? '青チーム' : '赤チーム'}のターン終了`
        );

        return {
          ...state,
          characters: refreshedCharacters,
          currentTeam: newCurrentTeam,
          currentTurn: newCurrentTurn,
          selectedCharacter: null,
          selectedAction: null,
          selectedSkill: null,
          pendingAction: { type: null },
          pendingAnimations: animations,
          playerCrystals: newPlayerCrystalsEndTurn,
          enemyCrystals: newEnemyCrystalsEndTurn,
        };
      }

      console.log(`✅ [APPLY_BOARD_ACTION] 処理完了:`, {
        animationsCount: animations.length,
        newGamePhase
      });

      return {
        ...newState,
        characters: newCharacters,
        selectedCharacter: null,
        selectedAction: null,
        selectedSkill: null,
        pendingAction: { type: null },
        pendingAnimations: animations,
        playerCrystals: newPlayerCrystals,
        enemyCrystals: newEnemyCrystals,
        gamePhase: newGamePhase,
      };
    }

    case 'SELECT_CHARACTER': {
      console.log(`👆 [SELECT_CHARACTER] キャラクター選択:`, {
        character: action.character?.name || 'null',
        team: action.character?.team,
        remainingActions: action.character?.remainingActions
      });

      if (!action.character) {
        return {
          ...state,
          selectedCharacter: null,
          selectedAction: null,
          selectedSkill: null,
          pendingAction: { type: null },
        };
      }

      if (action.character.team === state.currentTeam && action.character.remainingActions > 0) {
        return {
          ...state,
          selectedCharacter: action.character,
          selectedAction: 'attack',
          selectedSkill: null,
          pendingAction: { type: null },
        };
      }
      
      return {
        ...state,
        selectedCharacter: action.character,
        selectedAction: null,
        selectedSkill: null,
        pendingAction: { type: null },
      };
    }

    case 'SET_ACTION_MODE': {
      console.log(`🎯 [SET_ACTION_MODE] アクションモード設定:`, action.mode);

      if (!state.selectedCharacter || state.selectedCharacter.team !== state.currentTeam) {
        return state;
      }
      
      return {
        ...state,
        selectedAction: action.mode,
        pendingAction: { type: null },
      };
    }

    case 'SET_PENDING_ACTION': {
      console.log(`⏳ [SET_PENDING_ACTION] 保留アクション設定:`, action.action);

      if (state.gamePhase === 'preparation') return state;
      
      if (!state.selectedCharacter || state.selectedCharacter.team !== state.currentTeam) {
        return state;
      }

      return {
        ...state,
        pendingAction: action.action,
      };
    }

    case 'SET_ANIMATION_TARGET': {
      console.log(`🎬 [SET_ANIMATION_TARGET] アニメーション対象設定:`, action.target);

      return {
        ...state,
        animationTarget: action.target,
      };
    }

    case 'SET_PENDING_ANIMATIONS': {
      console.log(`🎬 [SET_PENDING_ANIMATIONS] 保留アニメーション設定:`, {
        count: action.animations.length,
        animations: action.animations
      });

      return {
        ...state,
        pendingAnimations: action.animations,
      };
    }

    case 'CONFIRM_ACTION': {
      console.log(`✅ [CONFIRM_ACTION] アクション確定:`, {
        selectedCharacter: state.selectedCharacter?.name,
        pendingAction: state.pendingAction
      });

      if (!state.selectedCharacter || !state.pendingAction.type) return state;
      
      if (state.selectedCharacter.team !== state.currentTeam) {
        return state;
      }

      const character = state.selectedCharacter;
      let newCharacters = [...state.characters];
      let animations: AnimationSequence[] = [];
      let newPlayerCrystals = state.playerCrystals;
      let newEnemyCrystals = state.enemyCrystals;
      let newGamePhase = state.gamePhase;

      if (state.pendingAction.type === 'move' && state.pendingAction.position) {
        console.log(`🚶 [CONFIRM_ACTION] 移動実行:`, state.pendingAction.position);
        animations.push({ id: character.id, type: 'move' });
        
        newCharacters = newCharacters.map(char => 
          char.id === character.id
            ? {
                ...char,
                position: state.pendingAction.position!,
                remainingActions: Math.max(0, char.remainingActions - 1),
              }
            : char
        );

        // 棋譜に記録
        addGameHistoryMove(
          state.currentTurn,
          state.currentTeam,
          'move',
          `${character.name}が(${state.pendingAction.position.x},${state.pendingAction.position.y})に移動`
        );
      } else if (state.pendingAction.type === 'attack' && state.pendingAction.targetId) {
        console.log(`⚔️ [CONFIRM_ACTION] 攻撃実行:`, state.pendingAction.targetId);
        const target = state.characters.find(char => char.id === state.pendingAction.targetId);
        if (target) {
          const damage = Math.max(0, character.attack - target.defense);
          const newHp = Math.max(0, target.hp - damage);
          
          console.log(`💥 [CONFIRM_ACTION] ダメージ計算:`, { damage, newHp });
          
          animations.push(
            { id: character.id, type: 'attack' },
            { id: target.id, type: 'damage' }
          );

          if (newHp === 0) {
            console.log(`💀 [CONFIRM_ACTION] 対象撃破:`, target.name);
            animations.push(
              { id: target.id, type: 'ko' },
              { id: target.team, type: 'crystal-gain' }
            );

            if (character.type === 'monster' && !character.isEvolved && character.monsterType) {
              const evolvedType = getEvolvedMonsterType(character.monsterType);
              if (evolvedType) {
                console.log(`🌟 [CONFIRM_ACTION] 進化発生:`, evolvedType);
                animations.push({ id: character.id, type: 'evolve' });
              }
            }

            if (target.team === 'player') {
              newEnemyCrystals = Math.min(8, newEnemyCrystals + target.cost);
            } else {
              newPlayerCrystals = Math.min(8, newPlayerCrystals + target.cost);
            }

            if (target.type === 'master') {
              console.log(`👑 [CONFIRM_ACTION] ゲーム終了`);
              newGamePhase = 'result';
            }
          }

          newCharacters = newCharacters.map(char => {
            if (char.id === character.id) {
              return { ...char, remainingActions: Math.max(0, char.remainingActions - 1) };
            }
            if (char.id === target.id) {
              return { ...char, hp: newHp };
            }
            return char;
          });

          // 棋譜に記録
          addGameHistoryMove(
            state.currentTurn,
            state.currentTeam,
            'attack',
            `${character.name}が${target.name}を攻撃（ダメージ: ${damage}）`
          );
        }
      }

      return {
        ...state,
        characters: newCharacters,
        selectedCharacter: null,
        selectedAction: null,
        selectedSkill: null,
        pendingAction: { type: null },
        pendingAnimations: animations,
        playerCrystals: newPlayerCrystals,
        enemyCrystals: newEnemyCrystals,
        gamePhase: newGamePhase,
      };
    }

    case 'EVOLVE_CHARACTER': {
      console.log(`🌟 [EVOLVE_CHARACTER] 進化処理:`, action.characterId);

      const character = state.characters.find(char => char.id === action.characterId);
      if (!character || character.type !== 'monster' || !character.monsterType || character.isEvolved) return state;

      const evolvedType = getEvolvedMonsterType(character.monsterType);
      if (!evolvedType) return state;

      console.log(`🌟 [EVOLVE_CHARACTER] 進化実行:`, { from: character.monsterType, to: evolvedType });

      const evolvedStats = monsterData[evolvedType];
      const updatedCharacters = state.characters.map(char => {
        if (char.id === action.characterId) {
          return {
            ...char,
            name: evolvedStats.name,
            monsterType: evolvedType,
            maxHp: evolvedStats.hp,
            hp: char.hp,
            attack: evolvedStats.attack,
            defense: evolvedStats.defense,
            actions: evolvedStats.actions,
            image: evolvedStats.image,
            skillId: evolvedStats.skillId,
            isEvolved: true,
          };
        }
        return char;
      });

      return {
        ...state,
        characters: updatedCharacters,
      };
    }

    case 'SELECT_SKILL': {
      console.log(`✨ [SELECT_SKILL] スキル選択:`, {
        skill: action.skill.name,
        cost: action.skill.crystalCost,
        character: state.selectedCharacter?.name
      });

      if (!state.selectedCharacter || state.selectedCharacter.team !== state.currentTeam) {
        return state;
      }

      const crystals = state.currentTeam === 'player' ? state.playerCrystals : state.enemyCrystals;
      if (crystals < action.skill.crystalCost) {
        console.warn(`⚠️ [SELECT_SKILL] クリスタル不足:`, { required: action.skill.crystalCost, available: crystals });
        return state;
      }

      return {
        ...state,
        selectedSkill: action.skill,
        selectedAction: 'skill',
        pendingAction: { type: null },
      };
    }

    case 'USE_SKILL': {
      console.log(`✨ [USE_SKILL] スキル使用:`, {
        skill: state.selectedSkill?.name,
        targetId: action.targetId,
        caster: state.selectedCharacter?.name
      });

      if (!state.selectedCharacter || !state.selectedSkill) return state;
      
      const target = state.characters.find(char => char.id === action.targetId);
      if (!target) return state;

      const skill = state.selectedSkill;
      let newCharacters = [...state.characters];
      let animations: AnimationSequence[] = [{ id: state.selectedCharacter.id, type: 'attack' }];
      let newPlayerCrystals = state.playerCrystals;
      let newEnemyCrystals = state.enemyCrystals;
      let newGamePhase = state.gamePhase;

      if (state.currentTeam === 'player') {
        newPlayerCrystals = Math.max(0, newPlayerCrystals - skill.crystalCost);
      } else {
        newEnemyCrystals = Math.max(0, newEnemyCrystals - skill.crystalCost);
      }

      console.log(`💎 [USE_SKILL] クリスタル消費:`, { cost: skill.crystalCost });

      if (skill.healing) {
        console.log(`💚 [USE_SKILL] 回復効果:`, skill.healing);
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
        console.log(`💥 [USE_SKILL] ダメージ効果:`, skill.damage);
        animations.push({ id: target.id, type: 'damage' });
        
        let newHp: number;
        if (skill.ignoreDefense) {
          newHp = Math.max(0, target.hp - 1);
        } else {
          const totalDamage = state.selectedCharacter.attack + skill.damage;
          const damage = Math.max(0, totalDamage - target.defense);
          newHp = Math.max(0, target.hp - damage);
        }

        if (newHp === 0) {
          console.log(`💀 [USE_SKILL] 対象撃破:`, target.name);
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
            console.log(`👑 [USE_SKILL] ゲーム終了`);
            newGamePhase = 'result';
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
            console.log(`🌟 [USE_SKILL] 進化効果:`, evolvedType);
            animations.push({ id: target.id, type: 'evolve' });
          }
        }
      }

      newCharacters = newCharacters.map(char => {
        if (char.id === state.selectedCharacter!.id) {
          return { ...char, remainingActions: Math.max(0, char.remainingActions - 1) };
        }
        return char;
      });

      // 棋譜に記録
      addGameHistoryMove(
        state.currentTurn,
        state.currentTeam,
        'skill',
        `${state.selectedCharacter.name}が${target.name}に${skill.name}を使用`
      );

      return {
        ...state,
        characters: newCharacters,
        selectedCharacter: null,
        selectedAction: null,
        selectedSkill: null,
        pendingAction: { type: null },
        pendingAnimations: animations,
        playerCrystals: newPlayerCrystals,
        enemyCrystals: newEnemyCrystals,
        gamePhase: newGamePhase,
      };
    }

    case 'REMOVE_DEFEATED_CHARACTERS': {
      console.log(`💀 [REMOVE_DEFEATED_CHARACTERS] 撃破キャラクター除去:`, action.targetId);

      const defeatedCharacter = state.characters.find(char => char.id === action.targetId);
      const updatedCharacters = state.characters.filter(char => char.id !== action.targetId);

      let hostCrystals = state.playerCrystals;
      let guestCrystals = state.enemyCrystals;

      if (state.gamePhase === 'result') {
        return {
          ...state,
          characters: updatedCharacters,
        };
      }

      if (defeatedCharacter) {
        const crystalGain = defeatedCharacter.cost;
        
        console.log(`💎 [REMOVE_DEFEATED_CHARACTERS] クリスタル獲得:`, { 
          character: defeatedCharacter.name, 
          cost: crystalGain 
        });
        
        if (defeatedCharacter.team === 'player') {
          guestCrystals = Math.min(8, guestCrystals + crystalGain);
        } else {
          hostCrystals = Math.min(8, hostCrystals + crystalGain);
        }
      }

      const hostMasterAlive = updatedCharacters.some(char => char.team === 'player' && char.type === 'master');
      const guestMasterAlive = updatedCharacters.some(char => char.team === 'enemy' && char.type === 'master');

      console.log(`👑 [REMOVE_DEFEATED_CHARACTERS] マスター生存状況:`, { 
        hostMasterAlive, 
        guestMasterAlive 
      });

      return {
        ...state,
        characters: updatedCharacters,
        playerCrystals: hostCrystals,
        enemyCrystals: guestCrystals,
        gamePhase: (!hostMasterAlive || !guestMasterAlive) ? 'result' : 'action',
      };
    }

    case 'CANCEL_ACTION': {
      console.log(`❌ [CANCEL_ACTION] アクションキャンセル`);

      return {
        ...state,
        pendingAction: { type: null },
      };
    }

    case 'SURRENDER': {
      console.log(`🏳️ [SURRENDER] 降参:`, action.team);

      // 棋譜に記録
      addGameHistoryMove(
        state.currentTurn,
        action.team,
        'surrender',
        `${action.team === 'player' ? '青チーム' : '赤チーム'}が降参`
      );

      return {
        ...state,
        gamePhase: 'result',
        selectedCharacter: null,
        selectedAction: null,
        selectedSkill: null,
        pendingAction: { type: null },
        animationTarget: null,
        pendingAnimations: [],
        characters: state.characters.filter(char => 
          !(char.team === action.team && char.type === 'master')
        ),
      };
    }

    case 'END_TURN': {
      console.log(`🔄 [END_TURN] ターン終了処理開始`);

      if (state.gamePhase === 'preparation') return state;

      const newCurrentTeam: Team = state.currentTeam === 'player' ? 'enemy' : 'player';
      
      console.log(`🔄 [END_TURN] チーム切り替え:`, { from: state.currentTeam, to: newCurrentTeam });
      
      const refreshedCharacters = state.characters.map(character => {
        if (character.team === newCurrentTeam) {
          return {
            ...character,
            remainingActions: character.actions,
          };
        }
        return character;
      });

      const newPlayerCrystals = newCurrentTeam === 'player' 
        ? Math.min(8, state.playerCrystals + 1)
        : state.playerCrystals;
      
      const newEnemyCrystals = newCurrentTeam === 'enemy'
        ? Math.min(8, state.enemyCrystals + 1)
        : state.enemyCrystals;

      const newCurrentTurn = newCurrentTeam === 'player' ? state.currentTurn + 1 : state.currentTurn;

      console.log(`🔄 [END_TURN] ターン情報更新:`, { 
        newTurn: newCurrentTurn,
        playerCrystals: newPlayerCrystals,
        enemyCrystals: newEnemyCrystals
      });

      const animations: AnimationSequence[] = [{ id: newCurrentTeam, type: 'turn-start' }];
      
      if (newCurrentTeam === 'player' && newPlayerCrystals > state.playerCrystals) {
        animations.push({ id: 'player-crystal', type: 'crystal-gain' });
      } else if (newCurrentTeam === 'enemy' && newEnemyCrystals > state.enemyCrystals) {
        animations.push({ id: 'enemy-crystal', type: 'crystal-gain' });
      }

      // 棋譜に記録
      addGameHistoryMove(
        state.currentTurn,
        state.currentTeam,
        'end_turn',
        `${state.currentTeam === 'player' ? '青チーム' : '赤チーム'}のターン終了`
      );

      return {
        ...state,
        characters: refreshedCharacters,
        currentTeam: newCurrentTeam,
        currentTurn: newCurrentTurn,
        selectedCharacter: null,
        selectedAction: null,
        selectedSkill: null,
        pendingAction: { type: null },
        pendingAnimations: animations,
        playerCrystals: newPlayerCrystals,
        enemyCrystals: newEnemyCrystals,
      };
    }

    case 'START_LOCAL_GAME': {
      console.log(`🎮 [START_LOCAL_GAME] ローカルゲーム開始:`, {
        hostDeck: action.hostDeck,
        guestDeck: action.guestDeck,
        timestamp: new Date().toISOString()
      });

      const newState = createInitialGameState(action.hostDeck, action.guestDeck);
      
      // 🔧 ゲーム開始時の棋譜記録を1つだけ作成
      setTimeout(() => {
        console.log(`📋 [START_LOCAL_GAME] 棋譜記録作成`);
        addGameHistoryMove(
          0,
          'player',
          'game_start',
          'ローカルゲーム開始 - 青チームのターン'
        );
      }, 100);
      
      return {
        ...newState,
        gamePhase: 'action',
        currentTeam: 'player',
        characters: newState.characters.map(char => ({
          ...char,
          remainingActions: char.team === 'player' ? char.actions : 0,
        })),
        pendingAnimations: [{ id: 'player', type: 'turn-start' }],
        savedDecks: {
          host: action.hostDeck,
          guest: action.guestDeck
        },
        gameRecords: [],
        isExecutingRecord: false,
        executionIndex: 0,
      };
    }

    case 'UPDATE_PREVIEW': {
      console.log(`👁️ [UPDATE_PREVIEW] プレビュー更新:`, {
        hostDeck: action.hostDeck,
        guestDeck: action.guestDeck
      });

      if (state.gamePhase !== 'preparation' && state.gamePhase !== 'result') return state;
      
      const newState = createInitialGameState(action.hostDeck, action.guestDeck);
      
      return {
        ...state,
        characters: newState.characters,
        savedDecks: {
          host: action.hostDeck,
          guest: action.guestDeck
        }
      };
    }

    case 'SET_SAVED_DECKS': {
      console.log(`💾 [SET_SAVED_DECKS] デッキ保存:`, {
        hostDeck: action.hostDeck,
        guestDeck: action.guestDeck
      });

      return {
        ...state,
        savedDecks: {
          host: action.hostDeck,
          guest: action.guestDeck
        }
      };
    }

    case 'RESET_GAME': {
      console.log(`🔄 [RESET_GAME] ゲームリセット`);

      const newState = createInitialGameState(state.savedDecks?.host, state.savedDecks?.guest);
      
      return {
        ...newState,
        savedDecks: state.savedDecks,
        gameRecords: [],
        isExecutingRecord: false,
        executionIndex: 0,
      };
    }

    default:
      console.warn(`⚠️ [GameReducer] 未知のアクション:`, action.type);
      return state;
  }
}

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  console.log(`🏗️ [GameProvider] プロバイダー初期化`);

  const [state, dispatch] = useReducer(gameReducer, {
    ...createInitialGameState(),
    gameRecords: [],
    isExecutingRecord: false,
    executionIndex: 0,
  });
  const [savedDecks, setSavedDecks] = React.useState<{
    host?: { master: keyof typeof masterData; monsters: MonsterType[] };
    guest?: { master: keyof typeof masterData; monsters: MonsterType[] };
  }>({
    host: { master: 'blue', monsters: ['bear', 'wolf', 'golem'] },
    guest: { master: 'red', monsters: ['bear', 'wolf', 'golem'] }
  });

  React.useEffect(() => {
    console.log(`🏗️ [GameProvider] 初期デッキ設定`);
    dispatch({ 
      type: 'SET_SAVED_DECKS', 
      hostDeck: savedDecks.host!, 
      guestDeck: savedDecks.guest! 
    });
    dispatch({ 
      type: 'UPDATE_PREVIEW', 
      hostDeck: savedDecks.host, 
      guestDeck: savedDecks.guest 
    });
  }, []);

  useEffect(() => {
    if (state.pendingAnimations.length > 0) {
      console.log(`🎬 [GameProvider] アニメーション実行開始:`, {
        count: state.pendingAnimations.length,
        animations: state.pendingAnimations
      });

      const playAnimations = async () => {
        for (const animation of state.pendingAnimations) {
          console.log(`🎬 [Animation] 実行:`, animation);
          dispatch({ type: 'SET_ANIMATION_TARGET', target: animation });
          await new Promise(resolve => setTimeout(resolve, ANIMATION_DURATION));
          
          if (state.gamePhase === 'result') {
            if (animation.type === 'ko') {
              await new Promise(resolve => setTimeout(resolve, 100));
              dispatch({ type: 'REMOVE_DEFEATED_CHARACTERS', targetId: animation.id });
            }
            continue;
          }
          
          if (animation.type === 'ko') {
            await new Promise(resolve => setTimeout(resolve, 100));
            dispatch({ type: 'REMOVE_DEFEATED_CHARACTERS', targetId: animation.id });
          } else if (animation.type === 'evolve') {
            await new Promise(resolve => setTimeout(resolve, 100));
            dispatch({ type: 'EVOLVE_CHARACTER', characterId: animation.id });
          }
        }
        console.log(`🎬 [GameProvider] アニメーション実行完了`);
        dispatch({ type: 'SET_ANIMATION_TARGET', target: null });
        dispatch({ type: 'SET_PENDING_ANIMATIONS', animations: [] });
      };

      playAnimations();
    }
  }, [state.pendingAnimations]);

  const isValidMove = (position: Position): boolean => {
    if (!state.selectedCharacter || state.selectedCharacter.remainingActions <= 0) return false;
    if (state.gamePhase === 'preparation') return false;
    if (state.selectedCharacter.team !== state.currentTeam) return false;

    const { x: srcX, y: srcY } = state.selectedCharacter.position;
    const { x: destX, y: destY } = position;

    const dx = Math.abs(srcX - destX);
    const dy = Math.abs(srcY - destY);
    
    if (dx > 1 || dy > 1) return false;
    if (destX < 0 || destX > 2 || destY < 0 || destY > 3) return false;

    const isOccupied = state.characters.some(
      char => char.position.x === destX && char.position.y === destY
    );

    return !isOccupied;
  };

  const isValidAttack = (targetId: string): boolean => {
    if (!state.selectedCharacter || state.selectedCharacter.remainingActions <= 0) return false;
    if (state.gamePhase === 'preparation') return false;
    if (state.selectedCharacter.team !== state.currentTeam) return false;

    const target = state.characters.find(char => char.id === targetId);
    if (!target || target.team === state.selectedCharacter.team) return false;

    const { x: srcX, y: srcY } = state.selectedCharacter.position;
    const { x: destX, y: destY } = target.position;

    const dx = Math.abs(srcX - destX);
    const dy = Math.abs(srcY - destY);

    return dx <= 1 && dy <= 1;
  };

  const isValidSkillTarget = (targetId: string): boolean => {
    if (!state.selectedCharacter || !state.selectedSkill || state.selectedCharacter.remainingActions <= 0) return false;
    if (state.gamePhase === 'preparation') return false;
    if (state.selectedCharacter.team !== state.currentTeam) return false;

    const target = state.characters.find(char => char.id === targetId);
    if (!target) return false;

    const { x: srcX, y: srcY } = state.selectedCharacter.position;
    const { x: destX, y: destY } = target.position;

    const dx = Math.abs(srcX - destX);
    const dy = Math.abs(srcY - destY);
    const distance = Math.max(dx, dy);

    if (state.selectedSkill.healing && target.team !== state.selectedCharacter.team) return false;
    if (state.selectedSkill.damage && target.team === state.selectedCharacter.team) return false;
    if (state.selectedSkill.effects?.some(effect => effect.type === 'evolve')) {
      if (target.team !== state.selectedCharacter.team) return false;
      if (target.type !== 'monster' || target.isEvolved) return false;
      if (target.type === 'monster' && target.monsterType) {
        const evolvedType = getEvolvedMonsterType(target.monsterType);
        if (!evolvedType) return false;
      }
    }

    return distance <= state.selectedSkill.range;
  };

  const getCharacterAt = (position: Position): Character | undefined => {
    return state.characters.find(
      char => char.position.x === position.x && char.position.y === position.y
    );
  };

  // 🆕 棋譜アクションをボードに反映する関数
  const applyBoardAction = (boardAction: BoardAction): boolean => {
    try {
      console.log(`🎯 [applyBoardAction] 実行:`, boardAction);
      dispatch({ type: 'APPLY_BOARD_ACTION', boardAction });
      return true;
    } catch (error) {
      console.error('❌ [applyBoardAction] エラー:', error);
      return false;
    }
  };

  // 🆕 棋譜レコードを作成する関数
  const createGameRecord = (actions: BoardAction[], description: string): string => {
    const recordId = `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`📋 [createGameRecord] 作成:`, { recordId, description, actionsCount: actions.length });
    dispatch({ 
      type: 'CREATE_GAME_RECORD', 
      actions, 
      description 
    });
    return recordId;
  };

  // 🆕 棋譜レコードを実行する関数
  const executeGameRecord = async (recordId: string): Promise<boolean> => {
    console.log(`🎬 [executeGameRecord] 実行開始:`, recordId);
    
    const record = state.gameRecords.find(r => r.id === recordId);
    if (!record) {
      console.error('❌ [executeGameRecord] 棋譜レコードが見つかりません:', recordId);
      return false;
    }

    try {
      dispatch({ type: 'SET_EXECUTION_STATE', isExecuting: true, index: 0 });
      
      for (let i = 0; i < record.actions.length; i++) {
        const action = record.actions[i];
        
        console.log(`🎬 [executeGameRecord] アクション実行 ${i + 1}/${record.actions.length}:`, action);
        
        // 実行前に少し待機
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // アクションを実行
        const success = applyBoardAction(action);
        if (!success) {
          console.error('❌ [executeGameRecord] アクション実行失敗:', action);
          dispatch({ type: 'SET_EXECUTION_STATE', isExecuting: false, index: 0 });
          return false;
        }
        
        // 実行インデックスを更新
        dispatch({ type: 'SET_EXECUTION_STATE', isExecuting: true, index: i + 1 });
        
        // アニメーション完了まで待機
        await new Promise(resolve => setTimeout(resolve, ANIMATION_DURATION + 100));
      }
      
      dispatch({ type: 'SET_EXECUTION_STATE', isExecuting: false, index: 0 });
      console.log('✅ [executeGameRecord] 棋譜実行完了:', record.description);
      return true;
    } catch (error) {
      console.error('❌ [executeGameRecord] 棋譜実行エラー:', error);
      dispatch({ type: 'SET_EXECUTION_STATE', isExecuting: false, index: 0 });
      return false;
    }
  };

  return (
    <GameContext.Provider 
      value={{ 
        state, 
        dispatch, 
        isValidMove, 
        isValidAttack, 
        isValidSkillTarget,
        getCharacterAt,
        applyBoardAction,
        createGameRecord,
        executeGameRecord,
        savedDecks: state.savedDecks || savedDecks
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};