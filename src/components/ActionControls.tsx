import React from 'react';
import { useGame } from '../context/GameContext';
import { Crown } from 'lucide-react';

const ActionControls: React.FC = () => {
  const { state } = useGame();
  const { selectedCharacter, gamePhase, currentTeam, selectedAction, selectedSkill, characters } = state;
  
  if (gamePhase === 'preparation') {
    return (
      <div className="p-4 bg-white rounded-xl shadow-lg border border-blue-100">
        <p className="text-gray-700 font-medium">
          ゲームを開始してください
        </p>
      </div>
    );
  }
  
  if (gamePhase === 'result') {
    const playerMasterAlive = characters.some(char => char.team === 'player' && char.type === 'master');
    const winner = playerMasterAlive ? 'player' : 'enemy';

    return (
      <div className="p-6 bg-white rounded-xl shadow-lg border border-blue-100">
        <div className="flex flex-col items-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
            winner === 'player' 
              ? 'bg-gradient-to-br from-blue-500 to-blue-600'
              : 'bg-gradient-to-br from-red-500 to-red-600'
          }`}>
            <Crown size={32} className="text-white drop-shadow" />
          </div>
          <h2 className={`text-2xl font-bold mb-2 ${
            winner === 'player' ? 'text-blue-600' : 'text-red-600'
          }`}>
            {winner === 'player' ? 'あなたの勝利！' : '相手の勝利！'}
          </h2>
          <p className="text-gray-600 text-center">
            {winner === 'player' 
              ? '見事、相手のマスターを倒しました！'
              : '相手にマスターを倒されてしまいました...'}
          </p>
        </div>
      </div>
    );
  }

  let helpMessage = '';

  if (!selectedCharacter) {
    helpMessage = '行動できるキャラクターを選んでください';
  } else if (selectedCharacter.team !== currentTeam) {
    helpMessage = 'そのキャラクターは操作できません';
  } else if (selectedCharacter.remainingActions <= 0) {
    helpMessage = 'このキャラクターは行動済みです';
  } else if (selectedAction === 'skill') {
    helpMessage = `${selectedSkill?.name}の対象を選んでください`;
  } else {
    helpMessage = '移動先か攻撃対象を選んでください';
  }

  return (
    <div className="p-4 bg-white rounded-xl shadow-lg border border-blue-100">
      <p className="text-gray-700 font-medium">
        {helpMessage}
      </p>
    </div>
  );
};

export default ActionControls;