import React, { useState } from 'react';
import { X, Copy, Users, Wifi } from 'lucide-react';

interface SimpleNetworkLobbyProps {
  onClose: () => void;
  onStartNetworkGame: (roomId: string, isHost: boolean) => void;
}

const SimpleNetworkLobby: React.FC<SimpleNetworkLobbyProps> = ({ onClose, onStartNetworkGame }) => {
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [roomId, setRoomId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateRoom = () => {
    setIsCreating(true);
    const newRoomId = generateRoomId();
    setRoomId(newRoomId);
    
    // 簡単な遅延でルーム作成をシミュレート
    setTimeout(() => {
      setIsCreating(false);
      onStartNetworkGame(newRoomId, true);
    }, 1000);
  };

  const handleJoinRoom = () => {
    if (roomId.trim()) {
      onStartNetworkGame(roomId.trim().toUpperCase(), false);
    }
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-t-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wifi size={24} />
            <h2 className="text-xl font-bold">オンライン対戦</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {mode === 'menu' && (
            <div className="space-y-4">
              <p className="text-gray-600 text-center mb-6">
                オンライン対戦モードを選択してください
              </p>
              
              <button
                onClick={() => setMode('create')}
                className="w-full p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-3"
              >
                <Users size={20} />
                <span className="font-medium">ルームを作成</span>
              </button>
              
              <button
                onClick={() => setMode('join')}
                className="w-full p-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center justify-center gap-3"
              >
                <Wifi size={20} />
                <span className="font-medium">ルームに参加</span>
              </button>
            </div>
          )}

          {mode === 'create' && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-800 mb-2">ルーム作成</h3>
                <p className="text-gray-600 text-sm">
                  ルームを作成して友達を招待しましょう
                </p>
              </div>

              {!isCreating ? (
                <div className="space-y-4">
                  <button
                    onClick={handleCreateRoom}
                    className="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                  >
                    ルームを作成する
                  </button>
                  
                  <button
                    onClick={() => setMode('menu')}
                    className="w-full p-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    戻る
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-600">ルームを作成中...</p>
                </div>
              )}
            </div>
          )}

          {mode === 'join' && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-800 mb-2">ルーム参加</h3>
                <p className="text-gray-600 text-sm">
                  ルームIDを入力して参加してください
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ルームID
                  </label>
                  <input
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                    placeholder="例: ABC123"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-center text-lg"
                    maxLength={6}
                  />
                </div>
                
                <button
                  onClick={handleJoinRoom}
                  disabled={!roomId.trim()}
                  className={`w-full p-3 rounded-lg transition-colors font-medium ${
                    roomId.trim()
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  ルームに参加
                </button>
                
                <button
                  onClick={() => setMode('menu')}
                  className="w-full p-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  戻る
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimpleNetworkLobby;