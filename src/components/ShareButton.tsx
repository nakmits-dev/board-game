import React, { useState } from 'react';
import { Share2, Twitter, Facebook, Link, Check } from 'lucide-react';

interface ShareButtonProps {
  className?: string;
}

const ShareButton: React.FC<ShareButtonProps> = ({ className = '' }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const gameUrl = 'https://board-game.nakmits.com/';
  const gameTitle = 'ボードdeモンスターズ - 戦略的ターン制ボードゲーム';
  const gameDescription = 'マスターとモンスターでチームを編成し、3×4のボード上で戦略的なバトルを楽しもう！';

  const shareToTwitter = () => {
    const text = `${gameTitle}\n${gameDescription}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(gameUrl)}&hashtags=ボードゲーム,戦略ゲーム,オンラインゲーム`;
    window.open(url, '_blank', 'width=550,height=420');
    setShowMenu(false);
  };

  const shareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(gameUrl)}`;
    window.open(url, '_blank', 'width=550,height=420');
    setShowMenu(false);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(gameUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setShowMenu(false);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: gameTitle,
          text: gameDescription,
          url: gameUrl,
        });
        setShowMenu(false);
      } catch (err) {
        console.error('Error sharing: ', err);
      }
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        aria-label="ゲームを共有"
      >
        <Share2 size={16} />
        <span className="hidden sm:inline">共有</span>
      </button>

      {showMenu && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowMenu(false)}
          />
          
          {/* Share Menu */}
          <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 min-w-[200px]">
            {/* Native Share (if supported) */}
            {navigator.share && (
              <button
                onClick={shareNative}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3"
              >
                <Share2 size={16} className="text-gray-600" />
                <span>共有</span>
              </button>
            )}

            {/* Twitter */}
            <button
              onClick={shareToTwitter}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3"
            >
              <Twitter size={16} className="text-blue-400" />
              <span>Twitterで共有</span>
            </button>

            {/* Facebook */}
            <button
              onClick={shareToFacebook}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3"
            >
              <Facebook size={16} className="text-blue-600" />
              <span>Facebookで共有</span>
            </button>

            {/* Copy Link */}
            <button
              onClick={copyToClipboard}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3"
            >
              {copied ? (
                <>
                  <Check size={16} className="text-green-600" />
                  <span className="text-green-600">コピーしました！</span>
                </>
              ) : (
                <>
                  <Link size={16} className="text-gray-600" />
                  <span>リンクをコピー</span>
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ShareButton;