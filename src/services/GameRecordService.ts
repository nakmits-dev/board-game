// 🎯 Single Responsibility Principle: 棋譜の管理を専門に行うサービス
import { BoardAction, GameRecord } from '../types/gameTypes';

export interface IGameRecordService {
  createRecord(actions: BoardAction[], description: string): string;
  getRecord(recordId: string): GameRecord | null;
  getAllRecords(): GameRecord[];
  deleteRecord(recordId: string): boolean;
}

export class GameRecordService implements IGameRecordService {
  private records: GameRecord[] = [];

  createRecord(actions: BoardAction[], description: string): string {
    console.log(`📋 [GameRecordService] 棋譜作成:`, { description, actionsCount: actions.length });

    const record: GameRecord = {
      id: `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      actions: [...actions], // 配列のコピーを作成
      description,
      createdAt: Date.now()
    };

    this.records.push(record);
    console.log(`📋 [GameRecordService] 棋譜作成完了:`, record.id);
    
    return record.id;
  }

  getRecord(recordId: string): GameRecord | null {
    const record = this.records.find(r => r.id === recordId);
    console.log(`📋 [GameRecordService] 棋譜取得:`, { recordId, found: !!record });
    return record || null;
  }

  getAllRecords(): GameRecord[] {
    console.log(`📋 [GameRecordService] 全棋譜取得:`, { count: this.records.length });
    return [...this.records]; // 配列のコピーを返す
  }

  deleteRecord(recordId: string): boolean {
    const initialLength = this.records.length;
    this.records = this.records.filter(r => r.id !== recordId);
    const deleted = this.records.length < initialLength;
    
    console.log(`📋 [GameRecordService] 棋譜削除:`, { recordId, deleted });
    return deleted;
  }

  // 🆕 棋譜をクリア
  clearAllRecords(): void {
    console.log(`📋 [GameRecordService] 全棋譜クリア`);
    this.records = [];
  }
}