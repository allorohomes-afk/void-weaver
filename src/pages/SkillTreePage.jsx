import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ArrowLeft, Brain, Layout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import SkillCategory from '@/components/skills/SkillCategory';
import SkillDetailModal from '@/components/skills/SkillDetailModal';

export default function SkillTreePage() {
    const [characterId, setCharacterId] = useState(null);
    const [selectedSkill, setSelectedSkill] = useState(null);

    // Initialize Character ID
    useEffect(() => {
        // Try URL params first, then session
        const params = new URLSearchParams(window.location.search);
        const urlId = params.get('character_id');
        const sessionId = sessionStorage.getItem('selectedCharacterId');
        
        if (urlId) setCharacterId(urlId);
        else if (sessionId) setCharacterId(sessionId);
        else window.location.href = '/CharacterSelect';
    }, []);

    // --- Queries ---
    const { data: character, isLoading: charLoading } = useQuery({
        queryKey: ['character', characterId],
        queryFn: async () => (await base44.entities.Character.filter({ id: characterId }))[0],
        enabled: !!characterId
    });

    const { data: allSkills = [], isLoading: skillsLoading } = useQuery({
        queryKey: ['skills'],
        queryFn: async () => await base44.entities.Skill.list()
    });

    const { data: characterSkills = [], isLoading: csLoading } = useQuery({
        queryKey: ['characterSkills', characterId],
        queryFn: async () => await base44.entities.CharacterSkill.filter({ character_id: characterId }),
        enabled: !!characterId
    });

    // --- Processing ---
    const categories = [
        "grounding", "relational", "critical_thought", 
        "protector_stance", "social_awareness", "nd_sensitivity", 
        "peer_resistance", "self_insight", "political_awareness"
    ];

    const handleBack = () => {
        window.location.href = '/SceneView';
    };

    const getUnlockedAt = (skillId) => {
        const cs = characterSkills.find(c => c.skill_id === skillId);
        return cs ? cs.unlocked_at : null;
    };

    const getSkillStatus = (skillId) => {
        const cs = characterSkills.find(c => c.skill_id === skillId);
        return cs ? 'unlocked' : 'locked';
    };

    if (charLoading || skillsLoading || csLoading || !characterId) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    // Calculate total mastery for header stats
    const totalUnlocked = characterSkills.length;
    const totalSkills = allSkills.length;
    const masteryPct = Math.round((totalUnlocked / totalSkills) * 100) || 0;

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#020617] via-[#0f172a] to-black text-slate-200 font-sans selection:bg-cyan-500/30">
            
            {/* Header */}
            <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-2xl">
                <div className="flex items-center gap-4">
                    <Button onClick={handleBack} variant="ghost" size="icon" className="hover:bg-slate-800 text-slate-400">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold text-white flex items-center gap-2">
                            <Brain className="w-5 h-5 text-indigo-400" />
                            Skill Mastery
                        </h1>
                        <p className="text-xs text-slate-500 uppercase tracking-widest">
                            {character?.name || 'Character'} • Lv. {Math.floor(totalUnlocked / 3) + 1}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <div className="text-xs text-slate-500 uppercase">Mastery</div>
                        <div className="text-lg font-mono font-bold text-indigo-400">{masteryPct}%</div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-slate-500 uppercase">Unlocked</div>
                        <div className="text-lg font-mono font-bold text-white">{totalUnlocked} <span className="text-slate-600 text-sm">/ {totalSkills}</span></div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto max-w-5xl px-4 py-12">
                <div className="grid gap-8">
                    {categories.map(cat => {
                        const catSkills = allSkills.filter(s => s.category === cat);
                        if (catSkills.length === 0) return null;

                        return (
                            <SkillCategory
                                key={cat}
                                category={cat}
                                skills={catSkills}
                                characterSkills={characterSkills}
                                character={character}
                                onSkillClick={setSelectedSkill}
                            />
                        );
                    })}
                </div>
            </main>

            {/* Modals */}
            <SkillDetailModal 
                skill={selectedSkill}
                status={selectedSkill ? getSkillStatus(selectedSkill.id) : 'locked'}
                unlockedAt={selectedSkill ? getUnlockedAt(selectedSkill.id) : null}
                character={character}
                onClose={() => setSelectedSkill(null)}
            />

        </div>
    );
}