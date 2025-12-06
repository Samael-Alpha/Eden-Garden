import React, { useRef, useState, useEffect } from 'react';
import { Message } from '../types';
import { User, Bot, AlertCircle, ChevronRight, Play, Pause, Dices, Hexagon, Trophy, Scroll, Star } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
  onOptionClick?: (option: string) => void;
  isLast?: boolean;
}

// Audio decoding helpers
const decodeBase64 = (base64: string) => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const playPCM = async (base64Audio: string, onEnded: () => void): Promise<{ stop: () => void }> => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContextClass({ sampleRate: 24000 });
    
    const bytes = decodeBase64(base64Audio);
    const dataInt16 = new Int16Array(bytes.buffer);
    const numChannels = 1;
    const sampleRate = 24000;
    
    const frameCount = dataInt16.length / numChannels;
    const buffer = audioContext.createBuffer(numChannels, frameCount, sampleRate);
    
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.onended = () => {
      onEnded();
      audioContext.close();
    };
    source.start();
    
    return {
      stop: () => {
        try {
          source.stop();
          audioContext.close();
        } catch (e) {
          // ignore
        }
      }
    };
  } catch (error) {
    console.error("Audio playback error:", error);
    onEnded();
    return { stop: () => {} };
  }
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onOptionClick, isLast }) => {
  const isUser = message.role === 'user';
  const hasChoices = message.choices && message.choices.length > 0;
  
  // Audio State
  const [isPlaying, setIsPlaying] = useState(false);
  const stopAudioRef = useRef<(() => void) | null>(null);

  // Typewriter State
  const [displayedText, setDisplayedText] = useState('');
  const [isTypingDone, setIsTypingDone] = useState(false);
  
  // Quest Parsing
  const [questNotification, setQuestNotification] = useState<{type: 'start'|'complete'|'update', text: string} | null>(null);
  const [cleanMessageText, setCleanMessageText] = useState('');

  useEffect(() => {
    let text = message.text;
    let quest = null;

    // Parse Quest Tags
    // [QUEST START: ...]
    const startMatch = text.match(/\[QUEST START:\s*(.*?)\]/i);
    if (startMatch) {
      quest = { type: 'start' as const, text: startMatch[1] };
      text = text.replace(/\[QUEST START:\s*(.*?)\]/i, '');
    }
    
    // [QUEST COMPLETE: ...]
    const completeMatch = text.match(/\[QUEST COMPLETE:\s*(.*?)\]/i);
    if (completeMatch) {
      quest = { type: 'complete' as const, text: completeMatch[1] };
      text = text.replace(/\[QUEST COMPLETE:\s*(.*?)\]/i, '');
    }
    
    // [QUEST UPDATE: ...]
    const updateMatch = text.match(/\[QUEST UPDATE:\s*(.*?)\]/i);
    if (updateMatch) {
      quest = { type: 'update' as const, text: updateMatch[1] };
      text = text.replace(/\[QUEST UPDATE:\s*(.*?)\]/i, '');
    }

    setCleanMessageText(text.trim());
    setQuestNotification(quest);

    // Reset typing state when message changes
    if (isUser || !isLast) {
      setDisplayedText(text.trim());
      setIsTypingDone(true);
    } else {
      setDisplayedText('');
      setIsTypingDone(false);
      
      let currentIndex = 0;
      const speed = 15; // ms per char
      const finalText = text.trim();

      const interval = setInterval(() => {
        if (currentIndex < finalText.length) {
          setDisplayedText(finalText.substring(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(interval);
          setIsTypingDone(true);
        }
      }, speed);

      return () => clearInterval(interval);
    }
  }, [message.text, isLast, isUser]);

  useEffect(() => {
    // Cleanup audio on unmount
    return () => {
      if (stopAudioRef.current) {
        stopAudioRef.current();
        stopAudioRef.current = null;
      }
    };
  }, []);

  const toggleAudio = async () => {
    if (isPlaying) {
      if (stopAudioRef.current) {
        stopAudioRef.current();
        stopAudioRef.current = null;
      }
      setIsPlaying(false);
    } else {
      if (message.audio) {
        setIsPlaying(true);
        const { stop } = await playPCM(message.audio, () => setIsPlaying(false));
        stopAudioRef.current = stop;
      }
    }
  };

  const getQuestColor = (type: string) => {
    switch (type) {
      case 'start': return 'bg-amber-500/20 border-amber-500 text-amber-200';
      case 'complete': return 'bg-green-500/20 border-green-500 text-green-200';
      case 'update': return 'bg-blue-500/20 border-blue-500 text-blue-200';
      default: return 'bg-gray-500/20 border-gray-500';
    }
  };

  const getQuestIcon = (type: string) => {
    switch (type) {
      case 'start': return <Scroll size={18} />;
      case 'complete': return <Trophy size={18} />;
      case 'update': return <Star size={18} />;
      default: return <Scroll size={18} />;
    }
  };

  return (
    <div className={`flex w-full mb-8 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[95%] md:max-w-[80%] lg:max-w-[70%] ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-4 items-start`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-xl border border-white/10
          ${isUser ? 'bg-gradient-to-br from-brand-500 to-brand-700 text-white' : 'bg-black/60 backdrop-blur text-brand-400'}`}>
          {isUser ? <User size={18} /> : <Bot size={18} />}
        </div>

        {/* Content Container */}
        <div className="flex flex-col w-full min-w-0">
          
          {/* Main Bubble */}
          <div className={`flex flex-col gap-3 p-5 rounded-2xl shadow-2xl backdrop-blur-xl text-base md:text-lg leading-relaxed border relative transition-all duration-300
            ${isUser 
              ? 'bg-brand-600/90 text-white border-brand-500/50 rounded-tr-none hover:bg-brand-600' 
              : 'bg-gray-900/80 text-gray-100 border-white/10 rounded-tl-none hover:bg-gray-900/90'
            } ${message.isError ? 'border-red-500/50 bg-red-900/40 text-red-200' : ''}`}>
            
            {message.isError && (
              <div className="flex items-center gap-2 font-semibold mb-1 text-red-300">
                <AlertCircle size={16} />
                <span>System Message</span>
              </div>
            )}

            {/* Quest Notification */}
            {questNotification && (
               <div className={`flex items-center gap-3 p-3 rounded-lg border mb-2 animate-in slide-in-from-top-2 ${getQuestColor(questNotification.type)}`}>
                  <div className="p-1.5 rounded-full bg-black/20">
                    {getQuestIcon(questNotification.type)}
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider opacity-80">
                      {questNotification.type === 'start' ? 'New Quest' : questNotification.type === 'complete' ? 'Quest Completed' : 'Quest Updated'}
                    </div>
                    <div className="font-semibold text-sm">
                      {questNotification.text}
                    </div>
                  </div>
               </div>
            )}

            {/* Render Image */}
            {message.image && (
              <div className="mb-2 overflow-hidden rounded-xl border border-white/20 shadow-2xl group cursor-pointer relative bg-black">
                <img 
                  src={message.image} 
                  alt="Scene Visualization" 
                  className="w-full h-auto object-cover max-h-[500px] transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
            )}

            <div className="whitespace-pre-wrap break-words font-medium tracking-wide drop-shadow-sm min-h-[1.5em]">
              {displayedText}
              {!isTypingDone && <span className="animate-pulse inline-block w-2 h-4 bg-brand-400 ml-1 align-middle" />}
            </div>
            
            <div className="flex items-center justify-between mt-1 pt-2 border-t border-white/5">
                <span className={`text-[11px] font-medium opacity-60 ${isUser ? 'text-brand-100' : 'text-gray-400'}`}>
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                
                {/* Audio Control */}
                {message.audio && !isUser && (
                  <button 
                    onClick={toggleAudio}
                    className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-2 text-xs font-semibold border
                      ${isPlaying 
                        ? 'bg-brand-500 text-white border-brand-400 shadow-[0_0_15px_rgba(139,92,246,0.4)] animate-pulse' 
                        : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-brand-300 hover:border-brand-500/30'
                      }`}
                  >
                    {isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                    {isPlaying ? 'Playing...' : 'Narration'}
                  </button>
                )}
            </div>
          </div>

          {/* Interactive Choices - Visual Novel Style (Outside Bubble) */}
          {/* Only show choices AFTER typing is done */}
          {!isUser && hasChoices && isTypingDone && (
            <div className={`flex flex-col gap-3 mt-4 w-full ${!isLast ? 'opacity-40 pointer-events-none grayscale' : 'animate-in fade-in slide-in-from-bottom-4 duration-700'}`}>
              {message.choices!.map((choice, idx) => {
                const isStatCheck = choice.match(/^\[(Strength|Intelligence|Charisma|Endurance|Luck|Wealth)\]/i); // Added Wealth check
                
                // Styles based on stat type
                let statColorClass = 'border-l-gray-500';
                let statIconColor = 'text-gray-400';
                
                if (choice.includes('[Strength]')) { statColorClass = 'border-l-red-500 shadow-[0_0_15px_-5px_rgba(239,68,68,0.3)]'; statIconColor = 'text-red-400'; }
                else if (choice.includes('[Intelligence]')) { statColorClass = 'border-l-blue-500 shadow-[0_0_15px_-5px_rgba(59,130,246,0.3)]'; statIconColor = 'text-blue-400'; }
                else if (choice.includes('[Charisma]')) { statColorClass = 'border-l-pink-500 shadow-[0_0_15px_-5px_rgba(236,72,153,0.3)]'; statIconColor = 'text-pink-400'; } // Changed to Pink/Purple
                else if (choice.includes('[Endurance]')) { statColorClass = 'border-l-green-500 shadow-[0_0_15px_-5px_rgba(34,197,94,0.3)]'; statIconColor = 'text-green-400'; }
                else if (choice.includes('[Luck]')) { statColorClass = 'border-l-purple-500 shadow-[0_0_15px_-5px_rgba(168,85,247,0.3)]'; statIconColor = 'text-purple-400'; }
                else if (choice.includes('[Wealth]')) { statColorClass = 'border-l-amber-400 shadow-[0_0_15px_-5px_rgba(251,191,36,0.5)]'; statIconColor = 'text-amber-300'; } // Added Wealth Style
                else { statColorClass = 'border-l-brand-400 hover:border-l-brand-300 shadow-[0_0_15px_-5px_rgba(139,92,246,0.2)]'; }

                return (
                  <button
                    key={idx}
                    onClick={() => onOptionClick?.(choice)}
                    className={`
                      relative group w-full text-left overflow-hidden
                      bg-gray-900/90 backdrop-blur-md 
                      border border-white/10 
                      ${statColorClass} border-l-4
                      rounded-r-xl rounded-l-sm
                      p-4 md:py-5 transition-all duration-300 ease-out
                      hover:translate-x-1 hover:bg-gray-800
                      hover:shadow-lg hover:border-white/20
                    `}
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    {/* Hover Shine Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out pointer-events-none" />
                    
                    <div className="relative flex items-center justify-between z-10">
                      <div className="flex items-center gap-4">
                        {isStatCheck ? (
                           <div className={`p-2 rounded-lg bg-black/40 border border-white/5 ${statIconColor}`}>
                             {choice.includes('[Wealth]') ? <Trophy size={20} /> : <Dices size={20} />}
                           </div>
                        ) : (
                           <div className="p-2 rounded-lg bg-black/40 border border-white/5 text-brand-300 group-hover:text-white transition-colors group-hover:scale-110 duration-300">
                             <Hexagon size={20} className="group-hover:rotate-90 transition-transform duration-500" />
                           </div>
                        )}
                        
                        <span className={`font-semibold text-base md:text-lg tracking-wide ${isStatCheck ? 'text-gray-100' : 'text-gray-200 group-hover:text-white'}`}>
                          {choice}
                        </span>
                      </div>
                      
                      {/* Arrow Icon */}
                      <ChevronRight 
                        size={20} 
                        className="text-white/20 group-hover:text-brand-300 transform group-hover:translate-x-1 transition-all" 
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};