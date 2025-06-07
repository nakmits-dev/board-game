import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { useSimpleGameSync } from '../hooks/useSimpleGameSync';
import { Bug, Eye, EyeOff, Clock, Users, Wifi, Database } from 'lucide-react';

const DebugPanel: React.FC = () => {
  const { state } = useGame();
  const { gameState: networkState } = useSimpleGameSync();
  const [isExpanded, setIsExpanded] = useState(false);

  if (state.gamePhase === 'preparation') return null;

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {/* 折りたたみボタン */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mb-2 p-2 bg-gray-800 text-white rounded-lg shadow-lg hover:bg-gray-700 transition-colors"
        title="デバッグ情報を表示/非表示"
      >
        {isExpanded ? <EyeOff size={20} /> : <Eye size={20} />}
        <Bug size={16} className="ml-1" />
      </button>

      {/* デバッグパネル */}
      {isExpanded && (
        <div className="bg-gray-900 text-white rounded-lg shadow-2xl p-4 max-w-md max-h-96 overflow-y-auto">
          <div className="space-y-4">
            {/* ゲーム状態 */}
            <div>
              <h3 className="text-sm font-bold text-green-400 mb-2 flex items-center gap-1">
                <Database size={14} />
                ゲーム状態
              </h3>
              <div className="text-xs space-y-1">
                <div>フェーズ: <span className="text-yellow-300">{state.gamePhase}</span></div>
                <div>ターン: <span className="text-blue-300">{state.currentTurn}</span></div>
                <div>現在のチーム: <span className="text-purple-300">{state.currentTeam}</span></div>
                <div>キャラクター数: <span className="text-cyan-300">{state.characters.length}</span></div>
                <div>プレイヤークリスタル: <span className="text-blue-300">{state.playerCrystals}</span></div>
                <div>敵クリスタル: <span className="text-red-300">{state.enemyCrystals}</span></div>
                <div>待った可能: <span className="text-orange-300">{state.canUndo ? 'Yes' : 'No'}</span></div>
              </div>
            </div>

            {/* ネットワーク状態 */}
            {state.isNetworkGame && (
              <div>
                <h3 className="text-sm font-bold text-purple-400 mb-2 flex items-center gap-1">
                  <Wifi size={14} />
                  ネットワーク状態
                </h3>
                <div className="text-xs space-y-1">
                  <div>ルームID: <span className="text-yellow-300">{state.roomId || 'なし'}</span></div>
                  <div>ホスト: <span className="text-green-300">{state.isHost ? 'Yes' : 'No'}</span></div>
                  <div>接続状態: <span className="text-blue-300">{networkState.status}</span></div>
                  <div>対戦相手: <span className="text-cyan-300">{networkState.opponent?.name || 'なし'}</span></div>
                  <div>同期コールバック: <span className="text-orange-300">{state.networkSyncCallback ? 'Set' : 'None'}</span></div>
                </div>
              </div>
            )}

            {/* 選択状態 */}
            <div>
              <h3 className="text-sm font-bold text-blue-400 mb-2 flex items-center gap-1">
                <Users size={14} />
                選択状態
              </h3>
              <div className="text-xs space-y-1">
                <div>選択キャラ: <span className="text-yellow-300">{state.selectedCharacter?.name || 'なし'}</span></div>
                <div>選択アクション: <span className="text-green-300">{state.selectedAction || 'なし'}</span></div>
                <div>選択スキル: <span className="text-purple-300">{state.selectedSkill?.name || 'なし'}</span></div>
                <div>保留アクション: <span className="text-orange-300">{state.pendingAction.type || 'なし'}</span></div>
              </div>
            </div>

            {/* アニメーション状態 */}
            {state.animationTarget && (
              <div>
                <h3 className="text-sm font-bold text-red-400 mb-2 flex items-center gap-1">
                  <Clock size={14} />
                  アニメーション
                </h3>
                <div className="text-xs space-y-1">
                  <div>対象: <span className="text-yellow-300">{state.animationTarget.id}</span></div>
                  <div>タイプ: <span className="text-green-300">{state.animationTarget.type}</span></div>
                  <div>保留数: <span className="text-blue-300">{state.pendingAnimations.length}</span></div>
                </div>
              </div>
            )}

            {/* 棋譜（ネットワークゲームのみ） */}
            {state.isNetworkGame && networkState.moves.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-yellow-400 mb-2">棋譜 ({networkState.moves.length}手)</h3>
                <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                  {networkState.moves.slice(-10).map((move, index) => (
                    <div key={move.id} className="flex justify-between">
                      <span className="text-gray-300">
                        {networkState.moves.length - 9 + index}.
                      </span>
                      <span className={move.player === 'host' ? 'text-blue-300' : 'text-red-300'}>
                        {move.player}
                      </span>
                      <span className="text-green-300">{move.action}</span>
                      {move.characterId && (
                        <span className="text-yellow-300 truncate max-w-16" title={move.characterId}>
                          {move.characterId.slice(-4)}
                        </span>
                      )}
                    </div>
                  ))}
                  {networkState.moves.length > 10 && (
                    <div className="text-gray-500 text-center">...他{networkState.moves.length - 10}手</div>
                  )}
                </div>
              </div>
            )}

            {/* キャラクター一覧 */}
            <div>
              <h3 className="text-sm font-bold text-cyan-400 mb-2">キャラクター一覧</h3>
              <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                {state.characters.map((char) => (
                  <div key={char.id} className="flex justify-between items-center">
                    <span className={char.team === 'player' ? 'text-blue-300' : 'text-red-300'}>
                      {char.name}
                    </span>
                    <span className="text-green-300">
                      {char.hp}/{char.maxHp}
                    </span>
                    <span className="text-yellow-300">
                      {char.remainingActions}/{char.actions}
                    </span>
                    <span className="text-gray-400 text-xs">
                      ({char.position.x},{char.position.y})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* パフォーマンス情報 */}
            <div>
              <h3 className="text-sm font-bold text-orange-400 mb-2">パフォーマンス</h3>
              <div className="text-xs space-y-1">
                <div>レンダリング: <span className="text-green-300">{Date.now() % 10000}</span></div>
                <div>メモリ使用量: <span className="text-blue-300">
                  {(performance as any).memory ? 
                    `${Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)}MB` : 
                    'N/A'
                  }
                </span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugPanel;