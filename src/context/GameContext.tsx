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
  switch (action.type) {
    case 'CREATE_GAME_RECORD': {
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
      return {
        ...state,
        isExecutingRecord: action.isExecuting,
        executionIndex: action.index || 0
      };
    }

    case 'APPLY_BOARD_ACTION': {
      const { boardAction } = action;
      
      if (state.gamePhase !== 'action') {
        console.warn('ゲームが進行中ではありません');
        return state;
      }

      let newState = { ...state };
      let newCharacters = [...state.characters];
      let animations: AnimationSequence[] = [];
      let newPlayerCrystals = state.playerCrystals;
      let newEnemyCrystals = state.enemyCrystals;
      let newGamePhase = state.gamePhase;

      if (boardAction.action === 'move' && boardAction.from && boardAction.to) {
        // 移動処理
        const character = newCharacters.find(char => 
          char.position.x === boardAction.from!.x && 
          char.position.y === boardAction.from!.y &&
          char.team === state.currentTeam &&
          char.remainingActions > 0
        );

        if (character) {
          // 移動先が空いているかチェック
          const isOccupied = newCharacters.some(char => 
            char.position.x === boardAction.to!.x && 
            char.position.y === boardAction.to!.y
          );

          if (!isOccupied) {
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
          }
        }
      } else if (boardAction.action === 'attack' && boardAction.from && boardAction.to) {
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
          const damage = Math.max(0, attacker.attack - target.defense);
          const newHp = Math.max(0, target.hp - damage);
          
          animations.push(
            { id: attacker.id, type: 'attack' },
            { id: target.id, type: 'damage' }
          );

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
        }
      } else if (boardAction.action === 'skill' && boardAction.from && boardAction.to) {
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
          
          if (skill) {
            const crystals = state.currentTeam === 'player' ? state.playerCrystals : state.enemyCrystals;
            
            if (crystals >= skill.crystalCost) {
              animations.push({ id: caster.id, type: 'attack' });

              // クリスタル消費
              if (state.currentTeam === 'player') {
                newPlayerCrystals = Math.max(0, newPlayerCrystals - skill.crystalCost);
              } else {
                newEnemyCrystals = Math.max(0, newEnemyCrystals - skill.crystalCost);
              }

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
            }
          }
        }
      } else if (boardAction.action === 'end_turn') {
        // ターン終了処理
        const newCurrentTeam: Team = state.currentTeam === 'player' ? 'enemy' : 'player';
        
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
      return {
        ...state,
        animationTarget: action.target,
      };
    }

    case 'SET_PENDING_ANIMATIONS': {
      return {
        ...state,
        pendingAnimations: action.animations,
      };
    }

    case 'CONFIRM_ACTION': {
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
        const target = state.characters.find(char => char.id === state.pendingAction.targetId);
        if (target) {
          const damage = Math.max(0, character.attack - target.defense);
          const newHp = Math.max(0, target.hp - damage);
          
          animations.push(
            { id: character.id, type: 'attack' },
            { id: target.id, type: 'damage' }
          );

          if (newHp === 0) {
            animations.push(
              { id: target.id, type: 'ko' },
              { id: target.team, type: 'crystal-gain' }
            );

            if (character.type === 'monster' && !character.isEvolved && character.monsterType) {
              const evolvedType = getEvolvedMonsterType(character.monsterType);
              if (evolvedType) {
                animations.push({ id: character.id, type: 'evolve' });
              }
            }

            if (target.team === 'player') {
              newEnemyCrystals = Math.min(8, newEnemyCrystals + target.cost);
            } else {
              newPlayerCrystals = Math.min(8, newPlayerCrystals + target.cost);
            }

            if (target.type === 'master') {
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
      const character = state.characters.find(char => char.id === action.characterId);
      if (!character || character.type !== 'monster' || !character.monsterType || character.isEvolved) return state;

      const evolvedType = getEvolvedMonsterType(character.monsterType);
      if (!evolvedType) return state;

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
      if (!state.selectedCharacter || state.selectedCharacter.team !== state.currentTeam) {
        return state;
      }

      const crystals = state.currentTeam === 'player' ? state.playerCrystals : state.enemyCrystals;
      if (crystals < action.skill.crystalCost) {
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
          const totalDamage = state.selectedCharacter.attack + skill.damage;
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
        
        if (defeatedCharacter.team === 'player') {
          guestCrystals = Math.min(8, guestCrystals + crystalGain);
        } else {
          hostCrystals = Math.min(8, hostCrystals + crystalGain);
        }
      }

      const hostMasterAlive = updatedCharacters.some(char => char.team === 'player' && char.type === 'master');
      const guestMasterAlive = updatedCharacters.some(char => char.team === 'enemy' && char.type === 'master');

      return {
        ...state,
        characters: updatedCharacters,
        playerCrystals: hostCrystals,
        enemyCrystals: guestCrystals,
        gamePhase: (!hostMasterAlive || !guestMasterAlive) ? 'result' : 'action',
      };
    }

    case 'CANCEL_ACTION': {
      return {
        ...state,
        pendingAction: { type: null },
      };
    }

    case 'SURRENDER': {
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
      if (state.gamePhase === 'preparation') return state;

      const newCurrentTeam: Team = state.currentTeam === 'player' ? 'enemy' : 'player';
      
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
      const newState = createInitialGameState(action.hostDeck, action.guestDeck);
      
      // 🔧 ゲーム開始時の棋譜記録を1つだけ作成
      setTimeout(() => {
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
      return {
        ...state,
        savedDecks: {
          host: action.hostDeck,
          guest: action.guestDeck
        }
      };
    }

    case 'RESET_GAME': {
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
      return state;
  }
}

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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
      const playAnimations = async () => {
        for (const animation of state.pendingAnimations) {
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
      dispatch({ type: 'APPLY_BOARD_ACTION', boardAction });
      return true;
    } catch (error) {
      console.error('ボードアクション適用エラー:', error);
      return false;
    }
  };

  // 🆕 棋譜レコードを作成する関数
  const createGameRecord = (actions: BoardAction[], description: string): string => {
    const recordId = `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    dispatch({ 
      type: 'CREATE_GAME_RECORD', 
      actions, 
      description 
    });
    return recordId;
  };

  // 🆕 棋譜レコードを実行する関数
  const executeGameRecord = async (recordId: string): Promise<boolean> => {
    const record = state.gameRecords.find(r => r.id === recordId);
    if (!record) {
      console.error('棋譜レコードが見つかりません:', recordId);
      return false;
    }

    try {
      dispatch({ type: 'SET_EXECUTION_STATE', isExecuting: true, index: 0 });
      
      for (let i = 0; i < record.actions.length; i++) {
        const action = record.actions[i];
        
        // 実行前に少し待機
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // アクションを実行
        const success = applyBoardAction(action);
        if (!success) {
          console.error('アクション実行失敗:', action);
          dispatch({ type: 'SET_EXECUTION_STATE', isExecuting: false, index: 0 });
          return false;
        }
        
        // 実行インデックスを更新
        dispatch({ type: 'SET_EXECUTION_STATE', isExecuting: true, index: i + 1 });
        
        // アニメーション完了まで待機
        await new Promise(resolve => setTimeout(resolve, ANIMATION_DURATION + 100));
      }
      
      dispatch({ type: 'SET_EXECUTION_STATE', isExecuting: false, index: 0 });
      console.log('✅ 棋譜実行完了:', record.description);
      return true;
    } catch (error) {
      console.error('棋譜実行エラー:', error);
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