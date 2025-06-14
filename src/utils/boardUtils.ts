import { Position, Character, BoardState, BoardCell, Team } from '../types/gameTypes';

// 🔧 ボード定数
export const BOARD_WIDTH = 3;
export const BOARD_HEIGHT = 4;

// 🔧 座標ベースのユーティリティ関数
export const isValidPosition = (position: Position): boolean => {
  return position.x >= 0 && position.x < BOARD_WIDTH && 
         position.y >= 0 && position.y < BOARD_HEIGHT;
};

export const arePositionsEqual = (pos1: Position, pos2: Position): boolean => {
  return pos1.x === pos2.x && pos1.y === pos2.y;
};

export const getDistance = (pos1: Position, pos2: Position): number => {
  const dx = Math.abs(pos1.x - pos2.x);
  const dy = Math.abs(pos1.y - pos2.y);
  return Math.max(dx, dy); // チェビシェフ距離（8方向移動）
};

export const getAdjacentPositions = (position: Position): Position[] => {
  const adjacent: Position[] = [];
  
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue; // 自分自身は除外
      
      const newPos: Position = {
        x: position.x + dx,
        y: position.y + dy
      };
      
      if (isValidPosition(newPos)) {
        adjacent.push(newPos);
      }
    }
  }
  
  return adjacent;
};

// 🔧 ボード状態管理
export const createEmptyBoard = (): BoardState => {
  const cells: BoardCell[][] = [];
  
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    const row: BoardCell[] = [];
    for (let x = 0; x < BOARD_WIDTH; x++) {
      row.push({
        position: { x, y },
        character: undefined,
        isValidPlacement: false,
        team: undefined
      });
    }
    cells.push(row);
  }
  
  return {
    width: BOARD_WIDTH,
    height: BOARD_HEIGHT,
    cells
  };
};

export const updateBoardWithCharacters = (board: BoardState, characters: Character[]): BoardState => {
  // ボードをリセット
  const newBoard = createEmptyBoard();
  
  // キャラクターを配置
  characters.forEach(character => {
    const { x, y } = character.position;
    if (isValidPosition(character.position)) {
      newBoard.cells[y][x] = {
        position: character.position,
        character,
        isValidPlacement: true,
        team: character.team
      };
    }
  });
  
  return newBoard;
};

export const getCharacterAt = (board: BoardState, position: Position): Character | undefined => {
  if (!isValidPosition(position)) return undefined;
  return board.cells[position.y][position.x].character;
};

export const getCellAt = (board: BoardState, position: Position): BoardCell | undefined => {
  if (!isValidPosition(position)) return undefined;
  return board.cells[position.y][position.x];
};

// 🔧 配置可能位置の定義
export const PLACEMENT_POSITIONS = {
  player: {
    master: { x: 1, y: 3 },
    monsters: [
      { x: 0, y: 3 }, // モンスター1（左）
      { x: 2, y: 3 }, // モンスター2（右）  
      { x: 1, y: 2 }  // モンスター3（前）
    ]
  },
  enemy: {
    master: { x: 1, y: 0 },
    monsters: [
      { x: 0, y: 0 }, // モンスター1（左）
      { x: 2, y: 0 }, // モンスター2（右）
      { x: 1, y: 1 }  // モンスター3（前）
    ]
  }
} as const;

export const isValidPlacementPosition = (position: Position): boolean => {
  const allValidPositions = [
    PLACEMENT_POSITIONS.player.master,
    ...PLACEMENT_POSITIONS.player.monsters,
    PLACEMENT_POSITIONS.enemy.master,
    ...PLACEMENT_POSITIONS.enemy.monsters
  ];
  
  return allValidPositions.some(validPos => arePositionsEqual(validPos, position));
};

export const getTeamForPosition = (position: Position): Team | null => {
  // プレイヤーチームの配置位置
  const playerPositions = [
    PLACEMENT_POSITIONS.player.master,
    ...PLACEMENT_POSITIONS.player.monsters
  ];
  
  // 敵チームの配置位置
  const enemyPositions = [
    PLACEMENT_POSITIONS.enemy.master,
    ...PLACEMENT_POSITIONS.enemy.monsters
  ];
  
  if (playerPositions.some(pos => arePositionsEqual(pos, position))) {
    return 'player';
  }
  
  if (enemyPositions.some(pos => arePositionsEqual(pos, position))) {
    return 'enemy';
  }
  
  return null;
};

// 🔧 全座標を取得する関数
export const getAllBoardPositions = (): Position[] => {
  const positions: Position[] = [];
  
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      positions.push({ x, y });
    }
  }
  
  return positions;
};

// 🔧 行ごとの座標を取得する関数
export const getRowPositions = (row: number): Position[] => {
  const positions: Position[] = [];
  
  for (let x = 0; x < BOARD_WIDTH; x++) {
    positions.push({ x, y: row });
  }
  
  return positions;
};

// 🔧 列ごとの座標を取得する関数
export const getColumnPositions = (column: number): Position[] => {
  const positions: Position[] = [];
  
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    positions.push({ x: column, y });
  }
  
  return positions;
};