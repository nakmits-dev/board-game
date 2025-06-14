import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { GameState, Character, Position, ActionType, Skill, Team, AnimationSequence, MonsterType, BoardState, BoardCell } from '../types/gameTypes';
import { createInitialGameState, getEvolvedMonsterType, monsterData } from '../data/initialGameState';
import { skillData } from '../data/skillData';
import { masterData } from '../data/cardData';
import { 
  isValidPosition, 
  arePositionsEqual, 
  getDistance, 
  getAdjacentPositions,
  createEmptyBoard,
  updateBoardWithCharacters,
  getCharacterAt as getBoardCharacterAt,
  BOARD_WIDTH,
  BOARD_HEIGHT
} from '../utils/boardUtils';

type GameAction =
  | { type: 'SELECT_CHARACTER'; character: Character | null }
  | { type: 'SET_ACTION_MODE'; mode: ActionType }
  | { type: 'SET_PENDING_ACTION'; action: { type: ActionType; targetId?: string; position?: Position } }
  | { type: 'CONFIRM_ACTION' }
  | { type: 'CANCEL_ACTION' }
  | { type: 'SELECT_SKILL'; skill: Skill }
  | { type: 'USE_SKILL'; targetId: string }
  | { type: 'END_TURN' }
  | { type: 'FORCE_END_TURN' }
  | { type: 'START_LOCAL_GAME'; hostBoard: BoardCell[][]; guestBoard: BoardCell[][]; startingTeam?: 'player' | 'enemy' }
  | { type: 'RESET_GAME' }
  | { type: 'UPDATE_PREVIEW'; hostBoard?: BoardCell[][]; guestBoard?: BoardCell[][] }
  | { type: 'SET_SAVED_BOARD'; hostBoard: BoardCell[][]; guestBoard: BoardCell[][] }
  | { type: 'SET_ANIMATION_TARGET'; target: { id: string; type: 'move' | 'attack' | 'damage' | 'heal' | 'ko' | 'crystal-gain' | 'turn-start' | 'evolve' } | null }
  | { type: 'SET_PENDING_ANIMATIONS'; animations: AnimationSequence[] }
  | { type: 'REMOVE_DEFEATED_CHARACTERS'; targetId: string; killerTeam?: Team }
  | { type: 'EVOLVE_CHARACTER'; characterId: string }
  | { type: 'CHECK_GAME_END' }
  | { type: 'SURRENDER'; team: Team }
  | { type: 'UPDATE_CRYSTALS'; playerCrystals: number; enemyCrystals: number }
  | { type: 'UPDATE_BOARD'; characters: Character[] };

interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  isValidMove: (position: Position) => boolean;
  isValidAttack: (targetId: string) => boolean;
  isValidSkillTarget: (targetId: string) => boolean;
  getCharacterAt: (position: Position) => Character | undefined;
  isPositionValid: (position: Position) => boolean;
  getAdjacentPositions: (position: Position) => Position[];
  getDistance: (pos1: Position, pos2: Position) => number;
  getAllBoardPositions: () => Position[];
  savedBoard: {
    host?: BoardCell[][];
    guest?: BoardCell[][];
  };
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const ANIMATION_DURATION = 300;

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'UPDATE_BOARD': {
      const newBoard = updateBoardWithCharacters(state.board, action.characters);
      return {
        ...state,
        board: newBoard,
        characters: action.characters,
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

    case 'UPDATE_CRYSTALS': {
      return {
        ...state,
        playerCrystals: action.playerCrystals,
        enemyCrystals: action.enemyCrystals,
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
      } else if (state.pendingAction.type === 'attack' && state.pendingAction.targetId) {
        const target = state.characters.find(char => char.id === state.pendingAction.targetId);
        if (target) {
          const damage = Math.max(0, character.attack - target.defense);
          const newHp = Math.max(0, target.hp - damage);
          
          // 🔧 アニメーション順序を正しく設定：攻撃 → ダメージ → 気絶
          animations.push(
            { id: character.id, type: 'attack' },
            { id: target.id, type: 'damage' }
          );

          if (newHp === 0) {
            animations.push({ id: target.id, type: 'ko' });

            // 🔧 マスターが倒された場合はクリスタル取得と進化を停止
            if (target.type !== 'master') {
              // モンスターが倒された場合のみクリスタル取得処理
              // 🔧 撃破された側がクリスタルを取得
              // 🔧 複数クリスタル取得時は同時にアニメーション実行
              const crystalTeam = target.team === 'player' ? 'player-crystal' : 'enemy-crystal';
              animations.push({ id: `${crystalTeam}-${target.cost}`, type: 'crystal-gain' });

              // 進化処理（攻撃側のキャラクターが進化可能な場合）
              if (character.type === 'monster' && !character.isEvolved && character.monsterType) {
                const evolvedType = getEvolvedMonsterType(character.monsterType);
                if (evolvedType) {
                  animations.push({ id: character.id, type: 'evolve' });
                }
              }
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
        }
      }

      const newBoard = updateBoardWithCharacters(state.board, newCharacters);

      return {
        ...state,
        board: newBoard,
        characters: newCharacters,
        selectedCharacter: null,
        selectedAction: null,
        selectedSkill: null,
        pendingAction: { type: null },
        pendingAnimations: animations,
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

      const newBoard = updateBoardWithCharacters(state.board, updatedCharacters);

      return {
        ...state,
        board: newBoard,
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
          animations.push({ id: target.id, type: 'ko' });

          // 🔧 マスターが倒された場合はクリスタル取得と進化を停止
          if (target.type !== 'master') {
            // モンスターが倒された場合のみクリスタル取得処理
            // 🔧 撃破された側がクリスタルを取得
            // 🔧 複数クリスタル取得時は同時にアニメーション実行
            const crystalTeam = target.team === 'player' ? 'player-crystal' : 'enemy-crystal';
            animations.push({ id: `${crystalTeam}-${target.cost}`, type: 'crystal-gain' });
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

      const newBoard = updateBoardWithCharacters(state.board, newCharacters);

      return {
        ...state,
        board: newBoard,
        characters: newCharacters,
        selectedCharacter: null,
        selectedAction: null,
        selectedSkill: null,
        pendingAction: { type: null },
        pendingAnimations: animations,
        playerCrystals: newPlayerCrystals,
        enemyCrystals: newEnemyCrystals,
      };
    }

    case 'REMOVE_DEFEATED_CHARACTERS': {
      const updatedCharacters = state.characters.filter(char => char.id !== action.targetId);
      const newBoard = updateBoardWithCharacters(state.board, updatedCharacters);

      return {
        ...state,
        board: newBoard,
        characters: updatedCharacters,
      };
    }

    case 'CHECK_GAME_END': {
      const hostMasterAlive = state.characters.some(char => char.team === 'player' && char.type === 'master');
      const guestMasterAlive = state.characters.some(char => char.team === 'enemy' && char.type === 'master');

      if (!hostMasterAlive || !guestMasterAlive) {
        return {
          ...state,
          gamePhase: 'result',
        };
      }

      return state;
    }

    case 'CANCEL_ACTION': {
      return {
        ...state,
        pendingAction: { type: null },
      };
    }

    case 'SURRENDER': {
      // 🔧 降参時はマスターを消さずにゲーム終了状態にする
      return {
        ...state,
        gamePhase: 'result',
        selectedCharacter: null,
        selectedAction: null,
        selectedSkill: null,
        pendingAction: { type: null },
        animationTarget: null,
        pendingAnimations: [],
        // マスターは削除しない（勝敗判定は別途行う）
      };
    }

    case 'END_TURN':
    case 'FORCE_END_TURN': {
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
        animations.push({ id: 'player-crystal-1', type: 'crystal-gain' });
      } else if (newCurrentTeam === 'enemy' && newEnemyCrystals > state.enemyCrystals) {
        animations.push({ id: 'enemy-crystal-1', type: 'crystal-gain' });
      }

      const newBoard = updateBoardWithCharacters(state.board, refreshedCharacters);

      return {
        ...state,
        board: newBoard,
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
      const newState = createInitialGameState(action.hostBoard, action.guestBoard);
      
      // 開始チームを決定
      const startingTeam = action.startingTeam || 'player';
      
      const refreshedCharacters = newState.characters.map(char => ({
        ...char,
        remainingActions: char.team === startingTeam ? char.actions : 0,
      }));

      const newBoard = updateBoardWithCharacters(newState.board, refreshedCharacters);
      
      return {
        ...newState,
        board: newBoard,
        characters: refreshedCharacters,
        gamePhase: 'action',
        currentTeam: startingTeam,
        pendingAnimations: [{ id: startingTeam, type: 'turn-start' }],
        savedBoard: {
          host: action.hostBoard,
          guest: action.guestBoard
        },
      };
    }

    case 'UPDATE_PREVIEW': {
      if (state.gamePhase !== 'preparation' && state.gamePhase !== 'result') return state;
      
      const newState = createInitialGameState(action.hostBoard, action.guestBoard);
      const newBoard = updateBoardWithCharacters(state.board, newState.characters);
      
      return {
        ...state,
        board: newBoard,
        characters: newState.characters,
        savedBoard: {
          host: action.hostBoard,
          guest: action.guestBoard
        }
      };
    }

    case 'SET_SAVED_BOARD': {
      return {
        ...state,
        savedBoard: {
          host: action.hostBoard,
          guest: action.guestBoard
        }
      };
    }

    case 'RESET_GAME': {
      const newState = createInitialGameState(state.savedBoard?.host, state.savedBoard?.guest);
      const newBoard = updateBoardWithCharacters(newState.board, newState.characters);
      
      return {
        ...newState,
        board: newBoard,
        savedBoard: state.savedBoard,
      };
    }

    default:
      return state;
  }
}

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, createInitialGameState());
  
  // 🔧 初期化時にデフォルトボードを設定（1回のみ）
  React.useEffect(() => {
    // 初期状態のキャラクターからボードを作成
    if (state.characters.length > 0 && (!state.savedBoard?.host || !state.savedBoard?.guest)) {
      // 初期キャラクターからボードを抽出
      const hostBoard = createEmptyBoard().cells;
      const guestBoard = createEmptyBoard().cells;
      
      // プレイヤーキャラクターをホストボードに配置
      state.characters.filter(char => char.team === 'player').forEach(char => {
        const { x, y } = char.position;
        if (y < BOARD_HEIGHT && x < BOARD_WIDTH) {
          hostBoard[y][x] = {
            position: char.position,
            character: char,
            isValidPlacement: true,
            team: char.team,
            cellType: char.type
          };
        }
      });
      
      // 敵キャラクターをゲストボードに配置
      state.characters.filter(char => char.team === 'enemy').forEach(char => {
        const { x, y } = char.position;
        if (y < BOARD_HEIGHT && x < BOARD_WIDTH) {
          guestBoard[y][x] = {
            position: char.position,
            character: char,
            isValidPlacement: true,
            team: char.team,
            cellType: char.type
          };
        }
      });
      
      dispatch({ 
        type: 'SET_SAVED_BOARD', 
        hostBoard, 
        guestBoard 
      });
    }
  }, []); // 空の依存配列で初回のみ実行

  useEffect(() => {
    if (state.pendingAnimations.length > 0) {
      const playAnimations = async () => {
        for (const animation of state.pendingAnimations) {
          dispatch({ type: 'SET_ANIMATION_TARGET', target: animation });
          await new Promise(resolve => setTimeout(resolve, ANIMATION_DURATION));
          
          if (animation.type === 'ko') {
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // 🔧 撃破されたキャラクターのクリスタル取得処理
            const defeatedCharacter = state.characters.find(char => char.id === animation.id);
            if (defeatedCharacter && defeatedCharacter.type !== 'master') {
              // 撃破された側がクリスタルを取得
              const newPlayerCrystals = defeatedCharacter.team === 'player' 
                ? Math.min(8, state.playerCrystals + defeatedCharacter.cost)
                : state.playerCrystals;
              
              const newEnemyCrystals = defeatedCharacter.team === 'enemy'
                ? Math.min(8, state.enemyCrystals + defeatedCharacter.cost)
                : state.enemyCrystals;
              
              dispatch({ 
                type: 'UPDATE_CRYSTALS', 
                playerCrystals: newPlayerCrystals, 
                enemyCrystals: newEnemyCrystals 
              });
            }
            
            dispatch({ type: 'REMOVE_DEFEATED_CHARACTERS', targetId: animation.id });
            
            // 🔧 気絶アニメーション後に勝利判定をチェック
            // マスターが倒された場合の勝利判定
            if (defeatedCharacter?.type === 'master') {
              // 少し遅延してから勝利判定
              await new Promise(resolve => setTimeout(resolve, 200));
              dispatch({ type: 'CHECK_GAME_END' });
            }
          } else if (animation.type === 'evolve') {
            await new Promise(resolve => setTimeout(resolve, 100));
            dispatch({ type: 'EVOLVE_CHARACTER', characterId: animation.id });
          } else if (animation.type === 'crystal-gain' && animation.id.includes('-')) {
            // 🔧 複数クリスタル取得時の同時アニメーション処理
            const [crystalTeam, costStr] = animation.id.split('-');
            const cost = parseInt(costStr);
            
            if (cost > 1) {
              // 複数クリスタルの場合、同時にアニメーション実行
              const simultaneousAnimations = [];
              for (let i = 0; i < cost; i++) {
                simultaneousAnimations.push(
                  new Promise(resolve => {
                    setTimeout(() => {
                      dispatch({ 
                        type: 'SET_ANIMATION_TARGET', 
                        target: { id: crystalTeam.replace('-crystal', '-crystal'), type: 'crystal-gain' } 
                      });
                      setTimeout(resolve, ANIMATION_DURATION);
                    }, i * 50); // 50ms間隔でずらして同時感を演出
                  })
                );
              }
              await Promise.all(simultaneousAnimations);
            }
          }
        }
        dispatch({ type: 'SET_ANIMATION_TARGET', target: null });
        dispatch({ type: 'SET_PENDING_ANIMATIONS', animations: [] });
      };

      playAnimations();
    }
  }, [state.pendingAnimations]);

  // 🔧 座標ベースの移動判定
  const isValidMove = (position: Position): boolean => {
    if (!state.selectedCharacter || state.selectedCharacter.remainingActions <= 0) return false;
    if (state.gamePhase === 'preparation') return false;
    if (state.selectedCharacter.team !== state.currentTeam) return false;

    // 座標が有効範囲内かチェック
    if (!isValidPosition(position)) return false;

    // 隣接する位置かチェック（8方向移動）
    const distance = getDistance(state.selectedCharacter.position, position);
    if (distance > 1) return false;

    // 既に他のキャラクターがいるかチェック
    const isOccupied = state.characters.some(
      char => arePositionsEqual(char.position, position)
    );

    return !isOccupied;
  };

  // 🔧 座標ベースの攻撃判定
  const isValidAttack = (targetId: string): boolean => {
    if (!state.selectedCharacter || state.selectedCharacter.remainingActions <= 0) return false;
    if (state.gamePhase === 'preparation') return false;
    if (state.selectedCharacter.team !== state.currentTeam) return false;

    const target = state.characters.find(char => char.id === targetId);
    if (!target || target.team === state.selectedCharacter.team) return false;

    // 隣接する位置かチェック（8方向攻撃）
    const distance = getDistance(state.selectedCharacter.position, target.position);
    return distance <= 1;
  };

  // 🔧 座標ベースのスキル対象判定
  const isValidSkillTarget = (targetId: string): boolean => {
    if (!state.selectedCharacter || !state.selectedSkill || state.selectedCharacter.remainingActions <= 0) return false;
    if (state.gamePhase === 'preparation') return false;
    if (state.selectedCharacter.team !== state.currentTeam) return false;

    const target = state.characters.find(char => char.id === targetId);
    if (!target) return false;

    // 距離チェック
    const distance = getDistance(state.selectedCharacter.position, target.position);

    // スキルの種類による対象チェック
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

  // 🔧 座標ベースのキャラクター検索
  const getCharacterAt = (position: Position): Character | undefined => {
    return state.characters.find(
      char => arePositionsEqual(char.position, position)
    );
  };

  // 🔧 全ボード座標を取得
  const getAllBoardPositions = (): Position[] => {
    const positions: Position[] = [];
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        positions.push({ x, y });
      }
    }
    return positions;
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
        isPositionValid: isValidPosition,
        getAdjacentPositions,
        getDistance,
        getAllBoardPositions,
        savedBoard: state.savedBoard || { host: undefined, guest: undefined }
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