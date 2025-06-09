// 4️⃣ 受信した内容を元に盤面計算モジュールを実行するモジュール

import { GameMove } from '../types/networkTypes';
import { GameBoardCalculator, MoveCommand } from './GameBoardCalculator';

export class OperationReceiver {
  private lastProcessedTimestamp: number = 0;
  private onBoardUpdateCallback: ((command: MoveCommand) => void) | null = null;

  /**
   * 盤面更新コールバックを設定
   */
  setOnBoardUpdateCallback(callback: (command: MoveCommand) => void) {
    this.onBoardUpdateCallback = callback;
    console.log('📥 [OperationReceiver] 盤面更新コールバック設定:', !!callback);
  }

  /**
   * 受信した操作データを処理
   */
  processReceivedOperations(allOperations: GameMove[]) {
    console.log('📥 [OperationReceiver] 操作受信チェック:', {
      totalOperations: allOperations.length,
      lastProcessedTimestamp: this.lastProcessedTimestamp
    });

    // 新しい操作のみをフィルタリング
    const newOperations = allOperations.filter(operation => 
      operation.timestamp > this.lastProcessedTimestamp
    );
    
    if (newOperations.length === 0) {
      console.log('📥 [OperationReceiver] 新しい操作なし - スキップ');
      return;
    }

    console.log('📥 [OperationReceiver] 新しい操作を検出:', {
      newOperationsCount: newOperations.length,
      operations: newOperations.map(op => ({ 
        action: op.action, 
        team: op.team, 
        turn: op.turn,
        timestamp: op.timestamp
      }))
    });

    // タイムスタンプ順でソート
    newOperations.sort((a, b) => a.timestamp - b.timestamp);

    // 新しい操作のみを順番に処理
    newOperations.forEach((operation) => {
      console.log('📥 [OperationReceiver] 操作変換:', {
        action: operation.action,
        team: operation.team,
        turn: operation.turn,
        timestamp: operation.timestamp
      });

      // 最新のタイムスタンプを更新
      this.lastProcessedTimestamp = Math.max(this.lastProcessedTimestamp, operation.timestamp);

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

      // 盤面更新コールバックを実行
      if (this.onBoardUpdateCallback) {
        console.log('🧮 [OperationReceiver] 盤面計算モジュール実行');
        this.onBoardUpdateCallback(command);
      }
    });

    console.log('✅ [OperationReceiver] 新しい操作処理完了:', {
      processedCount: newOperations.length,
      latestTimestamp: this.lastProcessedTimestamp
    });
  }

  /**
   * タイムスタンプをリセット
   */
  resetTimestamp() {
    this.lastProcessedTimestamp = 0;
    console.log('🔄 [OperationReceiver] タイムスタンプリセット');
  }

  /**
   * スキルIDを抽出（暫定実装）
   */
  private extractSkillId(operation: GameMove): string {
    // 実際の実装では、操作データからスキルIDを正しく取得する
    return 'rage-strike'; // 暫定値
  }
}

// シングルトンインスタンス
export const operationReceiver = new OperationReceiver();