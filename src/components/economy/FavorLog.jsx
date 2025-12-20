import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Handshake, ArrowUpRight, ArrowDownLeft, History, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function FavorLog({ characterId, isOpen, onClose }) {
    const { data: favors = [] } = useQuery({
        queryKey: ['favors', characterId],
        queryFn: async () => await base44.entities.Favor.filter({ character_id: characterId }),
        enabled: !!characterId && isOpen
    });

    const { data: npcs = [] } = useQuery({
        queryKey: ['npcs'],
        queryFn: async () => await base44.entities.NPC.list(),
        enabled: isOpen
    });

    const getNpcName = (id) => npcs.find(n => n.id === id)?.name || 'Unknown Contact';

    const activeFavors = favors.filter(f => f.status === 'active');
    const historyFavors = favors.filter(f => f.status !== 'active');

    const FavorCard = ({ favor }) => {
        const isOwedByPlayer = favor.type === 'owed_by_player';
        return (
            <div className={`p-4 rounded-lg border flex flex-col gap-2 ${
                isOwedByPlayer 
                ? 'bg-amber-950/20 border-amber-900/30' 
                : 'bg-emerald-950/20 border-emerald-900/30'
            }`}>
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                        {isOwedByPlayer ? <ArrowDownLeft className="w-4 h-4 text-amber-500" /> : <ArrowUpRight className="w-4 h-4 text-emerald-500" />}
                        <span className={`text-xs font-bold uppercase tracking-widest ${isOwedByPlayer ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {isOwedByPlayer ? 'Debt' : 'Credit'}
                        </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400 capitalize">
                        {favor.value}
                    </Badge>
                </div>
                
                <h4 className="font-bold text-slate-200">{getNpcName(favor.npc_id)}</h4>
                <p className="text-sm text-slate-400 italic">"{favor.description}"</p>
                
                {favor.status !== 'active' && (
                    <div className="mt-2 text-xs uppercase font-mono text-slate-500 border-t border-slate-800/50 pt-2 flex justify-between">
                        <span>{new Date(favor.updated_date || favor.created_date).toLocaleDateString()}</span>
                        <span className={favor.status === 'fulfilled' ? 'text-emerald-400' : 'text-red-400'}>
                            {favor.status}
                        </span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-slate-950/95 border-slate-800 text-slate-200 max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Handshake className="w-5 h-5 text-indigo-400" />
                        Social Ledger
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="active" className="w-full">
                    <TabsList className="w-full bg-slate-900 border border-slate-800">
                        <TabsTrigger value="active" className="flex-1 data-[state=active]:bg-indigo-900/30">Active</TabsTrigger>
                        <TabsTrigger value="history" className="flex-1 data-[state=active]:bg-slate-800">History</TabsTrigger>
                    </TabsList>

                    <TabsContent value="active" className="mt-4">
                        <ScrollArea className="h-[350px] pr-4">
                            {activeFavors.length === 0 ? (
                                <div className="text-center py-12 text-slate-500 italic">
                                    No active debts or credits. You are socially untethered.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {activeFavors.map(f => <FavorCard key={f.id} favor={f} />)}
                                </div>
                            )}
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="history" className="mt-4">
                        <ScrollArea className="h-[350px] pr-4">
                             <div className="space-y-3">
                                {historyFavors.map(f => <FavorCard key={f.id} favor={f} />)}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}