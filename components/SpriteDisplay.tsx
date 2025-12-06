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
      className={`fixed bottom-0 left-1/2 -translate-x-1/2 z-0 pointer-events-none transition-all duration-700 ease-out transform
        ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-10 opacity-0 scale-95'}
      `}
      style={{
        height: 'min(85vh, 800px)',
        width: 'auto',
        maxWidth: '100vw',
        filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.5))' // Cinematic depth
      }}
    >
      <div className="relative h-full flex flex-col items-center justify-end">
        {/* Character Image */}
        <img 
          src={displayUrl || ''} 
          alt="Character Sprite" 
          className={`h-full w-auto object-contain ${isVisible ? animationClass : ''}`}
          style={{
             // Slight vignette fade at bottom to blend with text box
             maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
             WebkitMaskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)'
          }}
        />
        
        {/* Name Tag - Optional visual helper if text box doesn't cover it */}
        {name && isVisible && false && (
          <div className="absolute bottom-20 md:bottom-12 bg-black/70 backdrop-blur-md text-white px-6 py-2 rounded-full border border-white/20 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300">
            <span className="font-bold text-lg tracking-wide text-brand-200">{name}</span>
          </div>
        )}
      </div>
    </div>
  );
};