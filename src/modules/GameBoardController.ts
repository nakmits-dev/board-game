// 🎮 ゲーム盤面制御モジュール
// 棋譜をもとに盤面を更新する処理のみを担当

import { GameState, Character, Position, Team, MonsterType, AnimationSequence } from '../types/gameTypes';
import { monsterData } from '../data/cardData';
import { skillData } from '../data/skillData';

const MAX_CRYSTALS = 8;

// マスター生存チェック
const checkMasterStatus = (characters: Character[]): { hostMasterAlive: boolean; guestMasterAlive: boolean } => {
  const hostMaster = characters.find(char => char.team === 'player' && char.type === 'master');
  const guestMaster = characters.find(char => char.team === 'enemy' && char.type === 'master');
  
  return {
    hostMasterAlive: !!hostMaster,
    guestMasterAlive: !!guestMaster
  };
};

// 進化タイプ取得
export const getEvolvedMonsterType = (type: MonsterType): MonsterType | null => {
  return monsterData[type].evolution || null;
};

// 🎯 棋譜適用関数（盤面更新のみ）
export const applyMoveToGameState = (state: GameState, move: any): GameState => {
  console.log('🎮 [GameBoardController] 棋譜適用:', {
    type: move.type || move.action,
    team: move.team,
    from: move.from,
    to: move.to
  });
  
  let updatedCharacters = [...state.characters];
  let animations: AnimationSequence[] = [];
  let hostCrystals = state.playerCrystals;
  let guestCrystals = state.enemyCrystals;
  let newGamePhase = state.gamePhase;
  let newCurrentTeam = state.currentTeam;
  let newCurrentTurn = state.currentTurn;

  const actionType = move.type || move.action;

  switch (actionType) {
    case 'move': {
      const character = updatedCharacters.find(char => 
        char.position.x === move.from.x && 
        char.position.y === move.from.y &&
        char.team === move.team
      );
      
      if (character && move.to) {
        console.log('📍 [GameBoardController] 移動適用:', character.name, move.from, '->', move.to);
        animations.push({ id: character.id, type: 'move' });
        
        updatedCharacters = updatedCharacters.map(char => 
          char.id === character.id
            ? {
                ...char,
                position: move.to,
                remainingActions: char.remainingActions - 1,
              }
            : char
        );
      }
      break;
    }

    case 'attack': {
      const attacker = updatedCharacters.find(char => 
        char.position.x === move.from.x && 
        char.position.y === move.from.y &&
        char.team === move.team
      );
      
      if (!attacker || !move.to) break;
      
      const target = updatedCharacters.find(char => 
        char.position.x === move.to.x && 
        char.position.y === move.to.y &&
        char.team !== move.team
      );
      
      if (!target) break;
      
      console.log('⚔️ [GameBoardController] 攻撃適用:', attacker.name, '->', target.name);
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

        if (attacker.type === 'monster' && !attacker.isEvolved && attacker.monsterType) {
          const evolvedType = getEvolvedMonsterType(attacker.monsterType);
          if (evolvedType) {
            animations.push({ id: attacker.id, type: 'evolve' });
          }
        }
      }

      updatedCharacters = updatedCharacters.map(char => {
        if (char.id === attacker.id) {
          return { ...char, remainingActions: char.remainingActions - 1 };
        }
        if (char.id === target.id) {
          return { ...char, hp: newHp };
        }
        return char;
      });

      if (newHp === 0 && target.type === 'master') {
        newGamePhase = 'result';
      }
      break;
    }

    case 'skill': {
      const caster = updatedCharacters.find(char => 
        char.position.x === move.from.x && 
        char.position.y === move.from.y &&
        char.team === move.team
      );
      
      const target = updatedCharacters.find(char => 
        char.position.x === move.to.x && 
        char.position.y === move.to.y
      );
      
      if (!caster || !target) break;

      const skill = skillData[move.skillId];
      if (!skill) break;

      console.log('✨ [GameBoardController] スキル適用:', caster.name, '->', target.name, skill.name);

      if (move.team === 'player') {
        hostCrystals -= skill.crystalCost;
      } else {
        guestCrystals -= skill.crystalCost;
      }

      animations.push({ id: caster.id, type: 'attack' });

      if (skill.healing) {
        animations.push({ id: target.id, type: 'heal' });
        updatedCharacters = updatedCharacters.map(char => {
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

        updatedCharacters = updatedCharacters.map(char => {
          if (char.id === target.id) {
            return { ...char, hp: newHp };
          }
          return char;
        });

        if (newHp === 0 && target.type === 'master') {
          newGamePhase = 'result';
        }
      }

      if (skill.effects?.some(effect => effect.type === 'evolve')) {
        if (target.type === 'monster' && !target.isEvolved && target.monsterType) {
          const evolvedType = getEvolvedMonsterType(target.monsterType);
          if (evolvedType) {
            animations.push({ id: target.id, type: 'evolve' });
          }
        }
      }

      updatedCharacters = updatedCharacters.map(char => {
        if (char.id === caster.id) {
          return { ...char, remainingActions: char.remainingActions - 1 };
        }
        return char;
      });
      break;
    }

    case 'end_turn':
    case 'forced_end_turn': {
      console.log('🔄 [GameBoardController] ターン終了適用:', actionType);
      
      newCurrentTeam = move.team === 'player' ? 'enemy' : 'player';
      
      const refreshedCharacters = updatedCharacters.map(character => {
        if (character.team === newCurrentTeam) {
          return {
            ...character,
            remainingActions: character.actions,
          };
        }
        return character;
      });

      updatedCharacters = refreshedCharacters;

      hostCrystals = newCurrentTeam === 'player' 
        ? Math.min(MAX_CRYSTALS, hostCrystals + 1)
        : hostCrystals;
      
      guestCrystals = newCurrentTeam === 'enemy'
        ? Math.min(MAX_CRYSTALS, guestCrystals + 1)
        : guestCrystals;

      newCurrentTurn = newCurrentTeam === 'player' ? newCurrentTurn + 1 : newCurrentTurn;

      animations.push({ id: newCurrentTeam, type: 'turn-start' });
      
      if (newCurrentTeam === 'player' && hostCrystals > state.playerCrystals) {
        animations.push({ id: 'player-crystal', type: 'crystal-gain' });
      } else if (newCurrentTeam === 'enemy' && guestCrystals > state.enemyCrystals) {
        animations.push({ id: 'enemy-crystal', type: 'crystal-gain' });
      }
      break;
    }

    case 'surrender': {
      console.log('🏳️ [GameBoardController] 降参適用:', move.team);
      newGamePhase = 'result';
      updatedCharacters = updatedCharacters.filter(char => 
        !(char.team === move.team && char.type === 'master')
      );
      break;
    }

    default: {
      console.warn('❓ [GameBoardController] 未対応の棋譜タイプ:', actionType);
      break;
    }
  }

  // ゲーム終了チェック
  if (newGamePhase !== 'result') {
    const { hostMasterAlive, guestMasterAlive } = checkMasterStatus(updatedCharacters);
    if (!hostMasterAlive || !guestMasterAlive) {
      newGamePhase = 'result';
    }
  }

  return {
    ...state,
    characters: updatedCharacters,
    playerCrystals: hostCrystals,
    enemyCrystals: guestCrystals,
    gamePhase: newGamePhase,
    currentTeam: newCurrentTeam,
    currentTurn: newCurrentTurn,
    pendingAnimations: animations,
    selectedCharacter: null,
    selectedAction: null,
    selectedSkill: null,
    pendingAction: { type: null },
    animationTarget: null,
  };
};