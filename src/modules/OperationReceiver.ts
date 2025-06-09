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
   * 🔧 **修正: 受信した操作データを処理（増分更新の確実な実行）**
   */
  processReceivedOperations(allOperations: GameMove[]) {
    console.log('📥 [OperationReceiver] 操作受信チェック:', {
      totalOperations: allOperations.length,
      lastProcessedTimestamp: this.lastProcessedTimestamp
    });

    // 🔧 **重要: 新しい操作のみをフィルタリング（増分更新）**
    const newOperations = allOperations.filter(operation => 
      operation.timestamp > this.lastProcessedTimestamp
    );
    
    if (newOperations.length === 0) {
      console.log('📥 [OperationReceiver] 新しい操作なし - スキップ');
      return;
    }

    console.log('📥 [OperationReceiver] 新しい操作を検出（増分更新）:', {
      newOperationsCount: newOperations.length,
      operations: newOperations.map(op => ({ 
        action: op.action, 
        team: op.team, 
        turn: op.turn,
        timestamp: op.timestamp,
        from: op.from,
        to: op.to
      }))
    });

    // 🔧 **重要: タイムスタンプ順でソート**
    newOperations.sort((a, b) => a.timestamp - b.timestamp);

    // 🔧 **修正: 新しい操作のみを現在の盤面に対して順番に適用**
    newOperations.forEach((operation, index) => {
      console.log(`📥 [OperationReceiver] 増分操作適用 ${index + 1}/${newOperations.length}:`, {
        action: operation.action,
        team: operation.team,
        turn: operation.turn,
        timestamp: operation.timestamp,
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

      // 🔧 **重要: 現在の盤面状態に対して増分更新を実行**
      if (this.onBoardUpdateCallback) {
        console.log('🧮 [OperationReceiver] 現在の盤面に対して増分更新実行:', command.type);
        this.onBoardUpdateCallback(command);
      } else {
        console.error('❌ [OperationReceiver] 盤面更新コールバックが設定されていません');
      }

      // 🔧 **重要: 最新のタイムスタンプを更新（各操作後）**
      this.lastProcessedTimestamp = Math.max(this.lastProcessedTimestamp, operation.timestamp);
    });

    console.log('✅ [OperationReceiver] 増分操作処理完了:', {
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
   * 🔧 **修正: スキルIDを正しく抽出**
   */
  private extractSkillId(operation: GameMove): string {
    // 🔧 **TODO: 実際の実装では、操作データからスキルIDを正しく取得する**
    // 現在は暫定的にrage-strikeを返すが、実際にはoperationにskillIdフィールドが必要
    console.warn('⚠️ [OperationReceiver] スキルID抽出は暫定実装:', operation);
    return 'rage-strike'; // 暫定値
  }
}

// シングルトンインスタンス
export const operationReceiver = new OperationReceiver();