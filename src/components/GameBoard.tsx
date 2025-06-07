import React from 'react';
import { useGame } from '../context/GameContext';
import { Position } from '../types/gameTypes';
import BoardCell from './BoardCell';

const GameBoard: React.FC = () => {
  const { state, dispatch, isValidMove, getCharacterAt } = useGame();
  const { selectedCharacter, selectedAction } = state;
  
  // Create a 3x4 grid
  const grid: Position[][] = [];
  for (let y = 0; y < 4; y++) {
    const row: Position[] = [];
    for (let x = 0; x < 3; x++) {
      row.push({ x, y });
    }
    grid.push(row);
  }
  
  return (
    <div className="bg-white rounded-xl shadow-lg p-4 border border-blue-100">
      <div className="grid grid-rows-4 gap-1">
        {grid.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} className="grid grid-cols-3 gap-1">
            {row.map((position) => (
              <BoardCell
                key={`cell-${position.x}-${position.y}`}
                position={position}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GameBoard;