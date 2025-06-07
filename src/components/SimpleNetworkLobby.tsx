import React, { useState, useEffect } from 'react';
import { useSimpleGameSync } from '../hooks/useSimpleGameSync';
import { useGame } from '../context/GameContext';
import { Wifi, Users, Copy, Check, X, Play, Clock, UserCheck, UserX } from 'lucide-react';

interface SimpleNetworkLobbyProps {
  onClose: () => void;
  onStartNetworkGame: (roomId: string, isHost: boolean) => void;
}

const SimpleNetworkLobby: React.FC<SimpleNetworkLobbyProps> = ({ onClose, onStartNetworkGame }) => {
  const { savedDecks } = useGame();
  const { gameState, createRoom, joinRoom, startGame, leaveRoom, setOnGameStart, isConnected } = useSimpleGameSync();
  
  const [mode, setMode] = useState<'menu' | 'waiting'>('menu');
  const [playerName, setPlayerName] = useState('プレイヤー');
  const [roomId, setRoomId] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // デッキが設定されているかチェック
  const hasValidDeck = savedDecks.player && savedDecks.enemy;

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
    console.log('ゲーム状態監視:', gameState);
    
    if (gameState.status === 'waiting' && gameState.roomId) {
      setMode('waiting');
      setRoomId(gameState.roomId);
      setError('');
    }
    
    if (gameState.status === 'playing') {
      console.log('ゲーム開始状態検出');
      // ゲーム開始時はロビーを閉じる
      onClose();
    }
  }, [gameState.status, gameState.roomId, onClose]);

  const handleCreateRoom = async () => {
    if (!hasValidDeck) {
      setError('先にチーム編成を完了してください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('ルーム作成開始');
      const newRoomId = await createRoom(playerName);
      console.log('ルーム作成完了:', newRoomId);
      setRoomId(newRoomId);
      setMode('waiting');
    } catch (err: any) {
      console.error('ルーム作成エラー:', err);
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

    setLoading(true);
    setError('');

    try {
      console.log('ルーム参加開始:', roomId.trim());
      await joinRoom(roomId.trim(), playerName);
      console.log('ルーム参加完了');
      setMode('waiting');
    } catch (err: any) {
      console.error('ルーム参加エラー:', err);
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
      console.log('ゲーム開始処理開始');
      await startGame();
      console.log('ゲーム開始処理完了');
    } catch (err: any) {
      console.error('ゲーム開始エラー:', err);
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
      console.log('ルーム退出処理開始');
      await leaveRoom();
      console.log('ルーム退出処理完了');
      setMode('menu');
      setRoomId('');
      setError('');
    } catch (err) {
      console.error('ルーム退出エラー:', err);
    } finally {
      setLoading(false);
    }
  };

  const canStartGame = gameState.isHost && gameState.opponent && !loading;

  if (!isConnected) {
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
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Wifi size={24} className="text-green-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-800">オンライン対戦</h2>
              <p className="text-sm text-green-600">接続済み</p>
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

        {/* デバッグ情報 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 p-2 bg-gray-100 rounded text-xs">
            <p>デバッグ: {JSON.stringify({
              status: gameState.status,
              roomId: gameState.roomId,
              isHost: gameState.isHost,
              hasOpponent: !!gameState.opponent
            })}</p>
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
                disabled={loading}
              />
            </div>

            <button
              onClick={handleCreateRoom}
              disabled={!hasValidDeck || loading}
              className={`w-full py-3 rounded-lg font-medium transition-colors ${
                hasValidDeck && !loading
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {loading ? '作成中...' : 'ルームを作成'}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">または</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ルームID
              </label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="ルームIDを入力"
                disabled={loading}
              />
            </div>

            <button
              onClick={handleJoinRoom}
              disabled={loading || !roomId.trim() || !hasValidDeck}
              className={`w-full py-3 rounded-lg font-medium transition-colors ${
                loading || !roomId.trim() || !hasValidDeck
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {loading ? '参加中...' : 'ルームに参加'}
            </button>
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

            {/* プレイヤー情報 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <UserCheck size={20} className="text-green-600" />
                  <span className="font-medium text-green-800">
                    {gameState.playerName} {gameState.isHost ? '(ホスト)' : ''}
                  </span>
                </div>
                <span className="text-sm text-green-600">準備完了</span>
              </div>
              
              {gameState.opponent ? (
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <UserCheck size={20} className="text-green-600" />
                    <span className="font-medium text-green-800">
                      {gameState.opponent.name}
                    </span>
                  </div>
                  <span className="text-sm text-green-600">準備完了</span>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-gray-600">対戦相手を待機中...</span>
                  <div className="animate-pulse w-2 h-2 bg-gray-400 rounded-full"></div>
                </div>
              )}
            </div>

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
                {loading ? 'ゲーム開始中...' : canStartGame ? 'ゲーム開始' : '対戦相手を待機中'}
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