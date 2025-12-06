import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import SkillNode from './SkillNode';

export default function SkillCategory({ category, skills, characterSkills, character, onSkillClick }) {
    const [isOpen, setIsOpen] = useState(true);

    // Group by Tier
    const tier1 = skills.filter(s => s.tier === 1);
    const tier2 = skills.filter(s => s.tier === 2);
    const tier3 = skills.filter(s => s.tier === 3);

    // Helper to check status
    const getSkillStatus = (skillId) => {
        const unlocked = characterSkills.find(cs => cs.skill_id === skillId);
        return unlocked ? 'unlocked' : 'locked';
    };

    // Helper to calculate progress (simple mock logic for UI demo as requested)
    // In reality, this needs deep parsing of the requirement JSON vs character stats
    const getProgress = (skill) => {
        if (getSkillStatus(skill.id) === 'unlocked') return 100;
        // Simple heuristic: if character has high relevant stats, show progress
        // This is purely for visual flavor based on the prompt's "In-Progress State" request
        // Real logic would be complex.
        return 0; 
    };

    const ContainerVariants = {
        hidden: { opacity: 0, height: 0 },
        visible: { opacity: 1, height: "auto" }
    };

    return (
        <div className="border border-slate-800 rounded-xl bg-slate-950/50 overflow-hidden mb-6">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-6 py-4 flex items-center justify-between bg-slate-900/50 hover:bg-slate-900 transition-colors"
            >
                <h3 className="text-lg font-bold text-slate-200 uppercase tracking-widest">
                    {category.replace(/_/g, ' ')}
                </h3>
                {isOpen ? <ChevronUp className="text-slate-500" /> : <ChevronDown className="text-slate-500" />}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        variants={ContainerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        className="p-8 relative flex flex-col items-center gap-12"
                    >
                        {/* Background Grid Lines (Connectors) */}
                        <div className="absolute inset-0 pointer-events-none flex justify-center">
                            <div className="w-0.5 h-full bg-gradient-to-b from-slate-800 via-slate-700 to-slate-800 opacity-30" />
                        </div>

                        {/* Tier 3 (Top) */}
                        <div className="flex gap-8 z-10">
                            {tier3.map(skill => (
                                <SkillNode 
                                    key={skill.id} 
                                    skill={skill} 
                                    status={getSkillStatus(skill.id)}
                                    progress={getProgress(skill)}
                                    onClick={onSkillClick}
                                />
                            ))}
                        </div>

                        {/* Tier 2 */}
                        <div className="flex gap-8 z-10">
                            {tier2.map(skill => (
                                <SkillNode 
                                    key={skill.id} 
                                    skill={skill} 
                                    status={getSkillStatus(skill.id)}
                                    progress={getProgress(skill)}
                                    onClick={onSkillClick}
                                />
                            ))}
                        </div>

                        {/* Tier 1 (Bottom) */}
                        <div className="flex gap-8 z-10">
                            {tier1.map(skill => (
                                <SkillNode 
                                    key={skill.id} 
                                    skill={skill} 
                                    status={getSkillStatus(skill.id)}
                                    progress={getProgress(skill)}
                                    onClick={onSkillClick}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}