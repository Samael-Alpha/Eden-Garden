import React, { useState, useEffect, useRef } from 'react';
import { Message } from '../types';
import { ChevronRight, Dices, Hexagon, Send, Play, Pause, Trophy, Star, Scroll } from 'lucide-react';

interface VisualNovelUIProps {
  message: Message;
  isTyping: boolean;
  onOptionClick: (option: string) => void;
  onSendMessage: (text: string) => void;
  characterName?: string; // Current speaker
}

export const VisualNovelUI: React.FC<VisualNovelUIProps> = ({ 
  message, 
  isTyping, 
  onOptionClick, 
  onSendMessage,
  characterName 
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [showChoices, setShowChoices] = useState(false);
  const [inputValue, setInputValue] = useState('');
  
  // Audio
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Parse quest tags out of display text but keep them for logic if needed
  const cleanText = message.text
    .replace(/\[QUEST START:.*?\]/i, '')
    .replace(/\[QUEST COMPLETE:.*?\]/i, '')
    .replace(/\[QUEST UPDATE:.*?\]/i, '')
    .trim();

  // Typewriter effect
  useEffect(() => {
    setDisplayedText('');
    setShowChoices(false);
    
    if (message.role === 'user') {
      setDisplayedText(cleanText);
      return;
    }

    let i = 0;
    const speed = 20; // Fast typewriter
    const interval = setInterval(() => {
      if (i < cleanText.length) {
        setDisplayedText(cleanText.substring(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        setShowChoices(true);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [message.id, cleanText, message.role]);

  // Handle Input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim()) {
        onSendMessage(inputValue);
        setInputValue('');
      }
    }
  };

  // Decode audio helper
  const playAudio = async () => {
    if (!message.audio) return;
    
    try {
      if (isPlayingAudio) {
         audioSourceRef.current?.stop();
         setIsPlayingAudio(false);
         return;
      }

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass({ sampleRate: 24000 });
      audioContextRef.current = ctx;

      const binaryString = window.atob(message.audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const dataInt16 = new Int16Array(bytes.buffer);
      const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < buffer.length; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setIsPlayingAudio(false);
      source.start();
      
      audioSourceRef.current = source;
      setIsPlayingAudio(true);

    } catch (e) {
      console.error("Audio error", e);
      setIsPlayingAudio(false);
    }
  };

  // Quest Notification (Local parsing for visual flair)
  const questMatch = message.text.match(/\[QUEST (START|COMPLETE|UPDATE):\s*(.*?)\]/i);
  const questType = questMatch?.[1]?.toLowerCase();
  const questName = questMatch?.[2];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-4 md:p-8 flex flex-col items-center justify-end pointer-events-none">
      
      <div className="w-full max-w-4xl pointer-events-auto flex flex-col gap-4">
        
        {/* Quest Banner - Floating */}
        {questName && (
          <div className="self-center mb-4 animate-in slide-in-from-top-4 fade-in duration-700">
             <div className={`
               px-6 py-2 rounded-full border backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.5)] flex items-center gap-3
               ${questType === 'start' ? 'bg-amber-900/80 border-amber-500 text-amber-100' : 
                 questType === 'complete' ? 'bg-green-900/80 border-green-500 text-green-100' : 
                 'bg-blue-900/80 border-blue-500 text-blue-100'}
             `}>
                {questType === 'start' && <Scroll size={18} />}
                {questType === 'complete' && <Trophy size={18} />}
                {questType === 'update' && <Star size={18} />}
                <span className="font-bold tracking-wide uppercase text-sm">
                  {questType === 'start' ? 'New Quest:' : questType === 'complete' ? 'Quest Completed:' : 'Quest Updated:'}
                </span>
                <span className="font-medium">{questName}</span>
             </div>
          </div>
        )}

        {/* Choices - Floating above text box */}
        {showChoices && message.choices && message.choices.length > 0 && !isTyping && (
          <div className="flex flex-col md:flex-row flex-wrap gap-3 justify-center items-end md:items-center mb-2 animate-in slide-in-from-bottom-4 fade-in duration-500">
            {message.choices.map((choice, idx) => {
              const isStatCheck = choice.match(/^\[(Strength|Intelligence|Charisma|Endurance|Luck|Wealth)\]/i);
              let borderColor = 'border-brand-500/50';
              let bgColor = 'bg-gray-900/90';
              
              if (choice.includes('[Wealth]')) { borderColor = 'border-amber-400'; bgColor = 'bg-amber-950/80'; }
              else if (choice.includes('[Strength]')) { borderColor = 'border-red-500'; }
              else if (choice.includes('[Charisma]')) { borderColor = 'border-pink-500'; }

              return (
                <button
                  key={idx}
                  onClick={() => onOptionClick(choice)}
                  className={`
                    group relative overflow-hidden text-left
                    ${bgColor} backdrop-blur-xl
                    border-l-4 ${borderColor} border-y border-r border-white/10
                    rounded-r-xl rounded-l-sm
                    px-5 py-3 md:py-4 md:min-w-[300px]
                    shadow-lg hover:shadow-brand-500/20 hover:scale-105
                    transition-all duration-200
                  `}
                >
                  <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center justify-between gap-3">
                     <span className="font-medium text-gray-100 group-hover:text-white text-sm md:text-base">{choice}</span>
                     {isStatCheck ? <Dices size={16} className="opacity-50" /> : <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Main Text Box */}
        <div className="relative bg-gray-950/85 backdrop-blur-xl border border-white/15 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.6)] overflow-hidden">
            
            {/* Nameplate */}
            <div className="absolute -top-4 left-6 bg-brand-600 text-white px-5 py-1 rounded-t-lg rounded-b-md shadow-lg border border-white/10 z-10">
                <span className="font-bold tracking-wider text-sm uppercase">
                    {message.role === 'user' ? 'You' : (characterName || 'Narrator')}
                </span>
            </div>

            {/* Audio Control (Absolute Right) */}
            {message.audio && (
                <button 
                  onClick={playAudio}
                  className="absolute top-4 right-4 p-2 text-brand-300 hover:text-white hover:bg-white/10 rounded-full transition-colors z-20"
                >
                    {isPlayingAudio ? <Pause size={18} /> : <Play size={18} />}
                </button>
            )}

            <div className="p-6 pt-8 min-h-[140px] flex flex-col justify-between">
                <p className="text-lg md:text-xl text-gray-100 leading-relaxed font-medium drop-shadow-md">
                   {displayedText}
                   {displayedText.length < cleanText.length && <span className="inline-block w-2 h-5 bg-brand-400 ml-1 animate-pulse align-middle"/>}
                </p>

                {/* Input Field (Hidden if choices exist, or always visible? Let's make it always visible but distinct) */}
                <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={showChoices ? "Or type your own action..." : "What do you do?"}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-gray-300 placeholder-gray-600 focus:text-white transition-colors"
                        disabled={isTyping}
                    />
                    <button 
                        onClick={() => { if(inputValue.trim()) { onSendMessage(inputValue); setInputValue(''); }}}
                        disabled={!inputValue.trim() || isTyping}
                        className="p-2 text-brand-400 hover:text-white disabled:opacity-30 transition-colors"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
            
            {/* Decorative bottom bar */}
            <div className="h-1 w-full bg-gradient-to-r from-brand-600 via-purple-500 to-brand-600 opacity-50" />
        </div>

      </div>
    </div>
  );
};