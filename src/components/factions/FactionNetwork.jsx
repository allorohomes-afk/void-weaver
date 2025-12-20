import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Network, RefreshCw, AlertTriangle, Handshake, Swords, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function FactionNetwork({ isOpen, onClose }) {
    const [isSimulating, setIsSimulating] = useState(false);
    const [characterId, setCharacterId] = useState(sessionStorage.getItem('selectedCharacterId'));

    const { data: relations = [], refetch } = useQuery({
        queryKey: ['faction_relations'],
        queryFn: async () => {
             return await base44.entities.FactionRelation.list();
        },
        enabled: isOpen
    });

    // Helper to get faction names (could be optimized with a join or pre-fetch context)
    const { data: factions = [] } = useQuery({
        queryKey: ['factions_list'],
        queryFn: async () => base44.entities.Faction.list()
    });

    const getFactionName = (id) => factions.find(f => f.id === id)?.name || 'Unknown Faction';

    const handleSimulate = async () => {
        setIsSimulating(true);
        try {
            await base44.functions.invoke('simulateFactionPolitics', { character_id: characterId });
            refetch();
        } catch (e) {
            console.error(e);
        } finally {
            setIsSimulating(false);
        }
    };

    const getStatusIcon = (status) => {
        switch(status) {
            case 'ally': return <Handshake className="w-4 h-4 text-emerald-400" />;
            case 'war': return <Swords className="w-4 h-4 text-red-500" />;
            case 'tension': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
            default: return <Network className="w-4 h-4 text-slate-500" />;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-slate-950/95 border-indigo-900/50 text-slate-100 max-w-3xl backdrop-blur-xl h-[70vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-indigo-400 font-orbitron tracking-wider">
                        <Network className="w-5 h-5" />
                        Faction Dynamics Network
                    </DialogTitle>
                    <p className="text-xs text-slate-500 uppercase tracking-widest">
                        Real-time political shifts
                    </p>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {relations.length === 0 && (
                        <div className="text-center text-slate-600 py-12 italic">
                            Political landscape is currently static.
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {relations.map(rel => (
                            <motion.div 
                                key={rel.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-slate-900/50 border border-slate-800 p-4 rounded-lg relative overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-slate-700 to-transparent" />
                                
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-indigo-200">{getFactionName(rel.source_faction_id)}</span>
                                        <span className="text-slate-600 text-xs">vs</span>
                                        <span className="font-bold text-indigo-200">{getFactionName(rel.target_faction_id)}</span>
                                    </div>
                                    <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                                        {getStatusIcon(rel.status)}
                                        <span className="text-[10px] uppercase font-bold text-slate-400">{rel.status}</span>
                                    </div>
                                </div>
                                
                                <div className="text-xs text-slate-400 italic border-l-2 border-slate-700 pl-2 mb-2">
                                    "{rel.last_incident_summary || 'No recent incidents'}"
                                </div>

                                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-2">
                                    <div 
                                        className={`h-full transition-all duration-1000 ${rel.relationship_score < 0 ? 'bg-red-500' : 'bg-emerald-500'}`}
                                        style={{ width: `${Math.abs(rel.relationship_score)}%`, marginLeft: rel.relationship_score < 0 ? 0 : '0%' }} 
                                    />
                                    {/* Note: A proper bidirectional bar needs center origin, keeping it simple for now */}
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-600 mt-1 font-mono">
                                    <span>Hostile (-100)</span>
                                    <span>{rel.relationship_score}</span>
                                    <span>Ally (+100)</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end">
                    <Button 
                        onClick={handleSimulate} 
                        disabled={isSimulating}
                        className="bg-indigo-900/20 hover:bg-indigo-900/40 text-indigo-400 border border-indigo-900/50 text-xs"
                    >
                        {isSimulating ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <RefreshCw className="w-3 h-3 mr-2" />}
                        Simulate Politics
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}