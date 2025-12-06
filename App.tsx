import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Image as ImageIcon, Sparkles, Trash2, Zap, MonitorPlay, Volume2, VolumeX, Clapperboard, Film, Save, FolderOpen, Wand2, History, MessageSquare } from 'lucide-react';
import { ChatMessage } from './components/ChatMessage';
import { CharacterCreator } from './components/CharacterCreator';
import { SpriteDisplay } from './components/SpriteDisplay';
import { ThemeToggle } from './components/ThemeToggle';
import { ParticleBackground } from './components/ParticleBackground';
import { CheatMenu } from './components/CheatMenu';
import { VisualNovelUI } from './components/VisualNovelUI';
import { initializeChat, sendMessageToGemini, generateImageWithGemini, generateSpeech, generateSceneVideo } from './services/geminiService';
import { Message, CharacterProfile, BackgroundLayer, CharacterStats, GameSettings } from './types';

const generateId = () => Math.random().toString(36).substring(2, 15);

const ACTION_CHIPS = ["Look Around", "Check Phone", "Inventory", "Flirt", "Observing"];

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState(''); // Only used for log view fallback
  const [isTyping, setIsTyping] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  
  // View Mode: 'vn' (Cinematic) or 'log' (Chat History)
  const [viewMode, setViewMode] = useState<'vn' | 'log'>('vn');

  // Audio State
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  // Settings State - Default to "Unrestricted/Free" mode as requested
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
    const savedBgType = localStorage.getItem('narrative_bg_type');
    const savedGameStarted = localStorage.getItem('narrative_started');

    if (savedProfile && savedMessages && savedGameStarted === 'true') {
      try {
        const parsedProfile = JSON.parse(savedProfile);
        const parsedMessages = JSON.parse(savedMessages);
        
        setCharacterProfile(parsedProfile);
        setMessages(parsedMessages);
        
        if (savedBg) {
          setBgLayer1({ url: savedBg, type: (savedBgType as 'image'|'video') || 'image' });
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

  useEffect(() => {
    const saveGame = () => {
      const { gameStarted, characterProfile, messages, activeLayer, bgLayer1, bgLayer2 } = stateRef.current;
      if (gameStarted && characterProfile) {
        try {
            localStorage.setItem('narrative_profile', JSON.stringify(characterProfile));
            localStorage.setItem('narrative_messages', JSON.stringify(messages));
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
          localStorage.setItem('manual_narrative_profile', JSON.stringify(characterProfile));
          localStorage.setItem('manual_narrative_messages', JSON.stringify(messages));
          const activeBg = activeLayer === 1 ? bgLayer1 : bgLayer2;
          localStorage.setItem('manual_narrative_bg', activeBg.url);
          localStorage.setItem('manual_narrative_bg_type', activeBg.type);
          alert(`Game saved manually at ${new Date().toLocaleTimeString()}`);
          setLastSaved(new Date());
      } catch (e) { alert("Failed to save game."); }
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

  // Tag Parsing
  const parseTags = (text: string) => {
    let cleanText = text;
    let scenePrompt = null;
    let spriteData = null;
    const sceneMatches = [...text.matchAll(/\[SCENE:\s*(.*?)\]/gi)];
    if (sceneMatches.length > 0) scenePrompt = sceneMatches[sceneMatches.length - 1][1];
    cleanText = cleanText.replace(/\[SCENE:\s*(.*?)\]/gi, '');
    const spriteMatches = [...text.matchAll(/\[SPRITE:\s*(.*?)\]/gi)];
    if (spriteMatches.length > 0) spriteData = spriteMatches[spriteMatches.length - 1][1];
    cleanText = cleanText.replace(/\[SPRITE:\s*(.*?)\]/gi, '');
    return { cleanText: cleanText.trim(), scenePrompt, spriteData };
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

  const handleVisualTags = async (scenePrompt: string | null, spriteData: string | null) => {
    if (scenePrompt) {
      try {
        const bgUrl = await generateImageWithGemini(`Visual novel background, ${scenePrompt}`);
        const img = new Image();
        img.src = bgUrl;
        img.onload = () => {
            const newLayerState: BackgroundLayer = { url: bgUrl, type: 'image' };
            if (activeLayer === 1) { setBgLayer2(newLayerState); setActiveLayer(2); } 
            else { setBgLayer1(newLayerState); setActiveLayer(1); }
        };
      } catch (e) { console.error("BG Gen Error", e); }
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
             // Create a detailed prompt for character
             const prompt = `visual novel character sprite, waist up portrait, ${parts.join(', ')}, white background, high quality, 3d render style`;
             const url = await generateImageWithGemini(prompt, 512, 768);
             setSpriteCache(prev => ({ ...prev, [cacheKey]: url }));
             setActiveSprite({ url, name, emotion });
           } catch (e) { console.error("Sprite Gen Error", e); }
        }
      }
    }
  };

  // Logic to generate video from the current context
  const handleGenerateVideo = useCallback(async () => {
    if (isGeneratingVideo) return;
    
    // Check if we need to force key selection upfront
    // @ts-ignore
    if (window.aistudio && window.aistudio.hasSelectedApiKey && !await window.aistudio.hasSelectedApiKey()) {
        try {
            // @ts-ignore
            await window.aistudio.openSelectKey();
        } catch (e) {
            console.error("Key selection cancelled", e);
            return;
        }
    }
    
    // Attempt to extract a scene description from the last message or context
    const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
    // Use the last message text, limited to 200 chars for the prompt
    const prompt = lastMsg ? lastMsg.text.slice(0, 200) : "Cinematic landscape";

    setIsGeneratingVideo(true);
    
    // Add a temporary system message to indicate work
    const loadingId = generateId();
    setMessages(prev => [...prev, { id: loadingId, role: 'model', text: "(Animating the current scene...)", timestamp: Date.now() }]);

    try {
        const videoUrl = await generateSceneVideo(prompt);
        const newLayer: BackgroundLayer = { url: videoUrl, type: 'video' };
        
        // Update background layer
        if (activeLayer === 1) {
            setBgLayer2(newLayer);
            setActiveLayer(2);
        } else {
            setBgLayer1(newLayer);
            setActiveLayer(1);
        }
        
        // Remove loading message
        setMessages(prev => prev.filter(m => m.id !== loadingId));

    } catch (e: any) {
        console.error("Video failed", e);
        
        // Robust check for 404/Not Found which implies missing Paid API key for Veo
        let isAuthError = false;
        try {
            const errorStr = JSON.stringify(e);
            isAuthError = errorStr.includes("404") || 
                          errorStr.includes("NOT_FOUND") || 
                          errorStr.includes("Requested entity was not found");
        } catch (jsonError) {
            // Fallback if stringify fails
            isAuthError = e.toString().includes("Requested entity was not found") || 
                          e.message?.includes("Requested entity was not found") || 
                          e.status === 404;
        }

        if (isAuthError) {
             // Trigger key selection if available
             // @ts-ignore - aistudio is injected in this specific environment
             if (window.aistudio && window.aistudio.openSelectKey) {
                 // @ts-ignore
                 await window.aistudio.openSelectKey();
                 setMessages(prev => prev.map(m => m.id === loadingId ? { ...m, text: "(Paid API Key required for Video. Please select a key in the pop-up and click the video button again.)", isError: true } : m));
             } else {
                 setMessages(prev => prev.map(m => m.id === loadingId ? { ...m, text: "(Video generation requires a paid API key.)", isError: true } : m));
             }
        } else {
            setMessages(prev => prev.map(m => m.id === loadingId ? { ...m, text: "(Video generation failed. Please try again.)", isError: true } : m));
        }
    } finally {
        setIsGeneratingVideo(false);
    }
  }, [messages, activeLayer, isGeneratingVideo]);

  const processUserTurn = async (userText: string) => {
    const newMessage: Message = { id: generateId(), role: 'user', text: userText, timestamp: Date.now() };
    setMessages(prev => [...prev, newMessage]);
    setIsTyping(true);

    try {
      const rawResponse = await sendMessageToGemini(userText, gameSettings);
      const { cleanText, scenePrompt, spriteData } = parseTags(rawResponse);
      const { narrative, choices } = parseOptions(cleanText);
      handleVisualTags(scenePrompt, spriteData);
      
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
      const { cleanText, scenePrompt, spriteData } = parseTags(startResponse);
      const { narrative, choices } = parseOptions(cleanText);
      handleVisualTags(scenePrompt, spriteData);
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
      initializeChat(); 
      setLastSaved(null);
    }
  };

  // Render logic for BG
  const renderBackground = (layer: BackgroundLayer, isActive: boolean) => {
     if (!layer.url) return null;
     const commonClasses = `absolute inset-0 w-full h-full object-cover transition-opacity duration-[2000ms] ease-in-out transform transition-transform duration-[20000ms] ease-out`;
     const style = { opacity: isActive ? 1 : 0, transform: isActive ? 'scale(1.1)' : 'scale(1)' }; // Opacity 1 for cinematic view
     
     if (layer.type === 'video') {
         return (
            <video 
                key={layer.url} 
                src={layer.url} 
                autoPlay 
                loop 
                muted 
                playsInline 
                className={commonClasses} 
                style={style}
                onLoadedData={(e) => {
                    // Force play if autoplay fails
                    e.currentTarget.play().catch(err => console.error("Auto-play failed", err));
                }}
            />
         );
     }
     return <div className={commonClasses} style={{ ...style, backgroundImage: `url("${layer.url}")`, backgroundPosition: 'center', backgroundSize: 'cover' }} />;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 transition-colors duration-200 font-sans overflow-hidden relative">
      <ParticleBackground />
      <div className="absolute inset-0 z-0 bg-black overflow-hidden pointer-events-none">
        {renderBackground(bgLayer1, activeLayer === 1)}
        {renderBackground(bgLayer2, activeLayer === 2)}
      </div>
      {/* Dark overlay specifically for Log View, lighter/none for VN View */}
      <div className={`absolute inset-0 z-0 bg-black pointer-events-none transition-opacity duration-500 ${viewMode === 'vn' ? 'opacity-10' : 'opacity-70 backdrop-blur-sm'}`} />

      <SpriteDisplay imageUrl={activeSprite.url} name={activeSprite.name} emotion={activeSprite.emotion} />

      {/* Header */}
      <header className={`flex-shrink-0 transition-all duration-300 z-50 sticky top-0 text-white ${viewMode === 'vn' ? 'bg-transparent hover:bg-black/40' : 'bg-white/5 backdrop-blur-md border-b border-white/10 shadow-lg'}`}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-brand-300 drop-shadow-lg">
            <MonitorPlay className="w-6 h-6" />
            <h1 className="font-bold text-xl tracking-tight text-white hidden md:block">Eden Garden</h1>
          </div>
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md p-1.5 rounded-full border border-white/10">
             <button onClick={handleManualSave} disabled={!gameStarted} className="p-2 text-gray-300 hover:text-green-400 rounded-full transition-colors"><Save size={18} /></button>
             <button onClick={handleManualLoad} className="p-2 text-gray-300 hover:text-blue-400 rounded-full transition-colors"><FolderOpen size={18} /></button>
             <button onClick={() => setShowCheatMenu(true)} className="p-2 text-brand-300 hover:text-white rounded-full transition-colors animate-pulse"><Wand2 size={18} /></button>
             
             <div className="h-5 w-px bg-white/20 mx-1"></div>
             
             {/* Video Trigger */}
             <button 
                onClick={handleGenerateVideo} 
                disabled={isGeneratingVideo || !gameStarted}
                className={`p-2 rounded-full transition-colors ${isGeneratingVideo ? 'text-brand-400 animate-pulse' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                title="Animate Current Scene"
             >
                <Clapperboard size={18} />
             </button>

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
                  {(isTyping || isGeneratingImage) && (
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