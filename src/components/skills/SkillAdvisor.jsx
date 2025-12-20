import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BrainCircuit, Loader2, Sparkles, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SkillAdvisor({ characterId, allSkills, onRecommend }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState(null);

    const handleConsult = async () => {
        setIsAnalyzing(true);
        try {
            const res = await base44.functions.invoke('analyzeSkillPath', { character_id: characterId });
            setAnalysis(res.data.analysis);
            if (onRecommend && res.data.analysis.skill_ids) {
                onRecommend(res.data.analysis.skill_ids);
            }
        } catch (e) {
            console.error("Advisor failed", e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] border border-indigo-400/50">
                    <BrainCircuit className="w-4 h-4 mr-2" />
                    Neural Skill Advisor
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-950/95 border-indigo-500/50 text-slate-100 max-w-lg backdrop-blur-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-indigo-400 font-orbitron tracking-wider">
                        <BrainCircuit className="w-5 h-5" />
                        Neural Optimization Path
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {!analysis && !isAnalyzing && (
                        <div className="text-center space-y-4">
                            <p className="text-slate-400 text-sm leading-relaxed">
                                The Neural Advisor analyzes your recent psychological patterns, choices, and journal reflections to suggest the optimal growth trajectory.
                            </p>
                            <Button 
                                onClick={handleConsult} 
                                className="w-full bg-indigo-900/30 hover:bg-indigo-900/50 text-indigo-300 border border-indigo-500/30"
                            >
                                <Sparkles className="w-4 h-4 mr-2" />
                                Initiate Analysis
                            </Button>
                        </div>
                    )}

                    {isAnalyzing && (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4">
                            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                            <span className="text-xs uppercase tracking-widest text-indigo-400 animate-pulse">
                                Processing Neural Patterns...
                            </span>
                        </div>
                    )}

                    {analysis && !isAnalyzing && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            <div className="p-4 bg-indigo-950/30 rounded-lg border border-indigo-500/30">
                                <h3 className="text-sm uppercase tracking-widest text-indigo-400 mb-2">
                                    Detected Archetype
                                </h3>
                                <div className="text-xl font-bold text-white mb-2">
                                    {analysis.vibe}
                                </div>
                                <p className="text-slate-300 text-sm italic leading-relaxed">
                                    "{analysis.narrative}"
                                </p>
                            </div>

                            <div>
                                <h3 className="text-xs uppercase tracking-widest text-slate-500 mb-3">
                                    Recommended Protocols
                                </h3>
                                <div className="space-y-2">
                                    {analysis.skill_ids.map(id => {
                                        const skill = allSkills.find(s => s.id === id);
                                        if (!skill) return null;
                                        return (
                                            <div key={id} className="flex items-center gap-3 p-3 bg-slate-900 rounded border border-slate-800">
                                                <Target className="w-4 h-4 text-emerald-400" />
                                                <div>
                                                    <div className="font-bold text-slate-200">{skill.name}</div>
                                                    <div className="text-[10px] text-slate-500 uppercase">
                                                        {skill.category.replace('_', ' ')} • Tier {skill.tier}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}