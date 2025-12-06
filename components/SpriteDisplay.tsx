import React, { useEffect, useState } from 'react';

interface SpriteDisplayProps {
  imageUrl: string | null;
  name?: string;
  emotion?: string;
}

export const SpriteDisplay: React.FC<SpriteDisplayProps> = ({ imageUrl, name, emotion }) => {
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (imageUrl) {
      // Preload image before showing
      const img = new Image();
      img.src = imageUrl;
      img.onload = () => {
        setDisplayUrl(imageUrl);
        setIsVisible(true);
      };
    } else {
      setIsVisible(false);
      // Delay clearing the URL to allow fade out animation
      setTimeout(() => setDisplayUrl(null), 500);
    }
  }, [imageUrl]);

  if (!displayUrl && !imageUrl) return null;

  const getAnimationClass = (emo?: string) => {
    if (!emo) return 'animate-breathe';
    const e = emo.toLowerCase();
    
    if (e.includes('angry') || e.includes('mad') || e.includes('scared') || e.includes('shock') || e.includes('furious')) {
      return 'animate-shake';
    }
    if (e.includes('happy') || e.includes('excited') || e.includes('laugh') || e.includes('joy')) {
      return 'animate-bounce-subtle';
    }
    return 'animate-breathe';
  };

  const animationClass = getAnimationClass(emotion);

  return (
    <div 
      className={`fixed bottom-0 left-1/2 -translate-x-1/2 z-0 pointer-events-none transition-all duration-1000 ease-in-out transform
        ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-12 opacity-0 scale-95'}
      `}
      style={{
        height: 'min(90vh, 900px)', // Slightly taller
        width: 'auto',
        maxWidth: '100vw',
        filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.6))' // Deeper shadow for 3D separation
      }}
    >
      <div className="relative h-full flex flex-col items-center justify-end">
        {/* Character Image */}
        <img 
          src={displayUrl || ''} 
          alt="Character Sprite" 
          className={`h-full w-auto object-contain ${isVisible ? animationClass : ''}`}
          style={{
             // Softer bottom fade
             maskImage: 'linear-gradient(to bottom, black 90%, transparent 100%)',
             WebkitMaskImage: 'linear-gradient(to bottom, black 90%, transparent 100%)'
          }}
        />
      </div>
    </div>
  );
};