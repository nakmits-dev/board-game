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
    // 🔧 降参時の勝敗判定を修正
    const playerMasterAlive = characters.some(char => char.team === 'player' && char.type === 'master');
    const enemyMasterAlive = characters.some(char => char.team === 'enemy' && char.type === 'master');
    
    // 両方のマスターが生きている場合は降参による勝敗
    let winner: 'player' | 'enemy';
    if (playerMasterAlive && enemyMasterAlive) {
      // 降参の場合は現在のターンの相手が勝利
      winner = currentTeam === 'player' ? 'enemy' : 'player';
    } else {
      // マスターが倒された場合
      winner = playerMasterAlive ? 'player' : 'enemy';
    }

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
          <h2 className={`text-2xl font-bold ${
            winner === 'player' ? 'text-blue-600' : 'text-red-600'
          }`}>
            {winner === 'player' ? '青チームの勝利！' : '赤チームの勝利！'}
          </h2>
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