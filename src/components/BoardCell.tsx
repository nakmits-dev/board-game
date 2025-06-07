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
  const [isDragging, setIsDragging] = React.useState(false);
  const [touchStartPos, setTouchStartPos] = React.useState<{ x: number; y: number } | null>(null);
  const [dragStartTime, setDragStartTime] = React.useState<number>(0);
  const character = getCharacterAt(position);
  const isSelected = selectedCharacter?.id === character?.id;
  const isActionable = gamePhase === 'action' && character?.team === currentTeam && character.remainingActions > 0;
  const canMoveTo = selectedCharacter && gamePhase === 'action' && !character && isValidMove(position) && selectedAction !== 'skill';
  const canAttack = selectedCharacter && gamePhase === 'action' && character && isValidAttack(character.id) && selectedAction !== 'skill';
  const canUseSkill = selectedCharacter && gamePhase === 'action' && character && selectedAction === 'skill' && isValidSkillTarget(character.id);

  // スマホかどうかを判定
  const isMobile = window.innerWidth < 1024;

  const handleDragStart = (e: React.DragEvent) => {
    if (character && character.team === currentTeam && character.remainingActions > 0) {
      e.dataTransfer.setData('text/plain', character.id);
      e.dataTransfer.effectAllowed = 'move';
      setIsDragging(true);
      dispatch({ type: 'SELECT_CHARACTER', character });
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!selectedCharacter || selectedAction === 'skill' || isDragging) return;
    
    const isValidTarget = (!character && isValidMove(position)) || (character && isValidAttack(character.id));
    if (isValidTarget) {
      e.dataTransfer.dropEffect = 'move';
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (selectedAction === 'skill' || isDragging) return;
    
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

  // タッチイベントの処理
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!character || character.team !== currentTeam || character.remainingActions <= 0 || selectedAction === 'skill') {
      return;
    }

    const touch = e.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    setDragStartTime(Date.now());
    dispatch({ type: 'SELECT_CHARACTER', character });
    
    // タッチフィードバック
    if (navigator.vibrate) {
      navigator.vibrate(30); // より短い振動
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos || selectedAction === 'skill') return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPos.x);
    const deltaY = Math.abs(touch.clientY - touchStartPos.y);
    const currentTime = Date.now();
    const timeDiff = currentTime - dragStartTime;
    
    // ドラッグ検出時間を300msに延長（3ピクセルまたは300ms経過）
    if ((deltaX > 3 || deltaY > 3) || timeDiff > 300) {
      if (!isDragging) {
        setIsDragging(true);
        // より強い振動フィードバック
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }
      
      e.preventDefault(); // スクロールを防ぐ
      
      // ドラッグ中の視覚的フィードバック
      const element = e.currentTarget as HTMLElement;
      element.style.opacity = '0.8';
      element.style.transform = 'scale(1.05)';
      element.style.zIndex = '1000';
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartPos) return;
    
    const touch = e.changedTouches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPos.x);
    const deltaY = Math.abs(touch.clientY - touchStartPos.y);
    const currentTime = Date.now();
    const timeDiff = currentTime - dragStartTime;
    
    // 元の状態に戻す
    const element = e.currentTarget as HTMLElement;
    element.style.opacity = '';
    element.style.transform = '';
    element.style.zIndex = '';
    
    const wasDragging = isDragging;
    setIsDragging(false);
    setTouchStartPos(null);
    setDragStartTime(0);
    
    // タップ判定時間も300msに延長（短い移動かつ短時間の場合はタップとして処理）
    if ((deltaX <= 3 && deltaY <= 3) && timeDiff < 300) {
      handleClick();
      return;
    }
    
    // ドラッグ操作として処理
    if (wasDragging) {
      // ドロップ先を特定
      const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
      const cellElement = elementBelow?.closest('[data-position]') as HTMLElement;
      
      if (cellElement && selectedCharacter) {
        const positionData = cellElement.getAttribute('data-position');
        if (positionData) {
          const [x, y] = positionData.split(',').map(Number);
          const targetPosition = { x, y };
          const targetCharacter = getCharacterAt(targetPosition);
          
          if (!targetCharacter && isValidMove(targetPosition)) {
            dispatch({
              type: 'SET_PENDING_ACTION',
              action: { type: 'move', position: targetPosition }
            });
            dispatch({ type: 'CONFIRM_ACTION' });
          } else if (targetCharacter && isValidAttack(targetCharacter.id)) {
            dispatch({
              type: 'SET_PENDING_ACTION',
              action: { type: 'attack', targetId: targetCharacter.id }
            });
            dispatch({ type: 'CONFIRM_ACTION' });
          }
        }
      }
    }
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
        if (isMobile) {
          setShowModal(true);
        }
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

  // ドラッグ可能な条件を調整（スマホでも有効）
  const isDraggable = isActionable && selectedAction !== 'skill';
  
  if (isDraggable) {
    cellClassName += " cursor-grab active:cursor-grabbing";
    if (isDragging) {
      cellClassName += " opacity-70 scale-105";
    }
  }

  return (
    <>
      <div 
        className={`${cellClassName} ${animationTarget?.id === character?.id && animationTarget?.type ? `character-${animationTarget.type}` : ''} ${isActionable ? 'character-actionable' : ''}`}
        onClick={handleClick}
        draggable={isDraggable}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        data-position={`${position.x},${position.y}`}
        style={{
          // スマホでのタッチ操作を最適化
          touchAction: isDraggable ? 'none' : 'auto',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none'
        }}
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