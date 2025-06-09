import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { useSimpleGameSync } from '../hooks/useSimpleGameSync';
import { operationReceiver } from '../modules/OperationReceiver';
import { Bug, Eye, EyeOff, Clock, Users, Wifi, Database, WifiOff, AlertCircle, CheckCircle, XCircle, RefreshCw, Upload, Download, FileText, MapPin } from 'lucide-react';

const DebugPanel: React.FC = () => {
  const { state } = useGame();
  const { isConnected, forceNewUser } = useSimpleGameSync();
  const [isExpanded, setIsExpanded] = useState(false);

  if (state.gamePhase === 'preparation') return null;

  // 接続状態のアイコンを決定
  const getConnectionIcon = () => {
    if (!isConnected) return WifiOff;
    return Wifi;
  };

  const ConnectionIcon = getConnectionIcon();

  // デバッグ用の新しいユーザーID生成
  const handleForceNewUser = async () => {
    try {
      await forceNewUser();
      console.log('🔧 新しいユーザーIDを生成しました');
    } catch (error) {
      console.error('🔧 ユーザーID生成に失敗:', error);
    }
  };

  // 🔧 **新機能: OperationReceiver のデバッグ情報を取得**
  const receiverDebugInfo = operationReceiver.getDebugInfo();

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {/* 折りたたみボタン */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mb-2 p-2 bg-gray-800 text-white rounded-lg shadow-lg hover:bg-gray-700 transition-colors flex items-center gap-1"
        title="デバッグ情報を表示/非表示"
      >
        {isExpanded ? <EyeOff size={20} /> : <Eye size={20} />}
        <Bug size={16} />
        {/* 接続状態インジケーター */}
        {state.roomId && (
          <div className="flex items-center gap-1">
            <ConnectionIcon 
              size={12} 
              className={`${
                !isConnected ? 'text-red-400' : 'text-green-400'
              }`} 
            />
          </div>
        )}
      </button>

      {/* デバッグパネル */}
      {isExpanded && (
        <div className="bg-gray-900 text-white rounded-lg shadow-2xl p-4 max-w-md max-h-96 overflow-y-auto">
          <div className="space-y-4">
            {/* ネットワーク状態 */}
            <div>
              <h3 className="text-sm font-bold text-purple-400 mb-2 flex items-center gap-1">
                <ConnectionIcon size={14} />
                ネットワーク状態
              </h3>
              <div className="text-xs space-y-1">
                <div>Firebase接続: <span className={`${isConnected ? 'text-green-300' : 'text-red-300'}`}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span></div>
                <div>ゲームルームID: <span className="text-yellow-300 font-mono text-xs">
                  {state.roomId || 'なし'}
                </span></div>
                <div>ホスト: <span className="text-green-300">{state.isHost ? 'Yes' : 'No'}</span></div>
                <div>送信関数: <span className="text-orange-300">{state.sendMoveFunction ? 'Set' : 'None'}</span></div>
              </div>
            </div>

            {/* 🔧 **新機能: OperationReceiver デバッグ情報** */}
            <div>
              <h3 className="text-sm font-bold text-cyan-400 mb-2 flex items-center gap-1">
                <Download size={14} />
                受信処理状態
              </h3>
              <div className="text-xs space-y-1">
                <div>最終処理タイムスタンプ: <span className="text-cyan-300 font-mono">
                  {receiverDebugInfo.lastProcessedTimestamp}
                </span></div>
                <div>処理済み操作数: <span className="text-cyan-300">
                  {receiverDebugInfo.processedOperationCount}
                </span></div>
                <div>コールバック設定: <span className="text-cyan-300">
                  {receiverDebugInfo.hasCallback ? 'Yes' : 'No'}
                </span></div>
              </div>
            </div>

            {/* デバッグ操作 */}
            {state.roomId && (
              <div>
                <h3 className="text-sm font-bold text-red-400 mb-2 flex items-center gap-1">
                  <RefreshCw size={14} />
                  デバッグ操作
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={handleForceNewUser}
                    className="w-full px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                    title="新しいユーザーIDを強制生成（同じタブ問題の解決用）"
                  >
                    新しいユーザーID生成
                  </button>
                  <button
                    onClick={() => operationReceiver.resetTimestamp()}
                    className="w-full px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded transition-colors"
                    title="受信処理状態をリセット"
                  >
                    受信状態リセット
                  </button>
                  <p className="text-xs text-gray-400">
                    ※同期問題が発生した場合に使用
                  </p>
                </div>
              </div>
            )}

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
                <div>ネットワークゲーム: <span className="text-purple-300">{state.roomId ? 'Yes' : 'No'}</span></div>
              </div>
            </div>

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