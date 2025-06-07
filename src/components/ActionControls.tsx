import React from 'react';
import { useGame } from '../context/GameContext';
import { Crown, HelpCircle } from 'lucide-react';

const ActionControls: React.FC = () => {
  const { state } = useGame();
  const { selectedCharacter, gamePhase, currentTeam, selectedAction, selectedSkill, characters } = state;
  
  if (gamePhase === 'preparation') {
    return (
      <div className="p-4 bg-white rounded-xl shadow-lg border border-blue-100">
        <div className="flex items-center justify-between">
          <p className="text-gray-700 font-medium">
            チーム編成を行い、対戦を開始してください
          </p>
          <div className="flex items-center gap-2 text-blue-600 text-sm">
            <HelpCircle size={16} />
            <span className="hidden sm:inline">右上の「遊び方」でチュートリアルを確認</span>
            <span className="sm:hidden">「遊び方」で操作方法を確認</span>
          </div>
        </div>
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
          <h2 className={`text-2xl font-bold ${
            winner === 'player' ? 'text-blue-600' : 'text-red-600'
          }`}>
            {winner === 'player' ? 'あなたの勝利！' : '相手の勝利！'}
          </h2>
        </div>
      </div>
    );
  }

  let helpMessage = '';
  let helpDetail = '';

  if (!selectedCharacter) {
    helpMessage = '行動できるキャラクターを選んでください';
    helpDetail = window.innerWidth < 1024 
      ? 'スマホ: キャラクターをタップして詳細を表示'
      : 'PC: キャラクターをクリックまたはドラッグ&ドロップ';
  } else if (selectedCharacter.team !== currentTeam) {
    helpMessage = 'そのキャラクターは操作できません';
    helpDetail = currentTeam === 'player' ? '青チームのキャラクターを選択してください' : '赤チームのキャラクターを選択してください';
  } else if (selectedCharacter.remainingActions <= 0) {
    helpMessage = 'このキャラクターは行動済みです';
    helpDetail = '他のキャラクターを選択するか、ターン終了してください';
  } else if (selectedAction === 'skill') {
    helpMessage = `${selectedSkill?.name}の対象を選んでください`;
    helpDetail = window.innerWidth < 1024 
      ? 'スマホ: 対象キャラクターをタップ'
      : 'PC: 対象キャラクターをクリック';
  } else {
    helpMessage = '移動先か攻撃対象を選んでください';
    helpDetail = window.innerWidth < 1024 
      ? 'スマホ: 移動先や攻撃対象をタップ。スキルはキャラクター詳細から選択'
      : 'PC: クリックまたはドラッグ&ドロップ。スキルは右パネルから選択';
  }

  return (
    <div className="p-4 bg-white rounded-xl shadow-lg border border-blue-100">
      <div className="space-y-2">
        <p className="text-gray-700 font-medium">
          {helpMessage}
        </p>
        {helpDetail && (
          <p className="text-gray-500 text-sm">
            💡 {helpDetail}
          </p>
        )}
      </div>
    </div>
  );
};

export default ActionControls;