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
  const [isLongPress, setIsLongPress] = React.useState(false);
  const [longPressTimer, setLongPressTimer] = React.useState<NodeJS.Timeout | null>(null);
  
  const character = getCharacterAt(position);
  const isSelected = selectedCharacter?.id === character?.id;
  const isActionable = gamePhase === 'action' && character?.team === currentTeam && character.remainingActions > 0;
  const canMoveTo = selectedCharacter && gamePhase === 'action' && !character && isValidMove(position) && selectedAction !== 'skill';
  const canAttack = selectedCharacter && gamePhase === 'action' && character && isValidAttack(character.id) && selectedAction !== 'skill';
  const canUseSkill = selectedCharacter && gamePhase === 'action' && character && selectedAction === 'skill' && isValidSkillTarget(character.id);

  // スマホかどうかを判定
  const isMobile = window.innerWidth < 1024;

  // タッチイベントハンドラー（スマホ専用）
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile || !character || !isActionable || selectedAction === 'skill') return;
    
    const touch = e.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    setIsLongPress(false);
    
    // 長押し検出タイマー
    const timer = setTimeout(() => {
      setIsLongPress(true);
      setIsDragging(true);
      dispatch({ type: 'SELECT_CHARACTER', character });
      
      // 触覚フィードバック
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      // ドラッグ開始の視覚的フィードバック
      const element = e.currentTarget as HTMLElement;
      element.classList.add('dragging-feedback');
    }, 500); // 500ms長押しでドラッグ開始
    
    setLongPressTimer(timer);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile || !isLongPress || !touchStartPos) return;
    
    e.preventDefault(); // スクロールを防止
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPos.x);
    const deltaY = Math.abs(touch.clientY - touchStartPos.y);
    
    // 一定距離移動したらドラッグとして認識
    if (deltaX > 10 || deltaY > 10) {
      // ドラッグ中の処理
      const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
      const cellBelow = elementBelow?.closest('[data-board-cell]');
      
      // 全てのセルのハイライトをクリア
      document.querySelectorAll('[data-board-cell]').forEach(cell => {
        cell.classList.remove('drag-hover');
      });
      
      // ドロップ可能なセルをハイライト
      if (cellBelow) {
        cellBelow.classList.add('drag-hover');
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isMobile) return;
    
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    // ドラッグ中の視覚的フィードバックをクリア
    const element = e.currentTarget as HTMLElement;
    element.classList.remove('dragging-feedback');
    
    // 全てのセルのハイライトをクリア
    document.querySelectorAll('[data-board-cell]').forEach(cell => {
      cell.classList.remove('drag-hover');
    });
    
    if (isLongPress && touchStartPos) {
      // ドラッグ終了処理
      const touch = e.changedTouches[0];
      const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
      const cellBelow = elementBelow?.closest('[data-board-cell]');
      
      if (cellBelow) {
        const posX = parseInt(cellBelow.getAttribute('data-x') || '0');
        const posY = parseInt(cellBelow.getAttribute('data-y') || '0');
        const targetPosition = { x: posX, y: posY };
        const targetCharacter = getCharacterAt(targetPosition);
        
        if (!targetCharacter && isValidMove(targetPosition)) {
          // 移動
          dispatch({
            type: 'SET_PENDING_ACTION',
            action: { type: 'move', position: targetPosition }
          });
          dispatch({ type: 'CONFIRM_ACTION' });
        } else if (targetCharacter && isValidAttack(targetCharacter.id)) {
          // 攻撃
          dispatch({
            type: 'SET_PENDING_ACTION',
            action: { type: 'attack', targetId: targetCharacter.id }
          });
          dispatch({ type: 'CONFIRM_ACTION' });
        }
      }
    } else if (!isLongPress) {
      // 短いタップの場合は通常のクリック処理
      handleClick();
    }
    
    setTouchStartPos(null);
    setIsLongPress(false);
    setIsDragging(false);
  };

  // PCドラッグイベントハンドラー（PC専用）
  const handleDragStart = (e: React.DragEvent) => {
    if (isMobile) return; // スマホでは無効
    
    if (character && character.team === currentTeam && character.remainingActions > 0) {
      e.dataTransfer.setData('text/plain', character.id);
      e.dataTransfer.effectAllowed = 'move';
      setIsDragging(true);
      dispatch({ type: 'SELECT_CHARACTER', character });
    }
  };

  const handleDragEnd = () => {
    if (isMobile) return; // スマホでは無効
    setIsDragging(false);
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (isMobile) return; // スマホでは無効
    
    e.preventDefault();
    if (!selectedCharacter || selectedAction === 'skill' || isDragging) return;
    
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

  // ドラッグ可能な条件（PC専用）
  const isDraggablePC = !isMobile && isActionable && selectedAction !== 'skill';
  
  if (isDraggablePC) {
    cellClassName += " cursor-grab active:cursor-grabbing";
    if (isDragging) {
      cellClassName += " opacity-50";
    }
  }

  return (
    <>
      <div 
        className={`${cellClassName} ${animationTarget?.id === character?.id && animationTarget?.type ? `character-${animationTarget.type}` : ''} ${isActionable ? 'character-actionable' : ''}`}
        onClick={handleClick}
        draggable={isDraggablePC}
        onDragStart={isDraggablePC ? handleDragStart : undefined}
        onDragEnd={isDraggablePC ? handleDragEnd : undefined}
        onDragOver={!isMobile ? handleDragOver : undefined}
        onDragLeave={!isMobile ? handleDragLeave : undefined}
        onDrop={!isMobile ? handleDrop : undefined}
        onTouchStart={isMobile ? handleTouchStart : undefined}
        onTouchMove={isMobile ? handleTouchMove : undefined}
        onTouchEnd={isMobile ? handleTouchEnd : undefined}
        data-board-cell="true"
        data-x={position.x}
        data-y={position.y}
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