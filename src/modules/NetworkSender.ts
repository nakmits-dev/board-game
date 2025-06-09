// 📤 ネットワーク送信モジュール
// Firebase への棋譜送信のみを担当

import { GameState, Position } from '../types/gameTypes';

export interface MoveData {
  turn: number;
  team: 'player' | 'enemy';
  action: 'move' | 'attack' | 'skill' | 'end_turn' | 'forced_end_turn' | 'surrender';
  from: Position;
  to?: Position;
  skillId?: string;
  timestamp: number;
}

export class NetworkSender {
  private sendMoveFunction: ((roomId: string, move: MoveData) => Promise<void>) | null = null;
  private roomId: string | null = null;

  // 送信関数を設定
  setSendMoveFunction(sendMoveFunction: ((roomId: string, move: MoveData) => Promise<void>) | null) {
    this.sendMoveFunction = sendMoveFunction;
    console.log('📤 [NetworkSender] 送信関数設定:', !!sendMoveFunction);
  }

  // ルームIDを設定
  setRoomId(roomId: string | null) {
    this.roomId = roomId;
    console.log('📤 [NetworkSender] ルームID設定:', roomId);
  }

  // 移動・攻撃の送信
  async sendAction(state: GameState, actionType: 'move' | 'attack', targetPosition?: Position, targetId?: string): Promise<boolean> {
    if (!this.canSend()) return false;
    if (!state.selectedCharacter) return false;

    const moveData: MoveData = {
      turn: state.currentTurn,
      team: state.currentTeam,
      action: actionType,
      from: state.selectedCharacter.position,
      to: targetPosition || (targetId ? 
        state.characters.find(c => c.id === targetId)?.position : undefined
      ),
      timestamp: Date.now()
    };

    console.log('📤 [NetworkSender] アクション送信:', moveData);
    
    try {
      await this.sendMoveFunction!(this.roomId!, moveData);
      return true;
    } catch (error) {
      console.error('❌ [NetworkSender] アクション送信エラー:', error);
      return false;
    }
  }

  // スキルの送信
  async sendSkill(state: GameState, targetId: string, skillId: string): Promise<boolean> {
    if (!this.canSend()) return false;
    if (!state.selectedCharacter) return false;

    const target = state.characters.find(char => char.id === targetId);
    if (!target) return false;

    const moveData: MoveData = {
      turn: state.currentTurn,
      team: state.currentTeam,
      action: 'skill',
      from: state.selectedCharacter.position,
      to: target.position,
      skillId,
      timestamp: Date.now()
    };

    console.log('📤 [NetworkSender] スキル送信:', moveData);
    
    try {
      await this.sendMoveFunction!(this.roomId!, moveData);
      return true;
    } catch (error) {
      console.error('❌ [NetworkSender] スキル送信エラー:', error);
      return false;
    }
  }

  // ターン終了の送信
  async sendEndTurn(state: GameState, forced: boolean = false): Promise<boolean> {
    if (!this.canSend()) return false;

    const moveData: MoveData = {
      turn: state.currentTurn,
      team: state.currentTeam,
      action: forced ? 'forced_end_turn' : 'end_turn',
      from: { x: 0, y: 0 },
      timestamp: Date.now()
    };

    console.log('📤 [NetworkSender] ターン終了送信:', moveData);
    
    try {
      await this.sendMoveFunction!(this.roomId!, moveData);
      return true;
    } catch (error) {
      console.error('❌ [NetworkSender] ターン終了送信エラー:', error);
      return false;
    }
  }

  // 降参の送信
  async sendSurrender(state: GameState): Promise<boolean> {
    if (!this.canSend()) return false;

    const moveData: MoveData = {
      turn: state.currentTurn,
      team: state.currentTeam,
      action: 'surrender',
      from: { x: 0, y: 0 },
      timestamp: Date.now()
    };

    console.log('📤 [NetworkSender] 降参送信:', moveData);
    
    try {
      await this.sendMoveFunction!(this.roomId!, moveData);
      return true;
    } catch (error) {
      console.error('❌ [NetworkSender] 降参送信エラー:', error);
      return false;
    }
  }

  // 送信可能かチェック
  private canSend(): boolean {
    const canSend = !!(this.sendMoveFunction && this.roomId);
    if (!canSend) {
      console.warn('⚠️ [NetworkSender] 送信不可:', {
        sendMoveFunction: !!this.sendMoveFunction,
        roomId: this.roomId
      });
    }
    return canSend;
  }
}

// シングルトンインスタンス
export const networkSender = new NetworkSender();