import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Package, Trash2, Info, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function InventoryPanel({ characterId, isOpen, onClose }) {
    const { data: inventory = [], refetch } = useQuery({
        queryKey: ['inventory', characterId],
        queryFn: async () => await base44.entities.CharacterInventory.filter({ character_id: characterId }),
        enabled: !!characterId && isOpen
    });

    const { data: resources = [] } = useQuery({
        queryKey: ['resources'],
        queryFn: async () => await base44.entities.Resource.list(),
        enabled: isOpen
    });

    const { data: character } = useQuery({
        queryKey: ['character', characterId],
        queryFn: async () => (await base44.entities.Character.filter({ id: characterId }))[0],
        enabled: !!characterId && isOpen
    });

    const maxSlots = character?.max_inventory_slots || 10;
    const usedSlots = inventory.length;

    const handleDrop = async (itemId, resourceName) => {
        if (!confirm(`Are you sure you want to discard ${resourceName}? It will be lost forever.`)) return;
        
        try {
            await base44.entities.CharacterInventory.delete(itemId);
            toast.success(`Discarded ${resourceName}`);
            refetch();
        } catch (e) {
            toast.error("Failed to discard item");
        }
    };

    const getResourceDetails = (resId) => resources.find(r => r.id === resId) || {};

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-slate-950/95 border-slate-800 text-slate-200 max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Package className="w-5 h-5 text-indigo-400" />
                            <span>Resource Cache</span>
                        </div>
                        <div className={`text-sm font-mono px-3 py-1 rounded border ${usedSlots >= maxSlots ? 'bg-red-950/50 border-red-500 text-red-400' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
                            {usedSlots} / {maxSlots} Slots
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {usedSlots === 0 ? (
                        <div className="text-center py-12 text-slate-500 italic">
                            Your pack is empty. Scavenge the wastes or barter with locals.
                        </div>
                    ) : (
                        <ScrollArea className="h-[400px] pr-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {inventory.map(item => {
                                    const res = getResourceDetails(item.resource_id);
                                    return (
                                        <div key={item.id} className="p-3 bg-slate-900/50 border border-slate-800 rounded flex flex-col gap-2 hover:border-indigo-500/30 transition-colors group">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-xs font-bold ${
                                                        res.rarity === 'common' ? 'text-slate-400' :
                                                        res.rarity === 'uncommon' ? 'text-emerald-400' :
                                                        res.rarity === 'rare' ? 'text-indigo-400' : 'text-amber-400'
                                                    }`}>
                                                        {item.quantity}x
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-sm text-slate-200">{res.name || 'Unknown Item'}</h4>
                                                        <span className="text-[10px] uppercase text-slate-500 tracking-wider">{res.category?.replace('_', ' ')}</span>
                                                    </div>
                                                </div>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-6 w-6 text-slate-600 hover:text-red-400 hover:bg-red-950/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => handleDrop(item.id, res.name)}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                            <p className="text-xs text-slate-400 line-clamp-2 pl-10">
                                                {res.description}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    )}

                    <div className="bg-slate-900/50 p-3 rounded border border-slate-800 flex gap-3 text-xs text-slate-500 italic">
                        <Info className="w-4 h-4 shrink-0 mt-0.5 opacity-50" />
                        <p>
                            "Travel light. We are defined not by what we hoard, but by what we are willing to let go." — Void Weaver Maxim
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}