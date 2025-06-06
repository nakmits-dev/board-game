import React, { useState } from 'react';
import { MonsterType, MasterCard, Position } from '../types/gameTypes';
import { monsterData, masterData } from '../data/cardData';
import { skillData } from '../data/skillData';
import { Shield, Sword, Sparkle, Heart, Crown, Gitlab as GitLab, Diamond, Play, X, Users, Bot } from 'lucide-react';

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
  const [currentTeam, setCurrentTeam] = useState<'player' | 'enemy'>('player');
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

  const getCurrentAssignments = () => currentTeam === 'player' ? playerAssignments : enemyAssignments;
  const setCurrentAssignments = (assignments: PositionAssignment[]) => {
    if (currentTeam === 'player') {
      setPlayerAssignments(assignments);
    } else {
      setEnemyAssignments(assignments);
    }
  };
  
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

  const canAssign = (id: string, type: 'master' | 'monster') => {
    if (!selectedPosition) return false;
    
    const assignments = getCurrentAssignments();
    const assignment = getAssignmentAt(selectedPosition, assignments);
    if (!assignment || assignment.type !== type) return false;
    
    // 既に同じカードが配置されているかチェック
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
    
    const assignments = getCurrentAssignments();
    const newAssignments = assignments.map(assignment => {
      if (assignment.position.x === selectedPosition.x && assignment.position.y === selectedPosition.y) {
        return { ...assignment, id };
      }
      return assignment;
    });
    
    setCurrentAssignments(newAssignments);
    setSelectedPosition(null);
  };

  const removeCard = (position: Position) => {
    const assignments = getCurrentAssignments();
    const newAssignments = assignments.map(assignment => {
      if (assignment.position.x === position.x && assignment.position.y === position.y) {
        const { id, ...rest } = assignment;
        return rest;
      }
      return assignment;
    });
    
    setCurrentAssignments(newAssignments);
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

  const renderBoardCell = (position: Position, assignments: PositionAssignment[], isCurrentTeam: boolean) => {
    const assignment = getAssignmentAt(position, assignments);
    const isSelected = selectedPosition?.x === position.x && selectedPosition?.y === position.y && isCurrentTeam;
    
    if (!assignment) return null;
    
    const hasCard = !!assignment.id;
    const cardData = hasCard 
      ? assignment.type === 'master' 
        ? masterData[assignment.id as keyof typeof masterData]
        : monsterData[assignment.id as MonsterType]
      : null;

    return (
      <div
        key={`${position.x}-${position.y}`}
        className={`w-20 h-20 border-2 rounded-lg flex items-center justify-center transition-all duration-200 ${
          isCurrentTeam 
            ? 'cursor-pointer' 
            : 'cursor-default opacity-75'
        } ${
          isSelected 
            ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-400/50' 
            : hasCard
            ? isCurrentTeam
              ? 'border-slate-300 bg-white hover:border-slate-400'
              : 'border-slate-300 bg-white'
            : isCurrentTeam
            ? 'border-dashed border-gray-400 bg-gray-50 hover:border-gray-500'
            : 'border-dashed border-gray-300 bg-gray-100'
        }`}
        onClick={() => isCurrentTeam ? setSelectedPosition(position) : undefined}
      >
        {hasCard && cardData ? (
          <div className="relative w-full h-full">
            <img 
              src={cardData.image} 
              alt={cardData.name}
              className="w-full h-full object-cover rounded"
            />
            <div className={`absolute top-0 right-0 w-4 h-4 rounded-full flex items-center justify-center text-xs ${
              assignment.type === 'master' 
                ? 'bg-amber-500 text-amber-950' 
                : 'bg-slate-500 text-white'
            }`}>
              {assignment.type === 'master' ? <Crown size={8} /> : <GitLab size={8} />}
            </div>
            {isCurrentTeam && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeCard(position);
                }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center"
              >
                <X size={8} />
              </button>
            )}
          </div>
        ) : (
          <div className="text-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
              assignment.type === 'master' 
                ? 'bg-amber-100 text-amber-600' 
                : 'bg-slate-100 text-slate-600'
            }`}>
              {assignment.type === 'master' ? <Crown size={16} /> : <GitLab size={16} />}
            </div>
            <span className="text-xs text-gray-500">
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
    const assignments = getCurrentAssignments();
    const isAssigned = assignments.some(a => a.id === id);
    
    return (
      <div
        key={id}
        className={`relative bg-slate-800/95 rounded-xl overflow-hidden shadow-lg border transition-all duration-200 cursor-pointer transform hover:scale-105 ${
          canSelect && !isAssigned
            ? 'border-slate-600 hover:border-slate-400' 
            : 'border-slate-700 opacity-50 cursor-not-allowed'
        }`}
        onClick={() => canSelect && !isAssigned ? assignCard(id, type) : undefined}
      >
        <div className="p-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`p-1 rounded-full ${
                type === 'master'
                  ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-amber-950'
                  : 'bg-gradient-to-br from-slate-500 to-slate-600 text-slate-200'
              }`}>
                {type === 'master' ? <Crown size={12} /> : <GitLab size={12} />}
              </div>
              <span className="text-sm font-bold text-white">{data.name}</span>
            </div>
            <div className="flex items-center gap-1">
              {Array(data.cost).fill('').map((_, i) => (
                <Diamond key={i} size={10} className="text-yellow-400" />
              ))}
            </div>
          </div>

          {/* Image */}
          <div className="relative w-full h-24 mb-2 rounded-lg overflow-hidden border border-slate-600">
            <img 
              src={data.image} 
              alt={data.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Stats */}
          <div className="flex justify-between items-center mb-2">
            <div className="flex gap-2">
              <div className="flex items-center gap-1">
                <Heart size={12} className="text-green-400" fill="currentColor" />
                <span className="text-xs font-bold text-green-400">{data.hp}</span>
              </div>
              <div className="flex items-center gap-1">
                <Sword size={12} className="text-red-400" />
                <span className="text-xs font-bold text-red-400">{data.attack}</span>
              </div>
              <div className="flex items-center gap-1">
                <Shield size={12} className="text-blue-400" />
                <span className="text-xs font-bold text-blue-400">{data.defense}</span>
              </div>
              <div className="flex items-center gap-1">
                <Sparkle size={12} className="text-amber-400" />
                <span className="text-xs font-bold text-amber-400">{data.actions}</span>
              </div>
            </div>
          </div>

          {/* Skill */}
          {skill && (
            <div className="bg-purple-900/50 rounded p-2">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-xs font-bold text-purple-200">{skill.name}</span>
                <span className="flex items-center gap-0.5">
                  {Array(skill.crystalCost).fill('').map((_, i) => (
                    <Diamond key={i} size={8} className="text-purple-400" />
                  ))}
                </span>
              </div>
              <p className="text-xs text-purple-300 leading-tight">{skill.description}</p>
            </div>
          )}

          {/* Status indicators */}
          {isAssigned && (
            <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">✓</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const currentAssignments = getCurrentAssignments();
  const selectedAssignment = selectedPosition ? getAssignmentAt(selectedPosition, currentAssignments) : null;

  return (
    <div className="min-h-screen bg-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-center text-blue-900 mb-2">デッキ編成</h1>
          <p className="text-center text-gray-600 mb-4">
            両チームのマスターは必須、モンスターは任意（最大コスト8）
          </p>
          
          {/* Team Selector */}
          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={() => {
                setCurrentTeam('player');
                setSelectedPosition(null);
              }}
              className={`px-6 py-3 rounded-lg font-bold transition-all flex items-center gap-2 ${
                currentTeam === 'player'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Users size={20} />
              プレイヤーチーム
            </button>
            <button
              onClick={() => {
                setCurrentTeam('enemy');
                setSelectedPosition(null);
              }}
              className={`px-6 py-3 rounded-lg font-bold transition-all flex items-center gap-2 ${
                currentTeam === 'enemy'
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Bot size={20} />
              敵チーム
            </button>
          </div>
          
          {/* Cost Display */}
          <div className="flex justify-center items-center gap-6 mb-6">
            <div className="bg-blue-100 rounded-lg px-4 py-2">
              <span className="text-sm font-bold text-blue-800">
                プレイヤー: {getTotalCost(playerAssignments)}/8
              </span>
              <div className="flex items-center gap-1 mt-1">
                {Array(8).fill('').map((_, i) => (
                  <Diamond 
                    key={i} 
                    size={12} 
                    className={i < getTotalCost(playerAssignments) ? 'text-blue-500' : 'text-gray-300'} 
                  />
                ))}
              </div>
            </div>
            
            <div className="bg-red-100 rounded-lg px-4 py-2">
              <span className="text-sm font-bold text-red-800">
                敵: {getTotalCost(enemyAssignments)}/8
              </span>
              <div className="flex items-center gap-1 mt-1">
                {Array(8).fill('').map((_, i) => (
                  <Diamond 
                    key={i} 
                    size={12} 
                    className={i < getTotalCost(enemyAssignments) ? 'text-red-500' : 'text-gray-300'} 
                  />
                ))}
              </div>
            </div>
            
            {canStartGame() && (
              <button
                onClick={handleStartGame}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-lg transform transition hover:scale-105 flex items-center gap-2"
              >
                <Play size={20} />
                ゲーム開始
              </button>
            )}
          </div>
        </div>

        {/* Board Layout */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
            {currentTeam === 'player' ? 'プレイヤーチーム' : '敵チーム'}編成
          </h2>
          <div className="flex justify-center">
            <div className="bg-slate-100 rounded-xl p-4">
              <div className="grid grid-rows-4 gap-2">
                {/* Enemy area */}
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2].map(x => 
                    renderBoardCell({ x, y: 0 }, enemyAssignments, currentTeam === 'enemy')
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="w-20 h-20"></div>
                  {renderBoardCell({ x: 1, y: 1 }, enemyAssignments, currentTeam === 'enemy')}
                  <div className="w-20 h-20"></div>
                </div>
                
                {/* Player area */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="w-20 h-20"></div>
                  {renderBoardCell({ x: 1, y: 2 }, playerAssignments, currentTeam === 'player')}
                  <div className="w-20 h-20"></div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2].map(x => 
                    renderBoardCell({ x, y: 3 }, playerAssignments, currentTeam === 'player')
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {selectedPosition && (
            <div className="mt-4 text-center">
              <p className={`font-medium ${currentTeam === 'player' ? 'text-blue-600' : 'text-red-600'}`}>
                位置 ({selectedPosition.x}, {selectedPosition.y}) の{selectedAssignment?.type === 'master' ? 'マスター' : 'モンスター'}を選択してください
              </p>
            </div>
          )}
        </div>

        {/* Card Selection */}
        {selectedPosition && selectedAssignment && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {selectedAssignment.type === 'master' ? 'マスター' : 'モンスター'}選択
              <span className={`ml-2 text-sm ${currentTeam === 'player' ? 'text-blue-600' : 'text-red-600'}`}>
                ({currentTeam === 'player' ? 'プレイヤーチーム' : '敵チーム'})
              </span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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