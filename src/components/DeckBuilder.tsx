import React, { useState } from 'react';
import { MonsterType, MasterCard } from '../types/gameTypes';
import { monsterData, masterData } from '../data/cardData';
import { skillData } from '../data/skillData';
import { Shield, Sword, Sparkle, Heart, Crown, Gitlab as GitLab, Diamond, Plus, Minus, Play } from 'lucide-react';

interface DeckBuilderProps {
  onStartGame: (playerDeck: { master: keyof typeof masterData; monsters: MonsterType[] }) => void;
}

const DeckBuilder: React.FC<DeckBuilderProps> = ({ onStartGame }) => {
  const [selectedMaster, setSelectedMaster] = useState<keyof typeof masterData>('normal');
  const [selectedMonsters, setSelectedMonsters] = useState<MonsterType[]>([]);
  
  const getTotalCost = () => {
    const masterCost = masterData[selectedMaster].cost;
    const monstersCost = selectedMonsters.reduce((total, monster) => total + monsterData[monster].cost, 0);
    return masterCost + monstersCost;
  };

  const canAddMonster = (monster: MonsterType) => {
    if (selectedMonsters.length >= 3) return false;
    if (selectedMonsters.includes(monster)) return false;
    const newCost = getTotalCost() + monsterData[monster].cost;
    return newCost <= 8;
  };

  const addMonster = (monster: MonsterType) => {
    if (canAddMonster(monster)) {
      setSelectedMonsters([...selectedMonsters, monster]);
    }
  };

  const removeMonster = (monster: MonsterType) => {
    setSelectedMonsters(selectedMonsters.filter(m => m !== monster));
  };

  const canStartGame = () => {
    return selectedMonsters.length === 3 && getTotalCost() === 8;
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

  const renderCard = (
    type: 'master' | 'monster',
    id: string,
    data: any,
    isSelected: boolean,
    onSelect: () => void,
    canSelect: boolean
  ) => {
    const skill = data.skillId ? skillData[data.skillId] : undefined;
    
    return (
      <div
        key={id}
        className={`relative bg-slate-800/95 rounded-xl overflow-hidden shadow-lg border transition-all duration-200 cursor-pointer transform hover:scale-105 ${
          isSelected 
            ? 'border-blue-400 ring-2 ring-blue-400/50' 
            : canSelect 
            ? 'border-slate-600 hover:border-slate-400' 
            : 'border-slate-700 opacity-50 cursor-not-allowed'
        }`}
        onClick={canSelect ? onSelect : undefined}
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

          {/* Selection indicator */}
          {isSelected && (
            <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">✓</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-center text-blue-900 mb-2">デッキ編成</h1>
          <p className="text-center text-gray-600 mb-4">
            マスター1体とモンスター3体を選んでください（合計コスト8）
          </p>
          
          {/* Cost Display */}
          <div className="flex justify-center items-center gap-4 mb-6">
            <div className="bg-slate-100 rounded-lg px-4 py-2">
              <span className="text-lg font-bold">
                現在のコスト: {getTotalCost()}/8
              </span>
              <div className="flex items-center gap-1 mt-1">
                {Array(8).fill('').map((_, i) => (
                  <Diamond 
                    key={i} 
                    size={16} 
                    className={i < getTotalCost() ? 'text-yellow-500' : 'text-gray-300'} 
                  />
                ))}
              </div>
            </div>
            
            {canStartGame() && (
              <button
                onClick={() => onStartGame({ master: selectedMaster, monsters: selectedMonsters })}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg transform transition hover:scale-105 flex items-center gap-2"
              >
                <Play size={20} />
                ゲーム開始
              </button>
            )}
          </div>
        </div>

        {/* Selected Team Display */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">選択中のチーム</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Master Slot */}
            <div className="relative">
              <h3 className="text-sm font-bold text-center mb-2 text-amber-600">マスター</h3>
              {renderCard(
                'master',
                selectedMaster,
                masterData[selectedMaster],
                true,
                () => {},
                false
              )}
            </div>
            
            {/* Monster Slots */}
            {[0, 1, 2].map(index => (
              <div key={index} className="relative">
                <h3 className="text-sm font-bold text-center mb-2 text-slate-600">モンスター {index + 1}</h3>
                {selectedMonsters[index] ? (
                  <div className="relative">
                    {renderCard(
                      'monster',
                      selectedMonsters[index],
                      monsterData[selectedMonsters[index]],
                      true,
                      () => removeMonster(selectedMonsters[index]),
                      true
                    )}
                    <button
                      onClick={() => removeMonster(selectedMonsters[index])}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs"
                    >
                      <Minus size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="h-48 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center">
                    <Plus size={24} className="text-gray-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Master Selection */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">マスター選択</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {Object.entries(masterData).map(([id, data]) => {
              const newCost = data.cost + selectedMonsters.reduce((total, monster) => total + monsterData[monster].cost, 0);
              const canSelect = newCost <= 8;
              
              return renderCard(
                'master',
                id,
                data,
                selectedMaster === id,
                () => setSelectedMaster(id as keyof typeof masterData),
                canSelect
              );
            })}
          </div>
        </div>

        {/* Monster Selection */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">モンスター選択</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {baseMonsters.map(monster => {
              const data = monsterData[monster];
              const isSelected = selectedMonsters.includes(monster);
              
              return (
                <div key={monster} className="relative">
                  {renderCard(
                    'monster',
                    monster,
                    data,
                    isSelected,
                    () => isSelected ? removeMonster(monster) : addMonster(monster),
                    canAddMonster(monster) || isSelected
                  )}
                  {isSelected && (
                    <button
                      onClick={() => removeMonster(monster)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs"
                    >
                      <Minus size={12} />
                    </button>
                  )}
                  {!isSelected && canAddMonster(monster) && (
                    <button
                      onClick={() => addMonster(monster)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center text-xs"
                    >
                      <Plus size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeckBuilder;