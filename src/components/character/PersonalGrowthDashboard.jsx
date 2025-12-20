import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Sprout, Star, Heart, Globe, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PersonalGrowthDashboard({ characterId }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const { data: records, refetch } = useQuery({
        queryKey: ['growth_records', characterId],
        queryFn: async () => {
             return await base44.entities.PersonalGrowthRecord.filter({ character_id: characterId }, '-created_date', 1);
        },
        enabled: !!characterId && isOpen
    });

    const currentRecord = records && records.length > 0 ? records[0] : null;

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            await base44.functions.invoke('analyzePersonalGrowth', { character_id: characterId });
            refetch();
        } catch (e) {
            console.error(e);
        } finally {
            setIsGenerating(false);
        }
    };

    // Auto-generate if opened and no record exists
    useEffect(() => {
        if (isOpen && records && records.length === 0 && !isGenerating) {
            handleGenerate();
        }
    }, [isOpen, records]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-start text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30 group">
                    <Sprout className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                    <span>Growth Profile</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900/95 border-emerald-900/50 text-slate-100 max-w-2xl backdrop-blur-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-emerald-400 font-orbitron tracking-wider">
                        <Sparkles className="w-5 h-5" />
                        Evolutionary Trajectory
                    </DialogTitle>
                </DialogHeader>

                {isGenerating || !currentRecord ? (
                    <div className="py-12 flex flex-col items-center justify-center space-y-4 text-emerald-500/50">
                        <Loader2 className="w-12 h-12 animate-spin" />
                        <p className="text-sm uppercase tracking-widest animate-pulse">Analyzing Psycho-Social Patterns...</p>
                    </div>
                ) : (
                    <div className="space-y-8 py-4">
                        {/* Archetype Header */}
                        <div className="text-center space-y-2">
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="inline-block px-4 py-1 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-[0.2em]"
                            >
                                Current Archetype
                            </motion.div>
                            <motion.h2 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.1 }}
                                className="text-3xl md:text-4xl font-bold text-white font-serif italic"
                            >
                                {currentRecord.archetype_title}
                            </motion.h2>
                        </div>

                        {/* Core Content Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <motion.div 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                                className="space-y-4 bg-slate-800/30 p-5 rounded-lg border border-slate-700/50"
                            >
                                <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold uppercase tracking-wide mb-2">
                                    <Heart className="w-4 h-4" /> Internal Shift
                                </div>
                                <p className="text-slate-300 leading-relaxed text-sm">
                                    {currentRecord.narrative_summary}
                                </p>
                                <div className="flex flex-wrap gap-2 mt-4">
                                    {currentRecord.dominant_emotions?.map(emo => (
                                        <span key={emo} className="px-2 py-1 bg-slate-700/50 rounded text-xs text-slate-300 border border-slate-600">
                                            {emo}
                                        </span>
                                    ))}
                                </div>
                            </motion.div>

                            <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 }}
                                className="space-y-4 bg-slate-800/30 p-5 rounded-lg border border-slate-700/50"
                            >
                                <div className="flex items-center gap-2 text-cyan-400 text-sm font-bold uppercase tracking-wide mb-2">
                                    <Globe className="w-4 h-4" /> External Impact
                                </div>
                                <p className="text-slate-300 leading-relaxed text-sm">
                                    {currentRecord.world_impact_summary}
                                </p>
                                <div className="space-y-2 mt-4">
                                    <div className="text-xs text-slate-500 uppercase">Core Values</div>
                                    <div className="flex flex-wrap gap-2">
                                        {currentRecord.core_values?.map(val => (
                                            <span key={val} className="px-2 py-1 bg-cyan-950/30 text-cyan-300 rounded text-xs border border-cyan-500/30 flex items-center gap-1">
                                                <Star className="w-3 h-3" /> {val}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        <div className="flex justify-center pt-4">
                             <Button variant="ghost" size="sm" onClick={handleGenerate} className="text-slate-500 hover:text-white text-xs">
                                Refresh Analysis
                             </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}