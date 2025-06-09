import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { ChevronDown, ChevronUp, History, Move, Sword, Sparkle, Flag, RotateCcw, Clock } from 'lucide-react';

interface GameHistoryProps {
  className?: string;
}

interface HistoryMove {
  id: string;
  turn: number;
  team: 'player' | 'enemy';
  action: string;
  description: string;
  timestamp: number;
  icon: React.ReactNode;
  color: string;
}

const GameHistory: React.FC<GameHistoryProps> = ({ className = '' }) => {
  const { state } = useGame();
  const [isExpanded, setIsExpanded] = useState(false);
  const [gameHistory, setGameHistory] = useState<HistoryMove[]>([]);

  // 棋譜データを監視して履歴を更新
  React.useEffect(() => {
    // 実際の棋譜データがあれば、それを履歴に変換
    // 現在はサンプルデータを表示
    const sampleHistory: HistoryMove[] = [
      {
        id: '1',
        turn: 1,
        team: 'player',
        action: 'move',
        description: 'ウルフが (1,3) → (1,2) に移動',
        timestamp: Date.now() - 30000,
        icon: <Move size={14} className="text-blue-500" />,
        color: 'text-blue-600'
      },
      {
        id: '2',
        turn: 1,
        team: 'enemy',
        action: 'attack',
        description: 'ベアーがウルフを攻撃 (ダメージ: 2)',
        timestamp: Date.now() - 25000,
        icon: <Sword size={14} className="text-red-500" />,
        color: 'text-red-600'
      },
      {
        id: '3',
        turn: 2,
        team: 'player',
        action: 'skill',
        description: 'レッドマスターが「いかりのいちげき」を使用',
        timestamp: Date.now() - 20000,
        icon: <Sparkle size={14} className="text-purple-500" />,
        color: 'text-blue-600'
      },
      {
        id: '4',
        turn: 2,
        team: 'enemy',
        action: 'end_turn',
        description: 'ターン終了',
        timestamp: Date.now() - 15000,
        icon: <RotateCcw size={14} className="text-gray-500" />,
        color: 'text-red-600'
      }
    ];

    setGameHistory(sampleHistory);
  }, [state.currentTurn]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'move':
        return <Move size={14} className="text-blue-500" />;
      case 'attack':
        return <Sword size={14} className="text-red-500" />;
      case 'skill':
        return <Sparkle size={14} className="text-purple-500" />;
      case 'end_turn':
      case 'forced_end_turn':
        return <RotateCcw size={14} className="text-gray-500" />;
      case 'surrender':
        return <Flag size={14} className="text-orange-500" />;
      default:
        return <History size={14} className="text-gray-500" />;
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) {
      return `${seconds}秒前`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}分前`;
    } else {
      return `${Math.floor(seconds / 3600)}時間前`;
    }
  };

  const getTeamName = (team: 'player' | 'enemy') => {
    if (state.roomId) {
      // ネットワークゲームの場合
      if (state.isHost) {
        return team === 'player' ? '青チーム(あなた)' : '赤チーム(相手)';
      } else {
        return team === 'player' ? '青チーム(相手)' : '赤チーム(あなた)';
      }
    } else {
      // ローカルゲームの場合
      return team === 'player' ? '青チーム' : '赤チーム';
    }
  };

  if (state.gamePhase === 'preparation') {
    return null;
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-blue-100 ${className}`}>
      {/* ヘッダー */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <History size={20} className="text-blue-600" />
          <h3 className="font-bold text-gray-800">棋譜</h3>
          <span className="text-sm text-gray-500">
            ({gameHistory.length}手)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            ターン {state.currentTurn}
          </span>
          {isExpanded ? (
            <ChevronUp size={20} className="text-gray-400" />
          ) : (
            <ChevronDown size={20} className="text-gray-400" />
          )}
        </div>
      </div>

      {/* 棋譜リスト */}
      {isExpanded && (
        <div className="border-t border-gray-100">
          {gameHistory.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <History size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm">まだ棋譜がありません</p>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {gameHistory.map((move, index) => (
                <div 
                  key={move.id}
                  className={`p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                    index === gameHistory.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* アクションアイコン */}
                    <div className="flex-shrink-0 mt-0.5">
                      {getActionIcon(move.action)}
                    </div>
                    
                    {/* 棋譜内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                          {move.turn}手目
                        </span>
                        <span className={`text-xs font-medium ${
                          move.team === 'player' ? 'text-blue-600' : 'text-red-600'
                        }`}>
                          {getTeamName(move.team)}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock size={10} />
                          {formatTime(move.timestamp)}
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {move.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* フッター */}
          {gameHistory.length > 0 && (
            <div className="p-3 bg-gray-50 text-center">
              <p className="text-xs text-gray-500">
                最新の棋譜が上に表示されます
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GameHistory;