import React, { useState } from 'react';
import { GameProvider } from './context/GameContext';
import GameBoard from './components/GameBoard';
import CharacterPanel from './components/CharacterPanel';
import ActionControls from './components/ActionControls';
import TurnOrder from './components/TurnOrder';
import CrystalDisplay from './components/CrystalDisplay';
import DeckBuilder from './components/DeckBuilder';
import ShareButton from './components/ShareButton';
import { useGame } from './context/GameContext';
import { MonsterType } from './types/gameTypes';
import { masterData } from './data/cardData';

const GameContent = () => {
  const { state, dispatch } = useGame();
  const { gamePhase } = state;
  const [showDeckBuilder, setShowDeckBuilder] = useState(false);
  const [currentDecks, setCurrentDecks] = useState<{
    player?: { master: keyof typeof masterData; monsters: MonsterType[] };
    enemy?: { master: keyof typeof masterData; monsters: MonsterType[] };
  }>({});

  const handleStartGame = (
    playerDeck?: { master: keyof typeof masterData; monsters: MonsterType[] },
    enemyDeck?: { master: keyof typeof masterData; monsters: MonsterType[] }
  ) => {
    if (gamePhase === 'result') {
      dispatch({ type: 'RESET_GAME' });
    }
    
    // デッキが指定されている場合は保存
    const finalPlayerDeck = playerDeck || currentDecks.player;
    const finalEnemyDeck = enemyDeck || currentDecks.enemy;
    
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
      setCurrentDecks({ player: playerDeck, enemy: enemyDeck });
      
      // 準備画面でのプレビューを更新
      dispatch({ type: 'UPDATE_PREVIEW', playerDeck, enemyDeck });
    }
    setShowDeckBuilder(false);
  };

  // 対戦開始ボタンの活性化条件をチェック
  const canStartGame = () => {
    return !!(currentDecks.player && currentDecks.enemy);
  };

  // スマホでの対戦中かどうかを判定
  const isMobileBattle = gamePhase === 'action' && window.innerWidth < 1024;

  if (showDeckBuilder) {
    return (
      <DeckBuilder 
        onStartGame={handleStartGame} 
        onClose={handleCloseDeckBuilder}
        initialPlayerDeck={currentDecks.player}
        initialEnemyDeck={currentDecks.enemy}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col bg-blue-50 text-gray-900 overflow-hidden">
      {/* ヘッダー - スマホ対戦中は非表示 */}
      {!isMobileBattle && (
        <header className="bg-white shadow-lg border-b border-blue-100 flex-shrink-0">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <h1 className="text-xl sm:text-2xl font-bold text-blue-900">ボードdeモンスターズ</h1>
              <ShareButton />
            </div>
          </div>
        </header>
      )}
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col lg:flex-row">
          {/* メインゲームエリア */}
          <div className="flex-1 flex flex-col p-2 sm:p-4 overflow-hidden">
            {(gamePhase === 'preparation' || gamePhase === 'result') ? (
              <div className="flex justify-center gap-2 sm:gap-4 mb-2 sm:mb-4 flex-shrink-0">
                <button
                  className="px-4 py-2 sm:px-6 sm:py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-lg transform transition hover:scale-105 text-sm sm:text-base"
                  onClick={handleShowDeckBuilder}
                >
                  チーム編成
                </button>
                <button
                  className={`px-4 py-2 sm:px-6 sm:py-3 font-bold rounded-lg shadow-lg transform transition text-sm sm:text-base ${
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
              <div className="mb-2 sm:mb-4 flex-shrink-0">
                <TurnOrder />
              </div>
            )}
            
            {/* ゲームボードエリア - 中央配置 */}
            <div className="flex-1 flex items-center justify-center relative min-h-0">
              <CrystalDisplay />
              <GameBoard />
            </div>
            
            {/* アクションコントロール */}
            <div className="mt-2 sm:mt-4 flex-shrink-0">
              <ActionControls />
            </div>
          </div>
          
          {/* キャラクターパネル - デスクトップのみ */}
          <div className="hidden lg:block lg:w-80 xl:w-96 p-4 flex-shrink-0">
            <CharacterPanel />
          </div>
        </div>
      </main>
      
      {/* フッター - スマホ対戦中は非表示 */}
      {!isMobileBattle && (
        <footer className="bg-white border-t border-blue-100 flex-shrink-0">
          <div className="container mx-auto px-4 py-3">
            <p className="text-center text-xs sm:text-sm text-blue-600">ボードdeモンスターズ &copy; 2025</p>
          </div>
        </footer>
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