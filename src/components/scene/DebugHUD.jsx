import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, Shield, Users, Zap, ChevronRight, X, Brain, Database } from 'lucide-react';
import { toast } from "sonner";

import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Clock, History, BarChart2 } from 'lucide-react';

export default function DebugHUD({ character, factions, factionStatuses, lastEffect, isOpen, onToggle }) {
  const handleSeedMission5 = async () => {
      try {
          toast.promise(base44.functions.invoke('seedMission5'), {
              loading: 'Seeding Mission 5...',
              success: (data) => {
                  return `Mission 5 Created! ${data.data.message}`;
              },
              error: (err) => {
                  console.error("Seeding failed:", err);
                  const msg = err.response?.data?.error || err.message || 'Unknown error';
                  return `Failed: ${msg}`;
              }
          });
      } catch (err) {
          console.error(err);
      }
  };
  if (!character) return null;

  const { data: choiceHistory } = useQuery({
      queryKey: ['choiceHistory', character.id],
      queryFn: async () => base44.entities.ChoiceHistory.filter({ character_id: character.id }, '-timestamp', 3),
      enabled: isOpen
  });

  const { data: politicalState } = useQuery({
      queryKey: ['politicalState', character.id],
      queryFn: async () => {
          const res = await base44.entities.PoliticalState.filter({ character_id: character.id });
          return res[0] || null;
      },
      enabled: isOpen
  });

  const { data: activeEffects } = useQuery({
      queryKey: ['longTermEffects', character.id],
      queryFn: async () => {
          const res = await base44.entities.LongTermEffect.filter({ character_id: character.id });
          return res.filter(e => e.remaining_scenes > 0);
      },
      enabled: isOpen
  });

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

              {/* Section E: Political State */}
              <section>
                <h3 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-widest flex items-center">
                    <BarChart2 className="w-3 h-3 mr-1.5" /> Political State
                </h3>
                {politicalState ? (
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-900/50 p-2 rounded border border-slate-800 text-xs">
                           <span className="text-slate-400 block mb-1">Old Guard</span>
                           <span className="text-white font-mono">{politicalState.old_guard_pressure}</span>
                        </div>
                        <div className="bg-slate-900/50 p-2 rounded border border-slate-800 text-xs">
                           <span className="text-slate-400 block mb-1">Lantern</span>
                           <span className="text-white font-mono">{politicalState.lantern_influence}</span>
                        </div>
                        <div className="bg-slate-900/50 p-2 rounded border border-slate-800 text-xs">
                           <span className="text-slate-400 block mb-1">Brotherhood</span>
                           <span className="text-white font-mono">{politicalState.brotherhood_shadow}</span>
                        </div>
                        <div className="bg-slate-900/50 p-2 rounded border border-slate-800 text-xs">
                           <span className="text-slate-400 block mb-1">Public</span>
                           <span className="text-white font-mono">{politicalState.public_sentiment}</span>
                        </div>
                    </div>
                ) : (
                    <div className="text-xs text-slate-600 italic">No political data yet</div>
                )}
              </section>

              {/* Section F: Active Effects */}
              <section>
                <h3 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-widest flex items-center">
                    <Clock className="w-3 h-3 mr-1.5" /> Active Effects
                </h3>
                <div className="space-y-2">
                    {activeEffects && activeEffects.length > 0 ? (
                        activeEffects.map(eff => (
                            <div key={eff.id} className="bg-slate-900/30 p-2 rounded border border-amber-900/30 flex justify-between items-center">
                                <span className="text-xs text-amber-200/80">{eff.description}</span>
                                <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-800/50">
                                    {eff.remaining_scenes} left
                                </Badge>
                            </div>
                        ))
                    ) : (
                        <div className="text-xs text-slate-600 italic">No temporary effects active</div>
                    )}
                </div>
              </section>

              {/* Section G: Skills Link */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                  <Button 
                      onClick={() => window.location.href = '/SkillTreePage'}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold"
                  >
                      <Brain className="w-3 h-3 mr-2" /> View Skill Tree
                  </Button>

                  <div className="pt-3 border-t border-slate-800">
                      <h3 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest flex items-center">
                          <Database className="w-3 h-3 mr-1.5" /> Admin Actions
                      </h3>
                      <Button 
                          onClick={async () => {
                              toast.promise(base44.functions.invoke('seedResources'), {
                                  loading: 'Seeding Resources...',
                                  success: 'Resources Seeded!',
                                  error: 'Failed to seed resources'
                              });
                          }}
                          variant="outline"
                          className="w-full border-emerald-500/30 hover:bg-emerald-950/50 text-emerald-300 text-xs mb-2"
                      >
                          <Database className="w-3 h-3 mr-2" />
                          Seed Base Resources
                      </Button>
                      <Button 
                          onClick={async () => {
                              toast.promise(base44.functions.invoke('seedChapterEndings'), {
                                  loading: 'Constructing Endings...',
                                  success: 'Chapter Endings Seeded',
                                  error: 'Failed to seed endings'
                              });
                          }}
                          variant="outline"
                          className="w-full border-purple-500/30 hover:bg-purple-950/50 text-purple-300 text-xs mb-2"
                      >
                          <Database className="w-3 h-3 mr-2" />
                          Seed Chapter Endings
                      </Button>
                      <Button 
                          onClick={async () => {
                              toast.promise(base44.functions.invoke('seedArchetypes'), {
                                  loading: 'Seeding Archetypes...',
                                  success: 'Archetypes Updated',
                                  error: 'Failed to seed archetypes'
                              });
                          }}
                          variant="outline"
                          className="w-full border-pink-500/30 hover:bg-pink-950/50 text-pink-300 text-xs mb-2"
                      >
                          <Brain className="w-3 h-3 mr-2" />
                          Seed Personality Archetypes
                      </Button>
                      <Button 
                          onClick={handleSeedMission5}
                          variant="outline"
                          className="w-full border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 text-xs mb-2"
                      >
                          Seed Mission 5 Content
                      </Button>

                      <Button 
                          onClick={async () => {
                              toast.promise(base44.functions.invoke('seedMission6'), {
                                  loading: 'Seeding Mission 6...',
                                  success: 'Mission 6 Content Created!',
                                  error: 'Failed to seed Mission 6'
                              });
                          }}
                          variant="outline"
                          className="w-full border-indigo-900/50 text-indigo-400 hover:bg-indigo-950/30 text-xs mb-2"
                      >
                          Seed Mission 6: The Spire
                      </Button>

                      <Button 
                          onClick={async () => {
                              toast.promise(base44.functions.invoke('seedMicroScripts'), {
                                  loading: 'Seeding Micro-Skills...',
                                  success: 'Micro-Skills Database Updated',
                                  error: 'Failed to seed scripts'
                              });
                          }}
                          variant="outline"
                          className="w-full border-slate-700 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 text-xs mb-2"
                      >
                          Fix Missing Micro-Skills
                      </Button>

                      <Button 
                          onClick={async () => {
                              if(confirm("Regenerate visual for this specific scene?")) {
                                  // 1. Delete existing cinematic record
                                  const currentSceneId = character.current_scene_id;
                                  const cines = await base44.entities.SceneCinematics.filter({ character_id: character.id, scene_id: currentSceneId });
                                  if(cines.length > 0) {
                                      await base44.entities.SceneCinematics.delete(cines[0].id);
                                  }
                                  toast.success("Cache cleared. Refreshing to regenerate...");
                                  setTimeout(() => window.location.reload(), 500);
                              }
                          }}
                          variant="outline"
                          className="w-full border-slate-700 text-cyan-400 hover:bg-cyan-950/30 text-xs mb-2"
                      >
                          Regenerate Scene Visuals
                      </Button>

                      <Button 
                          onClick={async () => {
                              if(confirm("This will reset your progress in Mission 5 to the beginning. Are you sure?")) {
                                  toast.promise(base44.functions.invoke('resetMission5', { character_id: character.id }), {
                                      loading: 'Resetting Mission 5...',
                                      success: 'Mission Reset Complete',
                                      error: 'Failed to reset mission'
                                  });
                                  setTimeout(() => window.location.reload(), 1500);
                              }
                          }}
                          variant="outline"
                          className="w-full border-red-900/50 text-red-400 hover:bg-red-950/30 text-xs"
                      >
                          Restart Mission 5
                      </Button>
                      </div>
              </div>

            </div>
          </ScrollArea>
        </div>
      )}
    </>
  );
}