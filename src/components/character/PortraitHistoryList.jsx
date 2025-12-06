import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

export default function PortraitHistoryList({ characterId, onRevert }) {
    const { data: history = [] } = useQuery({
        queryKey: ['portraitHistory', characterId],
        queryFn: async () => {
            return await base44.entities.PortraitHistory.filter({ character_id: characterId }, '-created_date');
        }
    });

    if (history.length === 0) return <div className="text-center text-slate-500 py-4">No history available</div>;

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 p-4 bg-slate-950/50 rounded-lg border border-slate-800">
            {history.map((item) => (
                <div key={item.id} className="relative group">
                    <div className="aspect-square rounded overflow-hidden border border-slate-700">
                        <img src={item.portrait_url} className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => onRevert(item)}
                        >
                            <RotateCcw className="w-3 h-3 mr-2" /> Revert
                        </Button>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 truncate">
                        {new Date(item.created_date).toLocaleDateString()}
                    </div>
                </div>
            ))}
        </div>
    );
}