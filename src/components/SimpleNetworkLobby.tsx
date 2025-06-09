import React, { useState, useEffect } from 'react';
import { useSimpleGameSync } from '../hooks/useSimpleGameSync';
import { useGame } from '../context/GameContext';
import { Wifi, Users, Copy, Check, X, Play, Clock, UserCheck, UserX, WifiOff, AlertCircle, Shuffle, Edit3, RefreshCw, Timer, TimerOff } from 'lucide-react';
import { SimpleRoom } from '../types/networkTypes';

interface SimpleNetworkLobbyProps {
  onClose: () => void;
  onStartNetworkGame: (roomId: string, isHost: boolean, hasTimeLimit: boolean, timeLimitSeconds: number) => void;
}

const SimpleNetworkLobby: React.FC<SimpleNetworkLobbyProps> = ({ onClose, onStartNetworkGame }) => {
  const { savedDecks } = useGame();
  const { createRoom, joinRoom, startGame, leaveRoom, setOnGameStart, setOnRoomUpdate, validateRoomId, isConnected, startRoomMonitoring } = useSimpleGameSync();
  
  const [mode, setMode] = useState<'menu' | 'waiting'>('menu');
  const [playerName, setPlayerName] = useState('プレイヤー');
  const [roomId, setRoomId] = useState('');
  const [customRoomId, setCustomRoomId] = useState('');
  const [useCustomRoomId, setUseCustomRoomId] = useState(false);
  const [timeLimitOption, setTimeLimitOption] = useState<'none' | '30' | '60'>('30'); // 🆕 時間制限選択
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [roomIdValidation, setRoomIdValidation] = useState<{ isValid: boolean; error?: string }>({ isValid: true });
  
  // ローカル状態でルーム情報を管理
  const [localRoomData, setLocalRoomData] = useState<{
    id: string;
    isHost: boolean;
    playerName: string;
    opponent: { name: string; connected: boolean; ready: boolean } | null;
    status: 'waiting' | 'playing';
    timeLimitOption: 'none' | '30' | '60'; // 🆕 時間制限情報
  } | null>(null);

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
      // 🆕 時間制限情報も含めて渡す
      const timeLimit = localRoomData?.timeLimitOption ?? '30';
      const hasTimeLimit = timeLimit !== 'none';
      const timeLimitSeconds = timeLimit === 'none' ? 0 : parseInt(timeLimit);
      onStartNetworkGame(roomId, isHost, hasTimeLimit, timeLimitSeconds);
    });
  }, [setOnGameStart, onStartNetworkGame, localRoomData?.timeLimitOption]);

  // ルーム更新コールバックを設定
  useEffect(() => {
    setOnRoomUpdate((roomData: SimpleRoom) => {
      if (!localRoomData) return;

      console.log('📊 ルーム更新受信:', {
        roomId: roomData.id,
        hostName: roomData.host.name,
        hostConnected: roomData.host.connected,
        guestExists: !!roomData.guest,
        guestName: roomData.guest?.name,
        guestConnected: roomData.guest?.connected
      });

      // 相手の情報を更新
      const isHost = localRoomData.isHost;
      const opponent = isHost ? 
        (roomData.guest ? {
          name: roomData.guest.name,
          connected: roomData.guest.connected,
          ready: roomData.guest.ready
        } : null) :
        {
          name: roomData.host.name,
          connected: roomData.host.connected,
          ready: roomData.host.ready
        };

      setLocalRoomData(prev => prev ? {
        ...prev,
        opponent,
        status: roomData.status
      } : null);

      // ゲーム開始時にロビーを閉じる
      if (roomData.status === 'playing') {
        console.log('🎮 ゲーム開始状態検出 - ロビーを閉じる');
        onClose();
      }
    });
  }, [setOnRoomUpdate, localRoomData, onClose]);

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
      setLocalRoomData({
        id: newRoomId,
        isHost: true,
        playerName,
        opponent: null,
        status: 'waiting',
        timeLimitOption // 🆕 時間制限設定を保存
      });
      setMode('waiting');
      
      // ルーム監視開始
      startRoomMonitoring(newRoomId, true);
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
      
      setLocalRoomData({
        id: roomId.trim(),
        isHost: false,
        playerName,
        opponent: null,
        status: 'waiting',
        timeLimitOption: '30' // 🆕 ゲストは常にホストの設定に従う
      });
      setMode('waiting');
      
      // ルーム監視開始
      startRoomMonitoring(roomId.trim(), false);
    } catch (err: any) {
      console.error('❌ ルーム参加エラー:', err);
      setError(err.message || 'ルームへの参加に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (!localRoomData?.isHost || !localRoomData.opponent) return;

    setLoading(true);
    setError('');

    try {
      console.log('🎮 ゲーム開始処理開始');
      await startGame(localRoomData.id);
      console.log('✅ ゲーム開始処理完了');
    } catch (err: any) {
      console.error('❌ ゲーム開始エラー:', err);
      setError(err.message || 'ゲームの開始に失敗しました');
      setLoading(false);
    }
  };

  const copyRoomId = async () => {
    if (!localRoomData?.id) return;

    try {
      await navigator.clipboard.writeText(localRoomData.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = localRoomData.id;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLeaveRoom = async () => {
    if (!localRoomData) return;
    
    setLoading(true);
    try {
      console.log('🚪 ルーム退出処理開始');
      await leaveRoom(localRoomData.id, localRoomData.isHost);
      console.log('✅ ルーム退出処理完了');
      setMode('menu');
      setRoomId('');
      setLocalRoomData(null);
      setError('');
    } catch (err) {
      console.error('❌ ルーム退出エラー:', err);
    } finally {
      setLoading(false);
    }
  };

  const canStartGame = localRoomData?.isHost && localRoomData.opponent && localRoomData.opponent.connected && !loading;

  // 接続状態の表示
  const getConnectionStatus = () => {
    if (!isConnected) {
      return { icon: WifiOff, text: '未接続', color: 'text-red-600' };
    }
    return { icon: Wifi, text: '接続済み', color: 'text-green-600' };
  };

  const connectionStatus = getConnectionStatus();

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
              
              {/* 🆕 時間制限設定 */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  時間制限設定
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="timeLimit"
                      value="none"
                      checked={timeLimitOption === 'none'}
                      onChange={(e) => setTimeLimitOption(e.target.value as 'none' | '30' | '60')}
                      className="text-blue-600 focus:ring-blue-500"
                      disabled={loading || !isConnected}
                    />
                    <TimerOff size={16} className="text-gray-600" />
                    <span className="text-sm text-gray-700">時間制限なし</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="timeLimit"
                      value="30"
                      checked={timeLimitOption === '30'}
                      onChange={(e) => setTimeLimitOption(e.target.value as 'none' | '30' | '60')}
                      className="text-blue-600 focus:ring-blue-500"
                      disabled={loading || !isConnected}
                    />
                    <Timer size={16} className="text-blue-600" />
                    <span className="text-sm text-gray-700">30秒/ターン</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="timeLimit"
                      value="60"
                      checked={timeLimitOption === '60'}
                      onChange={(e) => setTimeLimitOption(e.target.value as 'none' | '30' | '60')}
                      className="text-blue-600 focus:ring-blue-500"
                      disabled={loading || !isConnected}
                    />
                    <Timer size={16} className="text-green-600" />
                    <span className="text-sm text-gray-700">60秒/ターン</span>
                  </label>
                </div>
              </div>
              
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
        {mode === 'waiting' && localRoomData && (
          <div className="space-y-4">
            <div className="text-center">
              <Clock size={48} className="text-orange-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-800 mb-2">
                {localRoomData.isHost ? '対戦相手を待機中' : '対戦開始を待機中'}
              </h3>
            </div>

            {/* ルームID表示 */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">ルームID</p>
                  <p className="font-mono font-bold text-gray-800">{localRoomData.id}</p>
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

            {/* 🆕 ゲーム設定表示 */}
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                {localRoomData.timeLimitOption === 'none' ? (
                  <>
                    <TimerOff size={16} className="text-gray-600" />
                    <span className="text-sm text-gray-800 font-medium">時間制限なし</span>
                  </>
                ) : (
                  <>
                    <Timer size={16} className="text-blue-600" />
                    <span className="text-sm text-blue-800 font-medium">
                      時間制限あり ({localRoomData.timeLimitOption}秒/ターン)
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* プレイヤー情報表示 */}
            <div className="space-y-2">
              {/* 自分の情報 */}
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <UserCheck size={20} className="text-blue-600" />
                  <span className="font-medium text-blue-800">
                    {localRoomData.playerName} (青チーム・{localRoomData.isHost ? 'ホスト' : 'ゲスト'})
                  </span>
                </div>
                <span className="text-sm text-blue-600">準備完了</span>
              </div>
              
              {/* 相手の情報 */}
              {localRoomData.opponent ? (
                <div className={`flex items-center justify-between p-3 border rounded-lg ${
                  localRoomData.opponent.connected 
                    ? 'bg-red-50 border-red-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {localRoomData.opponent.connected ? (
                      <UserCheck size={20} className="text-red-600" />
                    ) : (
                      <UserX size={20} className="text-gray-600" />
                    )}
                    <span className={`font-medium ${
                      localRoomData.opponent.connected ? 'text-red-800' : 'text-gray-800'
                    }`}>
                      {localRoomData.opponent.name} (赤チーム・{localRoomData.isHost ? 'ゲスト' : 'ホスト'})
                    </span>
                  </div>
                  <span className={`text-sm ${
                    localRoomData.opponent.connected ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {localRoomData.opponent.connected ? '準備完了' : '切断中'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-gray-600">対戦相手を待機中...</span>
                  <div className="animate-pulse w-2 h-2 bg-gray-400 rounded-full"></div>
                </div>
              )}
            </div>

            {/* ゲーム開始ボタン */}
            {localRoomData.isHost && (
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
                  !localRoomData.opponent ? '対戦相手を待機中' : 
                  !localRoomData.opponent.connected ? '相手の再接続を待機中' : 
                  'ゲーム開始'}
              </button>
            )}

            {!localRoomData.isHost && (
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