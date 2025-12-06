import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Lock, Unlock, Shield, Brain, Heart, Users, Eye, Activity, Cloud, Zap, Scale } from 'lucide-react';

export default function SkillTreePage() {
  const [characterId, setCharacterId] = useState(null);

  useEffect(() => {
    const id = sessionStorage.getItem('selectedCharacterId');
    if (!id) {
      window.location.href = '/CharacterSelect';
    } else {
      setCharacterId(id);
    }
  }, []);

  const { data: skills, refetch: refetchSkills } = useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
        const list = await base44.entities.Skill.list();
        if (list.length === 0) {
            // Auto-seed if empty
            await base44.functions.invoke('seedSkills');
            return await base44.entities.Skill.list();
        }
        return list;
    }
  });

  const { data: unlockedSkills } = useQuery({
    queryKey: ['unlockedSkills', characterId],
    queryFn: async () => base44.entities.CharacterSkill.filter({ character_id: characterId }),
    enabled: !!characterId
  });

  const categories = [
    { id: 'grounding', name: 'Grounding', icon: Cloud, color: 'text-blue-400', bg: 'bg-blue-900/20', border: 'border-blue-800' },
    { id: 'relational', name: 'Relational', icon: Heart, color: 'text-pink-400', bg: 'bg-pink-900/20', border: 'border-pink-800' },
    { id: 'critical_thought', name: 'Critical Thought', icon: Brain, color: 'text-purple-400', bg: 'bg-purple-900/20', border: 'border-purple-800' },
    { id: 'protector_stance', name: 'Protector Stance', icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-900/20', border: 'border-emerald-800' },
    { id: 'social_awareness', name: 'Social Awareness', icon: Users, color: 'text-amber-400', bg: 'bg-amber-900/20', border: 'border-amber-800' },
    { id: 'nd_sensitivity', name: 'ND Sensitivity', icon: Activity, color: 'text-teal-400', bg: 'bg-teal-900/20', border: 'border-teal-800' },
    { id: 'peer_resistance', name: 'Peer Resistance', icon: Shield, color: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-800' },
    { id: 'self_insight', name: 'Self Insight', icon: Eye, color: 'text-indigo-400', bg: 'bg-indigo-900/20', border: 'border-indigo-800' },
    { id: 'political_awareness', name: 'Political', icon: Scale, color: 'text-slate-400', bg: 'bg-slate-900/20', border: 'border-slate-800' }
  ];

  const isUnlocked = (skillId) => {
    return unlockedSkills?.some(us => us.skill_id === skillId);
  };

  const handleBack = () => {
    window.location.href = '/SceneView';
  };

  if (!skills || !unlockedSkills) {
    return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading skills...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={handleBack} className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5 mr-2" /> Back to Scene
          </Button>
          <h1 className="text-3xl font-bold text-white tracking-tight">Skill Matrix</h1>
          <Badge variant="outline" className="ml-auto border-indigo-500 text-indigo-400">
            {unlockedSkills.length} / {skills.length} Unlocked
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map(cat => {
            const catSkills = skills.filter(s => s.category === cat.id).sort((a, b) => a.tier - b.tier);
            const Icon = cat.icon;
            
            return (
              <Card key={cat.id} className={`border-t-4 ${cat.border} bg-slate-900/50 backdrop-blur-sm overflow-hidden`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className={`text-lg font-bold ${cat.color} flex items-center gap-2`}>
                      <Icon className="w-5 h-5" /> {cat.name}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                  {catSkills.map(skill => {
                    const unlocked = isUnlocked(skill.id);
                    return (
                      <div 
                        key={skill.id} 
                        className={`
                          relative p-4 rounded-lg border transition-all duration-300
                          ${unlocked 
                            ? `${cat.bg} ${cat.border} border shadow-lg` 
                            : 'bg-slate-950/50 border-slate-800/50 opacity-60 grayscale hover:grayscale-0'
                          }
                        `}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className={`font-semibold text-sm ${unlocked ? 'text-white' : 'text-slate-500'}`}>
                            {skill.name}
                          </h4>
                          <Badge className={`text-[10px] px-1.5 py-0 ${unlocked ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-600'}`}>
                            Tier {skill.tier}
                          </Badge>
                        </div>
                        
                        <p className="text-xs text-slate-400 leading-relaxed mb-3">
                          {skill.description}
                        </p>

                        {unlocked ? (
                            <div className="space-y-2">
                                {skill.effects && (
                                    <div className="flex flex-wrap gap-1">
                                        {skill.effects.stats && Object.entries(skill.effects.stats).map(([k, v]) => (
                                            <span key={k} className="text-[9px] uppercase tracking-wider bg-slate-900/50 px-1.5 py-0.5 rounded text-indigo-300 border border-indigo-900/50">
                                                +{v} {k}
                                            </span>
                                        ))}
                                        {skill.effects.political && Object.entries(skill.effects.political).map(([k, v]) => (
                                            <span key={k} className="text-[9px] uppercase tracking-wider bg-slate-900/50 px-1.5 py-0.5 rounded text-amber-300 border border-amber-900/50">
                                                {v > 0 ? '+' : ''}{v} {k.replace('_', ' ')}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono mt-2">
                                    <Unlock className="w-3 h-3" />
                                    <span>ACTIVE</span>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-2 pt-2 border-t border-slate-800/50">
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono mb-1">
                                    <Lock className="w-3 h-3" />
                                    <span>LOCKED</span>
                                </div>
                                <div className="text-[10px] text-slate-600">
                                    Requirements: 
                                    <span className="block text-slate-500 italic mt-0.5">
                                        {JSON.stringify(skill.unlock_requirements).slice(0, 60)}...
                                    </span>
                                </div>
                            </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}