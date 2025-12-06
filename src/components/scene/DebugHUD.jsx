import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, Shield, Users, Zap, ChevronRight, X } from 'lucide-react';

export default function DebugHUD({ character, factions, factionStatuses, lastEffect, isOpen, onToggle }) {
  if (!character) return null;

  // --- Section A: Energies ---
  const { masculine_energy = 50, feminine_energy = 50 } = character;
  const energyDiff = masculine_energy - feminine_energy;
  
  let balanceZone = "mild imbalance";
  let zoneColor = "text-amber-400";
  
  if (Math.abs(energyDiff) <= 10) {
    balanceZone = "balanced";
    zoneColor = "text-green-400";
  } else if (energyDiff >= 15) {
    balanceZone = "shadow_masculine";
    zoneColor = "text-red-400";
  } else if (energyDiff <= -15) {
    balanceZone = "shadow_feminine";
    zoneColor = "text-purple-400";
  }

  // --- Section B: Core Stats ---
  const getStatTag = (val) => {
    if (val >= 80) return { label: "dominant", color: "bg-purple-600" };
    if (val >= 50) return { label: "strong", color: "bg-indigo-600" };
    if (val >= 20) return { label: "moderate", color: "bg-blue-600" };
    return { label: "low", color: "bg-slate-600" };
  };

  const stats = [
    { key: 'presence', label: 'Presence' },
    { key: 'insight', label: 'Insight' },
    { key: 'resolve', label: 'Resolve' },
    { key: 'care', label: 'Care' },
    { key: 'fear_freeze', label: 'Fear Freeze' },
  ];

  // --- Section C: Factions ---
  const getFactionTag = (val) => {
    if (val >= 10) return { label: "aligned", color: "text-green-400" };
    if (val >= 5) return { label: "friendly", color: "text-emerald-400" };
    if (val >= 1) return { label: "neutral", color: "text-slate-400" };
    if (val >= -4) return { label: "wary", color: "text-amber-400" };
    return { label: "hostile", color: "text-red-500" };
  };

  const getFactionStatus = (factionId) => {
    const status = factionStatuses?.find(s => s.faction_id === factionId);
    return status ? status.alignment : 0;
  };

  return (
    <>
      {/* Toggle Button */}
      <Button
        className="fixed bottom-4 right-4 z-50 rounded-full shadow-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-indigo-400"
        onClick={onToggle}
        size="sm"
      >
        {isOpen ? <X className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
        <span className="ml-2 font-mono text-xs">{isOpen ? 'Hide HUD' : 'Warden HUD'}</span>
      </Button>

      {/* HUD Panel */}
      {isOpen && (
        <div className="fixed top-0 right-0 h-full w-[320px] bg-slate-950/95 backdrop-blur-md border-l border-slate-800 z-40 shadow-2xl flex flex-col transition-transform duration-300 animate-in slide-in-from-right">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <h2 className="font-mono text-xs font-bold text-indigo-400 flex items-center tracking-wider">
              <Activity className="w-3 h-3 mr-2" /> DEBUG CONSOLE
            </h2>
            <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse delay-75"></div>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse delay-150"></div>
            </div>
          </div>

          <ScrollArea className="flex-1 p-5">
            <div className="space-y-8 pb-20">
                
              {/* Section A: Energies */}
              <section>
                <h3 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-widest flex items-center">
                    <Zap className="w-3 h-3 mr-1.5" /> Energies
                </h3>
                <div className="space-y-3 bg-slate-900/50 p-3 rounded border border-slate-800">
                    <div className="flex justify-between text-xs">
                        <span className="text-blue-300">Masculine</span>
                        <span className="font-mono text-white">{masculine_energy}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${masculine_energy}%` }}></div>
                    </div>

                    <div className="flex justify-between text-xs">
                        <span className="text-pink-300">Feminine</span>
                        <span className="font-mono text-white">{feminine_energy}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-pink-500" style={{ width: `${feminine_energy}%` }}></div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 mt-2 flex justify-between items-center">
                        <span className="text-[10px] text-slate-500 uppercase">Zone</span>
                        <span className={`text-xs font-mono font-bold ${zoneColor}`}>{balanceZone}</span>
                    </div>
                </div>
              </section>

              {/* Section B: Core Stats */}
              <section>
                <h3 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-widest flex items-center">
                    <Shield className="w-3 h-3 mr-1.5" /> Core Stats
                </h3>
                <div className="grid gap-2">
                    {stats.map(({ key, label }) => {
                        const val = character[key] || 0;
                        const tag = getStatTag(val);
                        return (
                            <div key={key} className="flex items-center justify-between bg-slate-900/30 p-2 rounded border border-slate-800/50 hover:bg-slate-800/50 transition-colors">
                                <span className="text-xs text-slate-300">{label}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] px-1.5 py-0.5 rounded text-white/90 font-medium tracking-tight min-w-[60px] text-center bg-slate-800 border border-slate-700/50">
                                        {val} <span className="opacity-50 mx-0.5">|</span> {tag.label}
                                    </span>
                                    <div className={`w-1.5 h-8 rounded-sm ${tag.color}`}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
              </section>

              {/* Section C: Factions */}
              <section>
                <h3 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-widest flex items-center">
                    <Users className="w-3 h-3 mr-1.5" /> Factions
                </h3>
                <div className="space-y-2">
                    {factions && factions.length > 0 ? (
                        factions.map(faction => {
                            const alignment = getFactionStatus(faction.id);
                            const tag = getFactionTag(alignment);
                            return (
                                <div key={faction.id} className="flex items-center justify-between bg-slate-900/30 p-2 rounded border border-slate-800/50">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-slate-200 font-medium">{faction.name}</span>
                                        <span className={`text-[10px] ${tag.color}`}>{tag.label}</span>
                                    </div>
                                    <div className="font-mono text-xs text-slate-400">
                                        {alignment > 0 ? '+' : ''}{alignment}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-xs text-slate-600 italic p-2">No factions found</div>
                    )}
                </div>
              </section>

              {/* Section D: Last Choice Impact */}
              <section>
                <h3 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-widest flex items-center">
                    <Activity className="w-3 h-3 mr-1.5" /> Last Effect
                </h3>
                <div className="bg-slate-900/80 p-3 rounded border border-slate-800 font-mono text-[10px] text-slate-400 overflow-hidden">
                    {lastEffect ? (
                        <div className="space-y-2">
                            <div className="flex justify-between border-b border-slate-800 pb-1">
                                <span className="text-indigo-400">Script:</span>
                                <span className="text-slate-200 truncate max-w-[150px]" title={lastEffect.name}>{lastEffect.name}</span>
                            </div>
                            <div className="max-h-32 overflow-y-auto text-green-400/80 whitespace-pre-wrap break-words">
                                {JSON.stringify(lastEffect.effect_json, null, 2)}
                            </div>
                        </div>
                    ) : (
                        <span className="italic text-slate-600">No effect triggered yet...</span>
                    )}
                </div>
              </section>

            </div>
          </ScrollArea>
        </div>
      )}
    </>
  );
}