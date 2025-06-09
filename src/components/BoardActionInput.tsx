import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { BoardAction } from '../types/gameTypes';
import { skillData } from '../data/skillData';
import { Play, RotateCcw } from 'lucide-react';

const BoardActionInput: React.FC = () => {
  const { state, applyBoardAction } = useGame();
  const [action, setAction] = useState<'move' | 'attack' | 'skill' | 'end_turn'>('move');
  const [fromX, setFromX] = useState<number>(0);
  const [fromY, setFromY] = useState<number>(0);
  const [toX, setToX] = useState<number>(0);
  const [toY, setToY] = useState<number>(0);
  const [skillId, setSkillId] = useState<string>('');

  const handleApplyAction = () => {
    const boardAction: BoardAction = {
      action,
      from: action !== 'end_turn' ? { x: fromX, y: fromY } : undefined,
      to: action !== 'end_turn' ? { x: toX, y: toY } : undefined,
      skillId: action === 'skill' ? skillId : undefined,
    };

    const success = applyBoardAction(boardAction);
    if (success) {
      console.log('✅ アクション適用成功:', boardAction);
    } else {
      console.error('❌ アクション適用失敗:', boardAction);
    }
  };

  if (state.gamePhase !== 'action') {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-blue-100 p-4 mb-4">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Play size={20} className="text-blue-600" />
        棋譜入力
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* アクション選択 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            アクション
          </label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="move">移動</option>
            <option value="attack">攻撃</option>
            <option value="skill">スキル</option>
            <option value="end_turn">ターン終了</option>
          </select>
        </div>

        {/* From座標 */}
        {action !== 'end_turn' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From (X, Y)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  max="2"
                  value={fromX}
                  onChange={(e) => setFromX(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="X"
                />
                <input
                  type="number"
                  min="0"
                  max="3"
                  value={fromY}
                  onChange={(e) => setFromY(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Y"
                />
              </div>
            </div>

            {/* To座標 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To (X, Y)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  max="2"
                  value={toX}
                  onChange={(e) => setToX(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="X"
                />
                <input
                  type="number"
                  min="0"
                  max="3"
                  value={toY}
                  onChange={(e) => setToY(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Y"
                />
              </div>
            </div>
          </>
        )}

        {/* スキル選択 */}
        {action === 'skill' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              スキル
            </label>
            <select
              value={skillId}
              onChange={(e) => setSkillId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">スキルを選択</option>
              {Object.entries(skillData).map(([id, skill]) => (
                <option key={id} value={id}>
                  {skill.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 実行ボタン */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={handleApplyAction}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          {action === 'end_turn' ? (
            <>
              <RotateCcw size={16} />
              ターン終了
            </>
          ) : (
            <>
              <Play size={16} />
              実行
            </>
          )}
        </button>
      </div>

      {/* 現在のターン情報 */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          <strong>現在のターン:</strong> {state.currentTurn}手目 - {' '}
          <span className={state.currentTeam === 'player' ? 'text-blue-600' : 'text-red-600'}>
            {state.currentTeam === 'player' ? '青チーム' : '赤チーム'}
          </span>
        </p>
      </div>
    </div>
  );
};

export default BoardActionInput;