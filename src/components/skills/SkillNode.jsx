import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Zap, Shield, Brain, Heart, Eye, Users, Activity, Hexagon, Star } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function SkillNode({ skill, status, progress, onClick, isRecommended }) {
    const isLocked = status === 'locked';
    const isUnlocked = status === 'unlocked';
    
    const categoryColors = {
        grounding: "text-emerald-400 border-emerald-500/50 shadow-emerald-900/20",
        relational: "text-pink-400 border-pink-500/50 shadow-pink-900/20",
        critical_thought: "text-blue-400 border-blue-500/50 shadow-blue-900/20",
        protector_stance: "text-amber-400 border-amber-500/50 shadow-amber-900/20",
        social_awareness: "text-purple-400 border-purple-500/50 shadow-purple-900/20",
        nd_sensitivity: "text-cyan-400 border-cyan-500/50 shadow-cyan-900/20",
        peer_resistance: "text-red-400 border-red-500/50 shadow-red-900/20",
        self_insight: "text-indigo-400 border-indigo-500/50 shadow-indigo-900/20",
        political_awareness: "text-slate-300 border-slate-500/50 shadow-slate-900/20"
    };

    const colorClass = categoryColors[skill.category] || "text-slate-400 border-slate-500";

    return (
        <div className="relative group flex flex-col items-center z-10">
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onClick(skill)}
                className={cn(
                    "relative w-20 h-20 rounded-xl border-2 flex items-center justify-center transition-all duration-300 backdrop-blur-md bg-slate-900/80",
                    isUnlocked ? `${colorClass} shadow-[0_0_15px_rgba(0,0,0,0.3)] border-opacity-100` : 
                    progress > 0 ? "border-amber-500/60 text-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.1)]" :
                    "border-slate-700 text-slate-700 opacity-70 grayscale",
                    isRecommended && "ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950 shadow-[0_0_20px_rgba(52,211,153,0.3)]"
                )}
            >
                {/* Background Glow for Unlocked */}
                {isUnlocked && (
                    <div className={cn("absolute inset-0 rounded-xl opacity-20 blur-md", colorClass.split(' ')[1].replace('border', 'bg'))} />
                )}

                {/* Icon */}
                {skill.icon_url ? (
                    <img 
                        src={skill.icon_url} 
                        alt={skill.name} 
                        className={cn("w-14 h-14 object-contain", isLocked && "opacity-30")}
                    />
                ) : (
                    <Hexagon className="w-10 h-10 stroke-1" />
                )}

                {/* Recommendation Badge */}
                {isRecommended && (
                    <div className="absolute -top-3 -left-3 w-7 h-7 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center z-30 shadow-lg shadow-emerald-500/30 animate-bounce">
                        <Star className="w-4 h-4 text-slate-950 fill-current" />
                    </div>
                )}

                {/* Tier Badge */}
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center z-20">
                    <span className="text-[10px] font-mono text-slate-400">{skill.tier}</span>
                </div>

                {/* Lock Overlay */}
                {isLocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 rounded-xl">
                        <Lock className="w-6 h-6 text-slate-500/50" />
                    </div>
                )}
            </motion.button>

            {/* Progress Label */}
            {!isUnlocked && progress > 0 && (
                <div className="absolute -bottom-6 whitespace-nowrap">
                    <span className="text-[10px] text-amber-500 font-mono uppercase tracking-wider animate-pulse">
                        Almost Unlocked
                    </span>
                </div>
            )}
            
            {/* Name Label */}
            <div className="absolute -bottom-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                <span className="text-xs text-white bg-slate-900/90 px-2 py-1 rounded border border-slate-700">
                    {skill.name}
                </span>
            </div>
        </div>
    );
}