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
    console.log('🔧 [OperationReceiver] 盤面更新コールバック設定');
    this.onBoardUpdateCallback = callback;
  }

  /**
   * 受信した操作データを現在の盤面に対して増分適用
   */
  processReceivedOperations(allOperations: GameMove[]) {
    console.log('📥 [OperationReceiver] 操作受信開始:', {
      totalOperations: allOperations.length,
      lastProcessedTimestamp: this.lastProcessedTimestamp,
      processedOperationCount: this.processedOperationIds.size
    });

    // 未処理の操作のみを抽出
    const newOperations = allOperations.filter(operation => {
      const isNewByTimestamp = operation.timestamp > this.lastProcessedTimestamp;
      const isNewById = !this.processedOperationIds.has(operation.id);
      const isNew = isNewByTimestamp && isNewById;
      
      console.log(`📋 [OperationReceiver] 操作チェック:`, {
        id: operation.id.slice(-6),
        action: operation.action,
        team: operation.team,
        turn: operation.turn,
        timestamp: operation.timestamp,
        isNewByTimestamp,
        isNewById,
        isNew
      });
      
      return isNew;
    });
    
    if (newOperations.length === 0) {
      console.log('📥 [OperationReceiver] 新しい操作なし - 処理終了');
      return;
    }

    console.log('📥 [OperationReceiver] 新しい操作を検出:', {
      newOperationCount: newOperations.length,
      operations: newOperations.map(op => ({
        id: op.id.slice(-6),
        action: op.action,
        team: op.team,
        turn: op.turn,
        timestamp: op.timestamp
      }))
    });

    // ターン順 → タイムスタンプ順でソート
    newOperations.sort((a, b) => {
      if (a.turn !== b.turn) {
        return a.turn - b.turn;
      }
      return a.timestamp - b.timestamp;
    });

    console.log('📥 [OperationReceiver] ソート後の操作順序:', 
      newOperations.map((op, index) => ({
        index,
        id: op.id.slice(-6),
        action: op.action,
        team: op.team,
        turn: op.turn,
        timestamp: op.timestamp
      }))
    );

    // 新しい操作のみを現在の盤面に対して順次適用
    newOperations.forEach((operation, index) => {
      console.log(`🎯 [OperationReceiver] 操作適用 ${index + 1}/${newOperations.length}:`, {
        id: operation.id.slice(-6),
        action: operation.action,
        team: operation.team,
        turn: operation.turn,
        from: operation.from,
        to: operation.to,
        timestamp: operation.timestamp
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

      console.log(`🔄 [OperationReceiver] MoveCommand変換:`, command);

      // 現在の盤面状態に対して増分更新を実行
      if (this.onBoardUpdateCallback) {
        console.log(`📤 [OperationReceiver] 盤面更新コールバック実行:`, {
          commandType: command.type,
          team: command.team,
          turn: command.turn
        });
        
        this.onBoardUpdateCallback(command);
        
        console.log(`✅ [OperationReceiver] 盤面更新完了:`, {
          id: operation.id.slice(-6),
          action: operation.action
        });
      } else {
        console.warn(`⚠️ [OperationReceiver] 盤面更新コールバックが未設定`);
      }

      // 処理済み操作として記録
      this.processedOperationIds.add(operation.id);
      this.lastProcessedTimestamp = Math.max(this.lastProcessedTimestamp, operation.timestamp);
      
      console.log(`📝 [OperationReceiver] 処理済み記録:`, {
        operationId: operation.id.slice(-6),
        newLastProcessedTimestamp: this.lastProcessedTimestamp,
        totalProcessedCount: this.processedOperationIds.size
      });
    });

    console.log('✅ [OperationReceiver] 全操作処理完了:', {
      processedCount: newOperations.length,
      finalLastProcessedTimestamp: this.lastProcessedTimestamp,
      totalProcessedOperations: this.processedOperationIds.size
    });
  }

  /**
   * 処理状態をリセット
   */
  resetTimestamp() {
    console.log('🔄 [OperationReceiver] 処理状態リセット:', {
      oldTimestamp: this.lastProcessedTimestamp,
      oldProcessedCount: this.processedOperationIds.size
    });
    
    this.lastProcessedTimestamp = 0;
    this.processedOperationIds.clear();
    
    console.log('✅ [OperationReceiver] 処理状態リセット完了');
  }

  /**
   * スキルIDを抽出（暫定実装）
   */
  private extractSkillId(operation: GameMove): string {
    console.log('🔧 [OperationReceiver] スキルID抽出 (暫定値):', 'rage-strike');
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