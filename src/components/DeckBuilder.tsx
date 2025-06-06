import React, { useState } from 'react';
import { MonsterType, MasterCard, Position } from '../types/gameTypes';
import { monsterData, masterData } from '../data/cardData';
import { skillData } from '../data/skillData';
import { Shield, Sword, Sparkle, Heart, Crown, Gitlab as GitLab, Diamond, Play, X } from 'lucide-react';

interface DeckBuilderProps {
  onStartGame: (
    playerDeck: { master: keyof typeof masterData; monsters: MonsterType[] },
    enemyDeck: { master: keyof typeof masterData; monsters: MonsterType[] }
  ) => void;
}

interface PositionAssignment {
  position: Position;
  type: 'master' | 'monster';
  id?: string;
}

const DeckBuilder: React.FC<DeckBuilderProps> = ({ onStartGame }) => {
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  
  const [playerAssignments, setPlayerAssignments] = useState<PositionAssignment[]>([
    { position: { x: 0, y: 3 }, type: 'monster' },
    { position: { x: 1, y: 3 }, type: 'master' },
    { position: { x: 2, y: 3 }, type: 'monster' },
    { position: { x: 1, y: 2 }, type: 'monster' },
  ]);
  
  const [enemyAssignments, setEnemyAssignments] = useState<PositionAssignment[]>([
    { position: { x: 0, y: 0 }, type: 'monster' },
    { position: { x: 1, y: 0 }, type: 'master' },
    { position: { x: 2, y: 0 }, type: 'monster' },
    { position: { x: 1, y: 1 }, type: 'monster' },
  ]);
  
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
    
    // 同じチーム内で既に同じカードが配置されているかチェック
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

  const removeCard = (position: Position) => {
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

  const handleStartGame = () => {
    if (!canStartGame()) return;
    
    const playerMaster = playerAssignments.find(a => a.type === 'master')?.id as keyof typeof masterData;
    const enemyMaster = enemyAssignments.find(a => a.type === 'master')?.id as keyof typeof masterData;
    
    const playerMonsters = playerAssignments
      .filter(a => a.type === 'monster' && a.id)
      .map(a => a.id as MonsterType);
    
    const enemyMonsters = enemyAssignments
      .filter(a => a.type === 'monster' && a.id)
      .map(a => a.id as MonsterType);
    
    onStartGame(
      { master: playerMaster, monsters: playerMonsters },
      { master: enemyMaster, monsters: enemyMonsters }
    );
  };

  // 進化前のモンスターのみを取得
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

    // 対戦ボードと同じスタイリングを適用
    let cellClassName = "w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center relative border transition-all duration-200";
    
    if (hasCard) {
      cellClassName += isPlayerTeam 
        ? " border-blue-100" 
        : " border-red-100";
    } else {
      cellClassName += " border-slate-100";
    }

    if (isSelected) {
      cellClassName += " ring-2 ring-yellow-300 bg-yellow-50/30";
    }

    if (!hasCard) {
      cellClassName += " ring-1 ring-green-400/50 bg-green-400/10 cursor-pointer hover:bg-green-400/20";
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
              
              {/* Stats overlay - 対戦ボードと同じ */}
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

              {/* バツボタン - タイプマークと重ならないよう上部に配置 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeCard(position);
                }}
                className="absolute -top-1 -left-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg z-10"
              >
                <X size={8} className="sm:w-[10px] sm:h-[10px]" />
              </button>

              {/* タイプマーク - 右上に配置 */}
              <div className={`absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center shadow-lg z-10 ${
                assignment.type === 'master' 
                  ? 'bg-amber-500 text-amber-950' 
                  : 'bg-slate-500 text-slate-200'
              }`}>
                {assignment.type === 'master' ? <Crown size={8} className="sm:w-[10px] sm:h-[10px]" /> : <GitLab size={8} className="sm:w-[10px] sm:h-[10px]" />}
              </div>
            </div>
            
            {/* HP表示 - 対戦ボードと同じ */}
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

  const renderCard = (
    type: 'master' | 'monster',
    id: string,
    data: any,
    canSelect: boolean
  ) => {
    const skill = data.skillId ? skillData[data.skillId] : undefined;
    const playerAssigned = playerAssignments.some(a => a.id === id);
    const enemyAssigned = enemyAssignments.some(a => a.id === id);
    const isAssigned = playerAssigned || enemyAssigned;
    
    return (
      <div
        key={id}
        className={`relative bg-slate-800/95 rounded-xl overflow-hidden shadow-lg border transition-all duration-200 cursor-pointer transform hover:scale-105 ${
          canSelect && !isAssigned
            ? selectedPosition 
              ? 'border-blue-400 ring-2 ring-blue-400/50 hover:border-blue-300' 
              : 'border-slate-600 hover:border-slate-400'
            : 'border-slate-700 opacity-50 cursor-not-allowed'
        }`}
        onClick={() => canSelect && !isAssigned ? assignCard(id, type) : undefined}
      >
        <div className="p-2 sm:p-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`p-1 rounded-full ${
                type === 'master'
                  ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-amber-950'
                  : 'bg-gradient-to-br from-slate-500 to-slate-600 text-slate-200'
              }`}>
                {type === 'master' ? <Crown size={10} className="sm:w-3 sm:h-3" /> : <GitLab size={10} className="sm:w-3 sm:h-3" />}
              </div>
              <span className="text-xs sm:text-sm font-bold text-white">{data.name}</span>
            </div>
            <div className="flex items-center gap-1">
              {Array(data.cost).fill('').map((_, i) => (
                <Diamond key={i} size={8} className="text-yellow-400 sm:w-[10px] sm:h-[10px]" />
              ))}
            </div>
          </div>

          {/* Image */}
          <div className="relative w-full h-16 sm:h-24 mb-2 rounded-lg overflow-hidden border border-slate-600">
            <img 
              src={data.image} 
              alt={data.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Stats */}
          <div className="flex justify-between items-center mb-2">
            <div className="flex gap-1 sm:gap-2">
              <div className="flex items-center gap-1">
                <Heart size={10} className="text-green-400 sm:w-3 sm:h-3" fill="currentColor" />
                <span className="text-xs font-bold text-green-400">{data.hp}</span>
              </div>
              <div className="flex items-center gap-1">
                <Sword size={10} className="text-red-400 sm:w-3 sm:h-3" />
                <span className="text-xs font-bold text-red-400">{data.attack}</span>
              </div>
              <div className="flex items-center gap-1">
                <Shield size={10} className="text-blue-400 sm:w-3 sm:h-3" />
                <span className="text-xs font-bold text-blue-400">{data.defense}</span>
              </div>
              <div className="flex items-center gap-1">
                <Sparkle size={10} className="text-amber-400 sm:w-3 sm:h-3" />
                <span className="text-xs font-bold text-amber-400">{data.actions}</span>
              </div>
            </div>
          </div>

          {/* Skill */}
          {skill && (
            <div className="bg-purple-900/50 rounded p-1 sm:p-2">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-xs font-bold text-purple-200">{skill.name}</span>
                <span className="flex items-center gap-0.5">
                  {Array(skill.crystalCost).fill('').map((_, i) => (
                    <Diamond key={i} size={6} className="text-purple-400 sm:w-2 sm:h-2" />
                  ))}
                </span>
              </div>
              <p className="text-xs text-purple-300 leading-tight">{skill.description}</p>
            </div>
          )}

          {/* Status indicators */}
          {isAssigned && (
            <div className={`absolute top-2 right-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center ${
              playerAssigned ? 'bg-blue-500' : 'bg-red-500'
            }`}>
              <span className="text-white text-xs font-bold">✓</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const selectedAssignment = selectedPosition ? getAssignmentAt(selectedPosition, getAssignmentsForPosition(selectedPosition)) : null;
  const selectedTeam = selectedPosition ? getTeamForPosition(selectedPosition) : null;

  return (
    <div className="min-h-screen bg-blue-50 p-2 sm:p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-center text-blue-900 mb-2">デッキ編成</h1>
          <p className="text-center text-gray-600 mb-4 text-sm sm:text-base">
            コスト8以下になるよう編成してください
          </p>
          
          {/* Cost Display */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div className="bg-blue-100 rounded-lg px-3 sm:px-4 py-2">
              <span className="text-sm font-bold text-blue-800">
                プレイヤー: {getTotalCost(playerAssignments)}/8
              </span>
              <div className="flex items-center gap-1 mt-1">
                {Array(8).fill('').map((_, i) => (
                  <Diamond 
                    key={i} 
                    size={10} 
                    className={`sm:w-3 sm:h-3 ${i < getTotalCost(playerAssignments) ? 'text-blue-500' : 'text-gray-300'}`} 
                  />
                ))}
              </div>
            </div>
            
            <div className="bg-red-100 rounded-lg px-3 sm:px-4 py-2">
              <span className="text-sm font-bold text-red-800">
                敵: {getTotalCost(enemyAssignments)}/8
              </span>
              <div className="flex items-center gap-1 mt-1">
                {Array(8).fill('').map((_, i) => (
                  <Diamond 
                    key={i} 
                    size={10} 
                    className={`sm:w-3 sm:h-3 ${i < getTotalCost(enemyAssignments) ? 'text-red-500' : 'text-gray-300'}`} 
                  />
                ))}
              </div>
            </div>
            
            {canStartGame() && (
              <button
                onClick={handleStartGame}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-lg transform transition hover:scale-105 flex items-center gap-2"
              >
                <Play size={16} className="sm:w-5 sm:h-5" />
                ゲーム開始
              </button>
            )}
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
                {selectedTeam === 'player' ? 'プレイヤー' : '敵'}チーム - {selectedAssignment?.type === 'master' ? 'マスター' : 'モンスター'}を選択してください
              </p>
            </div>
          )}
        </div>

        {/* Card Selection */}
        {selectedPosition && selectedAssignment && (
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">
              {selectedAssignment.type === 'master' ? 'マスター' : 'モンスター'}選択
              <span className={`ml-2 text-sm ${selectedTeam === 'player' ? 'text-blue-600' : 'text-red-600'}`}>
                ({selectedTeam === 'player' ? 'プレイヤー' : '敵'}チーム)
              </span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
              {selectedAssignment.type === 'master' 
                ? Object.entries(masterData).map(([id, data]) => 
                    renderCard('master', id, data, canAssign(id, 'master'))
                  )
                : baseMonsters.map(monster => 
                    renderCard('monster', monster, monsterData[monster], canAssign(monster, 'monster'))
                  )
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeckBuilder;