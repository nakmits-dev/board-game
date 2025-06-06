import React, { useState, useRef, useEffect } from 'react';
import { MonsterType, MasterCard, Position } from '../types/gameTypes';
import { monsterData, masterData, generateTeamWithCost8 } from '../data/cardData';
import { skillData } from '../data/skillData';
import { Shield, Sword, Sparkle, Heart, Crown, Gitlab as GitLab, Play, X, Filter, Star, Shuffle, ArrowLeft, Trash2 } from 'lucide-react';
import CharacterCard from './CharacterCard';

interface DeckBuilderProps {
  onStartGame: (
    playerDeck: { master: keyof typeof masterData; monsters: MonsterType[] },
    enemyDeck: { master: keyof typeof masterData; monsters: MonsterType[] }
  ) => void;
  onClose: (
    playerDeck?: { master: keyof typeof masterData; monsters: MonsterType[] },
    enemyDeck?: { master: keyof typeof masterData; monsters: MonsterType[] }
  ) => void;
  initialPlayerDeck?: { master: keyof typeof masterData; monsters: MonsterType[] };
  initialEnemyDeck?: { master: keyof typeof masterData; monsters: MonsterType[] };
}

interface PositionAssignment {
  position: Position;
  type: 'master' | 'monster';
  id?: string;
}

const DeckBuilder: React.FC<DeckBuilderProps> = ({ 
  onStartGame, 
  onClose, 
  initialPlayerDeck, 
  initialEnemyDeck 
}) => {
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [costFilter, setCostFilter] = useState<number | null>(null);
  const cardSelectionRef = useRef<HTMLDivElement>(null);
  
  // 空の初期状態を作成する関数
  const createEmptyAssignments = (isPlayer: boolean = true): PositionAssignment[] => {
    return isPlayer 
      ? [
          { position: { x: 0, y: 3 }, type: 'monster' },
          { position: { x: 1, y: 3 }, type: 'master' },
          { position: { x: 2, y: 3 }, type: 'monster' },
          { position: { x: 1, y: 2 }, type: 'monster' },
        ]
      : [
          { position: { x: 0, y: 0 }, type: 'monster' },
          { position: { x: 1, y: 0 }, type: 'master' },
          { position: { x: 2, y: 0 }, type: 'monster' },
          { position: { x: 1, y: 1 }, type: 'monster' },
        ];
  };

  // 既存の編成から初期状態を作成する関数
  const createAssignmentsFromDeck = (
    deck: { master: keyof typeof masterData; monsters: MonsterType[] },
    isPlayer: boolean = true
  ): PositionAssignment[] => {
    const positions = createEmptyAssignments(isPlayer);

    return positions.map((pos, index) => {
      if (pos.type === 'master') {
        return { ...pos, id: deck.master };
      } else {
        const monsterIndex = isPlayer 
          ? [0, 2, 1][positions.filter((p, i) => p.type === 'monster' && i < index).length]
          : [0, 2, 1][positions.filter((p, i) => p.type === 'monster' && i < index).length];
        return { ...pos, id: deck.monsters[monsterIndex] };
      }
    });
  };

  // 初期状態を設定
  const getInitialState = () => {
    if (initialPlayerDeck && initialEnemyDeck) {
      // 既存の編成がある場合はそれを使用
      return {
        player: createAssignmentsFromDeck(initialPlayerDeck, true),
        enemy: createAssignmentsFromDeck(initialEnemyDeck, false)
      };
    } else {
      // 新規の場合はオールクリア状態
      return {
        player: createEmptyAssignments(true),
        enemy: createEmptyAssignments(false)
      };
    }
  };

  const initialState = getInitialState();
  const [playerAssignments, setPlayerAssignments] = useState<PositionAssignment[]>(initialState.player);
  const [enemyAssignments, setEnemyAssignments] = useState<PositionAssignment[]>(initialState.enemy);
  
  const getTotalCost = (assignments: PositionAssignment[]) => {
    return assignments.reduce((total, assignment) => {
      if (!assignment.id) return total;
      if (assignment.type === 'master') {
        return total + masterData[assignment.id as keyof typeof masterData].cost;
      } else {
        return total + monsterData[assignment.id as MonsterType].cost;
      }
    }, 0);
  };

  const getAssignmentAt = (position: Position, assignments: PositionAssignment[]) => {
    return assignments.find(a => a.position.x === position.x && a.position.y === position.y);
  };

  const getTeamForPosition = (position: Position): 'player' | 'enemy' => {
    return position.y >= 2 ? 'player' : 'enemy';
  };

  const getAssignmentsForPosition = (position: Position) => {
    return getTeamForPosition(position) === 'player' ? playerAssignments : enemyAssignments;
  };

  const setAssignmentsForPosition = (position: Position, assignments: PositionAssignment[]) => {
    if (getTeamForPosition(position) === 'player') {
      setPlayerAssignments(assignments);
    } else {
      setEnemyAssignments(assignments);
    }
  };

  const canAssign = (id: string, type: 'master' | 'monster') => {
    if (!selectedPosition) return false;
    
    const assignments = getAssignmentsForPosition(selectedPosition);
    const assignment = getAssignmentAt(selectedPosition, assignments);
    if (!assignment || assignment.type !== type) return false;
    
    // 選択中のチーム内で既に同じカードが配置されているかチェック
    const alreadyAssigned = assignments.some(a => a.id === id);
    if (alreadyAssigned) return false;
    
    // コスト計算
    const currentCost = getTotalCost(assignments);
    const cardCost = type === 'master' 
      ? masterData[id as keyof typeof masterData].cost 
      : monsterData[id as MonsterType].cost;
    
    // 既に配置されているカードがある場合、そのコストを引く
    if (assignment.id) {
      const existingCost = type === 'master'
        ? masterData[assignment.id as keyof typeof masterData].cost
        : monsterData[assignment.id as MonsterType].cost;
      return currentCost - existingCost + cardCost <= 8;
    }
    
    return currentCost + cardCost <= 8;
  };

  const assignCard = (id: string, type: 'master' | 'monster') => {
    if (!canAssign(id, type) || !selectedPosition) return;
    
    const assignments = getAssignmentsForPosition(selectedPosition);
    const newAssignments = assignments.map(assignment => {
      if (assignment.position.x === selectedPosition.x && assignment.position.y === selectedPosition.y) {
        return { ...assignment, id };
      }
      return assignment;
    });
    
    setAssignmentsForPosition(selectedPosition, newAssignments);
    setSelectedPosition(null);
  };

  const clearCard = (position: Position) => {
    const assignments = getAssignmentsForPosition(position);
    const newAssignments = assignments.map(assignment => {
      if (assignment.position.x === position.x && assignment.position.y === position.y) {
        const { id, ...rest } = assignment;
        return rest;
      }
      return assignment;
    });
    
    setAssignmentsForPosition(position, newAssignments);
  };

  const canStartGame = () => {
    // 両チームにマスターが配置されているかチェック
    const playerMaster = playerAssignments.find(a => a.type === 'master')?.id;
    const enemyMaster = enemyAssignments.find(a => a.type === 'master')?.id;
    
    if (!playerMaster || !enemyMaster) return false;
    
    // コストが8以下かチェック
    const playerCost = getTotalCost(playerAssignments);
    const enemyCost = getTotalCost(enemyAssignments);
    
    return playerCost <= 8 && enemyCost <= 8;
  };

  const handleComplete = () => {
    if (!canStartGame()) return;
    
    const playerMaster = playerAssignments.find(a => a.type === 'master')?.id as keyof typeof masterData;
    const enemyMaster = enemyAssignments.find(a => a.type === 'master')?.id as keyof typeof masterData;
    
    const playerMonsters = playerAssignments
      .filter(a => a.type === 'monster' && a.id)
      .map(a => a.id as MonsterType);
    
    const enemyMonsters = enemyAssignments
      .filter(a => a.type === 'monster' && a.id)
      .map(a => a.id as MonsterType);
    
    // 編成内容を保存して戻る
    onClose(
      { master: playerMaster, monsters: playerMonsters },
      { master: enemyMaster, monsters: enemyMonsters }
    );
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

  // ランダム選択機能（モンスター3体、合計コスト8）
  const handleRandomSelection = () => {
    const playerTeam = generateTeamWithCost8();
    const enemyTeam = generateTeamWithCost8();
    
    // プレイヤーチーム設定
    setPlayerAssignments([
      { position: { x: 0, y: 3 }, type: 'monster', id: playerTeam.monsters[0] },
      { position: { x: 1, y: 3 }, type: 'master', id: playerTeam.master },
      { position: { x: 2, y: 3 }, type: 'monster', id: playerTeam.monsters[1] },
      { position: { x: 1, y: 2 }, type: 'monster', id: playerTeam.monsters[2] },
    ]);
    
    // 敵チーム設定
    setEnemyAssignments([
      { position: { x: 0, y: 0 }, type: 'monster', id: enemyTeam.monsters[0] },
      { position: { x: 1, y: 0 }, type: 'master', id: enemyTeam.master },
      { position: { x: 2, y: 0 }, type: 'monster', id: enemyTeam.monsters[1] },
      { position: { x: 1, y: 1 }, type: 'monster', id: enemyTeam.monsters[2] },
    ]);
  };

  // オールクリア機能
  const handleClearAll = () => {
    setPlayerAssignments(createEmptyAssignments(true));
    setEnemyAssignments(createEmptyAssignments(false));
    setSelectedPosition(null);
  };

  const baseMonsters = getBaseMonsters();

  const renderBoardCell = (position: Position) => {
    const isPlayerTeam = getTeamForPosition(position) === 'player';
    const assignments = getAssignmentsForPosition(position);
    const assignment = getAssignmentAt(position, assignments);
    const isSelected = selectedPosition?.x === position.x && selectedPosition?.y === position.y;
    
    if (!assignment) return null;
    
    const hasCard = !!assignment.id;
    const cardData = hasCard 
      ? assignment.type === 'master' 
        ? masterData[assignment.id as keyof typeof masterData]
        : monsterData[assignment.id as MonsterType]
      : null;

    let cellClassName = "w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center relative border transition-all duration-200";
    
    if (hasCard) {
      cellClassName += isPlayerTeam 
        ? " border-blue-100" 
        : " border-red-100";
    } else {
      cellClassName += " border-slate-100";
    }

    // 選択状態の枠色を統一（青チームも赤チームも黄色）
    if (isSelected) {
      cellClassName += " ring-2 ring-yellow-300 bg-yellow-50/30";
    }

    if (!hasCard) {
      // 選択可能なマスを青と赤で分ける
      if (isPlayerTeam) {
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
        {hasCard && cardData ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={`relative w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden ${
              isPlayerTeam
                ? 'ring-1 ring-blue-400 shadow-md shadow-blue-400/30' 
                : 'ring-1 ring-red-400 shadow-md shadow-red-400/30'
            }`}>
              <img 
                src={cardData.image} 
                alt={cardData.name} 
                className="w-full h-full object-cover"
                draggable={false}
              />
              <div className={`absolute inset-0 ${
                isPlayerTeam ? 'bg-blue-500' : 'bg-red-500'
              } bg-opacity-10`}></div>
              
              {/* Stats overlay */}
              <div className="absolute bottom-0 inset-x-0 flex justify-center gap-0.5 p-0.5">
                {cardData.attack >= 2 && (
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-500/80 rounded flex items-center justify-center">
                    <Sword size={8} className="text-white sm:w-[10px] sm:h-[10px]" />
                  </div>
                )}
                {cardData.defense >= 1 && (
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-500/80 rounded flex items-center justify-center">
                    <Shield size={8} className="text-white sm:w-[10px] sm:h-[10px]" />
                  </div>
                )}
                {cardData.actions >= 2 && (
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-yellow-500/80 rounded flex items-center justify-center">
                    <Sparkle size={8} className="text-white sm:w-[10px] sm:h-[10px]" />
                  </div>
                )}
              </div>
            </div>
            
            {/* HP表示 */}
            <div className="flex gap-0.5 mt-1">
              {Array.from({ length: cardData.hp }, (_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 sm:w-3 sm:h-3 flex items-center justify-center ${
                    isPlayerTeam
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
              assignment.type === 'master' 
                ? 'bg-amber-100 text-amber-600' 
                : 'bg-slate-100 text-slate-600'
            }`}>
              {assignment.type === 'master' ? <Crown size={12} className="sm:w-4 sm:h-4" /> : <GitLab size={12} className="sm:w-4 sm:h-4" />}
            </div>
            <span className="text-xs text-gray-500 hidden sm:block">
              {assignment.type === 'master' ? 'マスター' : 'モンスター'}
            </span>
          </div>
        )}
      </div>
    );
  };

  const createCharacterForCard = (type: 'master' | 'monster', id: string, data: any) => {
    const skill = data.skillId ? skillData[data.skillId] : undefined;
    
    return {
      id: id,
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

  const selectedAssignment = selectedPosition ? getAssignmentAt(selectedPosition, getAssignmentsForPosition(selectedPosition)) : null;
  const selectedTeam = selectedPosition ? getTeamForPosition(selectedPosition) : null;

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

  // フィルタ変更時にスクロール位置を保持
  const handleFilterChange = (newFilter: number | null) => {
    const currentScrollTop = cardSelectionRef.current?.scrollTop || 0;
    setCostFilter(newFilter);
    
    // フィルタ変更後にスクロール位置を復元
    setTimeout(() => {
      if (cardSelectionRef.current) {
        cardSelectionRef.current.scrollTop = currentScrollTop;
      }
    }, 0);
  };

  // カード選択エリアの高さを動的に計算
  const getCardSelectionHeight = () => {
    if (!selectedPosition || !selectedAssignment) return 'auto';
    
    const filteredCards = selectedAssignment.type === 'master' 
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
            <div className="w-20"></div> {/* スペーサー */}
          </div>
          
          {/* Cost Display - 1行にまとめる */}
          <div className="flex justify-center items-center gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div className="bg-blue-100 rounded-lg px-3 sm:px-4 py-2">
              <span className="text-sm font-bold text-blue-800">
                青チーム: {getTotalCost(playerAssignments)}/8
              </span>
              <div className="flex items-center gap-1 mt-1">
                {Array(8).fill('').map((_, i) => (
                  <Star 
                    key={i} 
                    size={10} 
                    className={`sm:w-3 sm:h-3 ${i < getTotalCost(playerAssignments) ? 'text-blue-500' : 'text-gray-300'}`} 
                    fill={i < getTotalCost(playerAssignments) ? 'currentColor' : 'none'}
                  />
                ))}
              </div>
            </div>
            
            <div className="bg-red-100 rounded-lg px-3 sm:px-4 py-2">
              <span className="text-sm font-bold text-red-800">
                赤チーム: {getTotalCost(enemyAssignments)}/8
              </span>
              <div className="flex items-center gap-1 mt-1">
                {Array(8).fill('').map((_, i) => (
                  <Star 
                    key={i} 
                    size={10} 
                    className={`sm:w-3 sm:h-3 ${i < getTotalCost(enemyAssignments) ? 'text-red-500' : 'text-gray-300'}`} 
                    fill={i < getTotalCost(enemyAssignments) ? 'currentColor' : 'none'}
                  />
                ))}
              </div>
            </div>
          </div>
          
          {/* ボタン配置 */}
          <div className="flex justify-center gap-4">
            <button
              onClick={handleClearAll}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg shadow-lg transform transition hover:scale-105 flex items-center gap-2"
            >
              <Trash2 size={16} className="sm:w-5 sm:h-5" />
              オールクリア
            </button>
            
            <button
              onClick={handleRandomSelection}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-lg transform transition hover:scale-105 flex items-center gap-2"
            >
              <Shuffle size={16} className="sm:w-5 sm:h-5" />
              ランダム選択
            </button>
            
            <button
              onClick={handleComplete}
              disabled={!canStartGame()}
              className={`px-4 sm:px-6 py-2 sm:py-3 font-bold rounded-lg shadow-lg transform transition flex items-center gap-2 ${
                canStartGame()
                  ? 'bg-green-600 hover:bg-green-700 text-white hover:scale-105'
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }`}
            >
              <Play size={16} className="sm:w-5 sm:h-5" />
              完了
            </button>
          </div>
        </div>

        {/* Board Layout */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 text-center">ボード編成</h2>
          <div className="flex justify-center">
            <div className="bg-white rounded-xl p-2 sm:p-4 border border-blue-100">
              <div className="grid grid-rows-4 gap-1">
                {/* Enemy area */}
                <div className="grid grid-cols-3 gap-1">
                  {[0, 1, 2].map(x => 
                    renderBoardCell({ x, y: 0 })
                  )}
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <div className="w-16 h-16 sm:w-20 sm:h-20"></div>
                  {renderBoardCell({ x: 1, y: 1 })}
                  <div className="w-16 h-16 sm:w-20 sm:h-20"></div>
                </div>
                
                {/* Player area */}
                <div className="grid grid-cols-3 gap-1">
                  <div className="w-16 h-16 sm:w-20 sm:h-20"></div>
                  {renderBoardCell({ x: 1, y: 2 })}
                  <div className="w-16 h-16 sm:w-20 sm:h-20"></div>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[0, 1, 2].map(x => 
                    renderBoardCell({ x, y: 3 })
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {selectedPosition && (
            <div className="mt-4 text-center">
              <p className={`font-medium text-sm sm:text-base ${selectedTeam === 'player' ? 'text-blue-600' : 'text-red-600'}`}>
                {selectedTeam === 'player' ? '青' : '赤'}チーム - {selectedAssignment?.type === 'master' ? 'マスター' : 'モンスター'}を選択してください
              </p>
              {selectedAssignment?.id && (
                <button
                  onClick={() => clearCard(selectedPosition)}
                  className="mt-2 px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
                >
                  クリア
                </button>
              )}
            </div>
          )}
        </div>

        {/* Card Selection */}
        {selectedPosition && selectedAssignment && (
          <div 
            className="bg-white rounded-xl shadow-lg p-4 sm:p-6"
            style={{ minHeight: getCardSelectionHeight() }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 sm:mb-0">
                {selectedAssignment.type === 'master' ? 'マスター' : 'モンスター'}選択
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
                  {getAvailableCosts(selectedAssignment.type).map(cost => (
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
            
            <div 
              ref={cardSelectionRef}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {selectedAssignment.type === 'master' 
                ? getFilteredCards('master').map(([id, data]) => {
                    const character = createCharacterForCard('master', id, data);
                    const canSelect = canAssign(id, 'master');
                    
                    return (
                      <div
                        key={id}
                        className={`relative transition-all duration-200 cursor-pointer ${
                          canSelect
                            ? 'opacity-100'
                            : 'opacity-50 cursor-not-allowed'
                        }`}
                        onClick={() => canSelect ? assignCard(id, 'master') : undefined}
                      >
                        <CharacterCard
                          character={character}
                          currentTeam="player"
                          playerCrystals={0}
                          enemyCrystals={0}
                          variant="panel"
                        />
                      </div>
                    );
                  })
                : getFilteredCards('monster').map(monster => {
                    const data = monsterData[monster];
                    const character = createCharacterForCard('monster', monster, data);
                    const canSelect = canAssign(monster, 'monster');
                    
                    return (
                      <div
                        key={monster}
                        className={`relative transition-all duration-200 cursor-pointer ${
                          canSelect
                            ? 'opacity-100'
                            : 'opacity-50 cursor-not-allowed'
                        }`}
                        onClick={() => canSelect ? assignCard(monster, 'monster') : undefined}
                      >
                        <CharacterCard
                          character={character}
                          currentTeam="player"
                          playerCrystals={0}
                          enemyCrystals={0}
                          variant="panel"
                        />
                      </div>
                    );
                  })
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeckBuilder;