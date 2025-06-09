import React from 'react';
import { useGame } from '../context/GameContext';
import { Skill } from '../types/gameTypes';
import { skillData } from '../data/skillData';
import CharacterCard from './CharacterCard';

const CharacterPanel: React.FC = () => {
  const { state, dispatch } = useGame();
  const { selectedCharacter, currentTeam, playerCrystals, enemyCrystals } = state;

  const handleSkillClick = (skill: Skill) => {
    if (!selectedCharacter || selectedCharacter.team !== currentTeam) return;
    if (selectedCharacter.remainingActions <= 0) return;
    
    const availableCrystals = currentTeam === 'player' ? playerCrystals : enemyCrystals;
    if (availableCrystals < skill.crystalCost) return;

    dispatch({ type: 'SELECT_SKILL', skill });
  };

  return (
    <div className="perspective-1000 flex justify-center items-center h-full">
      <CharacterCard
        character={selectedCharacter}
        currentTeam={currentTeam}
        hostCrystals={playerCrystals}
        guestCrystals={enemyCrystals}
        onSkillSelect={handleSkillClick}
        variant="panel"
      />
    </div>
  );
};

export default CharacterPanel;