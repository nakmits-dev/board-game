import React from 'react';
import { Shield, Sword, Sparkle, Heart, Crown, Gitlab as GitLab, Diamond } from 'lucide-react';
import { Character, Skill, Team } from '../types/gameTypes';
import { skillData } from '../data/skillData';

interface CharacterCardProps {
  character?: Character;
  currentTeam: Team;
  playerCrystals: number;
  enemyCrystals: number;
  onSkillSelect?: (skill: Skill) => void;
  variant?: 'panel' | 'modal';
}

const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  currentTeam,
  playerCrystals,
  enemyCrystals,
  onSkillSelect,
  variant = 'panel'
}) => {
  if (!character) {
    return (
      <div className="w-[360px] h-[520px] bg-slate-800/95 rounded-2xl overflow-hidden shadow-xl border border-slate-700/50 backdrop-blur-sm">
        <div className="h-full flex flex-col items-center justify-center p-8">
          <div className="relative">
            <GitLab size={64} className="text-slate-600" />
            <div className="absolute inset-0 blur-2xl bg-slate-600/20"></div>
          </div>
          <p className="mt-6 text-center text-lg text-slate-400 font-medium">
            {currentTeam === 'player' ? "キャラクターをえらんでください" : "あいてのターンです"}
          </p>
        </div>
      </div>
    );
  }

  const isCurrentTeam = character.team === currentTeam;
  const hasActions = character.remainingActions > 0;
  const teamColor = character.team === 'player' ? 'blue' : 'red';
  const TypeIcon = character.type === 'master' ? Crown : GitLab;
  const availableCrystals = character.team === 'player' ? playerCrystals : enemyCrystals;

  // Get the skill for this character - Changed from .get() to bracket notation
  const skill = character.skillId ? skillData[character.skillId] : undefined;

  return (
    <div className="w-[360px] h-[520px] bg-slate-800/95 rounded-2xl overflow-hidden shadow-xl border border-slate-700/50 backdrop-blur-sm flex flex-col">
      {/* Header with Type and Name */}
      <div className="bg-gradient-to-r from-slate-700/80 to-slate-700/60 rounded-xl mx-2 mt-2 p-2 shadow-lg border border-slate-600/30">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-full ${
            character.type === 'master'
              ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-amber-950'
              : 'bg-gradient-to-br from-slate-500 to-slate-600 text-slate-200'
          } shadow-lg`}>
            <TypeIcon size={16} className="drop-shadow" />
          </div>
          
          <h3 className={`text-lg font-bold ${
            teamColor === 'blue' 
              ? 'bg-gradient-to-r from-blue-300 to-blue-200 text-transparent bg-clip-text' 
              : 'bg-gradient-to-r from-red-300 to-red-200 text-transparent bg-clip-text'
          }`}>
            {character.name}
          </h3>
        </div>
      </div>

      {/* Character Image with Stats Overlay */}
      <div className="relative mx-2 my-1">
        <div className="p-1.5 bg-gradient-to-b from-slate-700/80 to-slate-700/60 rounded-xl shadow-lg border border-slate-600/30">
          <div className="bg-gradient-to-b from-slate-600/80 to-slate-600/60 p-1 rounded-lg">
            <div className="relative w-[320px] h-[320px] mx-auto rounded-lg overflow-hidden border-2 border-slate-500/50">
              <img 
                src={character.image} 
                alt={character.name}
                className="w-full h-full object-cover"
              />
              <div className={`absolute inset-0 ${
                teamColor === 'blue' 
                  ? 'bg-blue-500/10' 
                  : 'bg-red-500/10'
              }`}></div>
              
              {/* Stats Overlay */}
              <div className="absolute bottom-2 right-2 flex gap-2 p-1.5 rounded-lg bg-black/60 backdrop-blur-sm">
                <div className="flex items-center gap-1">
                  <Heart size={14} className="text-green-400 drop-shadow" fill="currentColor" />
                  <span className="text-sm font-bold text-green-400 drop-shadow">{character.hp}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Sword size={14} className="text-red-400 drop-shadow" />
                  <span className="text-sm font-bold text-red-400 drop-shadow">{character.attack}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Shield size={14} className="text-blue-400 drop-shadow" />
                  <span className="text-sm font-bold text-blue-400 drop-shadow">{character.defense}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Sparkle size={14} className="text-amber-400 drop-shadow" />
                  <span className="text-sm font-bold text-amber-400 drop-shadow">{character.actions}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Skills */}
      <div className="flex-1 bg-gradient-to-r from-slate-700/80 to-slate-700/60 rounded-xl mx-2 mb-2 mt-1 p-2 shadow-lg border border-slate-600/30 overflow-y-auto">
        <div className="space-y-1.5">
          {skill && (
            <div 
              className={`p-2 rounded-lg transition-all duration-200 ${
                isCurrentTeam && hasActions && availableCrystals >= skill.crystalCost && onSkillSelect
                  ? 'bg-gradient-to-br from-purple-900/90 to-purple-800/90 hover:from-purple-800/90 hover:to-purple-700/90 cursor-pointer transform hover:scale-[1.02] border border-purple-700/30'
                  : 'bg-gradient-to-br from-slate-600/90 to-slate-700/90 border border-slate-600/30 opacity-75'
              }`}
              onClick={() => isCurrentTeam && hasActions && availableCrystals >= skill.crystalCost && onSkillSelect?.(skill)}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-purple-200 drop-shadow">
                    {skill.name}
                  </span>
                  <span className="flex items-center gap-0.5">
                    {Array(skill.crystalCost).fill('').map((_, i) => (
                      <Diamond 
                        key={i} 
                        size={12} 
                        className={`inline drop-shadow ${
                          i < availableCrystals ? 'text-purple-400' : 'text-purple-800'
                        }`} 
                      />
                    ))}
                  </span>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-purple-300/90 min-h-[2.5rem]">{skill.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CharacterCard;