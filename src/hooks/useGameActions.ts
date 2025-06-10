// 🎯 Interface Segregation Principle: ゲームアクション用のカスタムフック
import { useCallback } from 'react';
import { BoardAction } from '../types/gameTypes';
import { GameActionService } from '../services/GameActionService';

export interface UseGameActionsReturn {
  applyBoardAction: (boardAction: BoardAction) => boolean;
}

export const useGameActions = (
  state: any,
  dispatch: React.Dispatch<any>
): UseGameActionsReturn => {
  
  const applyBoardAction = useCallback((boardAction: BoardAction): boolean => {
    try {
      console.log(`🎯 [useGameActions] ボードアクション適用:`, boardAction);

      if (state.gamePhase !== 'action') {
        console.warn('⚠️ [useGameActions] ゲームが進行中ではありません');
        return false;
      }

      let result;

      switch (boardAction.action) {
        case 'move':
          if (!boardAction.from || !boardAction.to) return false;
          result = GameActionService.executeMove(
            state.characters,
            boardAction.from,
            boardAction.to,
            state.currentTeam,
            state.currentTurn
          );
          break;

        case 'attack':
          if (!boardAction.from || !boardAction.to) return false;
          result = GameActionService.executeAttack(
            state.characters,
            boardAction.from,
            boardAction.to,
            state.currentTeam,
            state.currentTurn,
            state.playerCrystals,
            state.enemyCrystals
          );
          break;

        case 'skill':
          if (!boardAction.from || !boardAction.to) return false;
          result = GameActionService.executeSkill(
            state.characters,
            boardAction.from,
            boardAction.to,
            state.currentTeam,
            state.currentTurn,
            state.playerCrystals,
            state.enemyCrystals
          );
          break;

        case 'end_turn':
          result = GameActionService.executeEndTurn(
            state.characters,
            state.currentTeam,
            state.currentTurn,
            state.playerCrystals,
            state.enemyCrystals
          );
          break;

        default:
          console.error('❌ [useGameActions] 未知のアクション:', boardAction.action);
          return false;
      }

      if (result.success) {
        // 結果をディスパッチ
        dispatch({
          type: 'APPLY_ACTION_RESULT',
          result
        });
      } else {
        console.error('❌ [useGameActions] アクション実行失敗:', result.message);
      }

      return result.success;
    } catch (error) {
      console.error('❌ [useGameActions] エラー:', error);
      return false;
    }
  }, [state, dispatch]);

  return {
    applyBoardAction
  };
};