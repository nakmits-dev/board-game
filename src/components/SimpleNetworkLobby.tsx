import React, { useState, useEffect } from 'react';
import { useSimpleGameSync } from '../hooks/useSimpleGameSync';
import { useGame } from '../context/GameContext';
import { Wifi, Users, Copy, Check, X, Play, Clock, UserCheck, UserX, WifiOff, AlertCircle, Shuffle, Edit3, RefreshCw } from 'lucide-react';

interface SimpleNetworkLobbyProps {
  onClose: () => void;
  onStartNetworkGame: (roomId: string, isHost: boolean) => void;
}

const SimpleNetworkLobby: React.FC<SimpleNetworkLobbyProps> = ({ onClose, onStartNetworkGame }) => {
  const { savedDecks } = useGame();
  const { gameState, createRoom, joinRoom, startGame, leaveRoom, setOnGameStart, validateRoomId, isConnected } = useSimpleGameSync();
  
  const [mode, setMode] = useState<'menu' | 'waiting'>('menu');
  const [playerName, setPlayerName] = useState('プレイヤー');
  const [roomId, setRoomId] = useState('');
  const [customRoomId, setCustomRoomId] = useState('');
  const [useCustomRoomId, setUseCustomRoomId] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [roomIdValidation, setRoomIdValidation] = useState<{ isValid: boolean; error?: string }>({ isValid: true });

  // デッキが設定されているかチェック
  const hasValidDeck = savedDecks.player && savedDecks.enemy;

  // カスタムルームIDのリアルタイム検証
  useEffect(() => {
    if (useCustomRoomId && customRoomId) {
      const validation = validateRoomId(customRoomId);
      setRoomIdValidation(validation);
    } else {
      setRoomIdValidation({ isValid: true });
    }
  }, [customRoomId, useCustomRoomId, validateRoomId]);

  // ゲーム開始コールバックを設定
  useEffect(() => {
    console.log('ゲーム開始コールバック設定');
    setOnGameStart((roomId: string, isHost: boolean) => {
      console.log('ゲーム開始コールバック実行:', { roomId, isHost });
      onStartNetworkGame(roomId, isHost);
    });
  }, [setOnGameStart, onStartNetworkGame]);

  // ゲーム状態の変化を監視
  useEffect(() => {
    console.log('🎮 ゲーム状態監視:', {
      status: gameState.status,
      roomId: gameState.roomId,
      isHost: gameState.isHost,
      playerName: gameState.playerName,
      opponent: gameState.opponent,
      connectionStatus: gameState.connectionStatus
    });
    
    if (gameState.status === 'waiting' && gameState.roomId) {
      console.log('📋 待機モードに切り替え');
      setMode('waiting');
      setRoomId(gameState.roomId);
      setError('');
    }
    
    if (gameState.status === 'playing') {
      console.log('🎮 ゲーム開始状態検出 - ロビーを閉じる');
      onClose();
    }
  }, [gameState.status, gameState.roomId, gameState.opponent, onClose]);

  // ランダムルームID生成
  const generateRandomRoomId = () => {
    const adjectives = ['cool', 'epic', 'fun', 'wild', 'mega', 'super', 'ultra', 'pro', 'ace', 'top'];
    const nouns = ['game', 'battle', 'fight', 'duel', 'match', 'arena', 'clash', 'war', 'quest', 'raid'];
    const numbers = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    return `${adjective}-${noun}-${numbers}`;
  };

  const handleCreateRoom = async () => {
    if (!hasValidDeck) {
      setError('先にチーム編成を完了してください');
      return;
    }

    if (!isConnected) {
      setError('サーバーに接続されていません');
      return;
    }

    // カスタムルームIDを使用する場合の検証
    if (useCustomRoomId) {
      if (!roomIdValidation.isValid) {
        setError(roomIdValidation.error || 'ルームIDが無効です');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      console.log('🏗️ ルーム作成開始');
      const finalRoomId = useCustomRoomId ? customRoomId.trim() : undefined;
      const newRoomId = await createRoom(playerName, finalRoomId);
      console.log('✅ ルーム作成完了:', newRoomId);
      setRoomId(newRoomId);
      setMode('waiting');
    } catch (err: any) {
      console.error('❌ ルーム作成エラー:', err);
      setError(err.message || 'ルームの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!hasValidDeck || !roomId.trim()) {
      setError('ルームIDを入力し、チーム編成を完了してください');
      return;
    }

    if (!isConnected) {
      setError('サーバーに接続されていません');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🚪 ルーム参加開始:', roomId.trim());
      await joinRoom(roomId.trim(), playerName);
      console.log('✅ ルーム参加完了');
      setMode('waiting');
    } catch (err: any) {
      console.error('❌ ルーム参加エラー:', err);
      setError(err.message || 'ルームへの参加に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (!gameState.isHost || !gameState.opponent) return;

    setLoading(true);
    setError('');

    try {
      console.log('🎮 ゲーム開始処理開始');
      await startGame();
      console.log('✅ ゲーム開始処理完了');
    } catch (err: any) {
      console.error('❌ ゲーム開始エラー:', err);
      setError(err.message || 'ゲームの開始に失敗しました');
      setLoading(false);
    }
  };

  const copyRoomId = async () => {
    if (!roomId) return;

    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // フォールバック
      const textArea = document.createElement('textarea');
      textArea.value = roomId;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLeaveRoom = async () => {
    setLoading(true);
    try {
      console.log('🚪 ルーム退出処理開始');
      await leaveRoom();
      console.log('✅ ルーム退出処理完了');
      setMode('menu');
      setRoomId('');
      setError('');
    } catch (err) {
      console.error('❌ ルーム退出エラー:', err);
    } finally {
      setLoading(false);
    }
  };

  const canStartGame = gameState.isHost && gameState.opponent && gameState.opponent.connected && !loading;

  // 接続状態の表示
  const getConnectionStatus = () => {
    if (!isConnected) {
      return { icon: WifiOff, text: '未接続', color: 'text-red-600' };
    }
    if (gameState.connectionStatus === 'connecting') {
      return { icon: AlertCircle, text: '接続中', color: 'text-yellow-600' };
    }
    return { icon: Wifi, text: '接続済み', color: 'text-green-600' };
  };

  const connectionStatus = getConnectionStatus();

  if (!isConnected && gameState.connectionStatus === 'connecting') {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
          <div className="text-center">
            <div className="animate-spin">
              <Wifi size={48} className="text-blue-500 mx-auto mb-4" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">接続中...</h2>
            <p className="text-gray-600 mb-4">サーバーに接続しています</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <connectionStatus.icon size={24} className={connectionStatus.color} />
            <div>
              <h2 className="text-xl font-bold text-gray-800">オンライン対戦</h2>
              <p className={`text-sm ${connectionStatus.color}`}>{connectionStatus.text}</p>
            </div>
          </div>
          <button
            onClick={mode === 'waiting' ? handleLeaveRoom : onClose}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* 接続エラー表示 */}
        {!isConnected && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <WifiOff size={16} className="text-red-600" />
              <p className="text-red-700 text-sm">
                サーバーに接続できません。ネットワーク接続を確認してください。
              </p>
            </div>
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* デッキ確認 */}
        {!hasValidDeck && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-700 text-sm">
              ⚠️ 先にチーム編成を完了してください
            </p>
          </div>
        )}

        {/* メニュー画面 */}
        {mode === 'menu' && (
          <div className="space-y-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                プレイヤー名
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="プレイヤー名を入力"
                maxLength={20}
                disabled={loading || !isConnected}
              />
            </div>

            {/* ルーム作成セクション */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-800 mb-3">ルームを作成</h3>
              
              {/* カスタムルームID切り替え */}
              <div className="mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useCustomRoomId}
                    onChange={(e) => setUseCustomRoomId(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    disabled={loading || !isConnected}
                  />
                  <span className="text-sm text-gray-700">カスタムルームIDを使用</span>
                </label>
              </div>

              {/* カスタムルームID入力 */}
              {useCustomRoomId && (
                <div className="mb-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={customRoomId}
                        onChange={(e) => setCustomRoomId(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                          roomIdValidation.isValid 
                            ? 'border-gray-300 focus:ring-blue-500' 
                            : 'border-red-300 focus:ring-red-500'
                        }`}
                        placeholder="my-room-123"
                        maxLength={20}
                        disabled={loading || !isConnected}
                      />
                      {!roomIdValidation.isValid && (
                        <p className="text-red-600 text-xs mt-1">{roomIdValidation.error}</p>
                      )}
                      <p className="text-gray-500 text-xs mt-1">
                        3-20文字、英数字・ハイフン・アンダースコアのみ
                      </p>
                    </div>
                    <button
                      onClick={() => setCustomRoomId(generateRandomRoomId())}
                      className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1"
                      title="ランダム生成"
                      disabled={loading || !isConnected}
                    >
                      <Shuffle size={16} />
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={handleCreateRoom}
                disabled={!hasValidDeck || loading || !isConnected || (useCustomRoomId && !roomIdValidation.isValid)}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  hasValidDeck && !loading && isConnected && (!useCustomRoomId || roomIdValidation.isValid)
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {loading ? '作成中...' : 'ルームを作成'}
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">または</span>
              </div>
            </div>

            {/* ルーム参加セクション */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-800 mb-3">ルームに参加</h3>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ルームID
                </label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="ルームIDを入力"
                  disabled={loading || !isConnected}
                />
              </div>

              <button
                onClick={handleJoinRoom}
                disabled={loading || !roomId.trim() || !hasValidDeck || !isConnected}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  loading || !roomId.trim() || !hasValidDeck || !isConnected
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {loading ? '参加中...' : 'ルームに参加'}
              </button>
            </div>
          </div>
        )}

        {/* 待機画面 */}
        {mode === 'waiting' && (
          <div className="space-y-4">
            <div className="text-center">
              <Clock size={48} className="text-orange-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-800 mb-2">
                {gameState.isHost ? '対戦相手を待機中' : '対戦開始を待機中'}
              </h3>
            </div>

            {/* ルームID表示 */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">ルームID</p>
                  <p className="font-mono font-bold text-gray-800">{roomId}</p>
                </div>
                <button
                  onClick={copyRoomId}
                  className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  <span className="text-sm">{copied ? 'コピー済み' : 'コピー'}</span>
                </button>
              </div>
            </div>

            {/* 🔥 修正: プレイヤー情報表示を強化 */}
            <div className="space-y-2">
              {/* 自分の情報 */}
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <UserCheck size={20} className="text-green-600" />
                  <span className="font-medium text-green-800">
                    {gameState.playerName} {gameState.isHost ? '(ホスト)' : '(ゲスト)'}
                  </span>
                </div>
                <span className="text-sm text-green-600">準備完了</span>
              </div>
              
              {/* 相手の情報 */}
              {gameState.opponent ? (
                <div className={`flex items-center justify-between p-3 border rounded-lg ${
                  gameState.opponent.connected 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {gameState.opponent.connected ? (
                      <UserCheck size={20} className="text-green-600" />
                    ) : (
                      <UserX size={20} className="text-red-600" />
                    )}
                    <span className={`font-medium ${
                      gameState.opponent.connected ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {gameState.opponent.name} {gameState.isHost ? '(ゲスト)' : '(ホスト)'}
                    </span>
                  </div>
                  <span className={`text-sm ${
                    gameState.opponent.connected ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {gameState.opponent.connected ? '準備完了' : '切断中'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-gray-600">対戦相手を待機中...</span>
                  <div className="animate-pulse w-2 h-2 bg-gray-400 rounded-full"></div>
                </div>
              )}
            </div>

            {/* 🔥 追加: デバッグ情報（開発時のみ表示） */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <h4 className="text-sm font-bold text-blue-800 mb-2">デバッグ情報</h4>
                <div className="text-xs text-blue-700 space-y-1">
                  <div>ゲーム状態: {gameState.status}</div>
                  <div>ルームID: {gameState.roomId}</div>
                  <div>ホスト: {gameState.isHost ? 'Yes' : 'No'}</div>
                  <div>プレイヤー名: {gameState.playerName}</div>
                  <div>相手存在: {gameState.opponent ? 'Yes' : 'No'}</div>
                  {gameState.opponent && (
                    <>
                      <div>相手名: {gameState.opponent.name}</div>
                      <div>相手接続: {gameState.opponent.connected ? 'Yes' : 'No'}</div>
                      <div>相手準備: {gameState.opponent.ready ? 'Yes' : 'No'}</div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ゲーム開始ボタン */}
            {gameState.isHost && (
              <button
                onClick={handleStartGame}
                disabled={!canStartGame}
                className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                  canStartGame
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Play size={20} />
                {loading ? 'ゲーム開始中...' : canStartGame ? 'ゲーム開始' : 
                  !gameState.opponent ? '対戦相手を待機中' : 
                  !gameState.opponent.connected ? '相手の再接続を待機中' : 
                  'ゲーム開始'}
              </button>
            )}

            {!gameState.isHost && (
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-blue-700 text-sm">
                  ホストがゲームを開始するまでお待ちください
                </p>
              </div>
            )}

            <button
              onClick={handleLeaveRoom}
              disabled={loading}
              className="w-full py-2 text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
            >
              {loading ? '退出中...' : 'ルームを退出'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleNetworkLobby;