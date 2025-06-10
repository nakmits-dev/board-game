import React, { useState, useEffect } from 'react';
import { GameProvider } from './context/GameContext';
import GameBoard from './components/GameBoard';
import CharacterPanel from './components/CharacterPanel';
import ActionControls from './components/ActionControls';
import TurnOrder from './components/TurnOrder';
import CrystalDisplay from './components/CrystalDisplay';
import DeckBuilder from './components/DeckBuilder';
import ShareButton from './components/ShareButton';
import Tutorial from './components/Tutorial';
import { useGame } from './context/GameContext';
import { MonsterType } from './types/gameTypes';
import { masterData } from './data/cardData';
import { HelpCircle } from 'lucide-react';

const GameContent = () => {
  const { state, dispatch, savedDecks } = useGame();
  const { gamePhase } = state;
  const [showDeckBuilder, setShowDeckBuilder] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const handleShowDeckBuilder = () => {
    setShowDeckBuilder(true);
  };

  const handleCloseDeckBuilder = (
    hostDeck?: { master: keyof typeof masterData; monsters: MonsterType[] },
    guestDeck?: { master: keyof typeof masterData; monsters: MonsterType[] }
  ) => {
    // 編成内容を保存
    if (hostDeck && guestDeck) {
      dispatch({ type: 'SET_SAVED_DECKS', hostDeck, guestDeck });
      
      // 準備画面でのプレビューを更新
      dispatch({ type: 'UPDATE_PREVIEW', hostDeck, guestDeck });
    }
    setShowDeckBuilder(false);
  };

  const handleStartLocalGame = (
    hostDeck: { master: keyof typeof masterData; monsters: MonsterType[] },
    guestDeck: { master: keyof typeof masterData; monsters: MonsterType[] }
  ) => {
    // 編成内容を保存してDeckBuilderを閉じる
    handleCloseDeckBuilder(hostDeck, guestDeck);
  };

  const handleGameStart = () => {
    // チェックを1回だけ実行
    const hasValidDecks = !!(savedDecks.host && savedDecks.guest);
    
    if (!hasValidDecks) {
      return;
    }
    
    if (gamePhase === 'result') {
      dispatch({ type: 'RESET_GAME' });
    }
    
    // 🎲 毎回ランダムに開始チームを決定
    const actualStartingTeam: 'player' | 'enemy' = Math.random() < 0.5 ? 'player' : 'enemy';
    
    // 保存されたデッキでゲーム開始
    dispatch({ 
      type: 'START_LOCAL_GAME', 
      hostDeck: savedDecks.host!, 
      guestDeck: savedDecks.guest!,
      startingTeam: actualStartingTeam
    });
  };

  // ボタンの活性化状態を計算
  const isGameStartEnabled = !!(savedDecks.host && savedDecks.guest);

  if (showDeckBuilder) {
    return (
      <DeckBuilder 
        onStartGame={handleStartLocalGame} 
        onClose={handleCloseDeckBuilder}
        initialHostDeck={savedDecks.host}
        initialGuestDeck={savedDecks.guest}
      />
    );
  }

  return (
    <div className="min-h-screen bg-blue-50 text-gray-900">
      {/* ヘッダー */}
      <header className="bg-white shadow-lg border-b border-blue-100">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-blue-900">ボードdeモンスターズ</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTutorial(true)}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                title="チュートリアルを見る"
              >
                <HelpCircle size={16} />
                <span className="hidden sm:inline">遊び方</span>
              </button>
              <ShareButton />
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto p-4 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {(gamePhase === 'preparation' || gamePhase === 'result') ? (
              <div className="flex justify-center gap-4 mb-4">
                <button
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-lg transform transition hover:scale-105"
                  onClick={handleShowDeckBuilder}
                >
                  チーム編成
                </button>
                <button
                  className={`px-6 py-3 font-bold rounded-lg shadow-lg transform transition ${
                    isGameStartEnabled
                      ? 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105'
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
                  onClick={handleGameStart}
                  disabled={!isGameStartEnabled}
                >
                  {gamePhase === 'preparation' ? 'ゲーム開始' : 'もう一度プレイ'}
                </button>
              </div>
            ) : (
              <div className="mb-4">
                {/* ターン情報（タイマー統合済み） */}
                <TurnOrder />
              </div>
            )}
            
            <div className="flex justify-center mb-4 relative">
              <CrystalDisplay />
              <GameBoard />
            </div>
            
            <div className="mt-4">
              <ActionControls />
            </div>
          </div>
          
          <div className="hidden lg:block space-y-4">
            <CharacterPanel />
          </div>
        </div>
      </main>
      
      {/* フッター */}
      <footer className="mt-8 py-6 bg-white border-t border-blue-100">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-blue-600">ボードdeモンスターズ &copy; 2025</p>
        </div>
      </footer>

      {/* チュートリアル */}
      {showTutorial && (
        <Tutorial onClose={() => setShowTutorial(false)} />
      )}
    </div>
  );
};

function App() {
  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  );
}

export default App;