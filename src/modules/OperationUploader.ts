// 3️⃣ 操作をアップロードするモジュール（重複防止機能付き）

import { GameState, Position, Team } from '../types/gameTypes';

export interface OperationData {
  turn: number;
  team: 'host' | 'guest'; // 🔧 host/guest制御に変更
  action: 'move' | 'attack' | 'skill' | 'end_turn' | 'forced_end_turn' | 'surrender';
  from: Position;
  to?: Position;
  skillId?: string;
  timestamp: number;
}

export class OperationUploader {
  private uploadFunction: ((roomId: string, operation: OperationData) => Promise<void>) | null = null;
  private roomId: string | null = null;
  private uploadInProgress: boolean = false;

  /**
   * アップロード関数を設定
   */
  setUploadFunction(uploadFunction: ((roomId: string, operation: OperationData) => Promise<void>) | null) {
    this.uploadFunction = uploadFunction;
  }

  /**
   * ルームIDを設定
   */
  setRoomId(roomId: string | null) {
    this.roomId = roomId;
  }

  /**
   * 🔧 player/enemy を host/guest に変換
   */
  private convertToHostGuest(gameTeam: Team, isHost: boolean): 'host' | 'guest' {
    if (isHost) {
      return gameTeam === 'player' ? 'host' : 'guest';
    } else {
      return gameTeam === 'player' ? 'guest' : 'host';
    }
  }

  /**
   * 移動操作をアップロード
   */
  async uploadMoveOperation(state: GameState, targetPosition: Position): Promise<boolean> {
    if (!this.canUpload() || !state.selectedCharacter) return false;

    const operationData: OperationData = {
      turn: state.currentTurn,
      team: this.convertToHostGuest(state.currentTeam, state.isHost),
      action: 'move',
      from: state.selectedCharacter.position,
      to: targetPosition,
      timestamp: Date.now()
    };

    console.log('📤 棋譜送信:', `${operationData.team} - ${operationData.action} - ターン${operationData.turn}`);
    return this.executeUpload(operationData);
  }

  /**
   * 攻撃操作をアップロード
   */
  async uploadAttackOperation(state: GameState, targetId: string): Promise<boolean> {
    if (!this.canUpload() || !state.selectedCharacter) return false;

    const target = state.characters.find(c => c.id === targetId);
    if (!target) return false;

    const operationData: OperationData = {
      turn: state.currentTurn,
      team: this.convertToHostGuest(state.currentTeam, state.isHost),
      action: 'attack',
      from: state.selectedCharacter.position,
      to: target.position,
      timestamp: Date.now()
    };

    console.log('📤 棋譜送信:', `${operationData.team} - ${operationData.action} - ターン${operationData.turn}`);
    return this.executeUpload(operationData);
  }

  /**
   * スキル操作をアップロード
   */
  async uploadSkillOperation(state: GameState, targetId: string, skillId: string): Promise<boolean> {
    if (!this.canUpload() || !state.selectedCharacter) return false;

    const target = state.characters.find(char => char.id === targetId);
    if (!target) return false;

    const operationData: OperationData = {
      turn: state.currentTurn,
      team: this.convertToHostGuest(state.currentTeam, state.isHost),
      action: 'skill',
      from: state.selectedCharacter.position,
      to: target.position,
      skillId,
      timestamp: Date.now()
    };

    console.log('📤 棋譜送信:', `${operationData.team} - ${operationData.action} - ターン${operationData.turn}`);
    return this.executeUpload(operationData);
  }

  /**
   * ターン終了操作をアップロード
   */
  async uploadEndTurnOperation(state: GameState, forced: boolean = false): Promise<boolean> {
    if (!this.canUpload()) return false;

    const operationData: OperationData = {
      turn: state.currentTurn,
      team: this.convertToHostGuest(state.currentTeam, state.isHost),
      action: forced ? 'forced_end_turn' : 'end_turn',
      from: { x: 0, y: 0 },
      timestamp: Date.now()
    };

    console.log('📤 棋譜送信:', `${operationData.team} - ${operationData.action} - ターン${operationData.turn}`);
    return this.executeUpload(operationData);
  }

  /**
   * 降参操作をアップロード
   */
  async uploadSurrenderOperation(state: GameState): Promise<boolean> {
    if (!this.canUpload()) return false;

    const operationData: OperationData = {
      turn: state.currentTurn,
      team: this.convertToHostGuest(state.currentTeam, state.isHost),
      action: 'surrender',
      from: { x: 0, y: 0 },
      timestamp: Date.now()
    };

    console.log('📤 棋譜送信:', `${operationData.team} - ${operationData.action} - ターン${operationData.turn}`);
    return this.executeUpload(operationData);
  }

  /**
   * アップロード実行（重複防止機能付き）
   */
  private async executeUpload(operationData: OperationData): Promise<boolean> {
    if (this.uploadInProgress) {
      return false;
    }

    this.uploadInProgress = true;

    try {
      await this.uploadFunction!(this.roomId!, operationData);
      return true;
    } catch (error) {
      console.error('❌ 棋譜送信エラー:', error);
      return false;
    } finally {
      setTimeout(() => {
        this.uploadInProgress = false;
      }, 200);
    }
  }

  /**
   * アップロード可能かチェック
   */
  private canUpload(): boolean {
    return !!(this.uploadFunction && this.roomId && !this.uploadInProgress);
  }
}

// シングルトンインスタンス
export const operationUploader = new OperationUploader();