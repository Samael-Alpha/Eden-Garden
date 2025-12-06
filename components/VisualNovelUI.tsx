import React, { useState, useEffect, useRef } from 'react';
import { Message } from '../types';
import { ChevronRight, Dices, Send, Play, Pause, Trophy, Star, Scroll, Flame, Sparkles, MessageCircle, Minus, Eye, Smartphone, Briefcase, Heart, Search } from 'lucide-react';

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
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Audio
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const cleanText = message.text
    .replace(/\[QUEST START:.*?\]/i, '')
    .replace(/\[QUEST COMPLETE:.*?\]/i, '')
    .replace(/\[QUEST UPDATE:.*?\]/i, '')
    .replace(/\[FX:.*?\]/gi, '')
    .trim();

  // Reset minimize state on new message
  useEffect(() => {
    setIsMinimized(false);
  }, [message.id]);

  // Typewriter effect
  useEffect(() => {
    setDisplayedText('');
    setShowChoices(false);
    
    if (message.role === 'user') {
      setDisplayedText(cleanText);
      return;
    }

    let i = 0;
    const speed = 25; 
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

  const questMatch = message.text.match(/\[QUEST (START|COMPLETE|UPDATE):\s*(.*?)\]/i);
  const questType = questMatch?.[1]?.toLowerCase();
  const questName = questMatch?.[2];

  const quickActions = [
    { label: 'Look', icon: Eye, action: 'Look Around' },
    { label: 'Phone', icon: Smartphone, action: 'Check Phone' },
    { label: 'Inventory', icon: Briefcase, action: 'Inventory' },
    { label: 'Flirt', icon: Heart, action: 'Flirt' },
    { label: 'Search', icon: Search, action: 'Observing' },
  ];

  // Minimized View
  if (isMinimized) {
    return (
      <div className="fixed inset-0 pointer-events-none z-40">
        {/* Keep Quest Popups visible even when minimized */}
        {questName && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 pointer-events-auto animate-in zoom-in slide-in-from-top-4 duration-700">
             <div className={`
               px-6 py-2 rounded-lg border-2 shadow-[0_0_20px_rgba(0,0,0,0.6)] flex items-center gap-3
               ${questType === 'start' ? 'bg-amber-900/90 border-amber-500 text-amber-100' : 
                 questType === 'complete' ? 'bg-green-900/90 border-green-500 text-green-100' : 
                 'bg-blue-900/90 border-blue-500 text-blue-100'}
             `}>
                <span className="font-bold text-sm shadow-black drop-shadow-md">{questName}</span>
             </div>
          </div>
        )}

        <div className="absolute bottom-8 right-8 pointer-events-auto animate-in zoom-in duration-300">
            <button 
              onClick={() => setIsMinimized(false)} 
              className="w-16 h-16 bg-brand-600 hover:bg-brand-500 text-white rounded-full shadow-[0_0_25px_rgba(124,58,237,0.6)] flex items-center justify-center border-2 border-white/20 transition-all hover:scale-110 group"
              title="Show Dialogue"
            >
              <MessageCircle size={32} className="group-hover:animate-pulse" />
              {/* Notification badge if typing */}
              {displayedText.length < cleanText.length && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-brand-600 animate-ping" />
              )}
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 pointer-events-none flex flex-col justify-end p-4 pb-6 md:p-8">
      
      {/* Quest Popup - Top Center */}
      {questName && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 pointer-events-auto animate-in zoom-in slide-in-from-top-4 duration-700">
           <div className={`
             px-6 py-2 rounded-lg border-2 shadow-[0_0_20px_rgba(0,0,0,0.6)] flex items-center gap-3 transform hover:scale-105 transition-transform
             ${questType === 'start' ? 'bg-amber-900/90 border-amber-500 text-amber-100' : 
               questType === 'complete' ? 'bg-green-900/90 border-green-500 text-green-100' : 
               'bg-blue-900/90 border-blue-500 text-blue-100'}
           `}>
              <div className="bg-black/30 p-1 rounded-md">
                {questType === 'start' && <Scroll size={18} />}
                {questType === 'complete' && <Trophy size={18} />}
                {questType === 'update' && <Star size={18} />}
              </div>
              <div className="flex flex-col">
                <span className="font-black tracking-widest uppercase text-[10px] leading-tight opacity-80">
                  {questType === 'start' ? 'New Quest Started' : questType === 'complete' ? 'Quest Completed' : 'Quest Updated'}
                </span>
                <span className="font-bold text-sm shadow-black drop-shadow-md">{questName}</span>
              </div>
           </div>
        </div>
      )}

      {/* Choices - Right Side, Game Style */}
      {showChoices && message.choices && message.choices.length > 0 && !isTyping && (
        <div className="absolute right-6 bottom-[28vh] md:bottom-[32vh] flex flex-col gap-3 items-end pointer-events-auto animate-in slide-in-from-right-12 fade-in duration-500 z-50">
          {message.choices.map((choice, idx) => {
            const isStatCheck = choice.match(/^\[(Strength|Intelligence|Charisma|Endurance|Luck|Wealth)\]/i);
            let gradientClass = 'from-blue-600 to-blue-500 border-blue-400';
            let icon = null;
            let glowClass = '';

            if (choice.includes('[Wealth]')) { 
                gradientClass = 'from-amber-500 to-amber-600 border-amber-300'; 
                glowClass = 'glow-wealth';
                icon = <Trophy size={16} className="text-white drop-shadow-md" />;
            }
            else if (choice.includes('[Strength]')) { 
                gradientClass = 'from-red-600 to-red-500 border-red-400';
                icon = <Flame size={16} className="text-white drop-shadow-md" />;
            }
            else if (choice.includes('[Charisma]')) { 
                gradientClass = 'from-pink-600 to-pink-500 border-pink-400';
                icon = <Sparkles size={16} className="text-white drop-shadow-md" />;
            }

            return (
              <button
                key={idx}
                onClick={() => onOptionClick(choice)}
                className={`
                  relative overflow-hidden text-right
                  bg-gradient-to-r ${gradientClass}
                  border-2
                  rounded-xl
                  px-6 py-3
                  min-w-[200px] max-w-[350px]
                  shadow-[0_5px_15px_rgba(0,0,0,0.5)] 
                  transform transition-all duration-200
                  hover:scale-105 hover:translate-x-[-5px] active:scale-95
                  ${glowClass}
                `}
                style={{ animationDelay: `${idx * 75}ms` }}
              >
                {/* Glossy overlay */}
                <div className="absolute inset-0 glossy-button pointer-events-none" />
                
                <div className="relative flex items-center justify-end gap-3 z-10">
                   <span className="font-bold text-white text-sm md:text-base drop-shadow-md leading-tight">{choice}</span>
                   {icon ? <div className="bg-black/20 p-1 rounded-md">{icon}</div> : 
                    isStatCheck ? <Dices size={16} className="text-white/80" /> : 
                    <ChevronRight size={18} className="text-white/80" />
                   }
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Text Box - VN Style */}
      <div className="w-full max-w-5xl mx-auto pointer-events-auto relative animate-in slide-in-from-bottom-6 duration-500">
          
          {/* Character Name Tag - Attached to top left */}
          {characterName && (
              <div className="absolute -top-5 left-4 md:left-8 z-20">
                  <div className="bg-pink-600 text-white px-6 py-1.5 rounded-t-lg border-x-2 border-t-2 border-pink-400 shadow-[0_0_10px_rgba(0,0,0,0.5)] transform skew-x-[-10deg]">
                      <div className="transform skew-x-[10deg] font-black uppercase tracking-wider text-sm md:text-base drop-shadow-md">
                          {characterName}
                      </div>
                  </div>
              </div>
          )}

          {/* The Box */}
          <div className="bg-slate-900/90 backdrop-blur-md border-2 border-slate-600 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.8)] overflow-hidden relative">
              
              {/* Glossy sheen on top half of box */}
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

              {/* Box Controls (Top Right) */}
              <div className="absolute top-2 right-2 flex items-center gap-1 z-20">
                  {message.audio && (
                      <button 
                        onClick={playAudio}
                        className="p-1.5 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700/80 rounded-full transition-colors border border-slate-600"
                        title="Replay Audio"
                      >
                          {isPlayingAudio ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                  )}
                  <button 
                    onClick={() => setIsMinimized(true)}
                    className="p-1.5 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700/80 rounded-full transition-colors border border-slate-600"
                    title="Minimize"
                  >
                    <Minus size={14} />
                  </button>
              </div>

              <div className="p-6 md:p-8 pt-8 md:pt-10 flex flex-col gap-2 min-h-[140px]">
                  <p className="text-base md:text-lg text-white font-medium leading-relaxed drop-shadow-md" style={{ textShadow: '1px 1px 2px black' }}>
                     {displayedText}
                     {displayedText.length < cleanText.length && <span className="inline-block w-2 h-5 bg-white ml-1 animate-pulse align-middle"/>}
                  </p>

                  {/* Controls Container */}
                  <div className="mt-4 border-t border-white/10 pt-3 flex flex-col gap-3">
                      
                      {/* Quick Commands - Expandable Icons */}
                      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                         {quickActions.map(qa => (
                           <button
                             key={qa.label}
                             onClick={() => onSendMessage(qa.action)}
                             className="group flex items-center gap-2 px-2.5 py-2 bg-black/40 hover:bg-brand-600 rounded-full border border-white/10 transition-all duration-500 ease-out max-w-[42px] hover:max-w-[140px] overflow-hidden whitespace-nowrap shadow-lg backdrop-blur-sm"
                             title={qa.label}
                           >
                              <qa.icon size={20} className="flex-shrink-0 text-brand-300 group-hover:text-white" />
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-sm font-bold text-white pr-2">
                                {qa.label}
                              </span>
                           </button>
                         ))}
                      </div>

                      {/* Input Field - Integrated */}
                      <div className="flex items-center gap-3">
                          <div className="bg-black/40 rounded-full flex-1 flex items-center px-4 py-1.5 border border-white/5 focus-within:border-brand-400/50 transition-colors shadow-inner">
                              <input
                                  type="text"
                                  value={inputValue}
                                  onChange={(e) => setInputValue(e.target.value)}
                                  onKeyDown={handleKeyDown}
                                  placeholder={showChoices ? "" : "What do you want to do?"}
                                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-300 focus:text-white transition-colors h-6 p-0 placeholder-gray-500"
                                  disabled={isTyping}
                              />
                          </div>
                          <button 
                              onClick={() => { if(inputValue.trim()) { onSendMessage(inputValue); setInputValue(''); }}}
                              disabled={!inputValue.trim() || isTyping}
                              className="bg-brand-600 hover:bg-brand-500 text-white p-2 rounded-full shadow-lg transition-transform transform hover:scale-110 disabled:opacity-50 disabled:scale-100"
                          >
                              <Send size={16} />
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      </div>

    </div>
  );
};