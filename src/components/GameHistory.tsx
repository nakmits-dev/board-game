import React, { useState, useEffect } from 'react';
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

// 🎯 棋譜データを管理するシングルトンクラス
class GameHistoryManager {
  private static instance: GameHistoryManager;
  private history: HistoryMove[] = [];
  private listeners: ((history: HistoryMove[]) => void)[] = [];
  private lastResetPhase: string | null = null; // 🔧 最後にリセットしたフェーズを記録

  static getInstance(): GameHistoryManager {
    if (!GameHistoryManager.instance) {
      GameHistoryManager.instance = new GameHistoryManager();
    }
    return GameHistoryManager.instance;
  }

  addMove(move: HistoryMove) {
    // 重複チェック（同じタイムスタンプの棋譜は追加しない）
    const exists = this.history.some(h => h.timestamp === move.timestamp);
    if (exists) {
      console.log('📋 [GameHistoryManager] 重複棋譜スキップ:', move.description);
      return;
    }

    console.log('📋 [GameHistoryManager] 棋譜追加:', move.description);
    this.history.push(move);
    
    // タイムスタンプ順でソート（新しいものが後）
    this.history.sort((a, b) => a.timestamp - b.timestamp);
    
    // リスナーに通知
    this.listeners.forEach(listener => listener([...this.history]));
  }

  getHistory(): HistoryMove[] {
    return [...this.history];
  }

  addListener(listener: (history: HistoryMove[]) => void) {
    this.listeners.push(listener);
  }

  removeListener(listener: (history: HistoryMove[]) => void) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  // 🔧 フェーズベースのリセット（重複防止）
  resetIfNeeded(currentPhase: string, gameId?: string) {
    const resetKey = `${currentPhase}_${gameId || 'default'}`;
    
    if (this.lastResetPhase === resetKey) {
      console.log('📋 [GameHistoryManager] リセット重複スキップ:', resetKey);
      return;
    }

    console.log('📋 [GameHistoryManager] 棋譜リセット実行:', resetKey);
    this.history = [];
    this.lastResetPhase = resetKey;
    this.listeners.forEach(listener => listener([]));
  }

  // 🔧 強制リセット（従来の動作）
  forceReset() {
    console.log('📋 [GameHistoryManager] 強制リセット');
    this.history = [];
    this.lastResetPhase = null;
    this.listeners.forEach(listener => listener([]));
  }
}

const GameHistory: React.FC<GameHistoryProps> = ({ className = '' }) => {
  const { state } = useGame();
  const [isExpanded, setIsExpanded] = useState(false);
  const [gameHistory, setGameHistory] = useState<HistoryMove[]>([]);
  const historyManager = GameHistoryManager.getInstance();

  // 🎯 棋譜マネージャーからの更新を監視
  useEffect(() => {
    const updateHistory = (history: HistoryMove[]) => {
      setGameHistory(history);
    };

    historyManager.addListener(updateHistory);
    setGameHistory(historyManager.getHistory());

    return () => {
      historyManager.removeListener(updateHistory);
    };
  }, [historyManager]);

  // 🔧 ゲームフェーズ変更時のリセット処理（重複防止）
  useEffect(() => {
    if (state.gamePhase === 'preparation') {
      // ゲームIDを生成（ターン数とタイムスタンプから）
      const gameId = `${state.currentTurn}_${Date.now()}`;
      historyManager.resetIfNeeded('preparation', gameId);
    }
  }, [state.gamePhase, historyManager]);

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

  // 🎯 最新の棋譜が上に来るように逆順で表示
  const displayHistory = [...gameHistory].reverse();

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
              {displayHistory.map((move, index) => (
                <div 
                  key={move.id}
                  className={`p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                    index === displayHistory.length - 1 ? 'border-b-0' : ''
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

// 🎯 棋譜追加用のエクスポート関数
export const addGameHistoryMove = (
  turn: number,
  team: 'player' | 'enemy',
  action: string,
  description: string,
  timestamp: number = Date.now()
) => {
  const historyManager = GameHistoryManager.getInstance();
  
  const move: HistoryMove = {
    id: `${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
    turn,
    team,
    action,
    description,
    timestamp,
    icon: <History size={14} className="text-gray-500" />,
    color: team === 'player' ? 'text-blue-600' : 'text-red-600'
  };

  historyManager.addMove(move);
};

// 🔧 強制リセット用のエクスポート関数
export const forceResetGameHistory = () => {
  const historyManager = GameHistoryManager.getInstance();
  historyManager.forceReset();
};

export default GameHistory;