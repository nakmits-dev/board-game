// 🎯 Single Responsibility Principle: ゲームの検証ロジックを専門に行うサービス
import { Character, Position, Team, Skill } from '../types/gameTypes';
import { getEvolvedMonsterType } from '../data/initialGameState';

export class GameValidationService {
  // 🎯 移動の妥当性をチェック
  static isValidMove(
    characters: Character[],
    selectedCharacter: Character | null,
    position: Position,
    currentTeam: Team,
    gamePhase: string
  ): boolean {
    if (!selectedCharacter || selectedCharacter.remainingActions <= 0) return false;
    if (gamePhase === 'preparation') return false;
    if (selectedCharacter.team !== currentTeam) return false;

    const { x: srcX, y: srcY } = selectedCharacter.position;
    const { x: destX, y: destY } = position;

    const dx = Math.abs(srcX - destX);
    const dy = Math.abs(srcY - destY);
    
    if (dx > 1 || dy > 1) return false;
    if (destX < 0 || destX > 2 || destY < 0 || destY > 3) return false;

    const isOccupied = characters.some(
      char => char.position.x === destX && char.position.y === destY
    );

    return !isOccupied;
  }

  // 🎯 攻撃の妥当性をチェック
  static isValidAttack(
    characters: Character[],
    selectedCharacter: Character | null,
    targetId: string,
    currentTeam: Team,
    gamePhase: string
  ): boolean {
    if (!selectedCharacter || selectedCharacter.remainingActions <= 0) return false;
    if (gamePhase === 'preparation') return false;
    if (selectedCharacter.team !== currentTeam) return false;

    const target = characters.find(char => char.id === targetId);
    if (!target || target.team === selectedCharacter.team) return false;

    const { x: srcX, y: srcY } = selectedCharacter.position;
    const { x: destX, y: destY } = target.position;

    const dx = Math.abs(srcX - destX);
    const dy = Math.abs(srcY - destY);

    return dx <= 1 && dy <= 1;
  }

  // 🎯 スキル対象の妥当性をチェック
  static isValidSkillTarget(
    characters: Character[],
    selectedCharacter: Character | null,
    selectedSkill: Skill | null,
    targetId: string,
    currentTeam: Team,
    gamePhase: string
  ): boolean {
    if (!selectedCharacter || !selectedSkill || selectedCharacter.remainingActions <= 0) return false;
    if (gamePhase === 'preparation') return false;
    if (selectedCharacter.team !== currentTeam) return false;

    const target = characters.find(char => char.id === targetId);
    if (!target) return false;

    const { x: srcX, y: srcY } = selectedCharacter.position;
    const { x: destX, y: destY } = target.position;

    const dx = Math.abs(srcX - destX);
    const dy = Math.abs(srcY - destY);
    const distance = Math.max(dx, dy);

    if (selectedSkill.healing && target.team !== selectedCharacter.team) return false;
    if (selectedSkill.damage && target.team === selectedCharacter.team) return false;
    if (selectedSkill.effects?.some(effect => effect.type === 'evolve')) {
      if (target.team !== selectedCharacter.team) return false;
      if (target.type !== 'monster' || target.isEvolved) return false;
      if (target.type === 'monster' && target.monsterType) {
        const evolvedType = getEvolvedMonsterType(target.monsterType);
        if (!evolvedType) return false;
      }
    }

    return distance <= selectedSkill.range;
  }

  // 🎯 ゲーム開始の妥当性をチェック
  static canStartGame(savedDecks: any): boolean {
    const result = !!(savedDecks.host && savedDecks.guest);
    console.log(`🎮 [GameValidationService] ゲーム開始可能チェック:`, { 
      result, 
      hasHost: !!savedDecks.host, 
      hasGuest: !!savedDecks.guest 
    });
    return result;
  }
}