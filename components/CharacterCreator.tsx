import React, { useState } from 'react';
import { CharacterProfile } from '../types';
import { User, ArrowRight, Dna, Crown, Sparkles, Zap } from 'lucide-react';

interface CharacterCreatorProps {
  onComplete: (profile: CharacterProfile) => void;
}

export const CharacterCreator: React.FC<CharacterCreatorProps> = ({ onComplete }) => {
  const [name, setName] = useState('');
  
  // Hardcoded requirements as requested
  const appearance = "Handsome guy with tapered black hairstyle who has an athletic but lean built body";
  const stats = {
    strength: 10,
    intelligence: 10,
    charisma: 10,
    endurance: 10,
    luck: 10
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onComplete({
        name: name.trim(),
        appearance: appearance,
        stats: stats
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 z-20 relative">
      <div className="w-full max-w-md bg-black/60 backdrop-blur-xl border border-brand-500/30 rounded-2xl shadow-2xl p-6 md:p-8 animate-in fade-in zoom-in duration-500 my-8">
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-brand-600 to-brand-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-500/20 animate-pulse">
            <Crown className="text-white w-8 h-8" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Welcome, King</h2>
          <p className="text-brand-200/80 text-sm">Your empire awaits.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Identity Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2 ml-1 uppercase tracking-wider">Protagonist Name</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-400 group-focus-within:text-brand-300 transition-colors">
                  <User size={20} />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name..."
                  autoFocus
                  className="w-full pl-10 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent text-white placeholder-gray-500 transition-all text-lg font-medium"
                />
              </div>
            </div>
          </div>

          {/* Passive Bonuses Display */}
          <div className="bg-gradient-to-r from-brand-900/50 to-gray-900/50 rounded-xl p-4 border border-white/5">
             <div className="flex items-center gap-2 mb-3 text-xs font-bold text-brand-300 uppercase tracking-widest">
                <Sparkles size={12} />
                <span>Active Bonuses</span>
             </div>
             <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                   <span className="text-gray-400">Appearance</span>
                   <span className="text-white font-medium text-right max-w-[200px] truncate">God-tier Genetics</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                   <span className="text-gray-400">Stats</span>
                   <span className="text-brand-400 font-bold flex items-center gap-1"><Zap size={12} fill="currentColor"/> MAXED OUT (10/10)</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                   <span className="text-gray-400">Wealth</span>
                   <span className="text-green-400 font-bold">UNLIMITED</span>
                </div>
             </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white rounded-xl font-bold text-xl shadow-lg hover:shadow-brand-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <span>Enter World</span>
            <ArrowRight size={24} />
          </button>
        </form>
      </div>
    </div>
  );
};