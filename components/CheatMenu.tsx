import React from 'react';
import { GameSettings } from '../types';
import { X, Wand2, Heart, ShieldAlert, Lock, Unlock } from 'lucide-react';

interface CheatMenuProps {
  settings: GameSettings;
  onUpdate: (newSettings: GameSettings) => void;
  onClose: () => void;
}

export const CheatMenu: React.FC<CheatMenuProps> = ({ settings, onUpdate, onClose }) => {
  
  const toggleSetting = (key: keyof GameSettings) => {
    onUpdate({ ...settings, [key]: !settings[key] });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-brand-500/30 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-900 to-gray-900 p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-brand-500/20 rounded-lg text-brand-300">
                <Wand2 size={24} />
             </div>
             <div>
                <h2 className="text-xl font-bold text-white">Narrative Controls</h2>
                <p className="text-xs text-brand-200 opacity-70">Modify the simulation rules</p>
             </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          
          {/* God Mode */}
          <div 
             onClick={() => toggleSetting('godMode')}
             className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${settings.godMode ? 'bg-brand-500/10 border-brand-500' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
          >
             <div className="flex items-center gap-4">
                <div className={`p-2 rounded-full ${settings.godMode ? 'bg-brand-500 text-white' : 'bg-gray-800 text-gray-500'}`}>
                   <ShieldAlert size={20} />
                </div>
                <div>
                   <h3 className={`font-bold ${settings.godMode ? 'text-brand-200' : 'text-gray-300'}`}>God Mode</h3>
                   <p className="text-xs text-gray-500">Auto-succeed on all stat checks. Max stats.</p>
                </div>
             </div>
             <div className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.godMode ? 'bg-brand-500' : 'bg-gray-700'}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${settings.godMode ? 'translate-x-6' : 'translate-x-0'}`} />
             </div>
          </div>

          {/* Max Compliance */}
          <div 
             onClick={() => toggleSetting('maxCompliance')}
             className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${settings.maxCompliance ? 'bg-pink-500/10 border-pink-500' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
          >
             <div className="flex items-center gap-4">
                <div className={`p-2 rounded-full ${settings.maxCompliance ? 'bg-pink-500 text-white' : 'bg-gray-800 text-gray-500'}`}>
                   <Heart size={20} />
                </div>
                <div>
                   <h3 className={`font-bold ${settings.maxCompliance ? 'text-pink-200' : 'text-gray-300'}`}>Absolute Compliance</h3>
                   <p className="text-xs text-gray-500">NPCs become extremely willing and submissive.</p>
                </div>
             </div>
             <div className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.maxCompliance ? 'bg-pink-500' : 'bg-gray-700'}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${settings.maxCompliance ? 'translate-x-6' : 'translate-x-0'}`} />
             </div>
          </div>

          {/* Unrestricted Mode */}
           <div 
             onClick={() => toggleSetting('nsfwUnlocked')}
             className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${settings.nsfwUnlocked ? 'bg-red-500/10 border-red-500' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
          >
             <div className="flex items-center gap-4">
                <div className={`p-2 rounded-full ${settings.nsfwUnlocked ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-500'}`}>
                   {settings.nsfwUnlocked ? <Unlock size={20} /> : <Lock size={20} />}
                </div>
                <div>
                   <h3 className={`font-bold ${settings.nsfwUnlocked ? 'text-red-200' : 'text-gray-300'}`}>Unrestricted Story</h3>
                   <p className="text-xs text-gray-500">Remove narrative filters and inhibitions.</p>
                </div>
             </div>
             <div className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.nsfwUnlocked ? 'bg-red-500' : 'bg-gray-700'}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${settings.nsfwUnlocked ? 'translate-x-6' : 'translate-x-0'}`} />
             </div>
          </div>

        </div>

        <div className="p-4 bg-black/20 text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Changes apply to next interaction</p>
        </div>

      </div>
    </div>
  );
};