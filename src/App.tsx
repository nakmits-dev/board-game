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
import { HelpCircle, Play } from 'lucide-react';

const GameContent = () => {
  const { state, dispatch, savedDecks } = useGame();
  const { gamePhase } = state;
  const [showDeckBuilder, setShowDeckBuilder] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // スマホでの対戦中かどうかを判定
  const isMobileBattle = gamePhase === 'action' && window.innerWidth < 1024;

  const handleStartGame = (
    playerDeck?: { master: keyof typeof masterData; monsters: MonsterType[] },
    enemyDeck?: { master: keyof typeof masterData; monsters: MonsterType[] }
  ) => {
    if (gamePhase === 'result') {
      dispatch({ type: 'RESET_GAME' });
    }
    
    // デッキが指定されている場合は保存、そうでなければ現在保存されているデッキを使用
    const finalPlayerDeck = playerDeck || savedDecks.player;
    const finalEnemyDeck = enemyDeck || savedDecks.enemy;
    
    dispatch({ type: 'START_GAME', playerDeck: finalPlayerDeck, enemyDeck: finalEnemyDeck });
    setShowDeckBuilder(false);
  };

  const handleShowDeckBuilder = () => {
    setShowDeckBuilder(true);
  };

  const handleCloseDeckBuilder = (
    playerDeck?: { master: keyof typeof masterData; monsters: MonsterType[] },
    enemyDeck?: { master: keyof typeof masterData; monsters: MonsterType[] }
  ) => {
    // 編成内容を保存
    if (playerDeck && enemyDeck) {
      dispatch({ type: 'SET_SAVED_DECKS', playerDeck, enemyDeck });
      
      // 準備画面でのプレビューを更新
      dispatch({ type: 'UPDATE_PREVIEW', playerDeck, enemyDeck });
    }
    setShowDeckBuilder(false);
  };

  // 対戦開始ボタンの活性化条件をチェック
  const canStartGame = () => {
    return !!(savedDecks.player && savedDecks.enemy);
  };

  if (showDeckBuilder) {
    return (
      <DeckBuilder 
        onStartGame={handleStartGame} 
        onClose={handleCloseDeckBuilder}
        initialPlayerDeck={savedDecks.player}
        initialEnemyDeck={savedDecks.enemy}
      />
    );
  }

  return (
    <div className="min-h-screen bg-blue-50 text-gray-900">
      {/* ヘッダー - スマホの対戦中は非表示 */}
      {!isMobileBattle && (
        <header className="bg-white shadow-lg border-b border-blue-100">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-blue-900">ボードdeモンスターズ</h1>
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
      )}
      
      <main className={`container mx-auto p-4 max-w-7xl ${isMobileBattle ? 'pt-2' : ''}`}>
        {/* スマホ対戦中の浮かび上がるヘルプボタン */}
        {isMobileBattle && (
          <div className="fixed top-4 right-4 z-30">
            <button
              onClick={() => setShowTutorial(true)}
              className="floating-help-button w-10 h-10 text-white rounded-full flex items-center justify-center transition-all duration-300"
              title="遊び方を見る"
            >
              <HelpCircle size={18} />
            </button>
          </div>
        )}

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
                    canStartGame()
                      ? 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105'
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
                  onClick={() => canStartGame() && handleStartGame()}
                  disabled={!canStartGame()}
                >
                  {gamePhase === 'preparation' ? '対戦開始' : 'もう一度プレイ'}
                </button>
              </div>
            ) : (
              <div className="mb-4">
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
          
          <div className="hidden lg:block">
            <CharacterPanel />
          </div>
        </div>
      </main>
      
      {/* フッター - スマホの対戦中は非表示 */}
      {!isMobileBattle && (
        <footer className="mt-8 py-6 bg-white border-t border-blue-100">
          <div className="container mx-auto px-4">
            <p className="text-center text-sm text-blue-600">ボードdeモンスターズ &copy; 2025</p>
          </div>
        </footer>
      )}

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