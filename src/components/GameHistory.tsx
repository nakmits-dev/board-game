import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { GameMove, GameRecord } from '../types/gameTypes';
import { 
  History, 
  RotateCcw, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Download, 
  Upload,
  Eye,
  X,
  Clock,
  User,
  Zap,
  Move,
  Sword,
  Crown,
  Gitlab as GitLab
} from 'lucide-react';

interface GameHistoryProps {
  onClose: () => void;
}

const GameHistory: React.FC<GameHistoryProps> = ({ onClose }) => {
  const { state, dispatch } = useGame();
  const { moveHistory, replayMode, replayIndex, canUndo } = state;
  const [isReplaying, setIsReplaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1000); // ms per move
  const [showMoveDetails, setShowMoveDetails] = useState(false);

  const handleUndo = () => {
    if (canUndo && moveHistory.length > 0) {
      dispatch({ type: 'UNDO_MOVE' });
    }
  };

  const handleStartReplay = () => {
    if (moveHistory.length === 0) return;
    dispatch({ type: 'START_REPLAY' });
    setIsReplaying(true);
  };

  const handleStopReplay = () => {
    dispatch({ type: 'STOP_REPLAY' });
    setIsReplaying(false);
  };

  const handleReplayStep = (direction: 'forward' | 'backward') => {
    if (direction === 'forward' && replayIndex < moveHistory.length - 1) {
      dispatch({ type: 'REPLAY_NEXT_MOVE' });
    } else if (direction === 'backward' && replayIndex > 0) {
      dispatch({ type: 'REPLAY_PREVIOUS_MOVE' });
    }
  };

  const handleAutoReplay = async () => {
    if (isReplaying) {
      setIsReplaying(false);
      return;
    }

    setIsReplaying(true);
    dispatch({ type: 'START_REPLAY' });

    for (let i = 0; i < moveHistory.length; i++) {
      if (!isReplaying) break;
      
      await new Promise(resolve => setTimeout(resolve, replaySpeed));
      dispatch({ type: 'REPLAY_NEXT_MOVE' });
    }

    setIsReplaying(false);
  };

  const exportGameRecord = () => {
    if (!state.gameRecord) return;

    const dataStr = JSON.stringify(state.gameRecord, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `game-record-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  const importGameRecord = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const gameRecord: GameRecord = JSON.parse(e.target?.result as string);
        dispatch({ type: 'LOAD_GAME_RECORD', gameRecord });
      } catch (error) {
        alert('ファイルの読み込みに失敗しました');
      }
    };
    reader.readAsText(file);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('ja-JP');
  };

  const getMoveIcon = (move: GameMove) => {
    switch (move.type) {
      case 'move':
        return <Move size={16} className="text-blue-500" />;
      case 'attack':
        return <Sword size={16} className="text-red-500" />;
      case 'skill':
        return <Zap size={16} className="text-purple-500" />;
      case 'end-turn':
        return <Clock size={16} className="text-gray-500" />;
      default:
        return <GitLab size={16} className="text-gray-400" />;
    }
  };

  const getMoveDescription = (move: GameMove) => {
    const teamName = move.team === 'player' ? '青' : '赤';
    
    switch (move.type) {
      case 'move':
        return `${teamName}チーム ${move.characterName} が移動`;
      case 'attack':
        return `${teamName}チーム ${move.characterName} が ${move.targetName} を攻撃${move.damage ? ` (${move.damage}ダメージ)` : ''}`;
      case 'skill':
        return `${teamName}チーム ${move.characterName} が ${move.skillName} を使用${move.targetName ? ` → ${move.targetName}` : ''}`;
      case 'end-turn':
        return `${teamName}チーム ターン終了`;
      default:
        return `${teamName}チーム 不明な行動`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <History size={24} />
            <h2 className="text-xl font-bold">棋譜・履歴</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Controls Panel */}
          <div className="w-80 bg-gray-50 border-r border-gray-200 p-4 flex flex-col">
            <h3 className="font-bold text-gray-800 mb-4">操作パネル</h3>
            
            {/* Undo */}
            <div className="mb-6">
              <button
                onClick={handleUndo}
                disabled={!canUndo || replayMode}
                className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  canUndo && !replayMode
                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <RotateCcw size={16} />
                1手戻る
              </button>
            </div>

            {/* Replay Controls */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-700 mb-2">リプレイ</h4>
              <div className="space-y-2">
                <button
                  onClick={handleStartReplay}
                  disabled={moveHistory.length === 0 || replayMode}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    moveHistory.length > 0 && !replayMode
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Eye size={16} />
                  リプレイ開始
                </button>

                {replayMode && (
                  <>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleReplayStep('backward')}
                        disabled={replayIndex <= 0}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm disabled:bg-gray-300 disabled:text-gray-500"
                      >
                        <SkipBack size={14} />
                      </button>
                      <button
                        onClick={handleAutoReplay}
                        className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded text-sm ${
                          isReplaying
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {isReplaying ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                      <button
                        onClick={() => handleReplayStep('forward')}
                        disabled={replayIndex >= moveHistory.length - 1}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm disabled:bg-gray-300 disabled:text-gray-500"
                      >
                        <SkipForward size={14} />
                      </button>
                    </div>
                    
                    <button
                      onClick={handleStopReplay}
                      className="w-full flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                    >
                      <X size={16} />
                      リプレイ終了
                    </button>

                    <div className="text-sm text-gray-600 text-center">
                      {replayIndex + 1} / {moveHistory.length}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Export/Import */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-700 mb-2">データ</h4>
              <div className="space-y-2">
                <button
                  onClick={exportGameRecord}
                  disabled={!state.gameRecord}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    state.gameRecord
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Download size={16} />
                  棋譜をエクスポート
                </button>
                
                <label className="w-full flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg cursor-pointer transition-colors">
                  <Upload size={16} />
                  棋譜をインポート
                  <input
                    type="file"
                    accept=".json"
                    onChange={importGameRecord}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Replay Speed */}
            {replayMode && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">再生速度</h4>
                <select
                  value={replaySpeed}
                  onChange={(e) => setReplaySpeed(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value={500}>高速 (0.5秒)</option>
                  <option value={1000}>標準 (1秒)</option>
                  <option value={2000}>低速 (2秒)</option>
                </select>
              </div>
            )}
          </div>

          {/* Move History */}
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">手順履歴</h3>
              <button
                onClick={() => setShowMoveDetails(!showMoveDetails)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showMoveDetails ? '簡易表示' : '詳細表示'}
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {moveHistory.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  <History size={48} className="mx-auto mb-4 opacity-50" />
                  <p>まだ手順がありません</p>
                  <p className="text-sm">ゲームを開始すると履歴が記録されます</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {moveHistory.map((move, index) => (
                    <div
                      key={move.id}
                      className={`p-3 rounded-lg border transition-all ${
                        replayMode && index === replayIndex
                          ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-200'
                          : index < replayIndex
                          ? 'bg-gray-50 border-gray-200'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getMoveIcon(move)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-600">
                              #{index + 1}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatTime(move.timestamp)}
                            </span>
                            {move.team === 'player' ? (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                青チーム
                              </span>
                            ) : (
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                                赤チーム
                              </span>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-800 font-medium">
                            {getMoveDescription(move)}
                          </p>
                          
                          {showMoveDetails && (
                            <div className="mt-2 text-xs text-gray-600 space-y-1">
                              {move.from && move.to && (
                                <p>移動: ({move.from.x}, {move.from.y}) → ({move.to.x}, {move.to.y})</p>
                              )}
                              {move.crystalCost && (
                                <p>クリスタル消費: {move.crystalCost}</p>
                              )}
                              {move.evolution && (
                                <p>進化: {move.evolution.from} → {move.evolution.to}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameHistory;