import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Book, PenTool, Calendar, Cloud, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function JournalInterface({ characterId, isOpen, onClose }) {
    const [isWriting, setIsWriting] = useState(false);

    const { data: entries = [], refetch } = useQuery({
        queryKey: ['journal', characterId],
        queryFn: async () => {
             return await base44.entities.PlayerJournalEntry.filter({ character_id: characterId }, '-created_date');
        },
        enabled: !!characterId && isOpen
    });

    const handleWriteEntry = async () => {
        setIsWriting(true);
        try {
            await base44.functions.invoke('generateJournalEntry', { character_id: characterId });
            refetch();
        } catch (e) {
            console.error("Failed to write journal", e);
        } finally {
            setIsWriting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-slate-950/95 border-amber-900/30 text-slate-100 max-w-2xl backdrop-blur-xl h-[80vh] flex flex-col font-serif">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-amber-500 font-serif italic tracking-wider">
                        <Book className="w-5 h-5" />
                        Character Journal
                    </DialogTitle>
                    <p className="text-xs text-slate-500 uppercase font-sans tracking-widest">
                        Reflections from the Void
                    </p>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto pr-2 space-y-6 py-4">
                    {entries.length === 0 && !isWriting && (
                        <div className="text-center text-slate-600 py-12 italic">
                            The pages are empty...
                        </div>
                    )}

                    {isWriting && (
                        <div className="flex flex-col items-center justify-center p-8 border border-amber-900/20 rounded-lg animate-pulse">
                            <PenTool className="w-6 h-6 text-amber-500 mb-2" />
                            <span className="text-xs text-amber-700 font-sans uppercase">Composing thoughts...</span>
                        </div>
                    )}

                    <AnimatePresence>
                        {entries.map((entry, idx) => (
                            <motion.div
                                key={entry.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="relative pl-6 border-l border-slate-800"
                            >
                                <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-slate-800 border border-slate-600" />
                                <div className="mb-1 flex items-baseline justify-between">
                                    <h3 className="text-lg text-amber-100 font-bold">{entry.title}</h3>
                                    <span className="text-xs text-slate-500 font-sans">{new Date(entry.created_date).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-[10px] uppercase tracking-widest text-slate-500 font-sans bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                        Mood: {entry.mood_tag}
                                    </span>
                                    {entry.reflection_depth > 7 && (
                                        <span className="text-[10px] uppercase tracking-widest text-indigo-400 font-sans">
                                            Deep Insight
                                        </span>
                                    )}
                                </div>
                                <p className="text-slate-300 leading-relaxed italic text-sm">
                                    "{entry.content}"
                                </p>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end">
                    <Button 
                        onClick={handleWriteEntry} 
                        disabled={isWriting}
                        className="bg-amber-900/20 hover:bg-amber-900/40 text-amber-500 border border-amber-900/50 font-sans uppercase tracking-widest text-xs"
                    >
                        {isWriting ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <PenTool className="w-3 h-3 mr-2" />}
                        Reflect on Now
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}