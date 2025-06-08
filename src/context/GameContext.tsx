import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { GameState, Character, Position, ActionType, Skill, Team, AnimationSequence, MonsterType } from '../types/gameTypes';
import { createInitialGameState, getEvolvedMonsterType, monsterData } from '../data/initialGameState';
import { skillData } from '../data/skillData';
import { masterData } from '../data/cardData';

type GameAction =
  | { type: 'SELECT_CHARACTER'; character: Character | null }
  | { type: 'SET_ACTION_MODE'; mode: ActionType }
  | { type: 'SET_PENDING_ACTION'; action: { type: ActionType; targetId?: string; position?: Position } }
  | { type: 'CONFIRM_ACTION' }
  | { type: 'CANCEL_ACTION' }
  | { type: 'SELECT_SKILL'; skill: Skill }
  | { type: 'USE_SKILL'; targetId: string }
  | { type: 'END_TURN' }
  | { type: 'START_GAME'; playerDeck?: { master: keyof typeof masterData; monsters: MonsterType[] }; enemyDeck?: { master: keyof typeof masterData; monsters: MonsterType[] } }
  | { type: 'START_NETWORK_GAME'; roomId: string; isHost: boolean; playerDeck?: { master: keyof typeof masterData; monsters: MonsterType[] }; enemyDeck?: { master: keyof typeof masterData; monsters: MonsterType[] } }
  | { type: 'RESET_GAME' }
  | { type: 'UPDATE_PREVIEW'; playerDeck?: { master: keyof typeof masterData; monsters: MonsterType[] }; enemyDeck?: { master: keyof typeof masterData; monsters: MonsterType[] } }
  | { type: 'SET_SAVED_DECKS'; playerDeck: { master: keyof typeof masterData; monsters: MonsterType[] }; enemyDeck: { master: keyof typeof masterData; monsters: MonsterType[] } }
  | { type: 'ADD_CRYSTAL'; team: Team }
  | { type: 'SET_ANIMATION_TARGET'; target: { id: string; type: 'move' | 'attack' | 'damage' | 'heal' | 'ko' | 'crystal-gain' | 'turn-start' | 'evolve' } | null }
  | { type: 'SET_PENDING_ANIMATIONS'; animations: AnimationSequence[] }
  | { type: 'REMOVE_DEFEATED_CHARACTERS'; targetId: string }
  | { type: 'EVOLVE_CHARACTER'; characterId: string }
  | { type: 'UNDO_MOVE' }
  | { type: 'SURRENDER'; team: Team }
  | { type: 'SYNC_NETWORK_ACTION'; action: any }
  | { type: 'SET_NETWORK_SYNC_CALLBACK'; callback: ((action: any) => void) | null };

interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  isValidMove: (position: Position) => boolean;
  isValidAttack: (targetId: string) => boolean;
  isValidSkillTarget: (targetId: string) => boolean;
  getCharacterAt: (position: Position) => Character | undefined;
  savedDecks: {
    player?: { master: keyof typeof masterData; monsters: MonsterType[] };
    enemy?: { master: keyof typeof masterData; monsters: MonsterType[] };
  };
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const MAX_CRYSTALS = 8;
const ANIMATION_DURATION = 300;

const checkMasterStatus = (characters: Character[]): { playerMasterAlive: boolean; enemyMasterAlive: boolean } => {
  const playerMaster = characters.find(char => char.team === 'player' && char.type === 'master');
  const enemyMaster = characters.find(char => char.team === 'enemy' && char.type === 'master');
  
  return {
    playerMasterAlive: !!playerMaster,
    enemyMasterAlive: !!enemyMaster
  };
};

// 状態の深いコピーを作成する関数
const deepCloneState = (state: GameState): GameState => {
  return JSON.parse(JSON.stringify({
    ...state,
    // アニメーション関連は除外
    selectedCharacter: null,
    selectedAction: null,
    selectedSkill: null,
    pendingAction: { type: null },
    animationTarget: null,
    pendingAnimations: [],
    previousState: undefined // 無限ループを防ぐ
  }));
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
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

      // ネットワークゲームの場合、自分のターンかつ自分のチームのキャラクターのみ選択可能
      if (state.isNetworkGame) {
        const isMyTeam = state.isHost ? action.character.team === 'player' : action.character.team === 'enemy';
        const isMyTurn = state.isHost ? state.currentTeam === 'player' : state.currentTeam === 'enemy';
        
        if (!isMyTeam || !isMyTurn) {
          return state; // 選択を無効化
        }
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

      // ネットワークゲームの場合、自分のターンでない場合は操作を無効化
      if (state.isNetworkGame) {
        const isMyTurn = state.isHost ? state.currentTeam === 'player' : state.currentTeam === 'enemy';
        if (!isMyTurn) {
          return state;
        }
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

      // ネットワークゲームの場合、自分のターンでない場合は操作を無効化
      if (state.isNetworkGame) {
        const isMyTurn = state.isHost ? state.currentTeam === 'player' : state.currentTeam === 'enemy';
        if (!isMyTurn) {
          return state;
        }
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

      // ネットワークゲームの場合、自分のターンでない場合は操作を無効化
      if (state.isNetworkGame) {
        const isMyTurn = state.isHost ? state.currentTeam === 'player' : state.currentTeam === 'enemy';
        if (!isMyTurn) {
          return state;
        }
      }

      // 現在の状態を保存（待った用）
      const previousState = deepCloneState(state);

      let updatedCharacters = [...state.characters];
      let animations: AnimationSequence[] = [];

      // ネットワークゲームの場合、アクションを送信
      if (state.isNetworkGame && state.networkSyncCallback) {
        const networkAction = {
          turn: state.currentTurn,
          team: state.currentTeam,
          type: state.pendingAction.type,
          characterId: state.selectedCharacter.id,
          targetId: state.pendingAction.targetId,
          position: state.pendingAction.position,
        };
        state.networkSyncCallback(networkAction);
      }

      if (state.pendingAction.type === 'move' && state.pendingAction.position) {
        animations.push({ id: state.selectedCharacter.id, type: 'move' });
        
        updatedCharacters = updatedCharacters.map(character => 
          character.id === state.selectedCharacter!.id
            ? {
                ...character,
                position: state.pendingAction.position!,
                remainingActions: character.remainingActions - 1,
              }
            : character
        );
      }

      if (state.pendingAction.type === 'attack' && state.pendingAction.targetId) {
        const target = updatedCharacters.find(char => char.id === state.pendingAction.targetId);
        if (target) {
          animations.push(
            { id: state.selectedCharacter.id, type: 'attack' },
            { id: target.id, type: 'damage' }
          );

          const damage = Math.max(0, state.selectedCharacter.attack - target.defense);
          const newHp = Math.max(0, target.hp - damage);

          // マスターが倒される場合は即座にゲーム終了
          if (newHp === 0 && target.type === 'master') {
            updatedCharacters = updatedCharacters.map(character => {
              if (character.id === state.selectedCharacter!.id) {
                return {
                  ...character,
                  remainingActions: character.remainingActions - 1,
                };
              }
              if (character.id === target.id) {
                return {
                  ...character,
                  hp: newHp,
                };
              }
              return character;
            });

            // マスターが倒された場合は即座に結果画面へ
            return {
              ...state,
              characters: updatedCharacters,
              selectedCharacter: null,
              selectedAction: null,
              selectedSkill: null,
              pendingAction: { type: null },
              gamePhase: 'result',
              pendingAnimations: animations,
              previousState,
              canUndo: !state.isNetworkGame, // ネットワークゲームでは待ったを無効化
            };
          }

          if (newHp === 0) {
            animations.push(
              { id: target.id, type: 'ko' },
              { id: state.selectedCharacter.team, type: 'crystal-gain' } // 倒した側がクリスタル獲得
            );

            // 進化条件を満たしているか確認（進化先があるモンスターのみ）
            const attacker = state.selectedCharacter;
            if (attacker.type === 'monster' && !attacker.isEvolved && attacker.monsterType) {
              const evolvedType = getEvolvedMonsterType(attacker.monsterType);
              if (evolvedType) {
                animations.push({ id: attacker.id, type: 'evolve' });
              }
            }
          }

          updatedCharacters = updatedCharacters.map(character => {
            if (character.id === state.selectedCharacter!.id) {
              return {
                ...character,
                remainingActions: character.remainingActions - 1,
              };
            }
            if (character.id === target.id) {
              return {
                ...character,
                hp: newHp,
              };
            }
            return character;
          });
        }
      }

      const { playerMasterAlive, enemyMasterAlive } = checkMasterStatus(updatedCharacters);

      return {
        ...state,
        characters: updatedCharacters,
        selectedCharacter: null,
        selectedAction: null,
        selectedSkill: null,
        pendingAction: { type: null },
        gamePhase: (!playerMasterAlive || !enemyMasterAlive) ? 'result' : 'action',
        pendingAnimations: animations,
        previousState,
        canUndo: !state.isNetworkGame, // ネットワークゲームでは待ったを無効化
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

      // ネットワークゲームの場合、自分のターンでない場合は操作を無効化
      if (state.isNetworkGame) {
        const isMyTurn = state.isHost ? state.currentTeam === 'player' : state.currentTeam === 'enemy';
        if (!isMyTurn) {
          return state;
        }
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
      
      // ネットワークゲームの場合、自分のターンでない場合は操作を無効化
      if (state.isNetworkGame) {
        const isMyTurn = state.isHost ? state.currentTeam === 'player' : state.currentTeam === 'enemy';
        if (!isMyTurn) {
          return state;
        }
      }

      // 現在の状態を保存（待った用）
      const previousState = deepCloneState(state);

      // ネットワークゲームの場合、アクションを送信
      if (state.isNetworkGame && state.networkSyncCallback) {
        const networkAction = {
          turn: state.currentTurn,
          team: state.currentTeam,
          type: 'skill',
          characterId: state.selectedCharacter.id,
          targetId: action.targetId,
          skillId: state.selectedSkill.id,
        };
        state.networkSyncCallback(networkAction);
      }
      
      let updatedCharacters = [...state.characters];
      let animations: AnimationSequence[] = [];
      const target = updatedCharacters.find(char => char.id === action.targetId);
      let playerCrystals = state.playerCrystals;
      let enemyCrystals = state.enemyCrystals;
      
      if (!target) return state;

      if (state.currentTeam === 'player') {
        playerCrystals -= state.selectedSkill.crystalCost;
      } else {
        enemyCrystals -= state.selectedSkill.crystalCost;
      }

      if (state.selectedSkill.healing) {
        const healing = state.selectedSkill.healing;
        animations.push(
          { id: state.selectedCharacter.id, type: 'attack' },
          { id: target.id, type: 'heal' }
        );

        updatedCharacters = updatedCharacters.map(character => {
          if (character.id === target.id) {
            return {
              ...character,
              hp: Math.min(character.maxHp, character.hp + healing),
            };
          }
          return character;
        });
      }

      if (state.selectedSkill.damage) {
        animations.push(
          { id: state.selectedCharacter.id, type: 'attack' },
          { id: target.id, type: 'damage' }
        );

        let newHp: number;
        
        // 呪いスキルの場合は防御力を無視してHPを直接1減らす
        if (state.selectedSkill.ignoreDefense) {
          newHp = Math.max(0, target.hp - 1);
        } else {
          // 通常のダメージ計算
          const totalDamage = state.selectedCharacter.attack + state.selectedSkill.damage;
          const damage = Math.max(0, totalDamage - target.defense);
          newHp = Math.max(0, target.hp - damage);
        }

        // マスターが倒される場合は即座にゲーム終了
        if (newHp === 0 && target.type === 'master') {
          updatedCharacters = updatedCharacters.map(character => {
            if (character.id === state.selectedCharacter!.id) {
              return {
                ...character,
                remainingActions: character.remainingActions - 1,
              };
            }
            if (character.id === target.id) {
              return {
                ...character,
                hp: newHp,
              };
            }
            return character;
          });

          // マスターが倒された場合は即座に結果画面へ
          return {
            ...state,
            characters: updatedCharacters,
            playerCrystals,
            enemyCrystals,
            selectedCharacter: null,
            selectedAction: null,
            selectedSkill: null,
            pendingAction: { type: null },
            gamePhase: 'result',
            pendingAnimations: animations,
            previousState,
            canUndo: !state.isNetworkGame, // ネットワークゲームでは待ったを無効化
          };
        }

        if (newHp === 0) {
          animations.push(
            { id: target.id, type: 'ko' },
            { id: state.selectedCharacter.team, type: 'crystal-gain' } // 倒した側がクリスタル獲得
          );
        }

        updatedCharacters = updatedCharacters.map(character => {
          if (character.id === target.id) {
            return {
              ...character,
              hp: newHp,
            };
          }
          return character;
        });
      }

      if (state.selectedSkill.effects?.some(effect => effect.type === 'evolve')) {
        if (target.type === 'monster' && !target.isEvolved && target.monsterType) {
          const evolvedType = getEvolvedMonsterType(target.monsterType);
          if (evolvedType) {
            animations.push({ id: target.id, type: 'evolve' });
          }
        }
      }

      updatedCharacters = updatedCharacters.map(character => {
        if (character.id === state.selectedCharacter!.id) {
          return {
            ...character,
            remainingActions: character.remainingActions - 1,
          };
        }
        return character;
      });

      const { playerMasterAlive, enemyMasterAlive } = checkMasterStatus(updatedCharacters);

      return {
        ...state,
        characters: updatedCharacters,
        playerCrystals,
        enemyCrystals,
        selectedCharacter: null,
        selectedAction: null,
        selectedSkill: null,
        pendingAction: { type: null },
        gamePhase: (!playerMasterAlive || !enemyMasterAlive) ? 'result' : 'action',
        pendingAnimations: animations,
        previousState,
        canUndo: !state.isNetworkGame, // ネットワークゲームでは待ったを無効化
      };
    }

    case 'REMOVE_DEFEATED_CHARACTERS': {
      const defeatedCharacter = state.characters.find(char => char.id === action.targetId);
      const updatedCharacters = state.characters.filter(char => char.id !== action.targetId);

      let playerCrystals = state.playerCrystals;
      let enemyCrystals = state.enemyCrystals;

      // ゲームが既に終了している場合はクリスタル獲得をスキップ
      if (state.gamePhase === 'result') {
        return {
          ...state,
          characters: updatedCharacters,
        };
      }

      if (defeatedCharacter) {
        // 倒されたキャラクターのコスト分のクリスタルを倒した側が獲得
        const crystalGain = defeatedCharacter.cost;
        
        if (defeatedCharacter.team === 'player') {
          // プレイヤーのキャラクターが倒された場合、敵がクリスタルを獲得
          enemyCrystals = Math.min(MAX_CRYSTALS, enemyCrystals + crystalGain);
        } else {
          // 敵のキャラクターが倒された場合、プレイヤーがクリスタルを獲得
          playerCrystals = Math.min(MAX_CRYSTALS, playerCrystals + crystalGain);
        }
      }

      const { playerMasterAlive, enemyMasterAlive } = checkMasterStatus(updatedCharacters);

      return {
        ...state,
        characters: updatedCharacters,
        playerCrystals,
        enemyCrystals,
        gamePhase: (!playerMasterAlive || !enemyMasterAlive) ? 'result' : 'action',
      };
    }

    case 'CANCEL_ACTION': {
      return {
        ...state,
        pendingAction: { type: null },
      };
    }

    case 'SURRENDER': {
      // 降参時は即座にゲーム終了（クリスタル獲得や進化は発生させない）
      return {
        ...state,
        gamePhase: 'result',
        selectedCharacter: null,
        selectedAction: null,
        selectedSkill: null,
        pendingAction: { type: null },
        animationTarget: null,
        pendingAnimations: [],
        // 降参したチームのマスターを削除してゲーム終了を示す
        characters: state.characters.filter(char => 
          !(char.team === action.team && char.type === 'master')
        ),
        canUndo: false, // 降参後は待ったできない
      };
    }

    case 'END_TURN': {
      if (state.gamePhase === 'preparation') return state;
      
      // ネットワークゲームの場合、自分のターンでない場合は操作を無効化
      if (state.isNetworkGame) {
        const isMyTurn = state.isHost ? state.currentTeam === 'player' : state.currentTeam === 'enemy';
        if (!isMyTurn) {
          return state;
        }
      }

      // 現在の状態を保存（待った用）
      const previousState = deepCloneState(state);

      // ネットワークゲームの場合、アクションを送信
      if (state.isNetworkGame && state.networkSyncCallback) {
        const networkAction = {
          turn: state.currentTurn,
          team: state.currentTeam,
          type: 'end_turn',
          characterId: '',
        };
        state.networkSyncCallback(networkAction);
      }
      
      const nextTeam: Team = state.currentTeam === 'player' ? 'enemy' : 'player';
      
      const refreshedCharacters = state.characters.map(character => {
        if (character.team === nextTeam) {
          return {
            ...character,
            remainingActions: character.actions,
          };
        }
        return character;
      });

      const playerCrystals = nextTeam === 'player' 
        ? Math.min(MAX_CRYSTALS, state.playerCrystals + 1)
        : state.playerCrystals;
      
      const enemyCrystals = nextTeam === 'enemy'
        ? Math.min(MAX_CRYSTALS, state.enemyCrystals + 1)
        : state.enemyCrystals;

      const animations: AnimationSequence[] = [
        { id: nextTeam, type: 'turn-start' }
      ];
      
      if (nextTeam === 'player' && playerCrystals > state.playerCrystals) {
        animations.push({ id: 'player-crystal', type: 'crystal-gain' });
      } else if (nextTeam === 'enemy' && enemyCrystals > state.enemyCrystals) {
        animations.push({ id: 'enemy-crystal', type: 'crystal-gain' });
      }

      return {
        ...state,
        characters: refreshedCharacters,
        currentTeam: nextTeam,
        currentTurn: nextTeam === 'player' ? state.currentTurn + 1 : state.currentTurn,
        selectedCharacter: null,
        selectedAction: null,
        selectedSkill: null,
        pendingAction: { type: null },
        playerCrystals,
        enemyCrystals,
        animationTarget: null,
        pendingAnimations: animations,
        previousState,
        canUndo: !state.isNetworkGame, // ネットワークゲームでは待ったを無効化
      };
    }

    case 'START_GAME': {
      const startingTeam: Team = Math.random() < 0.5 ? 'player' : 'enemy';
      
      // 新しいゲーム状態を作成（編成内容を反映）
      const newState = createInitialGameState(action.playerDeck, action.enemyDeck);
      
      return {
        ...newState,
        gamePhase: 'action',
        currentTeam: startingTeam,
        characters: newState.characters.map(char => ({
          ...char,
          remainingActions: char.team === startingTeam ? char.actions : 0,
        })),
        pendingAnimations: [{ id: startingTeam, type: 'turn-start' }],
        savedDecks: {
          player: action.playerDeck,
          enemy: action.enemyDeck
        },
        canUndo: false,
        isNetworkGame: false,
        isHost: false,
        roomId: null,
        networkSyncCallback: null,
      };
    }

    case 'START_NETWORK_GAME': {
      console.log('START_NETWORK_GAME - 現在の状態保持開始');
      console.log('現在のキャラクター数:', state.characters.length);
      console.log('現在のクリスタル:', { player: state.playerCrystals, enemy: state.enemyCrystals });
      
      const startingTeam: Team = 'player'; // ネットワークゲームでは常にプレイヤーから開始
      
      console.log('START_NETWORK_GAME - ルームID保持:', action.roomId);
      
      // 既存の状態を保持しつつ、ネットワークゲーム用の設定のみ更新
      return {
        ...state,
        gamePhase: 'action',
        currentTeam: startingTeam,
        // キャラクターの行動回数のみリセット
        characters: state.characters.map(char => ({
          ...char,
          remainingActions: char.team === startingTeam ? char.actions : 0,
        })),
        pendingAnimations: [{ id: startingTeam, type: 'turn-start' }],
        canUndo: false,
        isNetworkGame: true,
        isHost: action.isHost,
        roomId: action.roomId, // ここでルームIDを確実に設定
        networkSyncCallback: null,
        // 選択状態をクリア
        selectedCharacter: null,
        selectedAction: null,
        selectedSkill: null,
        pendingAction: { type: null },
        animationTarget: null,
      };
    }

    case 'UPDATE_PREVIEW': {
      // 準備画面または結果画面でのプレビュー更新
      if (state.gamePhase !== 'preparation' && state.gamePhase !== 'result') return state;
      
      const newState = createInitialGameState(action.playerDeck, action.enemyDeck);
      
      return {
        ...state,
        characters: newState.characters,
        savedDecks: {
          player: action.playerDeck,
          enemy: action.enemyDeck
        }
      };
    }

    case 'SET_SAVED_DECKS': {
      return {
        ...state,
        savedDecks: {
          player: action.playerDeck,
          enemy: action.enemyDeck
        }
      };
    }

    case 'RESET_GAME': {
      // 保存されたデッキがある場合はそれを使用してリセット
      const newState = createInitialGameState(state.savedDecks?.player, state.savedDecks?.enemy);
      return {
        ...newState,
        savedDecks: state.savedDecks,
        canUndo: false,
        isNetworkGame: false,
        isHost: false,
        roomId: null,
        networkSyncCallback: null,
      };
    }

    case 'UNDO_MOVE': {
      // 前の状態に戻る（ネットワークゲームでは無効）
      if (!state.canUndo || !state.previousState || state.isNetworkGame) return state;
      
      return {
        ...state.previousState,
        savedDecks: state.savedDecks, // 保存されたデッキは維持
        canUndo: false, // 連続での待ったを防ぐ
        isNetworkGame: state.isNetworkGame,
        isHost: state.isHost,
        roomId: state.roomId,
        networkSyncCallback: state.networkSyncCallback,
      };
    }

    case 'SET_NETWORK_SYNC_CALLBACK': {
      console.log('SET_NETWORK_SYNC_CALLBACK - コールバック設定:', !!action.callback);
      return {
        ...state,
        networkSyncCallback: action.callback,
      };
    }

    case 'SYNC_NETWORK_ACTION': {
      // ネットワークアクションを受信して状態を同期
      if (!state.isNetworkGame) return state;

      const networkAction = action.action;
      console.log('ネットワークアクション同期:', networkAction);
      
      // 相手のアクションのみ処理（自分のアクションは既に処理済み）
      const isOpponentAction = state.isHost ? 
        networkAction.team === 'enemy' : 
        networkAction.team === 'player';
      
      if (!isOpponentAction) {
        console.log('自分のアクションなのでスキップ');
        return state;
      }

      console.log('相手のアクションを処理:', networkAction.type);

      // ネットワークアクションをローカルアクションに変換して処理
      switch (networkAction.type) {
        case 'move':
          // 移動アクションの処理
          const moveCharacter = state.characters.find(char => char.id === networkAction.characterId);
          if (moveCharacter && networkAction.position) {
            console.log('移動処理:', moveCharacter.name, networkAction.position);
            const updatedCharacters = state.characters.map(char =>
              char.id === networkAction.characterId
                ? { ...char, position: networkAction.position!, remainingActions: char.remainingActions - 1 }
                : char
            );
            return {
              ...state,
              characters: updatedCharacters,
              pendingAnimations: [{ id: networkAction.characterId, type: 'move' }],
            };
          }
          break;

        case 'attack':
          // 攻撃アクションの処理
          const attacker = state.characters.find(char => char.id === networkAction.characterId);
          const target = state.characters.find(char => char.id === networkAction.targetId);
          if (attacker && target) {
            console.log('攻撃処理:', attacker.name, '->', target.name);
            const damage = Math.max(0, attacker.attack - target.defense);
            const newHp = Math.max(0, target.hp - damage);
            
            const updatedCharacters = state.characters.map(char => {
              if (char.id === networkAction.characterId) {
                return { ...char, remainingActions: char.remainingActions - 1 };
              }
              if (char.id === networkAction.targetId) {
                return { ...char, hp: newHp };
              }
              return char;
            });

            const animations = [
              { id: attacker.id, type: 'attack' as const },
              { id: target.id, type: 'damage' as const }
            ];

            if (newHp === 0) {
              animations.push(
                { id: target.id, type: 'ko' as const },
                { id: attacker.team, type: 'crystal-gain' as const } // 倒した側がクリスタル獲得
              );
            }

            const { playerMasterAlive, enemyMasterAlive } = checkMasterStatus(updatedCharacters);

            return {
              ...state,
              characters: updatedCharacters,
              gamePhase: (!playerMasterAlive || !enemyMasterAlive) ? 'result' : 'action',
              pendingAnimations: animations,
            };
          }
          break;

        case 'skill':
          // スキルアクションの処理
          const skillUser = state.characters.find(char => char.id === networkAction.characterId);
          const skillTarget = state.characters.find(char => char.id === networkAction.targetId);
          const skill = skillData[networkAction.skillId!];
          
          if (skillUser && skillTarget && skill) {
            console.log('スキル処理:', skillUser.name, skill.name, '->', skillTarget.name);
            let updatedCharacters = [...state.characters];
            let playerCrystals = state.playerCrystals;
            let enemyCrystals = state.enemyCrystals;

            // クリスタル消費
            if (skillUser.team === 'player') {
              playerCrystals -= skill.crystalCost;
            } else {
              enemyCrystals -= skill.crystalCost;
            }

            // スキル効果の適用
            if (skill.healing) {
              updatedCharacters = updatedCharacters.map(char =>
                char.id === skillTarget.id
                  ? { ...char, hp: Math.min(char.maxHp, char.hp + skill.healing!) }
                  : char
              );
            }

            if (skill.damage) {
              let newHp: number;
              if (skill.ignoreDefense) {
                newHp = Math.max(0, skillTarget.hp - 1);
              } else {
                const totalDamage = skillUser.attack + skill.damage;
                const damage = Math.max(0, totalDamage - skillTarget.defense);
                newHp = Math.max(0, skillTarget.hp - damage);
              }

              updatedCharacters = updatedCharacters.map(char =>
                char.id === skillTarget.id
                  ? { ...char, hp: newHp }
                  : char
              );

              // キャラクターが倒された場合のクリスタル獲得処理
              if (newHp === 0) {
                // 倒した側がクリスタル獲得
                if (skillUser.team === 'player') {
                  playerCrystals = Math.min(MAX_CRYSTALS, playerCrystals + skillTarget.cost);
                } else {
                  enemyCrystals = Math.min(MAX_CRYSTALS, enemyCrystals + skillTarget.cost);
                }
              }
            }

            // 使用者の行動回数を減らす
            updatedCharacters = updatedCharacters.map(char =>
              char.id === skillUser.id
                ? { ...char, remainingActions: char.remainingActions - 1 }
                : char
            );

            const animations = [
              { id: skillUser.id, type: 'attack' as const },
              { id: skillTarget.id, type: skill.healing ? 'heal' as const : 'damage' as const }
            ];

            const { playerMasterAlive, enemyMasterAlive } = checkMasterStatus(updatedCharacters);

            return {
              ...state,
              characters: updatedCharacters,
              playerCrystals,
              enemyCrystals,
              gamePhase: (!playerMasterAlive || !enemyMasterAlive) ? 'result' : 'action',
              pendingAnimations: animations,
            };
          }
          break;

        case 'end_turn':
          // ターン終了アクションの処理
          console.log('ターン終了処理');
          const nextTeam: Team = state.currentTeam === 'player' ? 'enemy' : 'player';
          
          const refreshedCharacters = state.characters.map(character => {
            if (character.team === nextTeam) {
              return {
                ...character,
                remainingActions: character.actions,
              };
            }
            return character;
          });

          const newPlayerCrystals = nextTeam === 'player' 
            ? Math.min(MAX_CRYSTALS, state.playerCrystals + 1)
            : state.playerCrystals;
          
          const newEnemyCrystals = nextTeam === 'enemy'
            ? Math.min(MAX_CRYSTALS, state.enemyCrystals + 1)
            : state.enemyCrystals;

          const turnAnimations: AnimationSequence[] = [
            { id: nextTeam, type: 'turn-start' }
          ];
          
          if (nextTeam === 'player' && newPlayerCrystals > state.playerCrystals) {
            turnAnimations.push({ id: 'player-crystal', type: 'crystal-gain' });
          } else if (nextTeam === 'enemy' && newEnemyCrystals > state.enemyCrystals) {
            turnAnimations.push({ id: 'enemy-crystal', type: 'crystal-gain' });
          }

          return {
            ...state,
            characters: refreshedCharacters,
            currentTeam: nextTeam,
            currentTurn: nextTeam === 'player' ? state.currentTurn + 1 : state.currentTurn,
            playerCrystals: newPlayerCrystals,
            enemyCrystals: newEnemyCrystals,
            pendingAnimations: turnAnimations,
          };

        case 'surrender':
          // 降参アクションの処理
          console.log('降参処理:', networkAction.team);
          return {
            ...state,
            gamePhase: 'result',
            characters: state.characters.filter(char => 
              !(char.team === networkAction.team && char.type === 'master')
            ),
          };
      }

      console.log('未対応のアクションタイプ:', networkAction.type);
      return state;
    }

    default:
      return state;
  }
}

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, {
    ...createInitialGameState(),
    canUndo: false,
    isNetworkGame: false,
    isHost: false,
    roomId: null,
    networkSyncCallback: null,
  });
  const [savedDecks, setSavedDecks] = React.useState<{
    player?: { master: keyof typeof masterData; monsters: MonsterType[] };
    enemy?: { master: keyof typeof masterData; monsters: MonsterType[] };
  }>({
    // デフォルト編成を設定（ベアーとウルフを逆に）
    player: { master: 'blue', monsters: ['bear', 'wolf', 'golem'] },
    enemy: { master: 'red', monsters: ['bear', 'wolf', 'golem'] }
  });

  // 初期化時にデフォルト編成を設定
  React.useEffect(() => {
    dispatch({ 
      type: 'SET_SAVED_DECKS', 
      playerDeck: savedDecks.player!, 
      enemyDeck: savedDecks.enemy! 
    });
    dispatch({ 
      type: 'UPDATE_PREVIEW', 
      playerDeck: savedDecks.player, 
      enemyDeck: savedDecks.enemy 
    });
  }, []);

  useEffect(() => {
    if (state.pendingAnimations.length > 0) {
      const playAnimations = async () => {
        for (const animation of state.pendingAnimations) {
          dispatch({ type: 'SET_ANIMATION_TARGET', target: animation });
          await new Promise(resolve => setTimeout(resolve, ANIMATION_DURATION));
          
          // ゲームが既に終了している場合は追加処理をスキップ
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

    // ネットワークゲームの場合、自分のターンでない場合は無効
    if (state.isNetworkGame) {
      const isMyTurn = state.isHost ? state.currentTeam === 'player' : state.currentTeam === 'enemy';
      if (!isMyTurn) return false;
    }

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

    // ネットワークゲームの場合、自分のターンでない場合は無効
    if (state.isNetworkGame) {
      const isMyTurn = state.isHost ? state.currentTeam === 'player' : state.currentTeam === 'enemy';
      if (!isMyTurn) return false;
    }

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

    // ネットワークゲームの場合、自分のターンでない場合は無効
    if (state.isNetworkGame) {
      const isMyTurn = state.isHost ? state.currentTeam === 'player' : state.currentTeam === 'enemy';
      if (!isMyTurn) return false;
    }

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
      // 進化先があるかチェック
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

  return (
    <GameContext.Provider 
      value={{ 
        state, 
        dispatch, 
        isValidMove, 
        isValidAttack, 
        isValidSkillTarget,
        getCharacterAt,
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