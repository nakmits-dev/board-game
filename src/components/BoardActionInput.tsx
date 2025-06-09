import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { BoardAction } from '../types/gameTypes';
import { Play, RotateCcw, Plus, List, Trash2, Clock } from 'lucide-react';

const BoardActionInput: React.FC = () => {
  const { state, applyBoardAction, createGameRecord, executeGameRecord } = useGame();
  const [action, setAction] = useState<'move' | 'attack' | 'skill' | 'end_turn'>('move');
  const [fromX, setFromX] = useState<number>(0);
  const [fromY, setFromY] = useState<number>(0);
  const [toX, setToX] = useState<number>(0);
  const [toY, setToY] = useState<number>(0);
  
  // 🆕 棋譜作成用の状態
  const [recordActions, setRecordActions] = useState<BoardAction[]>([]);
  const [recordDescription, setRecordDescription] = useState<string>('');
  const [showRecordBuilder, setShowRecordBuilder] = useState(false);

  const handleApplyAction = () => {
    const boardAction: BoardAction = {
      action,
      from: action !== 'end_turn' ? { x: fromX, y: fromY } : undefined,
      to: action !== 'end_turn' ? { x: toX, y: toY } : undefined,
    };

    const success = applyBoardAction(boardAction);
    if (success) {
      console.log('✅ アクション適用成功:', boardAction);
    } else {
      console.error('❌ アクション適用失敗:', boardAction);
    }
  };

  // 🆕 棋譜にアクションを追加
  const handleAddToRecord = () => {
    const boardAction: BoardAction = {
      action,
      from: action !== 'end_turn' ? { x: fromX, y: fromY } : undefined,
      to: action !== 'end_turn' ? { x: toX, y: toY } : undefined,
    };

    setRecordActions([...recordActions, boardAction]);
  };

  // 🆕 棋譜を作成
  const handleCreateRecord = () => {
    if (recordActions.length === 0 || !recordDescription.trim()) {
      alert('棋譜にアクションと説明を追加してください');
      return;
    }

    const recordId = createGameRecord(recordActions, recordDescription);
    console.log('✅ 棋譜作成完了:', recordId);
    
    // リセット
    setRecordActions([]);
    setRecordDescription('');
    setShowRecordBuilder(false);
  };

  // 🆕 棋譜を実行
  const handleExecuteRecord = async (recordId: string) => {
    const success = await executeGameRecord(recordId);
    if (success) {
      console.log('✅ 棋譜実行完了');
    } else {
      console.error('❌ 棋譜実行失敗');
    }
  };

  // 🆕 アクションの説明を生成
  const getActionDescription = (boardAction: BoardAction): string => {
    switch (boardAction.action) {
      case 'move':
        return `移動: (${boardAction.from?.x},${boardAction.from?.y}) → (${boardAction.to?.x},${boardAction.to?.y})`;
      case 'attack':
        return `攻撃: (${boardAction.from?.x},${boardAction.from?.y}) → (${boardAction.to?.x},${boardAction.to?.y})`;
      case 'skill':
        return `スキル: (${boardAction.from?.x},${boardAction.from?.y}) → (${boardAction.to?.x},${boardAction.to?.y})`;
      case 'end_turn':
        return 'ターン終了';
      default:
        return '不明なアクション';
    }
  };

  if (state.gamePhase !== 'action') {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-blue-100 p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Play size={20} className="text-blue-600" />
          棋譜システム
        </h3>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowRecordBuilder(!showRecordBuilder)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              showRecordBuilder 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <List size={16} />
            棋譜作成
          </button>
        </div>
      </div>
      
      {/* 単発アクション実行 */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-gray-700 mb-3">単発アクション実行</h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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
        </div>

        {/* 実行ボタン */}
        <div className="flex gap-2">
          <button
            onClick={handleApplyAction}
            disabled={state.isExecutingRecord}
            className={`flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors ${
              state.isExecutingRecord
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
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
          
          {showRecordBuilder && (
            <button
              onClick={handleAddToRecord}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
            >
              <Plus size={16} />
              棋譜に追加
            </button>
          )}
        </div>
      </div>

      {/* 棋譜作成エリア */}
      {showRecordBuilder && (
        <div className="border-t pt-6">
          <h4 className="text-md font-semibold text-gray-700 mb-3">棋譜作成</h4>
          
          {/* 棋譜説明 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              棋譜の説明
            </label>
            <input
              type="text"
              value={recordDescription}
              onChange={(e) => setRecordDescription(e.target.value)}
              placeholder="例: 開始3手の定石"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          {/* 追加されたアクション一覧 */}
          {recordActions.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                追加されたアクション ({recordActions.length}個)
              </label>
              <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                {recordActions.map((action, index) => (
                  <div key={index} className="flex items-center justify-between py-1">
                    <span className="text-sm text-gray-700">
                      {index + 1}. {getActionDescription(action)}
                    </span>
                    <button
                      onClick={() => setRecordActions(recordActions.filter((_, i) => i !== index))}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 棋譜作成ボタン */}
          <div className="flex gap-2">
            <button
              onClick={handleCreateRecord}
              disabled={recordActions.length === 0 || !recordDescription.trim()}
              className={`flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors ${
                recordActions.length === 0 || !recordDescription.trim()
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              <Plus size={16} />
              棋譜を作成
            </button>
            
            <button
              onClick={() => {
                setRecordActions([]);
                setRecordDescription('');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
            >
              <Trash2 size={16} />
              クリア
            </button>
          </div>
        </div>
      )}

      {/* 保存された棋譜一覧 */}
      {state.gameRecords.length > 0 && (
        <div className="border-t pt-6">
          <h4 className="text-md font-semibold text-gray-700 mb-3">保存された棋譜</h4>
          
          <div className="space-y-2">
            {state.gameRecords.map((record) => (
              <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{record.description}</p>
                  <p className="text-sm text-gray-600">
                    {record.actions.length}個のアクション • {new Date(record.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                
                <button
                  onClick={() => handleExecuteRecord(record.id)}
                  disabled={state.isExecutingRecord}
                  className={`flex items-center gap-2 px-3 py-2 font-medium rounded-lg transition-colors ${
                    state.isExecutingRecord
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-orange-600 hover:bg-orange-700 text-white'
                  }`}
                >
                  {state.isExecutingRecord ? (
                    <>
                      <Clock size={16} className="animate-spin" />
                      実行中...
                    </>
                  ) : (
                    <>
                      <Play size={16} />
                      実行
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 現在のターン情報 */}
      <div className="mt-6 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          <strong>現在のターン:</strong> {state.currentTurn}手目 - {' '}
          <span className={state.currentTeam === 'player' ? 'text-blue-600' : 'text-red-600'}>
            {state.currentTeam === 'player' ? '青チーム' : '赤チーム'}
          </span>
          {state.isExecutingRecord && (
            <span className="ml-2 text-orange-600 font-medium">
              (棋譜実行中: {state.executionIndex}手目)
            </span>
          )}
        </p>
      </div>
    </div>
  );
};

export default BoardActionInput;