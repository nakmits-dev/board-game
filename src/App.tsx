import React, { useState } from 'react';
import { GameProvider } from './context/GameContext';
import GameBoard from './components/GameBoard';
import CharacterPanel from './components/CharacterPanel';
import ActionControls from './components/ActionControls';
import TurnOrder from './components/TurnOrder';
import CrystalDisplay from './components/CrystalDisplay';
import DeckBuilder from './components/DeckBuilder';
import { useGame } from './context/GameContext';
import { MonsterType } from './types/gameTypes';
import { masterData } from './data/cardData';

const GameContent = () => {
  const { state, dispatch } = useGame();
  const { gamePhase } = state;
  const [showDeckBuilder, setShowDeckBuilder] = useState(false);

  const handleStartGame = (
    playerDeck?: { master: keyof typeof masterData; monsters: MonsterType[] },
    enemyDeck?: { master: keyof typeof masterData; monsters: MonsterType[] }
  ) => {
    if (gamePhase === 'result') {
      dispatch({ type: 'RESET_GAME' });
    }
    dispatch({ type: 'START_GAME', playerDeck, enemyDeck });
    setShowDeckBuilder(false);
  };

  const handleShowDeckBuilder = () => {
    setShowDeckBuilder(true);
  };

  const handleCloseDeckBuilder = () => {
    setShowDeckBuilder(false);
  };

  if (showDeckBuilder) {
    return <DeckBuilder onStartGame={handleStartGame} onClose={handleCloseDeckBuilder} />;
  }

  return (
    <div className="min-h-screen bg-blue-50 text-gray-900">
      <header className="bg-white shadow-lg border-b border-blue-100">
        <div className="container mx-auto px-4 py-3">
          <h1 className="text-2xl font-bold text-center text-blue-900">ボードdeモンスターズ</h1>
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
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg transform transition hover:scale-105"
                  onClick={() => handleStartGame()}
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
      
      <footer className="mt-8 py-6 bg-white border-t border-blue-100">
        <p className="text-center text-sm text-blue-600">ボードdeモンスターズ &copy; 2025</p>
      </footer>
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