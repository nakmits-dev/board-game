import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { GameState, Character, Position, ActionType, Skill, Team, AnimationSequence, MonsterType, GameMove, GameRecord } from '../types/gameTypes';
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
  | { type: 'RESET_GAME' }
  | { type: 'UPDATE_PREVIEW'; playerDeck?: { master: keyof typeof masterData; monsters: MonsterType[] }; enemyDeck?: { master: keyof typeof masterData; monsters: MonsterType[] } }
  | { type: 'SET_SAVED_DECKS'; playerDeck: { master: keyof typeof masterData; monsters: MonsterType[] }; enemyDeck: { master: keyof typeof masterData; monsters: MonsterType[] } }
  | { type: 'ADD_CRYSTAL'; team: Team }
  | { type: 'SET_ANIMATION_TARGET'; target: { id: string; type: 'move' | 'attack' | 'damage' | 'heal' | 'ko' | 'crystal-gain' | 'turn-start' | 'evolve' } | null }
  | { type: 'SET_PENDING_ANIMATIONS'; animations: AnimationSequence[] }
  | { type: 'REMOVE_DEFEATED_CHARACTERS'; targetId: string }
  | { type: 'EVOLVE_CHARACTER'; characterId: string }
  | { type: 'UNDO_MOVE' }
  | { type: 'START_REPLAY' }
  | { type: 'STOP_REPLAY' }
  | { type: 'REPLAY_NEXT_MOVE' }
  | { type: 'REPLAY_PREVIOUS_MOVE' }
  | { type: 'LOAD_GAME_RECORD'; gameRecord: GameRecord };

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

const generateMoveId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

const checkMasterStatus = (characters: Character[]): { playerMasterAlive: boolean; enemyMasterAlive: boolean } => {
  const playerMaster = characters.find(char => char.team === 'player' && char.type === 'master');
  const enemyMaster = characters.find(char => char.team === 'enemy' && char.type === 'master');
  
  return {
    playerMasterAlive: !!playerMaster,
    enemyMasterAlive: !!enemyMaster
  };
};

const createGameMove = (
  type: GameMove['type'],
  character: Character,
  turn: number,
  team: Team,
  options: {
    from?: Position;
    to?: Position;
    targetId?: string;
    targetName?: string;
    skillId?: string;
    skillName?: string;
    damage?: number;
    healing?: number;
    crystalCost?: number;
    evolution?: { from: string; to: string };
  } = {}
): GameMove => {
  return {
    id: generateMoveId(),
    turn,
    team,
    type,
    characterId: character.id,
    characterName: character.name,
    timestamp: Date.now(),
    ...options
  };
};

const deepCloneGameState = (state: GameState): GameState => {
  return JSON.parse(JSON.stringify({
    ...state,
    selectedCharacter: null,
    selectedAction: null,
    selectedSkill: null,
    pendingAction: { type: null },
    animationTarget: null,
    pendingAnimations: []
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
      if (state.gamePhase === 'preparation' || state.replayMode) return state;
      
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
      if (!state.selectedCharacter || !state.pendingAction.type || state.replayMode) return state;
      
      if (state.selectedCharacter.team !== state.currentTeam) {
        return state;
      }

      let updatedCharacters = [...state.characters];
      let animations: AnimationSequence[] = [];
      let newMoves = [...state.moveHistory];

      if (state.pendingAction.type === 'move' && state.pendingAction.position) {
        animations.push({ id: state.selectedCharacter.id, type: 'move' });
        
        const move = createGameMove('move', state.selectedCharacter, state.currentTurn, state.currentTeam, {
          from: state.selectedCharacter.position,
          to: state.pendingAction.position
        });
        newMoves.push(move);
        
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

          const move = createGameMove('attack', state.selectedCharacter, state.currentTurn, state.currentTeam, {
            targetId: target.id,
            targetName: target.name,
            damage
          });
          newMoves.push(move);

          if (newHp === 0) {
            animations.push(
              { id: target.id, type: 'ko' },
              { id: target.team, type: 'crystal-gain' }
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
        moveHistory: newMoves,
        canUndo: true,
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
      if (!state.selectedCharacter || state.selectedCharacter.team !== state.currentTeam || state.replayMode) {
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
      if (!state.selectedCharacter || !state.selectedSkill || state.replayMode) return state;
      
      let updatedCharacters = [...state.characters];
      let animations: AnimationSequence[] = [];
      const target = updatedCharacters.find(char => char.id === action.targetId);
      let playerCrystals = state.playerCrystals;
      let enemyCrystals = state.enemyCrystals;
      let newMoves = [...state.moveHistory];
      
      if (!target) return state;

      if (state.currentTeam === 'player') {
        playerCrystals -= state.selectedSkill.crystalCost;
      } else {
        enemyCrystals -= state.selectedSkill.crystalCost;
      }

      const move = createGameMove('skill', state.selectedCharacter, state.currentTurn, state.currentTeam, {
        targetId: target.id,
        targetName: target.name,
        skillId: state.selectedSkill.id,
        skillName: state.selectedSkill.name,
        crystalCost: state.selectedSkill.crystalCost
      });

      if (state.selectedSkill.healing) {
        const healing = state.selectedSkill.healing;
        animations.push(
          { id: state.selectedCharacter.id, type: 'attack' },
          { id: target.id, type: 'heal' }
        );

        move.healing = healing;

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
        let damage: number;
        
        // 呪いスキルの場合は防御力を無視してHPを直接1減らす
        if (state.selectedSkill.ignoreDefense) {
          newHp = Math.max(0, target.hp - 1);
          damage = 1;
        } else {
          // 通常のダメージ計算
          const totalDamage = state.selectedCharacter.attack + state.selectedSkill.damage;
          damage = Math.max(0, totalDamage - target.defense);
          newHp = Math.max(0, target.hp - damage);
        }

        move.damage = damage;

        if (newHp === 0) {
          animations.push(
            { id: target.id, type: 'ko' },
            { id: target.team, type: 'crystal-gain' }
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
            move.evolution = {
              from: target.name,
              to: monsterData[evolvedType].name
            };
          }
        }
      }

      newMoves.push(move);

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
        moveHistory: newMoves,
        canUndo: true,
      };
    }

    case 'REMOVE_DEFEATED_CHARACTERS': {
      const defeatedCharacter = state.characters.find(char => char.id === action.targetId);
      const updatedCharacters = state.characters.filter(char => char.id !== action.targetId);

      let playerCrystals = state.playerCrystals;
      let enemyCrystals = state.enemyCrystals;

      if (defeatedCharacter) {
        // 倒されたキャラクターのコスト分のクリスタルを獲得
        const crystalGain = defeatedCharacter.cost;
        
        if (defeatedCharacter.team === 'player') {
          // プレイヤーのキャラクターが倒された場合、プレイヤーがクリスタルを獲得
          playerCrystals = Math.min(MAX_CRYSTALS, playerCrystals + crystalGain);
        } else {
          // 敵のキャラクターが倒された場合、敵がクリスタルを獲得
          enemyCrystals = Math.min(MAX_CRYSTALS, enemyCrystals + crystalGain);
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

    case 'END_TURN': {
      if (state.gamePhase === 'preparation' || state.replayMode) return state;
      
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

      // ターン終了の記録
      const endTurnMove = createGameMove('end-turn', 
        state.characters.find(char => char.team === state.currentTeam)!,
        state.currentTurn,
        state.currentTeam
      );

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
        moveHistory: [...state.moveHistory, endTurnMove],
        canUndo: true,
      };
    }

    case 'START_GAME': {
      const startingTeam: Team = Math.random() < 0.5 ? 'player' : 'enemy';
      
      // 新しいゲーム状態を作成（編成内容を反映）
      const newState = createInitialGameState(action.playerDeck, action.enemyDeck);
      
      // ゲーム記録を初期化
      const gameRecord: GameRecord = {
        id: generateMoveId(),
        startTime: Date.now(),
        playerDeck: action.playerDeck || { master: 'blue', monsters: ['bear', 'wolf', 'golem'] },
        enemyDeck: action.enemyDeck || { master: 'red', monsters: ['bear', 'wolf', 'golem'] },
        moves: []
      };
      
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
        gameRecord,
        moveHistory: [],
        replayMode: false,
        replayIndex: -1,
        canUndo: false,
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
        moveHistory: [],
        replayMode: false,
        replayIndex: -1,
        canUndo: false,
      };
    }

    case 'UNDO_MOVE': {
      if (!state.canUndo || state.moveHistory.length === 0 || state.replayMode) return state;

      // 最後の手を取り除く
      const newMoveHistory = [...state.moveHistory];
      newMoveHistory.pop();

      // ゲーム開始時の状態から再構築
      let reconstructedState = createInitialGameState(state.savedDecks?.player, state.savedDecks?.enemy);
      reconstructedState = {
        ...reconstructedState,
        gamePhase: 'action',
        currentTeam: 'player',
        characters: reconstructedState.characters.map(char => ({
          ...char,
          remainingActions: char.team === 'player' ? char.actions : 0,
        })),
        savedDecks: state.savedDecks,
        moveHistory: newMoveHistory,
        replayMode: false,
        replayIndex: -1,
        canUndo: newMoveHistory.length > 0,
      };

      // 手順を再実行（簡略化版）
      // 実際の実装では、各手順を正確に再現する必要があります
      
      return reconstructedState;
    }

    case 'START_REPLAY': {
      if (state.moveHistory.length === 0) return state;

      // ゲーム開始時の状態に戻す
      const initialState = createInitialGameState(state.savedDecks?.player, state.savedDecks?.enemy);
      
      return {
        ...state,
        ...initialState,
        gamePhase: 'replay',
        replayMode: true,
        replayIndex: -1,
        savedDecks: state.savedDecks,
        moveHistory: state.moveHistory,
        gameRecord: state.gameRecord,
      };
    }

    case 'STOP_REPLAY': {
      return {
        ...state,
        gamePhase: 'action',
        replayMode: false,
        replayIndex: -1,
      };
    }

    case 'REPLAY_NEXT_MOVE': {
      if (!state.replayMode || state.replayIndex >= state.moveHistory.length - 1) return state;

      const nextIndex = state.replayIndex + 1;
      // ここで実際の手順を再現する処理を実装
      // 簡略化のため、インデックスのみ更新

      return {
        ...state,
        replayIndex: nextIndex,
      };
    }

    case 'REPLAY_PREVIOUS_MOVE': {
      if (!state.replayMode || state.replayIndex <= 0) return state;

      const prevIndex = state.replayIndex - 1;
      // ここで前の状態に戻す処理を実装

      return {
        ...state,
        replayIndex: prevIndex,
      };
    }

    case 'LOAD_GAME_RECORD': {
      const { gameRecord } = action;
      
      // ゲーム記録から初期状態を復元
      const initialState = createInitialGameState(gameRecord.playerDeck, gameRecord.enemyDeck);
      
      return {
        ...initialState,
        gamePhase: 'preparation',
        savedDecks: {
          player: gameRecord.playerDeck,
          enemy: gameRecord.enemyDeck
        },
        gameRecord,
        moveHistory: gameRecord.moves,
        replayMode: false,
        replayIndex: -1,
        canUndo: false,
      };
    }

    default:
      return state;
  }
}

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, {
    ...createInitialGameState(),
    moveHistory: [],
    replayMode: false,
    replayIndex: -1,
    canUndo: false,
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
    if (state.gamePhase === 'preparation' || state.replayMode) return false;
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
    if (state.gamePhase === 'preparation' || state.replayMode) return false;
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
    if (state.gamePhase === 'preparation' || state.replayMode) return false;
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