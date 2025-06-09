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
    console.log('🔧 [OperationUploader] アップロード関数設定:', {
      hasFunction: !!uploadFunction
    });
    this.uploadFunction = uploadFunction;
  }

  /**
   * ルームIDを設定
   */
  setRoomId(roomId: string | null) {
    console.log('🔧 [OperationUploader] ルームID設定:', {
      roomId: roomId ? roomId.slice(-6) : null
    });
    this.roomId = roomId;
  }

  /**
   * 🔧 player/enemy を host/guest に変換
   */
  private convertToHostGuest(gameTeam: Team, isHost: boolean): 'host' | 'guest' {
    const result = isHost
      ? (gameTeam === 'player' ? 'host' : 'guest')
      : (gameTeam === 'player' ? 'guest' : 'host');
    
    console.log('🔄 [OperationUploader] チーム変換:', {
      gameTeam,
      isHost,
      result
    });
    
    return result;
  }

  /**
   * 移動操作をアップロード
   */
  async uploadMoveOperation(state: GameState, targetPosition: Position): Promise<boolean> {
    console.log('📤 [OperationUploader] 移動操作アップロード開始:', {
      canUpload: this.canUpload(),
      hasSelectedCharacter: !!state.selectedCharacter,
      targetPosition
    });

    if (!this.canUpload() || !state.selectedCharacter) {
      console.warn('❌ [OperationUploader] 移動操作アップロード失敗: 前提条件不足');
      return false;
    }

    const operationData: OperationData = {
      turn: state.currentTurn,
      team: this.convertToHostGuest(state.currentTeam, state.isHost),
      action: 'move',
      from: state.selectedCharacter.position,
      to: targetPosition,
      timestamp: Date.now()
    };

    console.log('📤 [OperationUploader] 移動操作データ:', operationData);
    return this.executeUpload(operationData);
  }

  /**
   * 攻撃操作をアップロード
   */
  async uploadAttackOperation(state: GameState, targetId: string): Promise<boolean> {
    console.log('📤 [OperationUploader] 攻撃操作アップロード開始:', {
      canUpload: this.canUpload(),
      hasSelectedCharacter: !!state.selectedCharacter,
      targetId: targetId.slice(-6)
    });

    if (!this.canUpload() || !state.selectedCharacter) {
      console.warn('❌ [OperationUploader] 攻撃操作アップロード失敗: 前提条件不足');
      return false;
    }

    const target = state.characters.find(c => c.id === targetId);
    if (!target) {
      console.warn('❌ [OperationUploader] 攻撃操作アップロード失敗: 対象が見つからない');
      return false;
    }

    const operationData: OperationData = {
      turn: state.currentTurn,
      team: this.convertToHostGuest(state.currentTeam, state.isHost),
      action: 'attack',
      from: state.selectedCharacter.position,
      to: target.position,
      timestamp: Date.now()
    };

    console.log('📤 [OperationUploader] 攻撃操作データ:', operationData);
    return this.executeUpload(operationData);
  }

  /**
   * スキル操作をアップロード
   */
  async uploadSkillOperation(state: GameState, targetId: string, skillId: string): Promise<boolean> {
    console.log('📤 [OperationUploader] スキル操作アップロード開始:', {
      canUpload: this.canUpload(),
      hasSelectedCharacter: !!state.selectedCharacter,
      targetId: targetId.slice(-6),
      skillId
    });

    if (!this.canUpload() || !state.selectedCharacter) {
      console.warn('❌ [OperationUploader] スキル操作アップロード失敗: 前提条件不足');
      return false;
    }

    const target = state.characters.find(char => char.id === targetId);
    if (!target) {
      console.warn('❌ [OperationUploader] スキル操作アップロード失敗: 対象が見つからない');
      return false;
    }

    const operationData: OperationData = {
      turn: state.currentTurn,
      team: this.convertToHostGuest(state.currentTeam, state.isHost),
      action: 'skill',
      from: state.selectedCharacter.position,
      to: target.position,
      skillId,
      timestamp: Date.now()
    };

    console.log('📤 [OperationUploader] スキル操作データ:', operationData);
    return this.executeUpload(operationData);
  }

  /**
   * ターン終了操作をアップロード
   */
  async uploadEndTurnOperation(state: GameState, forced: boolean = false): Promise<boolean> {
    console.log('📤 [OperationUploader] ターン終了操作アップロード開始:', {
      canUpload: this.canUpload(),
      forced
    });

    if (!this.canUpload()) {
      console.warn('❌ [OperationUploader] ターン終了操作アップロード失敗: 前提条件不足');
      return false;
    }

    const operationData: OperationData = {
      turn: state.currentTurn,
      team: this.convertToHostGuest(state.currentTeam, state.isHost),
      action: forced ? 'forced_end_turn' : 'end_turn',
      from: { x: 0, y: 0 },
      timestamp: Date.now()
    };

    console.log('📤 [OperationUploader] ターン終了操作データ:', operationData);
    return this.executeUpload(operationData);
  }

  /**
   * 降参操作をアップロード
   */
  async uploadSurrenderOperation(state: GameState): Promise<boolean> {
    console.log('📤 [OperationUploader] 降参操作アップロード開始:', {
      canUpload: this.canUpload()
    });

    if (!this.canUpload()) {
      console.warn('❌ [OperationUploader] 降参操作アップロード失敗: 前提条件不足');
      return false;
    }

    const operationData: OperationData = {
      turn: state.currentTurn,
      team: this.convertToHostGuest(state.currentTeam, state.isHost),
      action: 'surrender',
      from: { x: 0, y: 0 },
      timestamp: Date.now()
    };

    console.log('📤 [OperationUploader] 降参操作データ:', operationData);
    return this.executeUpload(operationData);
  }

  /**
   * アップロード実行（重複防止機能付き）
   */
  private async executeUpload(operationData: OperationData): Promise<boolean> {
    if (this.uploadInProgress) {
      console.warn('⚠️ [OperationUploader] アップロード実行中 - 重複防止');
      return false;
    }

    console.log('📤 [OperationUploader] アップロード実行開始:', {
      action: operationData.action,
      team: operationData.team,
      turn: operationData.turn
    });

    this.uploadInProgress = true;

    try {
      await this.uploadFunction!(this.roomId!, operationData);
      console.log('✅ [OperationUploader] アップロード成功:', {
        action: operationData.action,
        team: operationData.team,
        turn: operationData.turn
      });
      return true;
    } catch (error) {
      console.error('❌ [OperationUploader] アップロード失敗:', error);
      return false;
    } finally {
      setTimeout(() => {
        console.log('🔧 [OperationUploader] アップロード状態リセット');
        this.uploadInProgress = false;
      }, 200);
    }
  }

  /**
   * アップロード可能かチェック
   */
  private canUpload(): boolean {
    const result = !!(this.uploadFunction && this.roomId && !this.uploadInProgress);
    console.log('🔍 [OperationUploader] アップロード可能性チェック:', {
      hasUploadFunction: !!this.uploadFunction,
      hasRoomId: !!this.roomId,
      uploadInProgress: this.uploadInProgress,
      canUpload: result
    });
    return result;
  }
}

// シングルトンインスタンス
export const operationUploader = new OperationUploader();