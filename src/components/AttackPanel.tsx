import React from 'react';
import { useGame } from '../context/GameContext';

const AttackPanel: React.FC = () => {
  const { state, dispatch, isValidAttack, isValidSkillTarget } = useGame();
  const { selectedCharacter, selectedAction, selectedSkill, characters } = state;
  
  if (!selectedCharacter || (selectedAction !== 'attack' && selectedAction !== 'skill')) {
    return null;
  }
  
  const handleAttack = (targetId: string) => {
    if (selectedAction === 'attack' && isValidAttack(targetId)) {
      dispatch({ type: 'ATTACK_CHARACTER', targetId });
    } else if (selectedAction === 'skill' && selectedSkill && isValidSkillTarget(targetId)) {
      dispatch({ type: 'USE_SKILL', targetId });
    }
  };
  
  const targets = characters.filter(char => {
    if (char.id === selectedCharacter.id) return false;
    
    if (selectedAction === 'attack') {
      return isValidAttack(char.id);
    } else if (selectedAction === 'skill' && selectedSkill) {
      return isValidSkillTarget(char.id);
    }
    
    return false;
  });
  
  if (targets.length === 0) {
    return (
      <div className="mt-4 p-4 bg-gray-800 rounded-lg text-white">
        <p>範囲内に対象がいません</p>
      </div>
    );
  }
  
  return (
    <div className="mt-4 p-4 bg-gray-800 rounded-lg">
      <h3 className="text-white font-bold mb-2">
        {selectedAction === 'attack' ? '攻撃対象を選択:' : 'スキル対象を選択:'}
      </h3>
      <div className="grid grid-cols-2 gap-2 mt-2">
        {targets.map(target => (
          <button
            key={target.id}
            className={`p-2 rounded flex items-center ${
              target.team === 'enemy' ? 'bg-red-900 hover:bg-red-800' : 'bg-blue-900 hover:bg-blue-800'
            }`}
            onClick={() => handleAttack(target.id)}
          >
            <div className="w-10 h-10 rounded-full overflow-hidden mr-2">
              <img 
                src={target.image} 
                alt={target.name} 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-white text-left">
              <p className="font-bold text-sm">{target.name}</p>
              <p className="text-xs">{target.hp} / {target.maxHp} HP</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default AttackPanel;