import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Globe, Activity, Shield, Skull, Heart, Scale, Zap, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ConsequenceLedger({ characterId }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const { data: impacts = [], refetch } = useQuery({
        queryKey: ['world_impacts', characterId],
        queryFn: async () => {
             return await base44.entities.WorldImpactNode.filter({ character_id: characterId }, '-severity');
        },
        enabled: !!characterId && isOpen
    });

    // Auto-analyze on first open if empty
    useEffect(() => {
        if (isOpen && impacts.length === 0 && !isAnalyzing) {
            handleAnalyze();
        }
    }, [isOpen]);

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        try {
            await base44.functions.invoke('generateWorldImpactAnalysis', { character_id: characterId });
            refetch();
        } catch (e) {
            console.error(e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getIcon = (alignment) => {
        switch(alignment) {
            case 'Order': return Shield;
            case 'Chaos': return Zap;
            case 'Mercy': return Heart;
            case 'Ruthlessness': return Skull;
            default: return Scale;
        }
    };

    const getColor = (alignment) => {
        switch(alignment) {
            case 'Order': return 'text-blue-400 border-blue-500/30 bg-blue-950/30';
            case 'Chaos': return 'text-orange-400 border-orange-500/30 bg-orange-950/30';
            case 'Mercy': return 'text-pink-400 border-pink-500/30 bg-pink-950/30';
            case 'Ruthlessness': return 'text-red-400 border-red-500/30 bg-red-950/30';
            default: return 'text-emerald-400 border-emerald-500/30 bg-emerald-950/30';
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-start text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/30 group">
                    <Activity className="w-4 h-4 mr-2 group-hover:animate-pulse" />
                    <span>Consequence Ledger</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-950/95 border-cyan-900/50 text-slate-100 max-w-3xl backdrop-blur-xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-cyan-400 font-orbitron tracking-wider">
                        <Globe className="w-5 h-5" />
                        Global Consequence Ledger
                    </DialogTitle>
                    <p className="text-xs text-slate-500 uppercase tracking-widest">
                        Tracking the ripple effects of your will
                    </p>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto pr-2 space-y-4 py-4">
                    {isAnalyzing && impacts.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-cyan-500/50 space-y-4">
                            <Loader2 className="w-10 h-10 animate-spin" />
                            <span className="text-xs uppercase tracking-widest">Scanning Causality Streams...</span>
                        </div>
                    )}

                    {!isAnalyzing && impacts.length === 0 && (
                        <div className="text-center text-slate-500 py-12 italic">
                            No significant world impacts recorded yet. Make choices to shape the world.
                        </div>
                    )}

                    <AnimatePresence>
                        {impacts.map((node, idx) => {
                            const Icon = getIcon(node.ethical_alignment);
                            const styleClass = getColor(node.ethical_alignment);
                            
                            return (
                                <motion.div
                                    key={node.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className={`p-4 rounded-lg border flex gap-4 items-start ${styleClass}`}
                                >
                                    <div className={`p-2 rounded-full bg-slate-950/50 border border-current shrink-0 mt-1`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-slate-200">{node.title}</h3>
                                            <span className="text-[10px] uppercase opacity-70 border border-current px-1.5 rounded">
                                                {node.region}
                                            </span>
                                            <span className="text-[10px] uppercase opacity-70">
                                                Severity: {node.severity}/10
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-300 leading-relaxed">
                                            {node.description}
                                        </p>
                                        <div className="text-[10px] opacity-50 uppercase tracking-widest pt-2">
                                            Alignment: {node.ethical_alignment}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                    <span className="text-xs text-slate-500">
                        {impacts.length} Active Ripples
                    </span>
                    <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={handleAnalyze} 
                        disabled={isAnalyzing}
                        className="border-slate-700 text-slate-400 hover:text-cyan-400"
                    >
                        {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Activity className="w-3 h-3 mr-2" />}
                        Refresh Projections
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}