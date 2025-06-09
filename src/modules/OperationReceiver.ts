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
    console.log('📥 [OperationReceiver] 盤面更新コールバック設定:', !!callback);
  }

  /**
   * 🔧 **新設計: 受信した操作データを現在の盤面に対して増分適用**
   */
  processReceivedOperations(allOperations: GameMove[]) {
    console.log('📥 [OperationReceiver] 操作受信処理開始:', {
      totalOperations: allOperations.length,
      lastProcessedTimestamp: this.lastProcessedTimestamp,
      processedIdsCount: this.processedOperationIds.size
    });

    // 🔧 **重要: 未処理の操作のみを抽出（IDベース + タイムスタンプベース）**
    const newOperations = allOperations.filter(operation => {
      const isNewByTimestamp = operation.timestamp > this.lastProcessedTimestamp;
      const isNewById = !this.processedOperationIds.has(operation.id);
      return isNewByTimestamp && isNewById;
    });
    
    if (newOperations.length === 0) {
      console.log('📥 [OperationReceiver] 新しい操作なし - 処理スキップ');
      return;
    }

    console.log('📥 [OperationReceiver] 新しい操作を検出:', {
      newOperationsCount: newOperations.length,
      operations: newOperations.map(op => ({ 
        id: op.id,
        action: op.action, 
        team: op.team, 
        turn: op.turn,
        timestamp: op.timestamp
      }))
    });

    // 🔧 **重要: ターン順 → タイムスタンプ順でソート（正確な順序保証）**
    newOperations.sort((a, b) => {
      if (a.turn !== b.turn) {
        return a.turn - b.turn;
      }
      return a.timestamp - b.timestamp;
    });

    // 🔧 **核心: 新しい操作のみを現在の盤面に対して順次適用**
    newOperations.forEach((operation, index) => {
      console.log(`📥 [OperationReceiver] 増分操作適用 ${index + 1}/${newOperations.length}:`, {
        id: operation.id,
        action: operation.action,
        team: operation.team,
        turn: operation.turn,
        from: operation.from,
        to: operation.to
      });

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

      // 🔧 **核心: 現在の盤面状態に対して増分更新を実行**
      if (this.onBoardUpdateCallback) {
        this.onBoardUpdateCallback(command);
      } else {
        console.error('❌ [OperationReceiver] 盤面更新コールバックが未設定');
        return;
      }

      // 🔧 **重要: 処理済み操作として記録**
      this.processedOperationIds.add(operation.id);
      this.lastProcessedTimestamp = Math.max(this.lastProcessedTimestamp, operation.timestamp);
    });

    console.log('✅ [OperationReceiver] 増分操作処理完了:', {
      processedCount: newOperations.length,
      totalProcessedIds: this.processedOperationIds.size,
      latestTimestamp: this.lastProcessedTimestamp
    });
  }

  /**
   * 処理状態をリセット
   */
  resetTimestamp() {
    this.lastProcessedTimestamp = 0;
    this.processedOperationIds.clear();
    console.log('🔄 [OperationReceiver] 処理状態リセット');
  }

  /**
   * スキルIDを抽出（暫定実装）
   */
  private extractSkillId(operation: GameMove): string {
    // TODO: 実際の実装では、操作データからスキルIDを正しく取得する
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