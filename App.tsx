import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Image as ImageIcon, Sparkles, Trash2, Zap, MonitorPlay, Volume2, VolumeX, Save, FolderOpen, Wand2, History, MessageSquare, MousePointerClick, MapPin } from 'lucide-react';
import { ChatMessage } from './components/ChatMessage';
import { CharacterCreator } from './components/CharacterCreator';
import { SpriteDisplay } from './components/SpriteDisplay';
import { ThemeToggle } from './components/ThemeToggle';
import { ParticleBackground } from './components/ParticleBackground';
import { CheatMenu } from './components/CheatMenu';
import { VisualNovelUI } from './components/VisualNovelUI';
import { initializeChat, sendMessageToGemini, generateImageWithGemini, generateSpeech } from './services/geminiService';
import { Message, CharacterProfile, BackgroundLayer, CharacterStats, GameSettings, Hotspot } from './types';

const generateId = () => Math.random().toString(36).substring(2, 15);

const ACTION_CHIPS = ["Look Around", "Check Phone", "Inventory", "Flirt", "Observing"];

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState(''); // Only used for log view fallback
  const [isTyping, setIsTyping] = useState(false);
  
  // View Mode: 'vn' (Cinematic) or 'log' (Chat History)
  const [viewMode, setViewMode] = useState<'vn' | 'log'>('vn');

  // Audio State
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  // FX State
  const [fxState, setFxState] = useState({ shake: false, flash: false });

  // Settings State
  const [showCheatMenu, setShowCheatMenu] = useState(false);
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    godMode: true,        // Enabled by default
    maxCompliance: true,  // Enabled by default
    nsfwUnlocked: true    // Enabled by default
  });

  // Visual State
  const [bgLayer1, setBgLayer1] = useState<BackgroundLayer>({ url: '', type: 'image' });
  const [bgLayer2, setBgLayer2] = useState<BackgroundLayer>({ url: '', type: 'image' });
  const [activeLayer, setActiveLayer] = useState<1 | 2>(1);

  const [activeSprite, setActiveSprite] = useState<{ url: string | null; name: string; emotion?: string }>({ url: null, name: '', emotion: 'neutral' });
  const [spriteCache, setSpriteCache] = useState<Record<string, string>>({}); 
  
  // Interactables
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);

  // Game State
  const [gameStarted, setGameStarted] = useState(false);
  const [characterProfile, setCharacterProfile] = useState<CharacterProfile | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load state
  useEffect(() => {
    const savedProfile = localStorage.getItem('narrative_profile');
    const savedMessages = localStorage.getItem('narrative_messages');
    const savedBg = localStorage.getItem('narrative_bg');
    const savedGameStarted = localStorage.getItem('narrative_started');

    if (savedProfile && savedMessages && savedGameStarted === 'true') {
      try {
        const parsedProfile = JSON.parse(savedProfile);
        const parsedMessages = JSON.parse(savedMessages);
        
        setCharacterProfile(parsedProfile);
        setMessages(parsedMessages);
        
        if (savedBg) {
          setBgLayer1({ url: savedBg, type: 'image' });
          setActiveLayer(1);
        }
        
        setGameStarted(true);
        initializeChat(parsedProfile, parsedMessages);
        setLastSaved(new Date());
      } catch (e) {
        console.error("Failed to load saved game:", e);
        localStorage.clear(); 
      }
    }
  }, []);

  const stateRef = useRef({ messages, characterProfile, bgLayer1, bgLayer2, activeLayer, gameStarted });
  useEffect(() => {
    stateRef.current = { messages, characterProfile, bgLayer1, bgLayer2, activeLayer, gameStarted };
  }, [messages, characterProfile, bgLayer1, bgLayer2, activeLayer, gameStarted]);

  // Helper to compress messages for storage (removes heavy audio/base64 data)
  const compressMessages = (msgs: Message[]): Message[] => {
    return msgs.map(msg => {
      // Create a copy without audio
      const { audio, ...rest } = msg;
      // Also remove large legacy images if present
      if (rest.image && rest.image.length > 5000) {
         return { ...rest, image: undefined };
      }
      return rest;
    });
  };

  useEffect(() => {
    const saveGame = () => {
      const { gameStarted, characterProfile, messages, activeLayer, bgLayer1, bgLayer2 } = stateRef.current;
      if (gameStarted && characterProfile) {
        try {
            const compressedMessages = compressMessages(messages);
            localStorage.setItem('narrative_profile', JSON.stringify(characterProfile));
            localStorage.setItem('narrative_messages', JSON.stringify(compressedMessages));
            const activeBg = activeLayer === 1 ? bgLayer1 : bgLayer2;
            localStorage.setItem('narrative_bg', activeBg.url);
            localStorage.setItem('narrative_bg_type', activeBg.type);
            localStorage.setItem('narrative_started', 'true');
            setLastSaved(new Date());
        } catch (e) {
            console.error("Auto-save failed", e);
        }
      }
    };
    const intervalId = setInterval(saveGame, 10000);
    const handleVisibilityChange = () => { if (document.visibilityState === 'hidden') saveGame(); };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleManualSave = () => {
      const { gameStarted, characterProfile, messages, activeLayer, bgLayer1, bgLayer2 } = stateRef.current;
      if (!gameStarted || !characterProfile) return;
      try {
          const compressedMessages = compressMessages(messages);
          localStorage.setItem('manual_narrative_profile', JSON.stringify(characterProfile));
          localStorage.setItem('manual_narrative_messages', JSON.stringify(compressedMessages));
          const activeBg = activeLayer === 1 ? bgLayer1 : bgLayer2;
          localStorage.setItem('manual_narrative_bg', activeBg.url);
          localStorage.setItem('manual_narrative_bg_type', activeBg.type);
          alert(`Game saved manually at ${new Date().toLocaleTimeString()}`);
          setLastSaved(new Date());
      } catch (e) { alert("Failed to save game. Storage full."); }
  };

  const handleManualLoad = () => {
      const savedProfile = localStorage.getItem('manual_narrative_profile');
      const savedMessages = localStorage.getItem('manual_narrative_messages');
      const savedBg = localStorage.getItem('manual_narrative_bg');
      
      if (!savedProfile || !savedMessages) { alert("No saved game found."); return; }

      if (window.confirm("Load your manual save? Unsaved progress will be lost.")) {
           try {
              const parsedProfile = JSON.parse(savedProfile);
              const parsedMessages = JSON.parse(savedMessages);
              setCharacterProfile(parsedProfile);
              setMessages(parsedMessages);
              if (savedBg) {
                  setBgLayer1({ url: savedBg, type: 'image' });
                  setBgLayer2({ url: '', type: 'image' }); 
                  setActiveLayer(1);
              }
              setGameStarted(true);
              initializeChat(parsedProfile, parsedMessages);
              setLastSaved(new Date());
           } catch(e) { alert("Failed to load save file."); }
      }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => { scrollToBottom(); }, [messages, isTyping, viewMode]);

  // Handle FX Timeouts
  useEffect(() => {
    if (fxState.shake) {
        const timer = setTimeout(() => setFxState(prev => ({...prev, shake: false})), 500);
        return () => clearTimeout(timer);
    }
  }, [fxState.shake]);

  useEffect(() => {
    if (fxState.flash) {
        const timer = setTimeout(() => setFxState(prev => ({...prev, flash: false})), 1000);
        return () => clearTimeout(timer);
    }
  }, [fxState.flash]);


  // Tag Parsing
  const parseTags = (text: string) => {
    let cleanText = text;
    let scenePrompt = null;
    let spriteData = null;
    const foundHotspots: Hotspot[] = [];
    const effects = { shake: false, flash: false };

    const sceneMatches = [...text.matchAll(/\[SCENE:\s*(.*?)\]/gi)];
    if (sceneMatches.length > 0) scenePrompt = sceneMatches[sceneMatches.length - 1][1];
    cleanText = cleanText.replace(/\[SCENE:\s*(.*?)\]/gi, '');
    
    const spriteMatches = [...text.matchAll(/\[SPRITE:\s*(.*?)\]/gi)];
    if (spriteMatches.length > 0) spriteData = spriteMatches[spriteMatches.length - 1][1];
    cleanText = cleanText.replace(/\[SPRITE:\s*(.*?)\]/gi, '');

    // Hotspot Parsing: [HOTSPOT: Label, X, Y, Action]
    const hotspotRegex = /\[HOTSPOT:\s*(.*?)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(.*?)\]/gi;
    const hotspotMatches = [...text.matchAll(hotspotRegex)];
    hotspotMatches.forEach(match => {
        foundHotspots.push({
            id: generateId(),
            label: match[1].trim(),
            x: parseInt(match[2]),
            y: parseInt(match[3]),
            action: match[4].trim()
        });
    });
    cleanText = cleanText.replace(hotspotRegex, '');

    // Handle clear tag
    const clearHotspots = /\[HOTSPOT:\s*CLEAR\]/i.test(text);
    if (clearHotspots) {
      cleanText = cleanText.replace(/\[HOTSPOT:\s*CLEAR\]/gi, '');
    }

    // FX Parsing
    if (/\[FX:\s*SHAKE\]/i.test(text)) {
        effects.shake = true;
        cleanText = cleanText.replace(/\[FX:\s*SHAKE\]/gi, '');
    }
    if (/\[FX:\s*FLASH\]/i.test(text)) {
        effects.flash = true;
        cleanText = cleanText.replace(/\[FX:\s*FLASH\]/gi, '');
    }

    return { cleanText: cleanText.trim(), scenePrompt, spriteData, foundHotspots, clearHotspots, effects };
  };

  const parseOptions = (text: string): { narrative: string, choices: string[] } => {
    const parts = text.split(/---OPTIONS---|--- OPTIONS ---/i);
    if (parts.length > 1) {
      const narrative = parts[0].trim();
      const optionsBlock = parts[1];
      const choices = optionsBlock.split('\n').map(line => line.trim()).filter(line => line.length > 0 && !line.startsWith('[') && line.length > 1).map(line => line.replace(/^(\d+[\.\)]|[-*•>])\s*/, ''));
      return { narrative, choices };
    }
    return { narrative: text, choices: [] };
  };

  const handleVisualTags = async (scenePrompt: string | null, spriteData: string | null, newHotspots: Hotspot[], shouldClearHotspots: boolean, effects: { shake: boolean, flash: boolean }) => {
    if (effects.shake) setFxState(prev => ({ ...prev, shake: true }));
    if (effects.flash) setFxState(prev => ({ ...prev, flash: true }));
    
    if (scenePrompt) {
      try {
        setHotspots([]); // Always clear hotspots on scene change
        const bgUrl = await generateImageWithGemini(`Visual novel background, ${scenePrompt}`);
        const img = new Image();
        img.src = bgUrl;
        img.onload = () => {
            const newLayerState: BackgroundLayer = { url: bgUrl, type: 'image' };
            if (activeLayer === 1) { setBgLayer2(newLayerState); setActiveLayer(2); } 
            else { setBgLayer1(newLayerState); setActiveLayer(1); }
        };
      } catch (e) { console.error("BG Gen Error", e); }
    } else if (shouldClearHotspots) {
        setHotspots([]);
    }

    if (newHotspots.length > 0) {
        setHotspots(prev => [...prev, ...newHotspots]);
    }

    if (spriteData) {
      if (spriteData.toUpperCase() === 'CLEAR') {
        setActiveSprite({ url: null, name: '', emotion: 'neutral' });
      } else {
        const parts = spriteData.split(',').map(s => s.trim());
        const name = parts[0];
        const emotion = parts[2] || 'neutral';
        const cacheKey = `${name}_${emotion}`.toLowerCase().replace(/\s/g, '');
        if (spriteCache[cacheKey]) {
           setActiveSprite({ url: spriteCache[cacheKey], name, emotion });
        } else {
           try {
             const prompt = `visual novel character sprite, waist up portrait, ${parts.join(', ')}, white background, high quality, 3d render style`;
             const url = await generateImageWithGemini(prompt, 512, 768);
             setSpriteCache(prev => ({ ...prev, [cacheKey]: url }));
             setActiveSprite({ url, name, emotion });
           } catch (e) { console.error("Sprite Gen Error", e); }
        }
      }
    }
  };

  const processUserTurn = async (userText: string) => {
    const newMessage: Message = { id: generateId(), role: 'user', text: userText, timestamp: Date.now() };
    setMessages(prev => [...prev, newMessage]);
    setIsTyping(true);

    try {
      const rawResponse = await sendMessageToGemini(userText, gameSettings);
      const { cleanText, scenePrompt, spriteData, foundHotspots, clearHotspots, effects } = parseTags(rawResponse);
      const { narrative, choices } = parseOptions(cleanText);
      handleVisualTags(scenePrompt, spriteData, foundHotspots, clearHotspots, effects);
      
      let audioData = undefined;
      if (isAudioEnabled) {
          try { audioData = await generateSpeech(narrative); } catch(err) { console.warn("Speech generation failed", err); }
      }

      const botMessage: Message = {
        id: generateId(),
        role: 'model',
        text: narrative,
        choices: choices,
        timestamp: Date.now(),
        audio: audioData
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: Message = { id: generateId(), role: 'model', text: "System Error. Please retry.", timestamp: Date.now(), isError: true };
      setMessages(prev => [...prev, errorMessage]);
    } finally { setIsTyping(false); }
  };

  const handleStartGame = async (profile: CharacterProfile) => {
    setCharacterProfile(profile);
    setGameStarted(true);
    setIsTyping(true);
    initializeChat(profile);
    try {
      const startResponse = await sendMessageToGemini("START_STORY_NOW", gameSettings);
      const { cleanText, scenePrompt, spriteData, foundHotspots, clearHotspots, effects } = parseTags(startResponse);
      const { narrative, choices } = parseOptions(cleanText);
      handleVisualTags(scenePrompt, spriteData, foundHotspots, clearHotspots, effects);
      let audioData = undefined;
      if (isAudioEnabled) { audioData = await generateSpeech(narrative); }
      setMessages([{ id: generateId(), role: 'model', text: narrative, choices: choices, timestamp: Date.now(), audio: audioData }]);
    } catch (e) { console.error("Start error", e); } finally { setIsTyping(false); }
  };

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim()) return;
    const text = inputValue.trim();
    setInputValue('');
    await processUserTurn(text);
  }, [inputValue, gameSettings]);

  const clearChat = () => {
    if (window.confirm("Restart the game?")) {
      localStorage.clear();
      setGameStarted(false);
      setMessages([]);
      setCharacterProfile(null);
      setBgLayer1({ url: '', type: 'image' });
      setBgLayer2({ url: '', type: 'image' });
      setActiveLayer(1);
      setActiveSprite({ url: null, name: '', emotion: 'neutral' });
      setHotspots([]);
      initializeChat(); 
      setLastSaved(null);
    }
  };

  // Render logic for BG
  const renderBackground = (layer: BackgroundLayer, isActive: boolean) => {
     if (!layer.url) return null;
     const commonClasses = `absolute inset-0 w-full h-full object-cover transition-opacity duration-[1500ms] ease-in-out`;
     // Applied animate-pan-zoom to active layer
     return <div className={`${commonClasses} ${isActive ? 'opacity-100 animate-pan-zoom' : 'opacity-0'}`} style={{ backgroundImage: `url("${layer.url}")`, backgroundPosition: 'center', backgroundSize: 'cover' }} />;
  };

  return (
    <div className={`flex flex-col h-screen bg-gray-900 transition-colors duration-200 font-sans overflow-hidden relative ${fxState.shake ? 'animate-shake-screen' : ''}`}>
      
      {fxState.flash && <div className="animate-flash-screen" />}
      
      <ParticleBackground />
      <div className="absolute inset-0 z-0 bg-black overflow-hidden pointer-events-none">
        {renderBackground(bgLayer1, activeLayer === 1)}
        {renderBackground(bgLayer2, activeLayer === 2)}
      </div>
      
      {/* Hotspots Overlay - Styled as interaction points */}
      <div className="absolute inset-0 z-1 pointer-events-none">
        {hotspots.map(h => (
            <button
            key={h.id}
            className="absolute w-14 h-14 -ml-7 -mt-7 pointer-events-auto group flex items-center justify-center transition-transform hover:scale-110"
            style={{ left: `${h.x}%`, top: `${h.y}%` }}
            onClick={() => processUserTurn(h.action)}
            title={h.label}
            >
              <div className="absolute inset-0 bg-blue-500 rounded-full opacity-30 animate-ping"></div>
              <div className="relative w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full border-2 border-white shadow-[0_0_15px_rgba(59,130,246,0.5)] flex items-center justify-center">
                 <MapPin size={20} className="text-white drop-shadow-md" />
              </div>
              
              <div className="absolute top-full mt-2 bg-black/80 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full border border-blue-500/30 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none transform translate-y-2 group-hover:translate-y-0">
                  {h.label}
              </div>
            </button>
        ))}
      </div>

      {/* Dark overlay specifically for Log View, lighter/none for VN View */}
      <div className={`absolute inset-0 z-0 bg-black pointer-events-none transition-opacity duration-500 ${viewMode === 'vn' ? 'opacity-0' : 'opacity-70 backdrop-blur-sm'}`} />

      <SpriteDisplay imageUrl={activeSprite.url} name={activeSprite.name} emotion={activeSprite.emotion} />

      {/* Header */}
      <header className={`flex-shrink-0 transition-all duration-300 z-50 sticky top-0 text-white ${viewMode === 'vn' ? 'bg-transparent hover:bg-black/40' : 'bg-white/5 backdrop-blur-md border-b border-white/10 shadow-lg'}`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-brand-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            <MonitorPlay className="w-6 h-6" />
            <h1 className="font-bold text-xl tracking-tight text-white hidden md:block" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>Eden Garden</h1>
          </div>
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md p-1.5 rounded-full border border-white/10 shadow-lg">
             <button onClick={handleManualSave} disabled={!gameStarted} className="p-2 text-gray-300 hover:text-green-400 rounded-full transition-colors"><Save size={18} /></button>
             <button onClick={handleManualLoad} className="p-2 text-gray-300 hover:text-blue-400 rounded-full transition-colors"><FolderOpen size={18} /></button>
             <button onClick={() => setShowCheatMenu(true)} className="p-2 text-brand-300 hover:text-white rounded-full transition-colors animate-pulse"><Wand2 size={18} /></button>
             
             <div className="h-5 w-px bg-white/20 mx-1"></div>
             
             {/* View Toggle */}
             <button 
               onClick={() => setViewMode(viewMode === 'vn' ? 'log' : 'vn')} 
               className={`p-2 rounded-full transition-colors ${viewMode === 'log' ? 'text-brand-300 bg-white/10' : 'text-gray-300 hover:text-white'}`}
               title={viewMode === 'vn' ? "Show Chat Log" : "Cinematic Mode"}
             >
               {viewMode === 'vn' ? <History size={18} /> : <MessageSquare size={18} />}
             </button>
             <button onClick={() => setIsAudioEnabled(!isAudioEnabled)} className={`p-2 rounded-full transition-colors ${isAudioEnabled ? 'text-brand-300' : 'text-gray-500'}`}>{isAudioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
             <button onClick={clearChat} className="p-2 text-white/50 hover:text-red-400 rounded-full transition-colors"><Trash2 size={18} /></button>
             <ThemeToggle />
          </div>
        </div>
      </header>
      
      {showCheatMenu && <CheatMenu settings={gameSettings} onUpdate={setGameSettings} onClose={() => setShowCheatMenu(false)} />}

      {!gameStarted ? (
        <main className="flex-1 overflow-y-auto z-20 relative"><CharacterCreator onComplete={handleStartGame} /></main>
      ) : (
        <>
          {/* Main View Area */}
          <main className="flex-1 overflow-hidden relative z-10">
            
            {/* LOG VIEW: Standard Chat List */}
            {viewMode === 'log' && (
              <div className="h-full overflow-y-auto p-4 sm:p-6 scroll-smooth">
                <div className="max-w-3xl mx-auto pb-32">
                  {messages.map((msg, index) => (
                    <ChatMessage key={msg.id} message={msg} onOptionClick={(opt) => processUserTurn(opt)} isLast={index === messages.length - 1} />
                  ))}
                  {isTyping && (
                    <div className="flex justify-start mb-6 opacity-70"><Zap size={16} className="text-brand-400 animate-pulse mr-2" /> <span>Thinking...</span></div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}

            {/* VN VIEW: Cinematic UI */}
            {viewMode === 'vn' && (
               <div className="absolute inset-0 pointer-events-none">
                 {/* Only show the LAST message in the visual novel box */}
                 {messages.length > 0 && (
                   <VisualNovelUI 
                      message={messages[messages.length - 1]} 
                      isTyping={isTyping}
                      onOptionClick={(opt) => processUserTurn(opt)}
                      onSendMessage={(text) => processUserTurn(text)}
                      characterName={activeSprite.name || undefined}
                   />
                 )}
               </div>
            )}
          </main>

          {/* Input Area (Only for Log View) */}
          {viewMode === 'log' && (
             <footer className="flex-shrink-0 p-4 border-t border-white/10 z-20 relative bg-black/80 backdrop-blur-lg">
               <div className="max-w-3xl mx-auto flex flex-col gap-2">
                 <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">{ACTION_CHIPS.map(action => (<button key={action} onClick={() => processUserTurn(action)} disabled={isTyping} className="flex-shrink-0 px-3 py-1 bg-white/5 hover:bg-brand-600 border border-white/10 rounded-full text-xs text-gray-300 hover:text-white">{action}</button>))}</div>
                 <div className="relative flex items-end gap-2 bg-white/5 p-2 rounded-3xl border border-white/10">
                    <textarea value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Type action..." className="flex-1 max-h-32 min-h-[44px] py-3 px-2 bg-transparent text-gray-100 focus:outline-none resize-none" rows={1} />
                    <button onClick={handleSendMessage} disabled={!inputValue.trim() || isTyping} className="p-3 mb-1 bg-brand-600 hover:bg-brand-500 text-white rounded-full"><Send size={20} /></button>
                 </div>
               </div>
             </footer>
          )}
        </>
      )}
    </div>
  );
};

export default App;