import React from 'react';
import { useGame } from '../context/GameContext';
import { Diamond } from 'lucide-react';

const CrystalDisplay: React.FC = () => {
  const { state } = useGame();
  const { playerCrystals, enemyCrystals, currentTeam, animationTarget, selectedCharacter, selectedSkill } = state;
  const maxCrystals = 8;

  const skillCost = selectedSkill?.crystalCost || 0;
  const isSkillMode = selectedCharacter && selectedSkill;
  const currentCrystals = currentTeam === 'player' ? playerCrystals : enemyCrystals;

  // 🔧 複数クリスタル取得時の同時アニメーション判定
  const isMultipleCrystalAnimation = (crystalIndex: number, team: 'player' | 'enemy') => {
    if (!animationTarget || animationTarget.type !== 'crystal-gain') return false;
    
    const targetTeam = team === 'player' ? 'player-crystal' : 'enemy-crystal';
    
    // 通常の単一クリスタルアニメーション
    if (animationTarget.id === targetTeam) {
      return crystalIndex === (team === 'player' ? playerCrystals : enemyCrystals) - 1;
    }
    
    // 複数クリスタル取得時の同時アニメーション
    if (animationTarget.id.startsWith(targetTeam + '-')) {
      const costStr = animationTarget.id.split('-')[2];
      const cost = parseInt(costStr);
      const currentTeamCrystals = team === 'player' ? playerCrystals : enemyCrystals;
      
      // 取得したクリスタル分だけアニメーション
      return crystalIndex >= currentTeamCrystals - cost && crystalIndex < currentTeamCrystals;
    }
    
    return false;
  };

  return (
    <>
      {/* プレイヤーのクリスタル（右） */}
      <div className="absolute right-0 bottom-0 flex flex-col-reverse gap-0.5">
        {Array(maxCrystals).fill('').map((_, i) => {
          const isHighlighted = isSkillMode && 
            currentTeam === 'player' && 
            i < playerCrystals && 
            i >= playerCrystals - skillCost;

          const isAnimating = isMultipleCrystalAnimation(i, 'player');

          return (
            <div
              key={`player-crystal-${i}`}
              className={`w-5 h-5 flex items-center justify-center rounded transition-all transform ${
                i < playerCrystals
                  ? currentTeam === 'player'
                    ? 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-md shadow-blue-500/30'
                    : 'bg-gradient-to-br from-blue-300 to-blue-500'
                  : 'bg-slate-700'
              } ${isAnimating ? 'crystal-gain' : ''} ${
                isHighlighted 
                  ? 'animate-[pulse_1s_ease-in-out_infinite] ring-1 ring-yellow-300/50 scale-110 z-10' 
                  : ''
              }`}
            >
              <Diamond 
                size={14} 
                className={`transition-all ${
                  i < playerCrystals 
                    ? isHighlighted 
                      ? 'text-yellow-100 drop-shadow-[0_0_2px_rgba(254,240,138,0.8)]' 
                      : 'text-white' 
                    : 'text-slate-600'
                }`}
                strokeWidth={2.5}
              />
            </div>
          );
        })}
      </div>

      {/* 敵のクリスタル（左） */}
      <div className="absolute left-0 top-0 flex flex-col gap-0.5">
        {Array(maxCrystals).fill('').map((_, i) => {
          const isHighlighted = isSkillMode && 
            currentTeam === 'enemy' && 
            i < enemyCrystals && 
            i >= enemyCrystals - skillCost;

          const isAnimating = isMultipleCrystalAnimation(i, 'enemy');

          return (
            <div
              key={`enemy-crystal-${i}`}
              className={`w-5 h-5 flex items-center justify-center rounded transition-all transform ${
                i < enemyCrystals
                  ? currentTeam === 'enemy'
                    ? 'bg-gradient-to-br from-red-400 to-red-600 shadow-md shadow-red-500/30'
                    : 'bg-gradient-to-br from-red-300 to-red-500'
                  : 'bg-slate-700'
              } ${isAnimating ? 'crystal-gain' : ''} ${
                isHighlighted 
                  ? 'animate-[pulse_1s_ease-in-out_infinite] ring-1 ring-yellow-300/50 scale-110 z-10' 
                  : ''
              }`}
            >
              <Diamond 
                size={14} 
                className={`transition-all ${
                  i < enemyCrystals 
                    ? isHighlighted 
                      ? 'text-yellow-100 drop-shadow-[0_0_2px_rgba(254,240,138,0.8)]' 
                      : 'text-white' 
                    : 'text-slate-600'
                }`}
                strokeWidth={2.5}
              />
            </div>
          );
        })}
      </div>
    </>
  );
};

export default CrystalDisplay;