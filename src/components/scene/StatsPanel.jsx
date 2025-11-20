import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Brain, Eye, Shield, Heart, Zap, Moon } from 'lucide-react';

export default function StatsPanel({ character }) {
  const stats = [
    { label: 'Presence', value: character.presence, icon: Eye, color: 'from-blue-500 to-cyan-500' },
    { label: 'Insight', value: character.insight, icon: Brain, color: 'from-purple-500 to-pink-500' },
    { label: 'Resolve', value: character.resolve, icon: Shield, color: 'from-red-500 to-orange-500' },
    { label: 'Integrity', value: character.integrity, icon: Shield, color: 'from-green-500 to-emerald-500' },
    { label: 'Care', value: character.care, icon: Heart, color: 'from-pink-500 to-rose-500' }
  ];

  const energies = [
    { label: 'Action Energy', value: character.masculine_energy, icon: Zap, color: 'from-amber-500 to-yellow-500' },
    { label: 'Relational Energy', value: character.feminine_energy, icon: Moon, color: 'from-indigo-500 to-purple-500' }
  ];

  return (
    <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
      <CardHeader className="border-b border-slate-700">
        <CardTitle className="text-white text-lg">{character.name}</CardTitle>
        <p className="text-slate-400 text-sm">{character.pronouns}</p>
      </CardHeader>
      <CardContent className="p-4 space-y-6">
        {/* Core Stats */}
        <div className="space-y-3">
          <h3 className="text-slate-300 text-sm font-semibold uppercase tracking-wide">Core Stats</h3>
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300">{label}</span>
                </div>
                <span className="text-white font-semibold">{value}</span>
              </div>
              <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r ${color} transition-all duration-500`}
                  style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Energy Stats */}
        <div className="space-y-3 pt-4 border-t border-slate-700">
          <h3 className="text-slate-300 text-sm font-semibold uppercase tracking-wide">Energy Balance</h3>
          {energies.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300">{label}</span>
                </div>
                <span className="text-white font-semibold">{value}</span>
              </div>
              <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r ${color} transition-all duration-500`}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}