import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users, Heart, Shield } from 'lucide-react';

export default function RelationshipsSummary({ relationships, npcs }) {
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

  // Sort by trust and take top 3
  const topRelationships = [...relationships]
    .sort((a, b) => b.trust - a.trust)
    .slice(0, 3);

  return (
    <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
      <CardHeader className="border-b border-slate-700">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <Users className="w-5 h-5" />
          Key Relationships
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {topRelationships.map((rel) => {
          const npc = npcs.find(n => n.id === rel.npc_id);
          if (!npc) return null;
          
          return (
            <div key={rel.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white font-medium">{npc.name}</span>
                <span className="text-slate-400 text-xs">{npc.role}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <Heart className="w-3 h-3 text-pink-400" />
                  <span className="text-slate-300">Trust: {rel.trust}</span>
                </div>
                <div className="flex items-center gap-1">
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