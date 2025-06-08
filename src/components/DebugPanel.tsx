import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { useSimpleGameSync } from '../hooks/useSimpleGameSync';
import { Bug, Eye, EyeOff, Clock, Users, Wifi, Database, WifiOff, AlertCircle, CheckCircle, XCircle, RefreshCw, Upload, Download, FileText, MapPin } from 'lucide-react';

const DebugPanel: React.FC = () => {
  const { state } = useGame();
  const { gameState: networkState, isConnected, forceNewUser } = useSimpleGameSync();
  const [isExpanded, setIsExpanded] = useState(false);

  if (state.gamePhase === 'preparation') return null;

  // 接続状態のアイコンを決定
  const getConnectionIcon = () => {
    if (!isConnected) return WifiOff;
    if (networkState.connectionStatus === 'connecting') return AlertCircle;
    return Wifi;
  };

  const ConnectionIcon = getConnectionIcon();

  // 状態の整合性チェック
  const getStatusConsistency = () => {
    if (!state.isNetworkGame) return { status: 'local', color: 'text-gray-400', icon: CheckCircle };
    
    const gameRoomId = state.roomId;
    const networkRoomId = networkState.roomId;
    const networkStatus = networkState.status;
    
    if (gameRoomId !== networkRoomId) {
      return { status: 'room_mismatch', color: 'text-red-400', icon: XCircle };
    }
    
    if (networkStatus === 'disconnected') {
      return { status: 'disconnected', color: 'text-red-400', icon: XCircle };
    }
    
    if (networkStatus === 'waiting') {
      return { status: 'waiting', color: 'text-yellow-400', icon: AlertCircle };
    }
    
    if (networkStatus === 'playing') {
      return { status: 'playing', color: 'text-green-400', icon: CheckCircle };
    }
    
    return { status: 'unknown', color: 'text-gray-400', icon: AlertCircle };
  };

  const statusConsistency = getStatusConsistency();

  // デバッグ用の新しいユーザーID生成
  const handleForceNewUser = async () => {
    try {
      await forceNewUser();
      console.log('🔧 新しいユーザーIDを生成しました');
    } catch (error) {
      console.error('🔧 ユーザーID生成に失敗:', error);
    }
  };

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
        {state.isNetworkGame && (
          <div className="flex items-center gap-1">
            <ConnectionIcon 
              size={12} 
              className={`${
                !isConnected ? 'text-red-400' : 
                networkState.connectionStatus === 'connecting' ? 'text-yellow-400' : 
                'text-green-400'
              }`} 
            />
            <statusConsistency.icon 
              size={12} 
              className={statusConsistency.color}
              title={`状態: ${statusConsistency.status}`}
            />
            {/* 初期盤面データの有無を表示 */}
            {networkState.initialState ? (
              <Download size={12} className="text-green-400" title="初期盤面データあり" />
            ) : (
              <Upload size={12} className="text-yellow-400" title="初期盤面データなし" />
            )}
            {/* 棋譜データの有無を表示 */}
            {networkState.moves.length > 0 ? (
              <FileText size={12} className="text-blue-400" title={`棋譜: ${networkState.moves.length}手`} />
            ) : (
              <FileText size={12} className="text-gray-400" title="棋譜なし" />
            )}
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
                <statusConsistency.icon 
                  size={12} 
                  className={statusConsistency.color}
                  title={`整合性: ${statusConsistency.status}`}
                />
              </h3>
              <div className="text-xs space-y-1">
                <div>Firebase接続: <span className={`${isConnected ? 'text-green-300' : 'text-red-300'}`}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span></div>
                <div>接続状態: <span className="text-blue-300">{networkState.connectionStatus}</span></div>
                <div>ゲームルームID: <span className="text-yellow-300 font-mono text-xs">
                  {state.roomId || 'なし'}
                </span></div>
                <div>ネットワークルームID: <span className="text-cyan-300 font-mono text-xs">
                  {networkState.roomId || 'なし'}
                </span></div>
                <div>ホスト: <span className="text-green-300">{state.isHost ? 'Yes' : 'No'}</span></div>
                <div>ネットワーク状態: <span className={statusConsistency.color}>{networkState.status}</span></div>
                <div>対戦相手: <span className="text-cyan-300">{networkState.opponent?.name || 'なし'}</span></div>
                {networkState.opponent && (
                  <div>相手接続: <span className={`${networkState.opponent.connected ? 'text-green-300' : 'text-red-300'}`}>
                    {networkState.opponent.connected ? 'Connected' : 'Disconnected'}
                  </span></div>
                )}
                <div>同期コールバック: <span className="text-orange-300">{state.networkSyncCallback ? 'Set' : 'None'}</span></div>
                <div>初期盤面データ: <span className={`${networkState.initialState ? 'text-green-300' : 'text-yellow-300'}`}>
                  {networkState.initialState ? 'あり' : 'なし'}
                </span></div>
              </div>
            </div>

            {/* 🎯 改善された初期盤面データの詳細 */}
            {state.isNetworkGame && networkState.initialState && (
              <div>
                <h3 className="text-sm font-bold text-green-400 mb-2 flex items-center gap-1">
                  <Download size={14} />
                  初期盤面データ
                </h3>
                <div className="text-xs space-y-1">
                  <div>キャラクター数: <span className="text-green-300">{networkState.initialState.characters?.length || 0}</span></div>
                  <div>プレイヤークリスタル: <span className="text-blue-300">{networkState.initialState.playerCrystals}</span></div>
                  <div>敵クリスタル: <span className="text-red-300">{networkState.initialState.enemyCrystals}</span></div>
                  <div>現在のチーム: <span className="text-purple-300">{networkState.initialState.currentTeam}</span></div>
                  <div>開始チーム: <span className="text-yellow-300">{networkState.initialState.startingTeam}</span></div>
                  <div>ターン数: <span className="text-yellow-300">{networkState.initialState.currentTurn}</span></div>
                  <div>ゲームフェーズ: <span className="text-cyan-300">{networkState.initialState.gamePhase}</span></div>
                  {networkState.initialState.uploadedAt && (
                    <div>アップロード時刻: <span className="text-gray-300">
                      {new Date(networkState.initialState.uploadedAt).toLocaleTimeString()}
                    </span></div>
                  )}
                </div>
              </div>
            )}

            {/* 状態整合性チェッカー */}
            {state.isNetworkGame && (
              <div>
                <h3 className="text-sm font-bold text-orange-400 mb-2 flex items-center gap-1">
                  <statusConsistency.icon size={14} />
                  状態整合性
                </h3>
                <div className="text-xs space-y-1">
                  <div>ステータス: <span className={statusConsistency.color}>{statusConsistency.status}</span></div>
                  {statusConsistency.status === 'room_mismatch' && (
                    <div className="text-red-300 bg-red-900/20 p-1 rounded">
                      ⚠️ ルームID不整合: ゲーム({state.roomId?.slice(-6)}) ≠ ネットワーク({networkState.roomId?.slice(-6)})
                    </div>
                  )}
                  {statusConsistency.status === 'disconnected' && (
                    <div className="text-red-300 bg-red-900/20 p-1 rounded">
                      ⚠️ ネットワーク切断状態
                    </div>
                  )}
                  {statusConsistency.status === 'playing' && (
                    <div className="text-green-300 bg-green-900/20 p-1 rounded">
                      ✅ 正常に同期中
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* デバッグ操作 */}
            {state.isNetworkGame && (
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
                  <p className="text-xs text-gray-400">
                    ※同じブラウザの異なるタブで接続している場合に使用
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
                <div>待った可能: <span className="text-orange-300">{state.canUndo ? 'Yes' : 'No'}</span></div>
                <div>ネットワークゲーム: <span className="text-purple-300">{state.isNetworkGame ? 'Yes' : 'No'}</span></div>
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

            {/* 🎯 改善された棋譜表示（座標情報を含む） */}
            {state.isNetworkGame && networkState.moves.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-yellow-400 mb-2 flex items-center gap-1">
                  <FileText size={14} />
                  棋譜 ({networkState.moves.length}手)
                </h3>
                <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                  {networkState.moves.slice(-10).map((move, index) => (
                    <div key={move.id} className="space-y-1 p-1 bg-gray-800 rounded">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">
                          {networkState.moves.length - 9 + index}.
                        </span>
                        <span className={move.player === 'host' ? 'text-blue-300' : 'text-red-300'}>
                          {move.player}
                        </span>
                        <span className="text-green-300">{move.action}</span>
                      </div>
                      {/* 🎯 座標情報の表示 */}
                      <div className="flex items-center gap-1 text-xs">
                        <MapPin size={10} className="text-gray-400" />
                        <span className="text-yellow-300">
                          ({move.from.x},{move.from.y})
                        </span>
                        {move.to && (
                          <>
                            <span className="text-gray-400">→</span>
                            <span className="text-cyan-300">
                              ({move.to.x},{move.to.y})
                            </span>
                          </>
                        )}
                        {move.targetId && (
                          <span className="text-red-300 text-xs">
                            target:{move.targetId.slice(-4)}
                          </span>
                        )}
                        {move.skillId && (
                          <span className="text-purple-300 text-xs">
                            skill:{move.skillId}
                          </span>
                        )}
                      </div>
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