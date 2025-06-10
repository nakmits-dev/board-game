import React from 'react';
import { useGame } from '../context/GameContext';
import { Position } from '../types/gameTypes';
import { Sword, Shield, Sparkle, Heart } from 'lucide-react';
import CharacterModal from './CharacterModal';

interface BoardCellProps {
  position: Position;
}

const BoardCell: React.FC<BoardCellProps> = ({ position }) => {
  const { state, dispatch, isValidMove, isValidAttack, isValidSkillTarget, getCharacterAt } = useGame();
  const { selectedCharacter, currentTeam, gamePhase, selectedSkill } = state;
  const [showModal, setShowModal] = React.useState(false);
  const [lastTap, setLastTap] = React.useState(0);
  
  const character = getCharacterAt(position);
  const isSelected = selectedCharacter?.id === character?.id;
  const isActionable = gamePhase === 'action' && character?.team === currentTeam && character.remainingActions > 0;
  
  // スマホかどうかを判定
  const isMobile = window.innerWidth < 1024;

  // ダブルタップ検出（スマホ専用）
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isMobile || !character) return;
    
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    
    if (tapLength < 500 && tapLength > 0) {
      e.preventDefault();
      setShowModal(true);
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
    
    setLastTap(currentTime);
  };

  const handleClick = () => {
    if (character) {
      if (selectedCharacter && selectedSkill) {
        // スキル使用
        if (isValidSkillTarget(selectedCharacter.id, character.id, selectedSkill.id)) {
          dispatch({
            type: 'USE_SKILL',
            casterId: selectedCharacter.id,
            targetId: character.id,
            skillId: selectedSkill.id
          });
        }
      } else if (selectedCharacter && selectedCharacter.id !== character.id) {
        // 攻撃
        if (isValidAttack(selectedCharacter.id, character.id)) {
          dispatch({
            type: 'ATTACK_CHARACTER',
            attackerId: selectedCharacter.id,
            targetId: character.id
          });
        }
      } else {
        // キャラクター選択
        dispatch({ type: 'SELECT_CHARACTER', character });
      }
    } else {
      // 空いているマスの処理
      if (selectedCharacter && !selectedSkill) {
        // 移動可能な場合は移動
        if (isValidMove(selectedCharacter.id, position)) {
          dispatch({
            type: 'MOVE_CHARACTER',
            characterId: selectedCharacter.id,
            position
          });
        } else {
          // 移動できない場合は選択解除
          dispatch({ type: 'SELECT_CHARACTER', character: null });
        }
      } else {
        // 選択解除
        dispatch({ type: 'SELECT_CHARACTER', character: null });
      }
    }
  };

  let cellClassName = "w-20 h-20 flex items-center justify-center relative border transition-all duration-200 cursor-pointer";
  
  if (character) {
    cellClassName += character.team === 'player' 
      ? " border-blue-100" 
      : " border-red-100";
  } else {
    cellClassName += " border-slate-100";
  }

  if (isSelected) {
    cellClassName += " ring-2 ring-yellow-300 bg-yellow-50/30";
  }

  // 有効なアクションのハイライト（移動可能な場合のみ）
  if (selectedCharacter && gamePhase === 'action') {
    if (selectedSkill) {
      if (character && isValidSkillTarget(selectedCharacter.id, character.id, selectedSkill.id)) {
        cellClassName += " ring-1 ring-purple-400/50 bg-purple-400/10 hover:bg-purple-400/20";
      }
    } else {
      // 移動可能な空いているマスのみハイライト
      if (!character && isValidMove(selectedCharacter.id, position)) {
        cellClassName += " ring-1 ring-green-400/50 bg-green-400/10 hover:bg-green-400/20";
      }
      // 攻撃可能なキャラクターのハイライト
      if (character && isValidAttack(selectedCharacter.id, character.id)) {
        cellClassName += " ring-1 ring-red-400/50 bg-red-400/10 hover:bg-red-400/20";
      }
    }
  }

  if (isActionable) {
    cellClassName += " character-actionable";
  }

  return (
    <>
      <div 
        className={cellClassName}
        onClick={handleClick}
        onTouchEnd={isMobile ? handleTouchEnd : undefined}
      >
        {character && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={`relative w-16 h-16 rounded-lg overflow-hidden ${
              character.team === 'player' 
                ? 'ring-1 ring-blue-400 shadow-md shadow-blue-400/30' 
                : 'ring-1 ring-red-400 shadow-md shadow-red-400/30'
            }`}>
              <img 
                src={character.image} 
                alt={character.name} 
                className="w-full h-full object-cover"
                draggable={false}
              />
              <div className={`absolute inset-0 ${
                character.team === 'player' ? 'bg-blue-500' : 'bg-red-500'
              } bg-opacity-10`}></div>
              
              <div className="absolute bottom-0 inset-x-0 flex justify-center gap-0.5 p-0.5">
                {character.attack >= 2 && (
                  <div className="w-4 h-4 bg-red-500/80 rounded flex items-center justify-center">
                    <Sword size={10} className="text-white" />
                  </div>
                )}
                {character.defense >= 1 && (
                  <div className="w-4 h-4 bg-blue-500/80 rounded flex items-center justify-center">
                    <Shield size={10} className="text-white" />
                  </div>
                )}
                {character.actions >= 2 && (
                  <div className="w-4 h-4 bg-yellow-500/80 rounded flex items-center justify-center">
                    <Sparkle size={10} className="text-white" />
                  </div>
                )}
              </div>
              
              {gamePhase === 'action' && character.team === currentTeam && character.remainingActions > 0 && (
                <div className="absolute top-0 right-0 w-5 h-5 bg-green-500/90 rounded flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  {character.remainingActions}
                </div>
              )}
            </div>
            
            <div className="flex gap-0.5 mt-1">
              {Array.from({ length: character.maxHp }, (_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 flex items-center justify-center ${
                    i < character.hp 
                      ? character.team === 'player'
                        ? 'text-blue-500/90'
                        : 'text-red-500/90'
                      : 'text-gray-300/50'
                  }`}
                >
                  <Heart size={12} fill="currentColor" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showModal && character && (
        <CharacterModal
          character={character}
          onClose={() => setShowModal(false)}
          hostCrystals={state.playerCrystals}
          guestCrystals={state.enemyCrystals}
          currentTeam={currentTeam}
          onSkillSelect={(skill) => {
            dispatch({ type: 'SELECT_CHARACTER', character });
            dispatch({ type: 'SELECT_SKILL', skill });
            setShowModal(false);
          }}
        />
      )}
    </>
  );
};

export default BoardCell;