import React, { useState } from 'react';
import { Hexagon, RefreshCw, Loader2 } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function Header() {
  const [logoUrl, setLogoUrl] = useState(localStorage.getItem('app_logo_url'));
  const [isGenerating, setIsGenerating] = useState(false);

  const generateLogo = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm("Generate a new AI logo for the app? This uses Leonardo AI credits.")) return;

    setIsGenerating(true);
    try {
        const res = await base44.functions.invoke('generateAppLogo', {});
        if (res.data.url) {
            setLogoUrl(res.data.url);
            localStorage.setItem('app_logo_url', res.data.url);
            toast.success("New logo generated!");
        } else {
            throw new Error(res.data.error || "Unknown error");
        }
    } catch (error) {
        console.error(error);
        toast.error("Failed to generate logo: " + error.message);
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50 supports-[backdrop-filter]:bg-slate-950/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to={createPageUrl('CharacterSelect')} className="flex items-center gap-3 group">
          <div className="relative group/logo cursor-pointer" onClick={generateLogo} title="Click to generate new logo">
            <div className="absolute inset-0 bg-indigo-500 blur-sm opacity-50 group-hover:opacity-100 transition-opacity duration-500 rounded-lg"></div>
            <div className="relative w-8 h-8 bg-slate-900 border border-slate-700 rounded-lg flex items-center justify-center group-hover:border-indigo-500 transition-colors duration-300 overflow-hidden">
                {isGenerating ? (
                    <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                ) : logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                    <Hexagon className="w-5 h-5 text-indigo-500 group-hover:text-indigo-400 transition-colors" strokeWidth={2.5} />
                )}
            </div>
            {!isGenerating && (
                <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-0.5 border border-slate-700 opacity-0 group-hover/logo:opacity-100 transition-opacity">
                    <RefreshCw className="w-2 h-2 text-slate-400" />
                </div>
            )}
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