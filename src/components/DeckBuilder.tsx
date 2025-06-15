import React, { useState, useRef, useEffect } from 'react';
import { MonsterType, MasterCard, Position, BoardCell, BoardState, Character } from '../types/gameTypes';
import { monsterData, masterData, generateTeamWithCost8 } from '../data/cardData';
import { 
  PLACEMENT_POSITIONS, 
  createEmptyBoard, 
  updateBoardWithCharacters,
  arePositionsEqual,
  isValidPlacementPosition,
  getTeamForPosition,
  BOARD_WIDTH,
  BOARD_HEIGHT
} from '../utils/boardUtils';
import { skillData } from '../data/skillData';
import { Shield, Sword, Sparkle, Heart, Crown, Gitlab as GitLab, Play, X, Filter, Star, Shuffle, ArrowLeft, Trash2, Eye, EyeOff, HelpCircle } from 'lucide-react';
import CharacterCard from './CharacterCard';

interface DeckBuilderProps {
  onStartGame: (
    hostBoard: BoardCell[][],
    guestBoard: BoardCell[][]
  ) => void;
  onClose: (
    hostBoard?: BoardCell[][],
    guestBoard?: BoardCell[][]
  ) => void;
  initialHostBoard?: BoardCell[][];
  initialGuestBoard?: BoardCell[][];
}

const DeckBuilder: React.FC<DeckBuilderProps> = ({ 
  onStartGame, 
  onClose, 
  initialHostBoard, 
  initialGuestBoard 
}) => {
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [costFilter, setCostFilter] = useState<number | null>(null);
  const [secretMode, setSecretMode] = useState(false);
  const cardSelectionRef = useRef<HTMLDivElement>(null);
  
  // 🔧 完全なボードベース管理
  const [playerBoard, setPlayerBoard] = useState<BoardCell[][]>(() => {
    if (initialHostBoard) return initialHostBoard;
    return createEmptyBoard().cells;
  });
  
  const [enemyBoard, setEnemyBoard] = useState<BoardCell[][]>(() => {
    if (initialGuestBoard) return initialGuestBoard;
    return createEmptyBoard().cells;
  });

  // プロップスが変更された場合に状態を更新
  useEffect(() => {
    if (initialHostBoard) setPlayerBoard(initialHostBoard);
    if (initialGuestBoard) setEnemyBoard(initialGuestBoard);
  }, [initialHostBoard, initialGuestBoard]);
  
  // 🔧 ボードベースのコスト計算
  const getBoardTotalCost = (board: BoardCell[][]): number => {
    let totalCost = 0;
    
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        const cell = board[y][x];
        if (cell.character) {
          totalCost += cell.character.cost;
        }
      }
    }
    
    return totalCost;
  };

  // 🔧 ボードベースのキャラクター取得
  const getCharacterAtPosition = (board: BoardCell[][], position: Position): Character | undefined => {
    if (position.y < 0 || position.y >= BOARD_HEIGHT || position.x < 0 || position.x >= BOARD_WIDTH) {
      return undefined;
    }
    return board[position.y][position.x].character;
  };

  // 🔧 ボードベースのキャラクター配置
  const placeCharacterOnBoard = (
    board: BoardCell[][], 
    position: Position, 
    character: Character | undefined
  ): BoardCell[][] => {
    const newBoard = board.map(row => [...row]);
    
    if (position.y >= 0 && position.y < BOARD_HEIGHT && position.x >= 0 && position.x < BOARD_WIDTH) {
      newBoard[position.y][position.x] = {
        ...newBoard[position.y][position.x],
        character,
        isValidPlacement: isValidPlacementPosition(position),
        team: character?.team || getTeamForPosition(position) || undefined,
        cellType: character ? character.type : 'empty'
      };
    }
    
    return newBoard;
  };

  // 🔧 同チーム内での重複チェック（カードの種類で判定）
  const isCardAlreadyPlaced = (board: BoardCell[][], cardId: string, type: 'master' | 'monster'): boolean => {
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        const cell = board[y][x];
        if (cell.character) {
          if (type === 'master') {
            // マスターの場合は masterType で判定
            if (cell.character.type === 'master' && 
                'masterType' in cell.character && 
                cell.character.masterType === masterData[cardId as keyof typeof masterData].type) {
              return true;
            }
          } else {
            // モンスターの場合は monsterType で判定
            if (cell.character.type === 'monster' && 
                'monsterType' in cell.character && 
                cell.character.monsterType === cardId) {
              return true;
            }
          }
        }
      }
    }
    return false;
  };

  // 🔧 ボードベースの配置可能判定
  const canPlaceCharacter = (id: string, type: 'master' | 'monster'): boolean => {
    if (!selectedPosition) return false;
    
    const team = getTeamForPosition(selectedPosition);
    if (!team) return false;
    
    const board = team === 'player' ? playerBoard : enemyBoard;
    
    // 🔧 同チーム内で既に同じカードが配置されているかチェック
    const alreadyPlaced = isCardAlreadyPlaced(board, id, type);
    if (alreadyPlaced) return false;
    
    // コスト計算
    const currentCost = getBoardTotalCost(board);
    const cardCost = type === 'master' 
      ? masterData[id as keyof typeof masterData].cost 
      : monsterData[id as MonsterType].cost;
    
    // 既に配置されているキャラクターがある場合、そのコストを引く
    const existingCharacter = getCharacterAtPosition(board, selectedPosition);
    if (existingCharacter) {
      return currentCost - existingCharacter.cost + cardCost <= 8;
    }
    
    return currentCost + cardCost <= 8;
  };

  // 🔧 ボードベースのキャラクター配置実行
  const placeCharacter = (id: string, type: 'master' | 'monster') => {
    if (!canPlaceCharacter(id, type) || !selectedPosition) return;
    
    const team = getTeamForPosition(selectedPosition);
    if (!team) return;
    
    // キャラクター作成
    const cardData = type === 'master' ? masterData[id as keyof typeof masterData] : monsterData[id as MonsterType];
    const character = createCharacterForCard(type, id, cardData);
    character.position = selectedPosition;
    character.team = team;
    
    if (team === 'player') {
      setPlayerBoard(placeCharacterOnBoard(playerBoard, selectedPosition, character));
    } else {
      setEnemyBoard(placeCharacterOnBoard(enemyBoard, selectedPosition, character));
    }
    
    setSelectedPosition(null);
  };

  // 🔧 ボードベースのキャラクター削除
  const removeCharacter = (position: Position) => {
    const team = getTeamForPosition(position);
    if (!team) return;
    
    if (team === 'player') {
      setPlayerBoard(placeCharacterOnBoard(playerBoard, position, undefined));
    } else {
      setEnemyBoard(placeCharacterOnBoard(enemyBoard, position, undefined));
    }
  };

  // 🔧 ボードベースの完了判定
  const canStartGame = (): boolean => {
    // 両チームにマスターが配置されているかチェック
    const playerMaster = getCharacterAtPosition(playerBoard, PLACEMENT_POSITIONS.player.master);
    const enemyMaster = getCharacterAtPosition(enemyBoard, PLACEMENT_POSITIONS.enemy.master);
    
    return !!(playerMaster?.type === 'master' && enemyMaster?.type === 'master');
  };

  // 🔧 ボードベースの編成完了処理
  const handleComplete = () => {
    if (!canStartGame()) return;
    
    // ボード情報をそのまま渡す
    onClose(playerBoard, enemyBoard);
  };

  // 🔧 ボードベースのランダム選択
  const handleRandomSelection = () => {
    const playerTeam = generateTeamWithCost8();
    const enemyTeam = generateTeamWithCost8();
    
    // 新しいボードを作成
    let newPlayerBoard = createEmptyBoard().cells;
    let newEnemyBoard = createEmptyBoard().cells;
    
    // プレイヤーマスター配置
    const playerMasterChar = createCharacterForCard('master', playerTeam.master, masterData[playerTeam.master]);
    playerMasterChar.position = PLACEMENT_POSITIONS.player.master;
    playerMasterChar.team = 'player';
    newPlayerBoard = placeCharacterOnBoard(newPlayerBoard, PLACEMENT_POSITIONS.player.master, playerMasterChar);
    
    // プレイヤーモンスター配置
    playerTeam.monsters.forEach((monster, index) => {
      if (index < PLACEMENT_POSITIONS.player.monsters.length) {
        const monsterChar = createCharacterForCard('monster', monster, monsterData[monster]);
        monsterChar.position = PLACEMENT_POSITIONS.player.monsters[index];
        monsterChar.team = 'player';
        newPlayerBoard = placeCharacterOnBoard(newPlayerBoard, PLACEMENT_POSITIONS.player.monsters[index], monsterChar);
      }
    });
    
    // 敵マスター配置
    const enemyMasterChar = createCharacterForCard('master', enemyTeam.master, masterData[enemyTeam.master]);
    enemyMasterChar.position = PLACEMENT_POSITIONS.enemy.master;
    enemyMasterChar.team = 'enemy';
    newEnemyBoard = placeCharacterOnBoard(newEnemyBoard, PLACEMENT_POSITIONS.enemy.master, enemyMasterChar);
    
    // 敵モンスター配置
    enemyTeam.monsters.forEach((monster, index) => {
      if (index < PLACEMENT_POSITIONS.enemy.monsters.length) {
        const monsterChar = createCharacterForCard('monster', monster, monsterData[monster]);
        monsterChar.position = PLACEMENT_POSITIONS.enemy.monsters[index];
        monsterChar.team = 'enemy';
        newEnemyBoard = placeCharacterOnBoard(newEnemyBoard, PLACEMENT_POSITIONS.enemy.monsters[index], monsterChar);
      }
    });
    
    setPlayerBoard(newPlayerBoard);
    setEnemyBoard(newEnemyBoard);
  };

  // 🔧 ボードベースのオールクリア
  const handleClearAll = () => {
    setPlayerBoard(createEmptyBoard().cells);
    setEnemyBoard(createEmptyBoard().cells);
    setSelectedPosition(null);
  };

  // 進化前のモンスターのみを取得する関数
  const getBaseMonsters = (): MonsterType[] => {
    const evolutionTargets = new Set(
      Object.values(monsterData)
        .map(monster => monster.evolution)
        .filter(evolution => evolution !== undefined)
    );
    
    return Object.keys(monsterData).filter(key => 
      !evolutionTargets.has(key as MonsterType)
    ) as MonsterType[];
  };

  const baseMonsters = getBaseMonsters();

  // 🔧 ボードベースのセル描画
  const renderBoardCell = (position: Position) => {
    // 配置可能な座標でない場合は空のセルを返す
    if (!isValidPlacementPosition(position)) {
      return (
        <div 
          key={`empty-${position.x}-${position.y}`}
          className="w-16 h-16 sm:w-20 sm:h-20"
        />
      );
    }

    const team = getTeamForPosition(position);
    if (!team) return null;
    
    const board = team === 'player' ? playerBoard : enemyBoard;
    const character = getCharacterAtPosition(board, position);
    const isSelected = selectedPosition && arePositionsEqual(selectedPosition, position);
    
    const hasCharacter = !!character;
    
    // シークレットモードの場合、全てのマスを隠す
    const shouldHideCharacter = secretMode && hasCharacter;

    let cellClassName = "w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center relative border transition-all duration-200";
    
    if (hasCharacter) {
      cellClassName += team === 'player' 
        ? " border-blue-100" 
        : " border-red-100";
    } else {
      cellClassName += " border-slate-100";
    }

    // 選択状態の枠色を統一（青チームも赤チームも黄色）
    if (isSelected) {
      cellClassName += " ring-2 ring-yellow-300 bg-yellow-50/30";
    }

    if (!hasCharacter) {
      // 選択可能なマスを青と赤で分ける
      if (team === 'player') {
        cellClassName += " ring-1 ring-blue-400/50 bg-blue-400/10 cursor-pointer hover:bg-blue-400/20";
      } else {
        cellClassName += " ring-1 ring-red-400/50 bg-red-400/10 cursor-pointer hover:bg-red-400/20";
      }
    } else {
      cellClassName += " cursor-pointer hover:bg-blue-50/30";
    }

    return (
      <div
        key={`${position.x}-${position.y}`}
        className={cellClassName}
        onClick={() => setSelectedPosition(position)}
      >
        {shouldHideCharacter ? (
          // シークレットモード時は全てのマスを？マークで隠す
          <div className="text-center">
            <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden ${
              team === 'player'
                ? 'ring-1 ring-blue-400 shadow-md shadow-blue-400/30'
                : 'ring-1 ring-red-400 shadow-md shadow-red-400/30'
            } bg-gray-800 flex items-center justify-center`}>
              <HelpCircle size={24} className={`${team === 'player' ? 'text-blue-400' : 'text-red-400'} sm:w-8 sm:h-8`} />
              <div className={`absolute inset-0 ${team === 'player' ? 'bg-blue-500' : 'bg-red-500'} bg-opacity-10`}></div>
            </div>
          </div>
        ) : hasCharacter && character ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={`relative w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden ${
              team === 'player'
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
                team === 'player' ? 'bg-blue-500' : 'bg-red-500'
              } bg-opacity-10`}></div>
              
              {/* Stats overlay */}
              <div className="absolute bottom-0 inset-x-0 flex justify-center gap-0.5 p-0.5">
                {character.attack >= 2 && (
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-500/80 rounded flex items-center justify-center">
                    <Sword size={8} className="text-white sm:w-[10px] sm:h-[10px]" />
                  </div>
                )}
                {character.defense >= 1 && (
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-500/80 rounded flex items-center justify-center">
                    <Shield size={8} className="text-white sm:w-[10px] sm:h-[10px]" />
                  </div>
                )}
                {character.actions >= 2 && (
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-yellow-500/80 rounded flex items-center justify-center">
                    <Sparkle size={8} className="text-white sm:w-[10px] sm:h-[10px]" />
                  </div>
                )}
              </div>
            </div>
            
            {/* HP表示 */}
            <div className="flex gap-0.5 mt-1">
              {Array.from({ length: character.hp }, (_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 sm:w-3 sm:h-3 flex items-center justify-center ${
                    team === 'player'
                      ? 'text-blue-500/90'
                      : 'text-red-500/90'
                  }`}
                >
                  <Heart size={8} fill="currentColor" className="sm:w-[12px] sm:h-[12px]" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center mb-1 ${
              // 配置位置によってアイコンを決定
              arePositionsEqual(position, PLACEMENT_POSITIONS.player.master) || arePositionsEqual(position, PLACEMENT_POSITIONS.enemy.master)
                ? 'bg-amber-100 text-amber-600' 
                : 'bg-slate-100 text-slate-600'
            }`}>
              {arePositionsEqual(position, PLACEMENT_POSITIONS.player.master) || arePositionsEqual(position, PLACEMENT_POSITIONS.enemy.master) 
                ? <Crown size={12} className="sm:w-4 sm:h-4" /> 
                : <GitLab size={12} className="sm:w-4 sm:h-4" />}
            </div>
            <span className="text-xs text-gray-500 hidden sm:block">
              {arePositionsEqual(position, PLACEMENT_POSITIONS.player.master) || arePositionsEqual(position, PLACEMENT_POSITIONS.enemy.master) 
                ? 'マスター' 
                : 'モンスター'}
            </span>
          </div>
        )}
      </div>
    );
  };

  // 🔧 座標ベースのボード描画（3x4グリッド）
  const renderBoard = () => {
    return (
      <div className="grid grid-rows-4 gap-1">
        {/* 各行を座標で管理 */}
        {Array.from({ length: BOARD_HEIGHT }, (_, y) => (
          <div key={`row-${y}`} className="grid grid-cols-3 gap-1">
            {Array.from({ length: BOARD_WIDTH }, (_, x) => {
              const position: Position = { x, y };
              return renderBoardCell(position);
            })}
          </div>
        ))}
      </div>
    );
  };

  const createCharacterForCard = (type: 'master' | 'monster', id: string, data: any) => {
    const skill = data.skillId ? skillData[data.skillId] : undefined;
    
    return {
      id: `${type}-${id}-${Date.now()}-${Math.random()}`,
      name: data.name,
      type: type,
      team: 'player' as const,
      position: { x: 0, y: 0 },
      hp: data.hp,
      maxHp: data.hp,
      attack: data.attack,
      defense: data.defense,
      actions: data.actions,
      remainingActions: 0,
      skillId: data.skillId,
      image: data.image,
      cost: data.cost,
      ...(type === 'monster' && {
        monsterType: id as MonsterType,
        canEvolve: !!data.evolution,
        isEvolved: false
      }),
      ...(type === 'master' && {
        masterType: data.type
      })
    };
  };

  const selectedTeam = selectedPosition ? getTeamForPosition(selectedPosition) : null;
  const selectedBoard = selectedTeam === 'player' ? playerBoard : enemyBoard;
  const selectedCharacter = selectedPosition ? getCharacterAtPosition(selectedBoard, selectedPosition) : null;

  // フィルタリング関数
  const getFilteredCards = (type: 'master' | 'monster') => {
    if (type === 'master') {
      return Object.entries(masterData).filter(([id, data]) => 
        costFilter === null || data.cost === costFilter
      );
    } else {
      return baseMonsters.filter(monster => 
        costFilter === null || monsterData[monster].cost === costFilter
      );
    }
  };

  // 利用可能なコストを取得
  const getAvailableCosts = (type: 'master' | 'monster') => {
    if (type === 'master') {
      return [...new Set(Object.values(masterData).map(data => data.cost))].sort();
    } else {
      return [...new Set(baseMonsters.map(monster => monsterData[monster].cost))].sort();
    }
  };

  // 🔧 フィルタ変更時にリセット（毎回リセット）
  const handleFilterChange = (newFilter: number | null) => {
    setCostFilter(newFilter);
    
    // スクロール位置をトップにリセット
    if (cardSelectionRef.current) {
      cardSelectionRef.current.scrollTop = 0;
    }
  };

  // 🔧 ポジション選択時にフィルターをリセット
  useEffect(() => {
    if (selectedPosition) {
      setCostFilter(null);
      if (cardSelectionRef.current) {
        cardSelectionRef.current.scrollTop = 0;
      }
    }
  }, [selectedPosition]);

  // カード選択エリアの高さを動的に計算
  const getCardSelectionHeight = () => {
    if (!selectedPosition) return 'auto';
    
    const selectedCellType = arePositionsEqual(selectedPosition, PLACEMENT_POSITIONS.player.master) || 
                            arePositionsEqual(selectedPosition, PLACEMENT_POSITIONS.enemy.master) 
                            ? 'master' : 'monster';
    
    const filteredCards = selectedCellType === 'master' 
      ? getFilteredCards('master')
      : getFilteredCards('monster');
    
    const cardsPerRow = window.innerWidth >= 1024 ? 3 : window.innerWidth >= 640 ? 2 : 1;
    const rows = Math.ceil(filteredCards.length / cardsPerRow);
    const cardHeight = 400; // CharacterCardの高さ
    const gap = 16; // gap-4
    const totalHeight = rows * cardHeight + (rows - 1) * gap;
    const padding = 48; // p-6の上下パディング
    
    return `${Math.min(totalHeight + padding, window.innerHeight * 0.6)}px`;
  };

  return (
    <div className="min-h-screen bg-blue-50 p-2 sm:p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => onClose()}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
              戻る
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-blue-900">チーム編成</h1>
            <div className="flex items-center gap-2">
              {/* シークレットモード切り替えボタン */}
              <button
                onClick={() => setSecretMode(!secretMode)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  secretMode 
                    ? 'bg-purple-600 text-white hover:bg-purple-700' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                title={secretMode ? 'シークレットモードON' : 'シークレットモードOFF'}
              >
                {secretMode ? <EyeOff size={16} /> : <Eye size={16} />}
                <span className="hidden sm:inline text-sm">
                  {secretMode ? 'シークレット' : '通常'}
                </span>
              </button>
            </div>
          </div>
          
          {/* シークレットモードの説明 */}
          {secretMode && (
            <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center gap-2 text-purple-800">
                <EyeOff size={16} />
                <span className="text-sm font-medium">
                  シークレットモード: お互いの編成が？マークで隠されます
                </span>
              </div>
            </div>
          )}
          
          {/* Cost Display - 1行にまとめる */}
          <div className="flex justify-center items-center gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div className="bg-blue-100 rounded-lg px-3 sm:px-4 py-2">
              <span className="text-sm font-bold text-blue-800">
                青チーム: {getBoardTotalCost(playerBoard)}/8
              </span>
              <div className="flex items-center gap-1 mt-1">
                {Array(8).fill('').map((_, i) => (
                  <Star 
                    key={i} 
                    size={10} 
                    className={`sm:w-3 sm:h-3 ${i < getBoardTotalCost(playerBoard) ? 'text-blue-500' : 'text-gray-300'}`} 
                    fill={i < getBoardTotalCost(playerBoard) ? 'currentColor' : 'none'}
                  />
                ))}
              </div>
            </div>
            
            <div className="bg-red-100 rounded-lg px-3 sm:px-4 py-2">
              <span className="text-sm font-bold text-red-800">
                赤チーム: {getBoardTotalCost(enemyBoard)}/8
              </span>
              <div className="flex items-center gap-1 mt-1">
                {Array(8).fill('').map((_, i) => (
                  <Star 
                    key={i} 
                    size={10} 
                    className={`sm:w-3 sm:h-3 ${i < getBoardTotalCost(enemyBoard) ? 'text-red-500' : 'text-gray-300'}`} 
                    fill={i < getBoardTotalCost(enemyBoard) ? 'currentColor' : 'none'}
                  />
                ))}
              </div>
            </div>
          </div>
          
          {/* ボタン配置 */}
          <div className="flex justify-center gap-2">
            <button
              onClick={handleClearAll}
              className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg shadow transform transition hover:scale-105 flex items-center gap-1.5 text-sm"
            >
              <Trash2 size={14} />
              クリア
            </button>
            
            <button
              onClick={handleRandomSelection}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg shadow transform transition hover:scale-105 flex items-center gap-1.5 text-sm"
            >
              <Shuffle size={14} />
              ランダム
            </button>
            
            <button
              onClick={handleComplete}
              disabled={!canStartGame()}
              className={`px-3 py-2 font-medium rounded-lg shadow transform transition flex items-center gap-1.5 text-sm ${
                canStartGame()
                  ? 'bg-green-600 hover:bg-green-700 text-white hover:scale-105'
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }`}
            >
              <Play size={14} />
              完了
            </button>
          </div>
        </div>

        {/* Board Layout */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 text-center">ボード編成</h2>
          <div className="flex justify-center">
            <div className="bg-white rounded-xl p-2 sm:p-4 border border-blue-100">
              {renderBoard()}
            </div>
          </div>
          
          {selectedPosition && (
            <div className="mt-4 text-center">
              <p className={`font-medium text-sm sm:text-base ${selectedTeam === 'player' ? 'text-blue-600' : 'text-red-600'}`}>
                {selectedTeam === 'player' ? '青' : '赤'}チーム - {
                  arePositionsEqual(selectedPosition, PLACEMENT_POSITIONS.player.master) || 
                  arePositionsEqual(selectedPosition, PLACEMENT_POSITIONS.enemy.master) 
                    ? 'マスター' : 'モンスター'
                }を選択してください
              </p>
              {selectedCharacter && (
                <button
                  onClick={() => removeCharacter(selectedPosition)}
                  className="mt-2 px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
                >
                  クリア
                </button>
              )}
            </div>
          )}
        </div>

        {/* Card Selection */}
        {selectedPosition && (
          <div 
            className="bg-white rounded-xl shadow-lg p-4 sm:p-6"
            style={{ minHeight: getCardSelectionHeight() }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 sm:mb-0">
                {arePositionsEqual(selectedPosition, PLACEMENT_POSITIONS.player.master) || 
                 arePositionsEqual(selectedPosition, PLACEMENT_POSITIONS.enemy.master) 
                  ? 'マスター' : 'モンスター'}選択
                <span className={`ml-2 text-sm ${selectedTeam === 'player' ? 'text-blue-600' : 'text-red-600'}`}>
                  ({selectedTeam === 'player' ? '青' : '赤'}チーム)
                </span>
              </h2>
              
              {/* コストフィルタ */}
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-gray-600" />
                <span className="text-sm text-gray-600">コスト:</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleFilterChange(null)}
                    className={`px-2 py-1 text-xs rounded ${
                      costFilter === null 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    全て
                  </button>
                  {getAvailableCosts(
                    arePositionsEqual(selectedPosition, PLACEMENT_POSITIONS.player.master) || 
                    arePositionsEqual(selectedPosition, PLACEMENT_POSITIONS.enemy.master) 
                      ? 'master' : 'monster'
                  ).map(cost => (
                    <button
                      key={cost}
                      onClick={() => handleFilterChange(cost)}
                      className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${
                        costFilter === cost 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {Array(cost).fill('').map((_, i) => (
                        <Star key={i} size={8} className="text-yellow-500" fill="currentColor" />
                      ))}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-center">
              <div 
                ref={cardSelectionRef}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl"
              >
                {(arePositionsEqual(selectedPosition, PLACEMENT_POSITIONS.player.master) || 
                  arePositionsEqual(selectedPosition, PLACEMENT_POSITIONS.enemy.master))
                  ? getFilteredCards('master').map(([id, data]) => {
                      const character = createCharacterForCard('master', id, data);
                      const canSelect = canPlaceCharacter(id, 'master');
                      
                      return (
                        <div
                          key={id}
                          className={`relative transition-all duration-200 cursor-pointer ${
                            canSelect
                              ? 'opacity-100'
                              : 'opacity-50 cursor-not-allowed'
                          }`}
                          onClick={() => canSelect ? placeCharacter(id, 'master') : undefined}
                        >
                          <CharacterCard
                            character={character}
                            currentTeam="player"
                            hostCrystals={0}
                            guestCrystals={0}
                            variant="panel"
                          />
                          {!canSelect && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl">
                              <span className="text-white font-bold text-sm bg-red-600 px-3 py-1 rounded-lg">
                                配置済み
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  : getFilteredCards('monster').map(monster => {
                      const data = monsterData[monster];
                      const character = createCharacterForCard('monster', monster, data);
                      const canSelect = canPlaceCharacter(monster, 'monster');
                      
                      return (
                        <div
                          key={monster}
                          className={`relative transition-all duration-200 cursor-pointer ${
                            canSelect
                              ? 'opacity-100'
                              : 'opacity-50 cursor-not-allowed'
                          }`}
                          onClick={() => canSelect ? placeCharacter(monster, 'monster') : undefined}
                        >
                          <CharacterCard
                            character={character}
                            currentTeam="player"
                            hostCrystals={0}
                            guestCrystals={0}
                            variant="panel"
                          />
                          {!canSelect && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl">
                              <span className="text-white font-bold text-sm bg-red-600 px-3 py-1 rounded-lg">
                                配置済み
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })
                }
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeckBuilder;