// 📥 ネットワーク受信モジュール
// Firebase からの棋譜受信と処理のみを担当

import { GameMove } from '../types/networkTypes';

export class NetworkReceiver {
  private lastProcessedTimestamp: number = 0;
  private onMoveCallback: ((moves: any[]) => void) | null = null;

  // 棋譜受信コールバックを設定
  setOnMoveCallback(callback: (moves: any[]) => void) {
    this.onMoveCallback = callback;
    console.log('📥 [NetworkReceiver] 受信コールバック設定:', !!callback);
  }

  // 棋譜受信処理
  processReceivedMoves(allMoves: GameMove[]) {
    console.log('📥 [NetworkReceiver] 棋譜受信チェック:', {
      totalMoves: allMoves.length,
      lastProcessedTimestamp: this.lastProcessedTimestamp
    });

    // 新しい棋譜のみをフィルタリング
    const newMoves = allMoves.filter(move => move.timestamp > this.lastProcessedTimestamp);
    
    if (newMoves.length === 0) {
      console.log('📥 [NetworkReceiver] 新しい棋譜なし - スキップ');
      return;
    }

    console.log('📥 [NetworkReceiver] 新しい棋譜を検出:', {
      newMovesCount: newMoves.length,
      moves: newMoves.map(m => ({ 
        action: m.action, 
        team: m.team, 
        turn: m.turn,
        timestamp: m.timestamp
      }))
    });

    // タイムスタンプ順でソート
    newMoves.sort((a, b) => a.timestamp - b.timestamp);

    // 新しい棋譜のみを順番に処理
    const processedMoves = newMoves.map((move) => {
      console.log('📥 [NetworkReceiver] 棋譜変換:', {
        action: move.action,
        team: move.team,
        turn: move.turn,
        timestamp: move.timestamp
      });

      // 最新のタイムスタンプを更新
      this.lastProcessedTimestamp = Math.max(this.lastProcessedTimestamp, move.timestamp);

      return {
        turn: move.turn,
        team: move.team,
        type: move.action,
        from: move.from,
        to: move.to,
        skillId: move.action === 'skill' ? 'rage-strike' : undefined
      };
    });

    console.log('✅ [NetworkReceiver] 新しい棋譜処理完了:', {
      processedCount: processedMoves.length,
      latestTimestamp: this.lastProcessedTimestamp
    });

    // コールバックで棋譜を送信
    if (this.onMoveCallback) {
      processedMoves.forEach(move => {
        this.onMoveCallback!(move);
      });
    }
  }

  // タイムスタンプをリセット
  resetTimestamp() {
    this.lastProcessedTimestamp = 0;
    console.log('🔄 [NetworkReceiver] タイムスタンプリセット');
  }
}

// シングルトンインスタンス
export const networkReceiver = new NetworkReceiver();