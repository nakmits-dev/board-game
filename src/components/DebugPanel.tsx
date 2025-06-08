import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Bug, X, Eye, EyeOff } from 'lucide-react';

const DebugPanel: React.FC = () => {
  const { state } = useGame();
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);

  // 開発環境でのみ表示
  if (import.meta.env.PROD) return null;

  const debugInfo = {
    // 基本情報
    gamePhase: state.gamePhase,
    currentTeam: state.currentTeam,
    currentTurn: state.currentTurn,
    
    // ネットワーク情報
    isNetworkGame: state.isNetworkGame,
    isHost: state.isHost,
    roomId: state.roomId?.slice(-6) || null,
    
    // 選択状態
    selectedCharacter: state.selectedCharacter ? {
      name: state.selectedCharacter.name,
      team: state.selectedCharacter.team,
      actions: state.selectedCharacter.remainingActions
    } : null,
    selectedAction: state.selectedAction,
    
    // リソース
    playerCrystals: state.playerCrystals,
    enemyCrystals: state.enemyCrystals,
    
    // 状態フラグ
    canUndo: state.canUndo,
    hasAnimations: state.pendingAnimations.length > 0,
    
    // キャラクター数
    totalCharacters: state.characters.length,
    playerCharacters: state.characters.filter(c => c.team === 'player').length,
    enemyCharacters: state.characters.filter(c => c.team === 'enemy').length,
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 p-2 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-700 transition-colors z-50"
        title="デバッグ情報を表示"
      >
        <Bug size={20} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white rounded-lg shadow-xl z-50 max-w-sm">
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Bug size={16} />
          <span className="text-sm font-medium">Debug</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title={isMinimized ? '展開' : '最小化'}
          >
            {isMinimized ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title="閉じる"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* コンテンツ */}
      {!isMinimized && (
        <div className="p-3 space-y-2 text-xs max-h-96 overflow-y-auto">
          {/* ゲーム状態 */}
          <div>
            <div className="text-yellow-400 font-medium mb-1">Game State</div>
            <div className="space-y-1 text-gray-300">
              <div>Phase: <span className="text-blue-400">{debugInfo.gamePhase}</span></div>
              <div>Team: <span className="text-green-400">{debugInfo.currentTeam}</span></div>
              <div>Turn: <span className="text-purple-400">{debugInfo.currentTurn}</span></div>
            </div>
          </div>

          {/* ネットワーク情報 */}
          {debugInfo.isNetworkGame && (
            <div>
              <div className="text-yellow-400 font-medium mb-1">Network</div>
              <div className="space-y-1 text-gray-300">
                <div>Host: <span className="text-blue-400">{debugInfo.isHost ? 'Yes' : 'No'}</span></div>
                <div>Room: <span className="text-purple-400">{debugInfo.roomId || 'None'}</span></div>
              </div>
            </div>
          )}

          {/* 選択状態 */}
          <div>
            <div className="text-yellow-400 font-medium mb-1">Selection</div>
            <div className="space-y-1 text-gray-300">
              {debugInfo.selectedCharacter ? (
                <>
                  <div>Char: <span className="text-green-400">{debugInfo.selectedCharacter.name}</span></div>
                  <div>Team: <span className="text-blue-400">{debugInfo.selectedCharacter.team}</span></div>
                  <div>Actions: <span className="text-orange-400">{debugInfo.selectedCharacter.actions}</span></div>
                </>
              ) : (
                <div>Char: <span className="text-gray-500">None</span></div>
              )}
              <div>Action: <span className="text-purple-400">{debugInfo.selectedAction || 'None'}</span></div>
            </div>
          </div>

          {/* リソース */}
          <div>
            <div className="text-yellow-400 font-medium mb-1">Resources</div>
            <div className="space-y-1 text-gray-300">
              <div>Player: <span className="text-blue-400">{debugInfo.playerCrystals}</span></div>
              <div>Enemy: <span className="text-red-400">{debugInfo.enemyCrystals}</span></div>
            </div>
          </div>

          {/* キャラクター数 */}
          <div>
            <div className="text-yellow-400 font-medium mb-1">Characters</div>
            <div className="space-y-1 text-gray-300">
              <div>Total: <span className="text-white">{debugInfo.totalCharacters}</span></div>
              <div>Player: <span className="text-blue-400">{debugInfo.playerCharacters}</span></div>
              <div>Enemy: <span className="text-red-400">{debugInfo.enemyCharacters}</span></div>
            </div>
          </div>

          {/* フラグ */}
          <div>
            <div className="text-yellow-400 font-medium mb-1">Flags</div>
            <div className="space-y-1 text-gray-300">
              <div>Undo: <span className={debugInfo.canUndo ? 'text-green-400' : 'text-gray-500'}>{debugInfo.canUndo ? 'Yes' : 'No'}</span></div>
              <div>Anim: <span className={debugInfo.hasAnimations ? 'text-orange-400' : 'text-gray-500'}>{debugInfo.hasAnimations ? 'Yes' : 'No'}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugPanel;