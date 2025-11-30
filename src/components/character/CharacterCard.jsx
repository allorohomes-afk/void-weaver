import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Calendar, Play } from 'lucide-react';
import { format } from 'date-fns';

export default function CharacterCard({ character, onPlay }) {
  return (
    <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 hover:border-purple-500 transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {character.portrait_url ? (
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-slate-600">
                <img src={character.portrait_url} alt={character.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold text-white">{character.name}</h3>
              <p className="text-slate-400 text-sm">{character.pronouns}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
          <Calendar className="w-4 h-4" />
          <span>Created {format(new Date(character.created_date), 'MMM d, yyyy')}</span>
        </div>

        <Button 
          onClick={() => onPlay(character.id)}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold"
        >
          <Play className="w-4 h-4 mr-2" />
          {character.current_scene_id ? 'Continue' : 'Start'}
        </Button>
      </CardContent>
    </Card>
  );
}