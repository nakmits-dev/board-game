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
  const { selectedCharacter, currentTeam, gamePhase, animationTarget, selectedAction, selectedSkill, playerCrystals, enemyCrystals } = state;
  const [showModal, setShowModal] = React.useState(false);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [lastTap, setLastTap] = React.useState(0);
  
  const character = getCharacterAt(position);
  const isSelected = selectedCharacter?.id === character?.id;
  const isActionable = gamePhase === 'action' && character?.team === currentTeam && character.remainingActions > 0;
  const canMoveTo = selectedCharacter && gamePhase === 'action' && !character && isValidMove(position) && selectedAction !== 'skill';
  const canAttack = selectedCharacter && gamePhase === 'action' && character && isValidAttack(character.id) && selectedAction !== 'skill';
  const canUseSkill = selectedCharacter && gamePhase === 'action' && character && selectedAction === 'skill' && isValidSkillTarget(character.id);

  // スマホかどうかを判定
  const isMobile = window.innerWidth < 1024;

  // PCドラッグイベントハンドラー（PC専用）
  const handleDragStart = (e: React.DragEvent) => {
    if (isMobile) return; // スマホでは無効
    
    if (character && character.team === currentTeam && character.remainingActions > 0) {
      e.dataTransfer.setData('text/plain', character.id);
      e.dataTransfer.effectAllowed = 'move';
      dispatch({ type: 'SELECT_CHARACTER', character });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (isMobile) return; // スマホでは無効
    
    e.preventDefault();
    if (!selectedCharacter || selectedAction === 'skill') return;
    
    const isValidTarget = (!character && isValidMove(position)) || (character && isValidAttack(character.id));
    if (isValidTarget) {
      e.dataTransfer.dropEffect = 'move';
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (isMobile) return; // スマホでは無効
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (isMobile) return; // スマホでは無効
    
    e.preventDefault();
    setIsDragOver(false);
    
    if (selectedAction === 'skill') return;
    
    const draggedCharacterId = e.dataTransfer.getData('text/plain');
    if (!draggedCharacterId || !selectedCharacter) return;

    if (!character && isValidMove(position)) {
      dispatch({
        type: 'SET_PENDING_ACTION',
        action: { type: 'move', position }
      });
      dispatch({ type: 'CONFIRM_ACTION' });
    } else if (character && isValidAttack(character.id)) {
      dispatch({
        type: 'SET_PENDING_ACTION',
        action: { type: 'attack', targetId: character.id }
      });
      dispatch({ type: 'CONFIRM_ACTION' });
    }
  };

  // ダブルタップ検出（スマホ専用）
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isMobile || !character) return;
    
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    
    if (tapLength < 500 && tapLength > 0) {
      // ダブルタップ検出
      e.preventDefault();
      setShowModal(true);
      // 触覚フィードバック
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
    
    setLastTap(currentTime);
  };

  const handleClick = () => {
    if (character) {
      if (selectedCharacter && selectedAction === 'attack' && isValidAttack(character.id)) {
        dispatch({
          type: 'SET_PENDING_ACTION',
          action: { type: 'attack', targetId: character.id }
        });
        dispatch({ type: 'CONFIRM_ACTION' });
      } else if (selectedCharacter && selectedAction === 'skill' && isValidSkillTarget(character.id)) {
        dispatch({ type: 'USE_SKILL', targetId: character.id });
      } else {
        dispatch({ type: 'SELECT_CHARACTER', character });
      }
    } else if (selectedCharacter && canMoveTo) {
      dispatch({
        type: 'SET_PENDING_ACTION',
        action: { type: 'move', position }
      });
      dispatch({ type: 'CONFIRM_ACTION' });
    } else if (!character && !canMoveTo && !canAttack && !canUseSkill) {
      dispatch({ type: 'SELECT_CHARACTER', character: null });
    }
  };

  let cellClassName = "w-20 h-20 flex items-center justify-center relative border transition-all duration-200";
  
  if (character) {
    cellClassName += character.team === 'player' 
      ? " border-blue-100" 
      : " border-red-100";
  } else {
    cellClassName += " border-slate-100";
  }

  if (gamePhase === 'action' && selectedCharacter) {
    if (isSelected) {
      cellClassName += " ring-2 ring-yellow-300 bg-yellow-50/30";
    }
    
    if (selectedCharacter.team === currentTeam && selectedCharacter.remainingActions > 0) {
      if (selectedAction === 'skill') {
        if (canUseSkill) {
          cellClassName += " ring-1 ring-purple-400/50 bg-purple-400/10 cursor-pointer hover:bg-purple-400/20";
          if (isDragOver) {
            cellClassName += " ring-2 ring-purple-500 bg-purple-400/30 scale-105 shadow-lg";
          }
        }
      } else {
        if (canMoveTo) {
          cellClassName += " ring-1 ring-green-400/50 bg-green-400/10 cursor-pointer hover:bg-green-400/20";
          if (isDragOver) {
            cellClassName += " ring-2 ring-green-500 bg-green-400/30 scale-105 shadow-lg";
          }
        }
        if (canAttack) {
          cellClassName += " ring-1 ring-red-400/50 bg-red-400/10 cursor-pointer hover:bg-red-400/20";
          if (isDragOver) {
            cellClassName += " ring-2 ring-red-500 bg-red-400/30 scale-105 shadow-lg";
          }
        }
      }
    }
  }

  // ドラッグ可能な条件（PC専用）
  const isDraggablePC = !isMobile && isActionable && selectedAction !== 'skill';
  
  if (isDraggablePC) {
    cellClassName += " cursor-grab active:cursor-grabbing";
  }

  return (
    <>
      <div 
        className={`${cellClassName} ${animationTarget?.id === character?.id && animationTarget?.type ? `character-${animationTarget.type}` : ''} ${isActionable ? 'character-actionable' : ''}`}
        onClick={handleClick}
        onTouchEnd={isMobile ? handleTouchEnd : undefined}
        draggable={isDraggablePC}
        onDragStart={isDraggablePC ? handleDragStart : undefined}
        onDragOver={!isMobile ? handleDragOver : undefined}
        onDragLeave={!isMobile ? handleDragLeave : undefined}
        onDrop={!isMobile ? handleDrop : undefined}
      >
        {character && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {/* 赤チームの場合は体力を上に表示 */}
            {character.team === 'enemy' && (
              <div className="flex gap-0.5 mb-1">
                {Array.from({ length: character.maxHp }, (_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 flex items-center justify-center transform rotate-180 ${
                      i < character.hp 
                        ? 'text-red-500/90'
                        : 'text-gray-300/50'
                    }`}
                  >
                    <Heart size={12} fill="currentColor" />
                  </div>
                ))}
              </div>
            )}

            <div className={`relative w-16 h-16 rounded-lg overflow-hidden ${
              character.team === 'player' 
                ? 'ring-1 ring-blue-400 shadow-md shadow-blue-400/30' 
                : 'ring-1 ring-red-400 shadow-md shadow-red-400/30'
            }`}>
              <img 
                src={character.image} 
                alt={character.name} 
                className={`w-full h-full object-cover ${
                  character.team === 'enemy' ? 'transform rotate-180' : ''
                }`}
                draggable={false}
              />
              <div className={`absolute inset-0 ${
                character.team === 'player' ? 'bg-blue-500' : 'bg-red-500'
              } bg-opacity-10`}></div>
              
              {/* ステータスアイコン - 赤チームは上に、青チームは下に */}
              <div className={`absolute ${
                character.team === 'enemy' ? 'top-0' : 'bottom-0'
              } inset-x-0 flex justify-center gap-0.5 p-0.5`}>
                {character.attack >= 2 && (
                  <div className={`w-4 h-4 bg-red-500/80 rounded flex items-center justify-center ${
                    character.team === 'enemy' ? 'transform rotate-180' : ''
                  }`}>
                    <Sword size={10} className="text-white" />
                  </div>
                )}
                {character.defense >= 1 && (
                  <div className={`w-4 h-4 bg-blue-500/80 rounded flex items-center justify-center ${
                    character.team === 'enemy' ? 'transform rotate-180' : ''
                  }`}>
                    <Shield size={10} className="text-white" />
                  </div>
                )}
                {character.actions >= 2 && (
                  <div className={`w-4 h-4 bg-yellow-500/80 rounded flex items-center justify-center ${
                    character.team === 'enemy' ? 'transform rotate-180' : ''
                  }`}>
                    <Sparkle size={10} className="text-white" />
                  </div>
                )}
              </div>
              
              {/* 残り行動回数 - 赤チームは左下、青チームは右上 */}
              {gamePhase === 'action' && character.team === currentTeam && character.remainingActions > 0 && (
                <div className={`absolute ${
                  character.team === 'enemy' ? 'bottom-0 left-0' : 'top-0 right-0'
                } w-5 h-5 bg-green-500/90 rounded flex items-center justify-center text-white text-xs font-bold shadow-sm ${
                  character.team === 'enemy' ? 'transform rotate-180' : ''
                }`}>
                  {character.remainingActions}
                </div>
              )}
            </div>
            
            {/* 青チームの場合は体力を下に表示 */}
            {character.team === 'player' && (
              <div className="flex gap-0.5 mt-1">
                {Array.from({ length: character.maxHp }, (_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 flex items-center justify-center ${
                      i < character.hp 
                        ? 'text-blue-500/90'
                        : 'text-gray-300/50'
                    }`}
                  >
                    <Heart size={12} fill="currentColor" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && character && (
        <CharacterModal
          character={character}
          onClose={() => setShowModal(false)}
          playerCrystals={playerCrystals}
          enemyCrystals={enemyCrystals}
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