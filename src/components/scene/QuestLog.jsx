import React, { useState } from 'react';
import { Scroll, CheckCircle2, Circle, Trophy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function QuestLog({ characterId }) {
    const [open, setOpen] = useState(false);

    const { data: quests = [] } = useQuery({
        queryKey: ['activeQuests', characterId],
        queryFn: async () => {
            const cqs = await base44.entities.CharacterMicroQuest.filter({ character_id: characterId });
            // Populate MQ details
            const populated = await Promise.all(cqs.map(async (cq) => {
                const mqs = await base44.entities.MicroQuest.filter({ id: cq.microquest_id });
                return { ...cq, details: mqs[0] };
            }));
            return populated;
        },
        enabled: !!characterId && open
    });

    const active = quests.filter(q => q.status === 'active');
    const completed = quests.filter(q => q.status === 'completed');

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full justify-start border-slate-700 text-slate-300 hover:bg-slate-800 bg-slate-900/50">
                    <Scroll className="w-4 h-4 mr-2 text-indigo-400" />
                    Mission Log
                    {active.length > 0 && (
                        <span className="ml-auto bg-indigo-500 text-white text-[10px] px-1.5 rounded-full">
                            {active.length}
                        </span>
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-500" />
                        MicroQuests
                    </DialogTitle>
                </DialogHeader>
                
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-6">
                        {/* Active Quests */}
                        <div>
                            <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-3">Active Objectives</h3>
                            {active.length === 0 ? (
                                <p className="text-slate-500 italic text-sm">No active microquests.</p>
                            ) : (
                                <div className="space-y-3">
                                    {active.map(q => (
                                        <div key={q.id} className="bg-slate-800/50 p-4 rounded-lg border border-indigo-500/30 relative overflow-hidden">
                                            <div className="flex items-start gap-3">
                                                <Circle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5 animate-pulse" />
                                                <div>
                                                    <h4 className="font-bold text-indigo-200">{q.details?.title}</h4>
                                                    <p className="text-sm text-slate-400 mt-1">{q.details?.body_text}</p>
                                                    
                                                    {q.details?.completion_criteria && (
                                                        <div className="mt-3 text-xs bg-slate-900/50 p-2 rounded border border-slate-700/50 font-mono text-slate-500">
                                                            OBJ: {Object.keys(q.details.completion_criteria).join(', ')}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Completed Quests */}
                        {completed.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-emerald-500 uppercase tracking-widest mb-3">Completed</h3>
                                <div className="space-y-3 opacity-75">
                                    {completed.map(q => (
                                        <div key={q.id} className="bg-slate-800/30 p-3 rounded-lg border border-slate-700 flex items-start gap-3">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                            <div>
                                                <h4 className="font-bold text-emerald-100/80 line-through decoration-emerald-500/50">{q.details?.title}</h4>
                                                <p className="text-xs text-slate-500">Completed</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}