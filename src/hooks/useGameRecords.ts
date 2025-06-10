// 🎯 Interface Segregation Principle: 棋譜管理用のカスタムフック
import { useCallback, useMemo } from 'react';
import { BoardAction, GameRecord } from '../types/gameTypes';
import { GameRecordService } from '../services/GameRecordService';
import { useGameActions } from './useGameActions';

export interface UseGameRecordsReturn {
  createGameRecord: (actions: BoardAction[], description: string) => string;
  executeGameRecord: (recordId: string) => Promise<boolean>;
  gameRecords: GameRecord[];
  isExecutingRecord: boolean;
}

// シングルトンのサービスインスタンス
const gameRecordService = new GameRecordService();

export const useGameRecords = (
  state: any,
  dispatch: React.Dispatch<any>
): UseGameRecordsReturn => {
  
  const { applyBoardAction } = useGameActions(state, dispatch);

  const createGameRecord = useCallback((actions: BoardAction[], description: string): string => {
    console.log(`📋 [useGameRecords] 棋譜作成:`, { description, actionsCount: actions.length });
    
    const recordId = gameRecordService.createRecord(actions, description);
    
    // 状態を更新
    dispatch({
      type: 'UPDATE_GAME_RECORDS',
      records: gameRecordService.getAllRecords()
    });
    
    return recordId;
  }, [dispatch]);

  const executeGameRecord = useCallback(async (recordId: string): Promise<boolean> => {
    console.log(`🎬 [useGameRecords] 棋譜実行開始:`, recordId);
    
    const record = gameRecordService.getRecord(recordId);
    if (!record) {
      console.error('❌ [useGameRecords] 棋譜レコードが見つかりません:', recordId);
      return false;
    }

    try {
      dispatch({ type: 'SET_EXECUTION_STATE', isExecuting: true, index: 0 });
      
      for (let i = 0; i < record.actions.length; i++) {
        const action = record.actions[i];
        
        console.log(`🎬 [useGameRecords] アクション実行 ${i + 1}/${record.actions.length}:`, action);
        
        // 実行前に少し待機
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // アクションを実行
        const success = applyBoardAction(action);
        if (!success) {
          console.error('❌ [useGameRecords] アクション実行失敗:', action);
          dispatch({ type: 'SET_EXECUTION_STATE', isExecuting: false, index: 0 });
          return false;
        }
        
        // 実行インデックスを更新
        dispatch({ type: 'SET_EXECUTION_STATE', isExecuting: true, index: i + 1 });
        
        // アニメーション完了まで待機
        await new Promise(resolve => setTimeout(resolve, 300 + 100));
      }
      
      dispatch({ type: 'SET_EXECUTION_STATE', isExecuting: false, index: 0 });
      console.log('✅ [useGameRecords] 棋譜実行完了:', record.description);
      return true;
    } catch (error) {
      console.error('❌ [useGameRecords] 棋譜実行エラー:', error);
      dispatch({ type: 'SET_EXECUTION_STATE', isExecuting: false, index: 0 });
      return false;
    }
  }, [applyBoardAction, dispatch]);

  const gameRecords = useMemo(() => {
    return gameRecordService.getAllRecords();
  }, [state.gameRecords]); // state.gameRecordsが変更されたときに再計算

  return {
    createGameRecord,
    executeGameRecord,
    gameRecords,
    isExecutingRecord: state.isExecutingRecord || false
  };
};