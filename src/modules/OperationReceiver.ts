// 1️⃣ 受信した操作データを処理し、現在の盤面に対して増分更新を行うモジュール

import { GameMove } from '../types/networkTypes';
import { GameBoardCalculator, MoveCommand } from './GameBoardCalculator';

export class OperationReceiver {
  private lastProcessedTimestamp: number = 0;
  private onBoardUpdateCallback: ((command: MoveCommand) => void) | null = null;
  private processedOperationIds: Set<string> = new Set();

  /**
   * 盤面更新コールバックを設定
   */
  setOnBoardUpdateCallback(callback: (command: MoveCommand) => void) {
    this.onBoardUpdateCallback = callback;
  }

  /**
   * 受信した操作データを現在の盤面に対して増分適用
   */
  processReceivedOperations(allOperations: GameMove[]) {
    // 未処理の操作のみを抽出
    const newOperations = allOperations.filter(operation => {
      const isNewByTimestamp = operation.timestamp > this.lastProcessedTimestamp;
      const isNewById = !this.processedOperationIds.has(operation.id);
      return isNewByTimestamp && isNewById;
    });
    
    if (newOperations.length === 0) {
      return;
    }

    console.log('📥 棋譜受信:', `${newOperations.length}件の新しい操作`);

    // ターン順 → タイムスタンプ順でソート
    newOperations.sort((a, b) => {
      if (a.turn !== b.turn) {
        return a.turn - b.turn;
      }
      return a.timestamp - b.timestamp;
    });

    // 新しい操作のみを現在の盤面に対して順次適用
    newOperations.forEach((operation) => {
      // GameMove を MoveCommand に変換
      const command: MoveCommand = {
        type: operation.action,
        team: operation.team,
        turn: operation.turn,
        from: operation.from,
        to: operation.to,
        skillId: operation.action === 'skill' ? this.extractSkillId(operation) : undefined,
        timestamp: operation.timestamp
      };

      // 現在の盤面状態に対して増分更新を実行
      if (this.onBoardUpdateCallback) {
        this.onBoardUpdateCallback(command);
      }

      // 処理済み操作として記録
      this.processedOperationIds.add(operation.id);
      this.lastProcessedTimestamp = Math.max(this.lastProcessedTimestamp, operation.timestamp);
    });
  }

  /**
   * 処理状態をリセット
   */
  resetTimestamp() {
    this.lastProcessedTimestamp = 0;
    this.processedOperationIds.clear();
  }

  /**
   * スキルIDを抽出（暫定実装）
   */
  private extractSkillId(operation: GameMove): string {
    return 'rage-strike'; // 暫定値
  }

  /**
   * デバッグ情報を取得
   */
  getDebugInfo() {
    return {
      lastProcessedTimestamp: this.lastProcessedTimestamp,
      processedOperationCount: this.processedOperationIds.size,
      hasCallback: !!this.onBoardUpdateCallback
    };
  }
}

// シングルトンインスタンス
export const operationReceiver = new OperationReceiver();