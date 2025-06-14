import React from 'react';
import { useGame } from '../context/GameContext';
import { Position } from '../types/gameTypes';
import BoardCell from './BoardCell';

const GameBoard: React.FC = () => {
  const { state } = useGame();
  
  // 🔧 座標ベースでボードを管理
  const BOARD_WIDTH = 3;
  const BOARD_HEIGHT = 4;
  
  // 座標配列を生成
  const boardPositions: Position[] = [];
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      boardPositions.push({ x, y });
    }
  }
  
  return (
    <div className="bg-white rounded-xl shadow-lg p-4 border border-blue-100">
      <div className="grid grid-rows-4 gap-1">
        {/* 各行を座標で管理 */}
        {Array.from({ length: BOARD_HEIGHT }, (_, y) => (
          <div key={`row-${y}`} className="grid grid-cols-3 gap-1">
            {Array.from({ length: BOARD_WIDTH }, (_, x) => {
              const position: Position = { x, y };
              return (
                <BoardCell
                  key={`cell-${x}-${y}`}
                  position={position}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GameBoard;