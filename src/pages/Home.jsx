import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Shield, Brain, Zap, Activity } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-cyan-500/30 font-sans overflow-x-hidden">
      
      {/* Navbar Placeholder */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur border-b border-slate-800">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tighter text-white font-orbitron">
            <div className="w-8 h-8 bg-indigo-600 rounded-sm flex items-center justify-center">
              <span className="text-white font-mono">V</span>
            </div>
            <span>VOID<span className="text-indigo-400">WEAVER</span></span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Protocol</a>
            <a href="#lore" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Archive</a>
            <Button 
              onClick={() => window.location.href = createPageUrl('CharacterSelect')}
              variant="outline" 
              className="border-indigo-500/50 text-indigo-400 hover:bg-indigo-950/50 hover:text-white"
            >
              Login
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950 pointer-events-none" />
        <div className="absolute inset-0 bg-[url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693c0b03019af794e0665c28/a4d6af00b_Leonardo_Anime_XL_A_clean_highdetail_2D_technical_blueprint_sk_0.jpg')] bg-cover bg-center opacity-40 pointer-events-none" />
        
        <div className="container mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-block mb-4 px-3 py-1 rounded-full bg-indigo-900/30 border border-indigo-500/30 text-indigo-300 text-xs font-mono tracking-widest uppercase">
              System Online // Cycle 404
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 font-orbitron">
              Balance the <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Chaos</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-200 max-w-2xl mx-auto mb-10 leading-relaxed">
              In a fractured cyberpunk metropolis, you are a Void Weaver. 
              Master the art of tactical empathy, de-escalate crisis, and reshape the city's fate through connection, not just combat.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                onClick={() => window.location.href = createPageUrl('CharacterSelect')}
                size="lg" 
                className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[200px] h-14 text-lg shadow-lg shadow-indigo-900/50"
              >
                Enter Simulation <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-slate-700 text-slate-300 hover:bg-slate-800 min-w-[200px] h-14 text-lg"
              >
                View Protocol
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-slate-600"
        >
          <div className="w-[1px] h-12 bg-gradient-to-b from-slate-600 to-transparent mx-auto" />
        </motion.div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-slate-950 relative border-t border-slate-900">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4 font-orbitron">Core Directives</h2>
            <p className="text-slate-400">Tools for the modern peacekeeper in a digital age.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Brain className="w-8 h-8 text-indigo-400" />}
              title="Tactical Empathy"
              desc="Read emotional currents like code. Analyze NPCs to unlock dialogue paths that defuse violence before it starts."
            />
            <FeatureCard 
              icon={<Shield className="w-8 h-8 text-cyan-400" />}
              title="Crisis Mediation"
              desc="Stand between warring factions. Use your Presence and Resolve to hold the line without firing a shot."
            />
            <FeatureCard 
              icon={<Activity className="w-8 h-8 text-pink-400" />}
              title="Energy Balance"
              desc="Manage your internal Masculine and Feminine energies. Too much action leads to tyranny; too much passivity leads to erasure."
            />
          </div>
        </div>
      </section>

      {/* Lore Section */}
      <section id="lore" className="py-24 bg-slate-900/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1605218427306-635ba2439af2?q=80&w=2808&auto=format&fit=crop')] bg-cover bg-center opacity-5" />
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto bg-slate-950/80 backdrop-blur border border-slate-800 p-8 md:p-12 rounded-2xl">
            <div className="flex items-center gap-4 mb-6">
              <Zap className="w-6 h-6 text-amber-400" />
              <h3 className="text-xl font-mono text-amber-400 uppercase tracking-widest">The World State</h3>
            </div>
            <p className="text-xl text-slate-300 leading-relaxed font-serif italic mb-6">
              "The Old Guard holds the walls. The Syndicate runs the streets. And in the cracks between, the people are bleeding. We are the Void Weavers—the ones who stitch it back together."
            </p>
            <p className="text-slate-400">
              Sector 4 is on the brink of civil collapse. Your choices determine if it falls into anarchy or rises into a new order. Every conversation is a battlefield. Every silence is a weapon.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-24 text-center">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-white mb-8 font-orbitron">Ready to Weave?</h2>
          <Button 
            onClick={() => window.location.href = createPageUrl('CharacterSelect')}
            className="bg-white text-slate-950 hover:bg-slate-200 h-16 px-10 text-xl font-bold rounded-full shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] font-orbitron"
          >
            Initialize Character
          </Button>
          <p className="mt-8 text-xs text-slate-600 font-mono">
            SYSTEM VERSION 0.9.4 // BASE44 ENGINE // ALL RIGHTS RESERVED
          </p>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="bg-slate-900/50 p-8 rounded-xl border border-slate-800 hover:border-indigo-500/50 transition-colors group">
      <div className="mb-6 bg-slate-950 w-16 h-16 rounded-lg flex items-center justify-center border border-slate-800 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-3 font-orbitron">{title}</h3>
      <p className="text-slate-400 leading-relaxed">
        {desc}
      </p>
    </div>
  );
}