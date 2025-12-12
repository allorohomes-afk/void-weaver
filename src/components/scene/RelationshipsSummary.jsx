import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Heart, Shield, MessageSquare } from 'lucide-react';

export default function RelationshipsSummary({ relationships, npcs, onInteract }) {
  if (!relationships || relationships.length === 0) {
    return (
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
        <CardHeader className="border-b border-slate-700">
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Relationships
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-slate-400 text-sm">No relationships established yet</p>
        </CardContent>
      </Card>
    );
  }

  // Sort by trust and take top 5
  const topRelationships = [...relationships]
    .sort((a, b) => b.trust - a.trust)
    .slice(0, 5);

  return (
    <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
      <CardHeader className="border-b border-slate-700">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <Users className="w-5 h-5" />
          Contacts
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {topRelationships.map((rel) => {
          const npc = npcs.find(n => n.id === rel.npc_id);
          if (!npc) return null;
          
          return (
            <div key={rel.id} className="space-y-2 pb-2 border-b border-slate-700/50 last:border-0 last:pb-0">
              <div className="flex items-center justify-between">
                <div>
                    <span className="text-white font-medium block">{npc.name}</span>
                    <span className="text-slate-400 text-xs">{npc.role}</span>
                </div>
                {onInteract && (
                    <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-slate-400 hover:text-indigo-400 hover:bg-indigo-950/30"
                        onClick={() => onInteract(npc)}
                        title="Comms Link"
                    >
                        <MessageSquare className="w-4 h-4" />
                    </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1 bg-slate-900/30 px-2 py-1 rounded">
                  <Heart className="w-3 h-3 text-pink-400" />
                  <span className="text-slate-300">Trust: {rel.trust}</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-900/30 px-2 py-1 rounded">
                  <Shield className="w-3 h-3 text-green-400" />
                  <span className="text-slate-300">Safety: {rel.safety}</span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}