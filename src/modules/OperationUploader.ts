// 3️⃣ 操作をアップロードするモジュール

import { GameState, Position } from '../types/gameTypes';

export interface OperationData {
  turn: number;
  team: 'player' | 'enemy';
  action: 'move' | 'attack' | 'skill' | 'end_turn' | 'forced_end_turn' | 'surrender';
  from: Position;
  to?: Position;
  skillId?: string;
  timestamp: number;
}

export class OperationUploader {
  private uploadFunction: ((roomId: string, operation: OperationData) => Promise<void>) | null = null;
  private roomId: string | null = null;

  /**
   * アップロード関数を設定
   */
  setUploadFunction(uploadFunction: ((roomId: string, operation: OperationData) => Promise<void>) | null) {
    this.uploadFunction = uploadFunction;
    console.log('📤 [OperationUploader] アップロード関数設定:', !!uploadFunction);
  }

  /**
   * ルームIDを設定
   */
  setRoomId(roomId: string | null) {
    this.roomId = roomId;
    console.log('📤 [OperationUploader] ルームID設定:', roomId);
  }

  /**
   * 移動操作をアップロード
   */
  async uploadMoveOperation(state: GameState, targetPosition: Position): Promise<boolean> {
    if (!this.canUpload() || !state.selectedCharacter) return false;

    const operationData: OperationData = {
      turn: state.currentTurn,
      team: state.currentTeam,
      action: 'move',
      from: state.selectedCharacter.position,
      to: targetPosition,
      timestamp: Date.now()
    };

    console.log('📤 [OperationUploader] 移動操作アップロード:', operationData);
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
      team: state.currentTeam,
      action: 'attack',
      from: state.selectedCharacter.position,
      to: target.position,
      timestamp: Date.now()
    };

    console.log('📤 [OperationUploader] 攻撃操作アップロード:', operationData);
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
      team: state.currentTeam,
      action: 'skill',
      from: state.selectedCharacter.position,
      to: target.position,
      skillId,
      timestamp: Date.now()
    };

    console.log('📤 [OperationUploader] スキル操作アップロード:', operationData);
    return this.executeUpload(operationData);
  }

  /**
   * ターン終了操作をアップロード
   */
  async uploadEndTurnOperation(state: GameState, forced: boolean = false): Promise<boolean> {
    if (!this.canUpload()) return false;

    const operationData: OperationData = {
      turn: state.currentTurn,
      team: state.currentTeam,
      action: forced ? 'forced_end_turn' : 'end_turn',
      from: { x: 0, y: 0 },
      timestamp: Date.now()
    };

    console.log('📤 [OperationUploader] ターン終了操作アップロード:', operationData);
    return this.executeUpload(operationData);
  }

  /**
   * 降参操作をアップロード
   */
  async uploadSurrenderOperation(state: GameState): Promise<boolean> {
    if (!this.canUpload()) return false;

    const operationData: OperationData = {
      turn: state.currentTurn,
      team: state.currentTeam,
      action: 'surrender',
      from: { x: 0, y: 0 },
      timestamp: Date.now()
    };

    console.log('📤 [OperationUploader] 降参操作アップロード:', operationData);
    return this.executeUpload(operationData);
  }

  /**
   * アップロード実行
   */
  private async executeUpload(operationData: OperationData): Promise<boolean> {
    try {
      await this.uploadFunction!(this.roomId!, operationData);
      console.log('✅ [OperationUploader] アップロード成功');
      return true;
    } catch (error) {
      console.error('❌ [OperationUploader] アップロードエラー:', error);
      return false;
    }
  }

  /**
   * アップロード可能かチェック
   */
  private canUpload(): boolean {
    const canUpload = !!(this.uploadFunction && this.roomId);
    if (!canUpload) {
      console.warn('⚠️ [OperationUploader] アップロード不可:', {
        uploadFunction: !!this.uploadFunction,
        roomId: this.roomId
      });
    }
    return canUpload;
  }
}

// シングルトンインスタンス
export const operationUploader = new OperationUploader();