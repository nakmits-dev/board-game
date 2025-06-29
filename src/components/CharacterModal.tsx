import React, { useRef, useEffect } from 'react';
import { Character, Skill } from '../types/gameTypes';
import { skillData } from '../data/skillData';
import CharacterCard from './CharacterCard';

interface CharacterModalProps {
  character: Character;
  onClose: () => void;
  hostCrystals: number;
  guestCrystals: number;
  currentTeam: 'player' | 'enemy';
  onSkillSelect?: (skill: Skill) => void;
}

const CharacterModal: React.FC<CharacterModalProps> = ({
  character,
  onClose,
  hostCrystals,
  guestCrystals,
  currentTeam,
  onSkillSelect,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm lg:hidden">
      <div ref={modalRef} className="flex items-center justify-center">
        <CharacterCard
          character={character}
          currentTeam={currentTeam}
          hostCrystals={hostCrystals}
          guestCrystals={guestCrystals}
          onSkillSelect={onSkillSelect}
          variant="modal"
        />
      </div>
    </div>
  );
};

export default CharacterModal;