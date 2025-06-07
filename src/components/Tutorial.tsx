import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Smartphone, Monitor, Zap, Crown, Gitlab as GitLab, Heart, Sword, Shield, Sparkle, Diamond, Star } from 'lucide-react';

interface TutorialProps {
  onClose: () => void;
}

const Tutorial: React.FC<TutorialProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // デバイス判定
  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  const tutorialSteps = [
    {
      title: "ボードdeモンスターズへようこそ！",
      content: (
        <div className="space-y-4">
          <p className="text-lg text-center text-blue-800 font-semibold">
            戦略的ターン制ボードゲームの世界へ！
          </p>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-bold text-blue-800 mb-2">ゲームの目標</h3>
            <p className="text-blue-700">
              マスターとモンスターでチームを編成し、3×4のボード上で戦略的なバトルを行います。
              相手のマスターを倒すか、相手が降参すると勝利です！
            </p>
          </div>
          <div className="flex justify-center">
            <div className="bg-white p-3 rounded-lg shadow-md">
              <Crown size={32} className="text-amber-500 mx-auto" />
              <p className="text-sm text-center mt-1">マスターを守ろう！</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "チーム編成",
      content: (
        <div className="space-y-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-bold text-green-800 mb-2 flex items-center gap-2">
              <Star size={20} className="text-yellow-500" />
              コストシステム
            </h3>
            <p className="text-green-700 mb-2">
              マスター1体 + モンスター3体で総コスト8以下になるようにチームを編成します。
            </p>
            <div className="flex items-center gap-2 text-sm">
              <span>コスト例:</span>
              {Array(3).fill('').map((_, i) => (
                <Star key={i} size={12} className="text-yellow-500" fill="currentColor" />
              ))}
              <span>= コスト3</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-amber-50 p-3 rounded-lg text-center">
              <Crown size={24} className="text-amber-600 mx-auto mb-1" />
              <p className="text-sm font-bold text-amber-800">マスター</p>
              <p className="text-xs text-amber-700">チームのリーダー</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg text-center">
              <GitLab size={24} className="text-purple-600 mx-auto mb-1" />
              <p className="text-sm font-bold text-purple-800">モンスター</p>
              <p className="text-xs text-purple-700">戦闘の主力</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "キャラクターの能力",
      content: (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-bold text-gray-800 mb-3">基本ステータス</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Heart size={16} className="text-green-500" fill="currentColor" />
                <span className="text-sm"><strong>HP:</strong> 体力</span>
              </div>
              <div className="flex items-center gap-2">
                <Sword size={16} className="text-red-500" />
                <span className="text-sm"><strong>攻撃:</strong> 与ダメージ</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-blue-500" />
                <span className="text-sm"><strong>防御:</strong> 軽減ダメージ</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkle size={16} className="text-yellow-500" />
                <span className="text-sm"><strong>行動:</strong> ターン中の行動回数</span>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-bold text-purple-800 mb-2">進化システム</h3>
            <p className="text-purple-700 text-sm">
              敵キャラクターを倒すと、進化可能なモンスターは自動的に進化します！
              進化後はステータスが向上し、より強力になります。
            </p>
          </div>
        </div>
      )
    },
    {
      title: "クリスタルシステム",
      content: (
        <div className="space-y-4">
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-bold text-purple-800 mb-2 flex items-center gap-2">
              <Diamond size={20} className="text-purple-600" />
              クリスタルの使い方
            </h3>
            <p className="text-purple-700 mb-3">
              クリスタルはスキル使用に必要なリソースです。最大8個まで保持できます。
            </p>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>ターン開始時に1個獲得</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span>キャラクター撃破時にそのコスト分獲得</span>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-bold text-blue-800 mb-2">クリスタル表示</h3>
            <p className="text-blue-700 text-sm mb-2">
              画面の両端にクリスタルが表示されます：
            </p>
            <div className="flex justify-between items-center">
              <div className="text-center">
                <div className="flex flex-col gap-1">
                  {Array(3).fill('').map((_, i) => (
                    <Diamond key={i} size={16} className="text-red-400" />
                  ))}
                </div>
                <p className="text-xs text-red-600 mt-1">敵チーム</p>
              </div>
              <div className="text-center">
                <div className="flex flex-col-reverse gap-1">
                  {Array(3).fill('').map((_, i) => (
                    <Diamond key={i} size={16} className="text-blue-400" />
                  ))}
                </div>
                <p className="text-xs text-blue-600 mt-1">プレイヤー</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "スキルシステム",
      content: (
        <div className="space-y-4">
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-bold text-purple-800 mb-3 flex items-center gap-2">
              <Zap size={20} className="text-purple-600" />
              利用可能なスキル
            </h3>
            
            <div className="space-y-3">
              <div className="bg-white p-3 rounded border-l-4 border-red-400">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-red-800">いかりのいちげき</span>
                  <div className="flex">
                    {Array(3).fill('').map((_, i) => (
                      <Diamond key={i} size={10} className="text-purple-400" />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-red-700">近接攻撃に+1ダメージ</p>
              </div>
              
              <div className="bg-white p-3 rounded border-l-4 border-green-400">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-green-800">かいふく</span>
                  <div className="flex">
                    {Array(2).fill('').map((_, i) => (
                      <Diamond key={i} size={10} className="text-purple-400" />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-green-700">味方のHPを2回復</p>
              </div>
              
              <div className="bg-white p-3 rounded border-l-4 border-purple-400">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-purple-800">のろい</span>
                  <div className="flex">
                    {Array(3).fill('').map((_, i) => (
                      <Diamond key={i} size={10} className="text-purple-400" />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-purple-700">敵のHPを1減らす（防御無視）</p>
              </div>
              
              <div className="bg-white p-3 rounded border-l-4 border-yellow-400">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-yellow-800">しんか</span>
                  <div className="flex">
                    {Array(3).fill('').map((_, i) => (
                      <Diamond key={i} size={10} className="text-purple-400" />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-yellow-700">味方モンスターを進化させる</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    // PC操作方法（PCの場合のみ表示）
    ...(isMobile ? [] : [{
      title: "PC操作方法",
      content: (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Monitor size={24} className="text-blue-600" />
            <h3 className="font-bold text-blue-800">デスクトップ・タブレット</h3>
          </div>
          
          <div className="space-y-3">
            <div className="bg-blue-50 p-3 rounded-lg">
              <h4 className="font-bold text-blue-800 mb-2">基本操作</h4>
              <div className="space-y-1 text-sm">
                <p><strong>キャラクター選択:</strong> クリック</p>
                <p><strong>移動:</strong> 移動先をクリック、またはドラッグ&ドロップ</p>
                <p><strong>攻撃:</strong> 攻撃対象をクリック</p>
              </div>
            </div>
            
            <div className="bg-purple-50 p-3 rounded-lg">
              <h4 className="font-bold text-purple-800 mb-2">スキル使用</h4>
              <div className="space-y-1 text-sm">
                <p>1. 右パネルのキャラクターカードでスキルをクリック</p>
                <p>2. 対象キャラクターをクリック</p>
                <p>3. スキルが発動！</p>
              </div>
            </div>
            
            <div className="bg-green-50 p-3 rounded-lg">
              <h4 className="font-bold text-green-800 mb-2">ドラッグ&ドロップ</h4>
              <p className="text-sm text-green-700">
                行動可能なキャラクターは、ドラッグして移動先や攻撃対象にドロップできます。
                直感的で素早い操作が可能です！
              </p>
            </div>
          </div>
        </div>
      )
    }]),
    // スマホ操作方法（スマホの場合のみ表示）
    ...(isMobile ? [{
      title: "スマホ操作方法",
      content: (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone size={24} className="text-green-600" />
            <h3 className="font-bold text-green-800">スマートフォン</h3>
          </div>
          
          <div className="space-y-3">
            <div className="bg-green-50 p-3 rounded-lg">
              <h4 className="font-bold text-green-800 mb-2">移動・攻撃操作</h4>
              <div className="space-y-2 text-sm">
                <p><strong>キャラクター選択:</strong> キャラクターをタップ</p>
                <p><strong>移動・攻撃:</strong> キャラクターを長押し→ドラッグで移動先や攻撃対象へ</p>
                <p className="text-green-600 font-medium">💡 長押しでドラッグ操作が開始されます</p>
              </div>
            </div>
            
            <div className="bg-purple-50 p-3 rounded-lg">
              <h4 className="font-bold text-purple-800 mb-2">スキル使用方法</h4>
              <div className="space-y-2 text-sm">
                <p><strong>ステップ1:</strong> キャラクターをタップしてモーダルを開く</p>
                <p><strong>ステップ2:</strong> モーダル内のスキルボタンをタップ</p>
                <p><strong>ステップ3:</strong> 対象キャラクターをタップ</p>
                <p className="text-purple-600 font-medium">💡 スキルボタンは紫色で表示されます</p>
              </div>
            </div>
            
            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <h4 className="font-bold text-yellow-800 mb-2">⚠️ 重要なポイント</h4>
              <div className="space-y-1 text-sm text-yellow-700">
                <p>• 移動・攻撃は長押し→ドラッグで操作</p>
                <p>• スキルはモーダル内から選択してください</p>
                <p>• 対戦中は画面スクロールが制限されます</p>
              </div>
            </div>
          </div>
        </div>
      )
    }] : []),
    {
      title: "ゲームの流れ",
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-bold text-blue-800 mb-3">バトルの進行</h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <div>
                  <p className="font-bold">チーム編成</p>
                  <p className="text-sm text-blue-700">マスター1体 + モンスター3体を選択</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <p className="font-bold">ターン制バトル</p>
                  <p className="text-sm text-blue-700">30秒以内に行動を決定（一時停止可能）</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                <div>
                  <p className="font-bold">勝利条件</p>
                  <p className="text-sm text-blue-700">相手のマスターを倒すか、相手が降参</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-bold text-green-800 mb-2">戦略のコツ</h3>
            <div className="space-y-1 text-sm text-green-700">
              <p>• マスターを前線に出しすぎないよう注意</p>
              <p>• クリスタルを効率的に使ってスキルを活用</p>
              <p>• 進化を狙って積極的に敵を倒す</p>
              <p>• 防御力の高いキャラクターで盾役を作る</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "さあ、始めよう！",
      content: (
        <div className="space-y-4 text-center">
          <div className="text-6xl mb-4">🎮</div>
          <h3 className="text-xl font-bold text-blue-800">準備完了！</h3>
          <p className="text-blue-700">
            これでボードdeモンスターズの基本的な遊び方がわかりました。
            実際にプレイして戦略を練り上げましょう！
          </p>
          
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700 mb-2">
              <strong>困ったときは：</strong>
            </p>
            <div className="space-y-1 text-sm text-gray-600">
              <p>• ゲーム画面右上の「遊び方」ボタンでいつでもチュートリアルを確認</p>
              <p>• 一時停止ボタンで時間を止めて考えることができます</p>
              <p>• 最初は簡単な編成から始めてみましょう</p>
            </div>
          </div>
          
          <div className="pt-4">
            <button
              onClick={onClose}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg shadow-lg transform transition hover:scale-105"
            >
              ゲームを始める！
            </button>
          </div>
        </div>
      )
    }
  ];

  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full h-[70vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-bold">チュートリアル</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="bg-gray-200 h-2 flex-shrink-0">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">
            {tutorialSteps[currentStep].title}
          </h3>
          {tutorialSteps[currentStep].content}
        </div>

        {/* Navigation */}
        <div className="bg-gray-50 p-4 flex items-center justify-between flex-shrink-0">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              currentStep === 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-blue-600 hover:bg-blue-50'
            }`}
          >
            <ChevronLeft size={20} />
            前へ
          </button>

          {/* Step Indicators */}
          <div className="flex gap-2">
            {tutorialSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => goToStep(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentStep
                    ? 'bg-blue-600'
                    : index < currentStep
                    ? 'bg-blue-300'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          {currentStep === tutorialSteps.length - 1 ? (
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              完了
            </button>
          ) : (
            <button
              onClick={nextStep}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              次へ
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Tutorial;