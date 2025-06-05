import React from 'react';
import { useGame } from '../context/GameContext';
import { Skill } from '../types/gameTypes';
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
    <div className="perspective-1000">
      <CharacterCard
        character={selectedCharacter}
        currentTeam={currentTeam}
        playerCrystals={playerCrystals}
        enemyCrystals={enemyCrystals}
        onSkillSelect={handleSkillClick}
        variant="panel"
      />
    </div>
  );
};

export default CharacterPanel;