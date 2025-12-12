import React from 'react';
import { Hexagon } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50 supports-[backdrop-filter]:bg-slate-950/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to={createPageUrl('CharacterSelect')} className="flex items-center gap-3 group">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500 blur-sm opacity-50 group-hover:opacity-100 transition-opacity duration-500 rounded-lg"></div>
            <div className="relative w-8 h-8 bg-slate-900 border border-slate-700 rounded-lg flex items-center justify-center group-hover:border-indigo-500 transition-colors duration-300">
                <Hexagon className="w-5 h-5 text-indigo-500 group-hover:text-indigo-400 transition-colors" strokeWidth={2.5} />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-slate-100 tracking-wider leading-none group-hover:text-white transition-colors">VOID WEAVER</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] leading-none group-hover:text-indigo-400 transition-colors">Simulation</span>
          </div>
        </Link>
      </div>
    </header>
  );
}