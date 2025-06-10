import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { GameState, Character, Position, ActionType, Skill, Team, AnimationSequence, MonsterType } from '../types/gameTypes';
import { createInitialGameState, getEvolvedMonsterType, monsterData } from '../data/initialGameState';
import { skillData } from '../data/skillData';
import { masterData } from '../data/cardData';
import { addGameHistoryMove } from '../components/GameHistory';

type GameAction =
  | { type: 'SELECT_CHARACTER'; character: Character | null }
  | { type: 'SELECT_SKILL'; skill: Skill | null }
  | { type: 'MOVE_CHARACTER'; characterId: string; position: Position }
  | { type: 'ATTACK_CHARACTER'; attackerId: string; targetId: string }
  | { type: 'USE_SKILL'; casterId: string; targetId: string; skillId: string }
  | { type: 'END_TURN' }
  | { type: 'START_GAME'; hostDeck: { master: keyof typeof masterData; monsters: MonsterType[] }; guestDeck: { master: keyof typeof masterData; monsters: MonsterType[] } }
  | { type: 'RESET_GAME' }
  | { type: 'SURRENDER'; team: Team };

interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  isValidMove: (characterId: string, position: Position) => boolean;
  isValidAttack: (attackerId: string, targetId: string) => boolean;
  isValidSkillTarget: (casterId: string, targetId: string, skillId: string) => boolean;
  getCharacterAt: (position: Position) => Character | undefined;
  savedDecks: {
    host?: { master: keyof typeof masterData; monsters: MonsterType[] };
    guest?: { master: keyof typeof masterData; monsters: MonsterType[] };
  };
}

const GameContext = createContext<GameContextType | undefined>(undefined);

function gameReducer(state: GameState, action: GameAction): GameState {
  console.log(`🎮 [GameAction] ${action.type}`, action);

  switch (action.type) {
    case 'SELECT_CHARACTER': {
      return {
        ...state,
        selectedCharacter: action.character,
        selectedAction: null,
        selectedSkill: null,
      };
    }

    case 'SELECT_SKILL': {
      return {
        ...state,
        selectedSkill: action.skill,
        selectedAction: action.skill ? 'skill' : null,
      };
    }

    case 'MOVE_CHARACTER': {
      if (state.gamePhase !== 'action') return state;
      
      const character = state.characters.find(c => c.id === action.characterId);
      if (!character || character.team !== state.currentTeam || character.remainingActions <= 0) {
        return state;
      }

      const updatedCharacters = state.characters.map(c =>
        c.id === action.characterId
          ? { ...c, position: action.position, remainingActions: c.remainingActions - 1 }
          : c
      );

      // 棋譜記録
      addGameHistoryMove(
        state.currentTurn,
        state.currentTeam,
        'move',
        `${character.name}が(${action.position.x},${action.position.y})に移動`
      );

      return {
        ...state,
        characters: updatedCharacters,
        selectedCharacter: null,
      };
    }

    case 'ATTACK_CHARACTER': {
      if (state.gamePhase !== 'action') return state;
      
      const attacker = state.characters.find(c => c.id === action.attackerId);
      const target = state.characters.find(c => c.id === action.targetId);
      
      if (!attacker || !target || attacker.team !== state.currentTeam || attacker.remainingActions <= 0) {
        return state;
      }

      const damage = Math.max(0, attacker.attack - target.defense);
      const newHp = Math.max(0, target.hp - damage);
      
      let updatedCharacters = state.characters.map(c => {
        if (c.id === action.attackerId) {
          return { ...c, remainingActions: c.remainingActions - 1 };
        }
        if (c.id === action.targetId) {
          return { ...c, hp: newHp };
        }
        return c;
      });

      let newPlayerCrystals = state.playerCrystals;
      let newEnemyCrystals = state.enemyCrystals;
      let newGamePhase = state.gamePhase;

      // キャラクターが倒された場合の処理
      if (newHp === 0) {
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

        // 撃破されたキャラクターを除去
        updatedCharacters = updatedCharacters.filter(c => c.id !== action.targetId);

        // 攻撃者の進化チェック
        if (attacker.type === 'monster' && !attacker.isEvolved && attacker.monsterType) {
          const evolvedType = getEvolvedMonsterType(attacker.monsterType);
          if (evolvedType) {
            const evolvedStats = monsterData[evolvedType];
            updatedCharacters = updatedCharacters.map(c =>
              c.id === action.attackerId
                ? {
                    ...c,
                    name: evolvedStats.name,
                    monsterType: evolvedType,
                    maxHp: evolvedStats.hp,
                    hp: c.hp, // 現在のHPは維持
                    attack: evolvedStats.attack,
                    defense: evolvedStats.defense,
                    actions: evolvedStats.actions,
                    image: evolvedStats.image,
                    skillId: evolvedStats.skillId,
                    isEvolved: true,
                  }
                : c
            );
          }
        }
      }

      // 棋譜記録
      addGameHistoryMove(
        state.currentTurn,
        state.currentTeam,
        'attack',
        `${attacker.name}が${target.name}を攻撃（ダメージ: ${damage}）`
      );

      return {
        ...state,
        characters: updatedCharacters,
        selectedCharacter: null,
        playerCrystals: newPlayerCrystals,
        enemyCrystals: newEnemyCrystals,
        gamePhase: newGamePhase,
      };
    }

    case 'USE_SKILL': {
      if (state.gamePhase !== 'action') return state;
      
      const caster = state.characters.find(c => c.id === action.casterId);
      const target = state.characters.find(c => c.id === action.targetId);
      const skill = skillData[action.skillId];
      
      if (!caster || !target || !skill || caster.team !== state.currentTeam || caster.remainingActions <= 0) {
        return state;
      }

      const crystals = state.currentTeam === 'player' ? state.playerCrystals : state.enemyCrystals;
      if (crystals < skill.crystalCost) {
        return state;
      }

      let updatedCharacters = [...state.characters];
      let newPlayerCrystals = state.playerCrystals;
      let newEnemyCrystals = state.enemyCrystals;
      let newGamePhase = state.gamePhase;

      // クリスタル消費
      if (state.currentTeam === 'player') {
        newPlayerCrystals = Math.max(0, newPlayerCrystals - skill.crystalCost);
      } else {
        newEnemyCrystals = Math.max(0, newEnemyCrystals - skill.crystalCost);
      }

      // 使用者の行動回数を減らす
      updatedCharacters = updatedCharacters.map(c =>
        c.id === action.casterId
          ? { ...c, remainingActions: c.remainingActions - 1 }
          : c
      );

      // スキル効果適用
      if (skill.healing) {
        updatedCharacters = updatedCharacters.map(c =>
          c.id === action.targetId
            ? { ...c, hp: Math.min(c.maxHp, c.hp + skill.healing!) }
            : c
        );
      }

      if (skill.damage) {
        let newHp: number;
        if (skill.ignoreDefense) {
          newHp = Math.max(0, target.hp - 1);
        } else {
          const totalDamage = caster.attack + skill.damage;
          const damage = Math.max(0, totalDamage - target.defense);
          newHp = Math.max(0, target.hp - damage);
        }

        updatedCharacters = updatedCharacters.map(c =>
          c.id === action.targetId
            ? { ...c, hp: newHp }
            : c
        );

        // キャラクターが倒された場合の処理
        if (newHp === 0) {
          if (target.team === 'player') {
            newEnemyCrystals = Math.min(8, newEnemyCrystals + target.cost);
          } else {
            newPlayerCrystals = Math.min(8, newPlayerCrystals + target.cost);
          }

          if (target.type === 'master') {
            newGamePhase = 'result';
          }

          updatedCharacters = updatedCharacters.filter(c => c.id !== action.targetId);
        }
      }

      // 進化効果
      if (skill.effects?.some(effect => effect.type === 'evolve')) {
        if (target.type === 'monster' && !target.isEvolved && target.monsterType) {
          const evolvedType = getEvolvedMonsterType(target.monsterType);
          if (evolvedType) {
            const evolvedStats = monsterData[evolvedType];
            updatedCharacters = updatedCharacters.map(c =>
              c.id === action.targetId
                ? {
                    ...c,
                    name: evolvedStats.name,
                    monsterType: evolvedType,
                    maxHp: evolvedStats.hp,
                    hp: c.hp,
                    attack: evolvedStats.attack,
                    defense: evolvedStats.defense,
                    actions: evolvedStats.actions,
                    image: evolvedStats.image,
                    skillId: evolvedStats.skillId,
                    isEvolved: true,
                  }
                : c
            );
          }
        }
      }

      // 棋譜記録
      addGameHistoryMove(
        state.currentTurn,
        state.currentTeam,
        'skill',
        `${caster.name}が${target.name}に${skill.name}を使用`
      );

      return {
        ...state,
        characters: updatedCharacters,
        selectedCharacter: null,
        selectedSkill: null,
        playerCrystals: newPlayerCrystals,
        enemyCrystals: newEnemyCrystals,
        gamePhase: newGamePhase,
      };
    }

    case 'END_TURN': {
      if (state.gamePhase !== 'action') return state;

      const newCurrentTeam: Team = state.currentTeam === 'player' ? 'enemy' : 'player';
      const newCurrentTurn = newCurrentTeam === 'player' ? state.currentTurn + 1 : state.currentTurn;

      // 新しいチームのキャラクターの行動回数をリセット
      const refreshedCharacters = state.characters.map(character => {
        if (character.team === newCurrentTeam) {
          return { ...character, remainingActions: character.actions };
        }
        return character;
      });

      // クリスタル獲得
      const newPlayerCrystals = newCurrentTeam === 'player' 
        ? Math.min(8, state.playerCrystals + 1)
        : state.playerCrystals;
      
      const newEnemyCrystals = newCurrentTeam === 'enemy'
        ? Math.min(8, state.enemyCrystals + 1)
        : state.enemyCrystals;

      // 棋譜記録
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
        playerCrystals: newPlayerCrystals,
        enemyCrystals: newEnemyCrystals,
      };
    }

    case 'START_GAME': {
      console.log('🎮 [START_GAME] ゲーム開始');
      
      const newState = createInitialGameState(action.hostDeck, action.guestDeck);
      
      // 棋譜記録（1回のみ）
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
        savedDecks: {
          host: action.hostDeck,
          guest: action.guestDeck
        },
      };
    }

    case 'RESET_GAME': {
      console.log('🔄 [RESET_GAME] ゲームリセット');
      
      const newState = createInitialGameState(state.savedDecks?.host, state.savedDecks?.guest);
      
      return {
        ...newState,
        savedDecks: state.savedDecks,
      };
    }

    case 'SURRENDER': {
      // 棋譜記録
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
        characters: state.characters.filter(char => 
          !(char.team === action.team && char.type === 'master')
        ),
      };
    }

    default:
      return state;
  }
}

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, createInitialGameState());
  const [savedDecks, setSavedDecks] = React.useState<{
    host?: { master: keyof typeof masterData; monsters: MonsterType[] };
    guest?: { master: keyof typeof masterData; monsters: MonsterType[] };
  }>({
    host: { master: 'blue', monsters: ['bear', 'wolf', 'golem'] },
    guest: { master: 'red', monsters: ['bear', 'wolf', 'golem'] }
  });

  // 初期デッキ設定
  React.useEffect(() => {
    dispatch({ 
      type: 'START_GAME', 
      hostDeck: savedDecks.host!, 
      guestDeck: savedDecks.guest! 
    });
  }, []);

  // バリデーション関数
  const isValidMove = (characterId: string, position: Position): boolean => {
    const character = state.characters.find(c => c.id === characterId);
    if (!character || character.team !== state.currentTeam || character.remainingActions <= 0) {
      return false;
    }

    const { x: srcX, y: srcY } = character.position;
    const { x: destX, y: destY } = position;

    // 隣接チェック
    const dx = Math.abs(srcX - destX);
    const dy = Math.abs(srcY - destY);
    if (dx > 1 || dy > 1) return false;

    // 範囲チェック
    if (destX < 0 || destX > 2 || destY < 0 || destY > 3) return false;

    // 占有チェック
    const isOccupied = state.characters.some(
      char => char.position.x === destX && char.position.y === destY
    );

    return !isOccupied;
  };

  const isValidAttack = (attackerId: string, targetId: string): boolean => {
    const attacker = state.characters.find(c => c.id === attackerId);
    const target = state.characters.find(c => c.id === targetId);
    
    if (!attacker || !target || attacker.team !== state.currentTeam || attacker.remainingActions <= 0) {
      return false;
    }

    if (target.team === attacker.team) return false;

    // 隣接チェック
    const { x: srcX, y: srcY } = attacker.position;
    const { x: destX, y: destY } = target.position;
    const dx = Math.abs(srcX - destX);
    const dy = Math.abs(srcY - destY);

    return dx <= 1 && dy <= 1;
  };

  const isValidSkillTarget = (casterId: string, targetId: string, skillId: string): boolean => {
    const caster = state.characters.find(c => c.id === casterId);
    const target = state.characters.find(c => c.id === targetId);
    const skill = skillData[skillId];
    
    if (!caster || !target || !skill || caster.team !== state.currentTeam || caster.remainingActions <= 0) {
      return false;
    }

    // クリスタルチェック
    const crystals = state.currentTeam === 'player' ? state.playerCrystals : state.enemyCrystals;
    if (crystals < skill.crystalCost) return false;

    // 距離チェック
    const { x: srcX, y: srcY } = caster.position;
    const { x: destX, y: destY } = target.position;
    const dx = Math.abs(srcX - destX);
    const dy = Math.abs(srcY - destY);
    const distance = Math.max(dx, dy);

    if (distance > skill.range) return false;

    // ターゲットタイプチェック
    if (skill.healing && target.team !== caster.team) return false;
    if (skill.damage && target.team === caster.team) return false;
    if (skill.effects?.some(effect => effect.type === 'evolve')) {
      if (target.team !== caster.team) return false;
      if (target.type !== 'monster' || target.isEvolved) return false;
      if (target.type === 'monster' && target.monsterType) {
        const evolvedType = getEvolvedMonsterType(target.monsterType);
        if (!evolvedType) return false;
      }
    }

    return true;
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