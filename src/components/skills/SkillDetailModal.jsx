import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, Zap, Lock, CheckCircle, Loader2, Shield, Target, Sparkles } from "lucide-react";
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import moment from 'moment';

export default function SkillDetailModal({ skill, status, unlockedAt, character, onClose, onGenerateIcon }) {
    if (!skill) return null;

    const isUnlocked = status === 'unlocked';
    const queryClient = useQueryClient();

    // Icon Generation Mutation
    const generateIconMutation = useMutation({
        mutationFn: async () => {
            return await base44.functions.invoke('generateSkillIcon', { skill_id: skill.id });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['skills'] });
        }
    });

    return (
        <Dialog open={!!skill} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 sm:max-w-lg">
                <DialogHeader>
                    <div className="flex items-start gap-4 mb-4">
                        <div className={`w-20 h-20 rounded-lg border border-slate-700 bg-slate-900 flex items-center justify-center overflow-hidden shrink-0 ${isUnlocked ? 'ring-2 ring-indigo-500/50' : 'opacity-50'}`}>
                            {skill.icon_url ? (
                                <img src={skill.icon_url} alt={skill.name} className="w-full h-full object-cover" />
                            ) : (
                                <Brain className="w-10 h-10 text-slate-600" />
                            )}
                        </div>
                        <div className="space-y-1">
                            <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
                                {skill.name}
                                <Badge variant="outline" className="ml-2 bg-slate-900 text-slate-400 border-slate-700">
                                    Tier {skill.tier}
                                </Badge>
                            </DialogTitle>
                            <p className="text-indigo-400 text-sm uppercase tracking-wider font-semibold">
                                {skill.category.replace(/_/g, ' ')}
                            </p>
                            <DialogDescription className="text-slate-400 text-base mt-2">
                                {skill.description}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="max-h-[60vh] pr-4">
                    <div className="space-y-6">
                        {/* Effects Section */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center">
                                <Sparkles className="w-4 h-4 mr-2" /> Effects
                            </h4>
                            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800/50 space-y-2">
                                {skill.effects?.stats && Object.entries(skill.effects.stats).map(([stat, val]) => (
                                    <div key={stat} className="flex items-center justify-between text-sm">
                                        <span className="text-slate-300 capitalize">{stat.replace(/_/g, ' ')}</span>
                                        <span className={val > 0 ? "text-green-400" : "text-red-400"}>
                                            {val > 0 ? '+' : ''}{val}
                                        </span>
                                    </div>
                                ))}
                                {skill.cinematic_modifier && (
                                    <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-indigo-300 italic flex gap-2">
                                        <Target className="w-3 h-3 mt-0.5 shrink-0" />
                                        "{skill.cinematic_modifier}"
                                    </div>
                                )}
                                {!skill.effects && !skill.cinematic_modifier && (
                                    <span className="text-slate-500 text-sm italic">No direct stat effects.</span>
                                )}
                            </div>
                        </div>

                        {/* Requirements Section */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center">
                                {isUnlocked ? <CheckCircle className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                                {isUnlocked ? "Unlocked" : "Requirements"}
                            </h4>
                            
                            {isUnlocked ? (
                                <div className="bg-emerald-900/10 border border-emerald-900/30 rounded-lg p-3 text-emerald-400 text-sm flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Mastered on {unlockedAt ? moment(unlockedAt).format('MMM D, YYYY') : 'Unknown Date'}</span>
                                </div>
                            ) : (
                                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800/50 text-sm space-y-2">
                                    {skill.unlock_requirements ? (
                                        <pre className="font-mono text-xs text-slate-400 whitespace-pre-wrap">
                                            {JSON.stringify(skill.unlock_requirements, null, 2)
                                                .replace(/[{}"]/g, '')
                                                .replace(/,/g, '')
                                                .trim()}
                                        </pre>
                                    ) : (
                                        <span className="text-slate-500 italic">Hidden requirements</span>
                                    )}
                                    <p className="text-xs text-slate-500 mt-2 italic border-t border-slate-800 pt-2">
                                        Complete specific choices and build stats to unlock.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter className="mt-6 sm:justify-between gap-4">
                    {/* Admin / Dev Tool for Icons */}
                    {!skill.icon_url && (
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => generateIconMutation.mutate()}
                            disabled={generateIconMutation.isPending}
                            className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-950"
                        >
                            {generateIconMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Brain className="w-3 h-3 mr-2" />}
                            Generate Icon
                        </Button>
                    )}
                    <Button onClick={onClose} className="bg-slate-800 hover:bg-slate-700 text-white ml-auto">
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}