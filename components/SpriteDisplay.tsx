import React, { useEffect, useState } from 'react';

interface SpriteDisplayProps {
  imageUrl: string | null;
  name?: string;
  emotion?: string;
}

export const SpriteDisplay: React.FC<SpriteDisplayProps> = ({ imageUrl, name, emotion }) => {
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [posture, setPosture] = useState({ x: 0, scale: 1, rotate: 0 });

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

  // Micro-posture shifts logic to make character feel "alive"
  useEffect(() => {
    if (!isVisible) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const shiftPosture = () => {
        // Random subtle shift between -10px and 10px
        const x = (Math.random() - 0.5) * 20; 
        // Random scale nuance to simulate shifting weight (0.99 to 1.01)
        const scale = 1 + (Math.random() - 0.5) * 0.02;
        // Subtle rotation (-0.5 to 0.5 deg)
        const rotate = (Math.random() - 0.5) * 1;
        
        setPosture({ x, scale, rotate });
    };
    
    // Initial random posture
    shiftPosture();
    
    // Loop with random intervals to avoid robotic repetition
    const loop = () => {
        // Shift every 4 to 8 seconds
        const delay = 4000 + Math.random() * 4000;
        shiftPosture();
        timeoutId = setTimeout(loop, delay);
    };
    
    timeoutId = setTimeout(loop, 2000);
    return () => clearTimeout(timeoutId);
  }, [isVisible]);

  if (!displayUrl && !imageUrl) return null;

  const getAnimationClass = (emo?: string) => {
    if (!emo) return 'animate-idle-standard';
    const e = emo.toLowerCase();
    
    // Map emotions to CSS animations
    if (e.includes('angry') || e.includes('mad') || e.includes('furious')) return 'animate-idle-angry';
    if (e.includes('happy') || e.includes('excited') || e.includes('laugh') || e.includes('joy') || e.includes('smile')) return 'animate-idle-happy';
    if (e.includes('sad') || e.includes('cry') || e.includes('depressed')) return 'animate-idle-sad';
    if (e.includes('flirty') || e.includes('love') || e.includes('blush') || e.includes('seductive')) return 'animate-idle-flirty';
    if (e.includes('scared') || e.includes('shock') || e.includes('surprise')) return 'animate-shock';
    
    return 'animate-idle-standard';
  };

  const animationClass = getAnimationClass(emotion);

  return (
    <div 
      className={`absolute bottom-0 left-1/2 -translate-x-1/2 z-10 pointer-events-none transition-all duration-1000 ease-in-out transform origin-bottom
        ${isVisible ? 'opacity-100' : 'opacity-0 scale-95'}
      `}
      style={{
        height: '95%', // Scale relative to container
        width: 'auto',
        maxHeight: '1200px',
        filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))' // Shadow helps separate from BG
      }}
    >
      {/* 
        Layer 1: Posture & Transforms 
        Handles slow, random organic shifts in weight/position 
      */}
      <div 
        className="relative h-full flex flex-col items-center justify-end transition-transform duration-[3000ms] ease-in-out"
        style={{
            transform: `translateX(${posture.x}px) scale(${posture.scale}) rotate(${posture.rotate}deg)`
        }}
      >
        {/* 
          Layer 2: CSS Keyframe Loops 
          Handles rhythmic breathing, bouncing, shaking based on emotion 
        */}
        <img 
          src={displayUrl || ''} 
          alt="Character Sprite" 
          className={`h-full w-auto object-contain ${isVisible ? animationClass : ''}`}
          style={{
             // Softer bottom fade to blend with UI
             maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
             WebkitMaskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)'
          }}
        />
      </div>
    </div>
  );
};