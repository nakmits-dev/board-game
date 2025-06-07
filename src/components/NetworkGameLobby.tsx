import React, { useState, useEffect } from 'react';
import { useFirebaseGame } from '../hooks/useFirebaseGame';
import { useGame } from '../context/GameContext';
import { MonsterType } from '../types/gameTypes';
import { masterData } from '../data/cardData';
import { Wifi, WifiOff, Users, Copy, Check, X, Play, Clock, UserCheck, UserX, RefreshCw } from 'lucide-react';

interface NetworkGameLobbyProps {
  onClose: () => void;
  onStartNetworkGame: (roomId: string, isHost: boolean) => void;
}

const NetworkGameLobby: React.FC<NetworkGameLobbyProps> = ({ onClose, onStartNetworkGame }) => {
  const { savedDecks } = useGame();
  const { networkState, createRoom, joinRoom, updateReadyStatus, startGame, leaveRoom, setOnGameStart, isConnected } = useFirebaseGame();
  
  const [mode, setMode] = useState<'menu' | 'create' | 'join' | 'waiting'>('menu');
  const [playerName, setPlayerName] = useState('プレイヤー');
  const [roomId, setRoomId] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(true);

  // デッキが設定されているかチェック
  const hasValidDeck = savedDecks.player && savedDecks.enemy;

  // ゲーム開始コールバックを設定
  useEffect(() => {
    setOnGameStart((roomId: string, isHost: boolean) => {
      console.log('ゲーム開始コールバック実行:', { roomId, isHost });
      onStartNetworkGame(roomId, isHost);
    });
  }, [setOnGameStart, onStartNetworkGame]);

  // ネットワーク状態の変化を監視
  useEffect(() => {
    if (networkState.isOnline && networkState.roomId) {
      setMode('waiting');
      setRoomId(networkState.roomId);
      setError(''); // エラーをクリア
    }
  }, [networkState.isOnline, networkState.roomId]);

  // 準備状態の変更を監視して送信
  useEffect(() => {
    if (mode === 'waiting' && networkState.roomId && isConnected) {
      updateReadyStatus(isReady);
    }
  }, [isReady, mode, networkState.roomId, isConnected, updateReadyStatus]);

  // エラー状態の監視
  useEffect(() => {
    if (networkState.connectionStatus === 'error') {
      setError('接続エラーが発生しました');
    }
  }, [networkState.connectionStatus]);

  const handleCreateRoom = async () => {
    if (!hasValidDeck || !savedDecks.player) {
      setError('先にチーム編成を完了してください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const newRoomId = await createRoom(playerName, savedDecks.player);
      setRoomId(newRoomId);
      setMode('waiting');
      setIsReady(true);
    } catch (err: any) {
      setError(err.message || 'ルームの作成に失敗しました');
      console.error('ルーム作成エラー:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!hasValidDeck || !savedDecks.player || !roomId.trim()) {
      setError('ルームIDを入力し、チーム編成を完了してください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await joinRoom(roomId.trim(), playerName, savedDecks.player);
      setMode('waiting');
      setIsReady(true);
    } catch (err: any) {
      setError(err.message || 'ルームへの参加に失敗しました');
      console.error('ルーム参加エラー:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (!networkState.isHost) return;

    // 両プレイヤーが準備完了かチェック
    if (!isReady || !networkState.opponent?.ready) {
      setError('両プレイヤーが準備完了である必要があります');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('ゲーム開始処理開始');
      await startGame();
      console.log('ゲーム開始処理完了');
      // ゲーム開始はFirebaseの監視で検出されるため、ここでは直接コールバックを呼ばない
    } catch (err: any) {
      setError(err.message || 'ゲームの開始に失敗しました');
      console.error('ゲーム開始エラー:', err);
    } finally {
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
      console.error('コピーに失敗しました:', err);
      // フォールバック: テキストエリアを使用
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
      await leaveRoom();
      setMode('menu');
      setRoomId('');
      setError('');
      setIsReady(true);
    } catch (err) {
      console.error('ルーム退出エラー:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleReady = () => {
    setIsReady(!isReady);
  };

  // ゲーム開始可能かチェック
  const canStartGame = networkState.isHost && 
                      networkState.opponent && 
                      isReady && 
                      networkState.opponent.ready &&
                      networkState.opponent.connected &&
                      !loading;

  // 接続状態の表示
  const getConnectionStatus = () => {
    if (!isConnected) return { text: '接続中...', color: 'text-yellow-600', icon: RefreshCw };
    if (networkState.connectionStatus === 'error') return { text: '接続エラー', color: 'text-red-600', icon: WifiOff };
    return { text: '接続済み', color: 'text-green-600', icon: Wifi };
  };

  const connectionStatus = getConnectionStatus();

  if (!isConnected && networkState.connectionStatus !== 'error') {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
          <div className="text-center">
            <div className="animate-spin">
              <RefreshCw size={48} className="text-blue-500 mx-auto mb-4" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">接続中...</h2>
            <p className="text-gray-600 mb-4">Firebaseに接続しています</p>
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
                disabled={loading}
              />
            </div>

            <button
              onClick={() => setMode('create')}
              disabled={!hasValidDeck || loading || !isConnected}
              className={`w-full py-3 rounded-lg font-medium transition-colors ${
                hasValidDeck && !loading && isConnected
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              ルームを作成
            </button>

            <button
              onClick={() => setMode('join')}
              disabled={!hasValidDeck || loading || !isConnected}
              className={`w-full py-3 rounded-lg font-medium transition-colors ${
                hasValidDeck && !loading && isConnected
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              ルームに参加
            </button>
          </div>
        )}

        {/* ルーム作成画面 */}
        {mode === 'create' && (
          <div className="space-y-4">
            <div className="text-center">
              <Users size={48} className="text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-800 mb-2">ルーム作成</h3>
              <p className="text-gray-600 text-sm mb-4">
                新しいルームを作成して友達を招待しましょう
              </p>
            </div>

            <button
              onClick={handleCreateRoom}
              disabled={loading || !isConnected}
              className={`w-full py-3 rounded-lg font-medium transition-colors ${
                loading || !isConnected
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loading ? '作成中...' : 'ルームを作成'}
            </button>

            <button
              onClick={() => setMode('menu')}
              disabled={loading}
              className="w-full py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
            >
              戻る
            </button>
          </div>
        )}

        {/* ルーム参加画面 */}
        {mode === 'join' && (
          <div className="space-y-4">
            <div className="text-center">
              <Users size={48} className="text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-800 mb-2">ルーム参加</h3>
              <p className="text-gray-600 text-sm mb-4">
                ルームIDを入力して参加してください
              </p>
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
              disabled={loading || !roomId.trim() || !isConnected}
              className={`w-full py-3 rounded-lg font-medium transition-colors ${
                loading || !roomId.trim() || !isConnected
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {loading ? '参加中...' : 'ルームに参加'}
            </button>

            <button
              onClick={() => setMode('menu')}
              disabled={loading}
              className="w-full py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
            >
              戻る
            </button>
          </div>
        )}

        {/* 待機画面 */}
        {mode === 'waiting' && (
          <div className="space-y-4">
            <div className="text-center">
              <Clock size={48} className="text-orange-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-800 mb-2">
                {networkState.isHost ? '対戦相手を待機中' : '対戦開始を待機中'}
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
              <div className={`flex items-center justify-between p-3 rounded-lg ${
                isReady ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <div className="flex items-center gap-2">
                  {isReady ? (
                    <UserCheck size={20} className="text-green-600" />
                  ) : (
                    <UserX size={20} className="text-yellow-600" />
                  )}
                  <span className={`font-medium ${
                    isReady ? 'text-green-800' : 'text-yellow-800'
                  }`}>
                    {networkState.isHost ? 'あなた (ホスト)' : 'あなた'}
                  </span>
                </div>
                <button
                  onClick={toggleReady}
                  disabled={loading}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors disabled:opacity-50 ${
                    isReady 
                      ? 'bg-green-600 text-white hover:bg-green-700' 
                      : 'bg-yellow-600 text-white hover:bg-yellow-700'
                  }`}
                >
                  {isReady ? '準備完了' : '準備中'}
                </button>
              </div>
              
              {networkState.opponent ? (
                <div className={`flex items-center justify-between p-3 rounded-lg ${
                  networkState.opponent.ready 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {networkState.opponent.ready ? (
                      <UserCheck size={20} className="text-green-600" />
                    ) : (
                      <UserX size={20} className="text-yellow-600" />
                    )}
                    <span className={`font-medium ${
                      networkState.opponent.ready ? 'text-green-800' : 'text-yellow-800'
                    }`}>
                      {networkState.opponent.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${
                      networkState.opponent.ready ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {networkState.opponent.ready ? '準備完了' : '準備中'}
                    </span>
                    <div className={`w-2 h-2 rounded-full ${
                      networkState.opponent.connected ? 'bg-green-500' : 'bg-red-500'
                    }`} title={networkState.opponent.connected ? '接続中' : '切断中'}></div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-gray-600">対戦相手を待機中...</span>
                  <div className="animate-pulse w-2 h-2 bg-gray-400 rounded-full"></div>
                </div>
              )}
            </div>

            {/* ゲーム開始ボタン */}
            {networkState.isHost && (
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
                {loading ? 'ゲーム開始中...' : canStartGame ? 'ゲーム開始' : '両プレイヤーの準備完了を待機中'}
              </button>
            )}

            {!networkState.isHost && networkState.opponent && (
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

export default NetworkGameLobby;