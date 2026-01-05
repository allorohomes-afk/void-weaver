import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import VoicePlayer from '@/components/voice/VoicePlayer';
import { Loader2, MessageSquare, X, Brain, Heart, Shield, Scroll, Meh, AlertTriangle, Smile, Frown, Sparkles, TrendingUp, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from "sonner";

export default function ConversationInterface({ characterId, npc, onClose }) {
    const [history, setHistory] = useState([]);
    const [currentChoices, setCurrentChoices] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [mood, setMood] = useState(npc.emotional_state || 'Neutral');
    const [moodChangeAlert, setMoodChangeAlert] = useState(null);
    const scrollRef = useRef(null);

    const startConversation = async () => {
        setIsLoading(true);
        try {
            const res = await base44.functions.invoke('interactWithNPC', {
                character_id: characterId,
                npc_id: npc.id,
                player_input: null 
            });
            handleResponse(res.data);
        } catch (err) {
            console.error("Conversation start failed", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        startConversation();
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history, isLoading]);

    const handleResponse = async (data) => {
        if (!data) return;

        // Generate voice for NPC dialogue
        let audioUrl = null;
        try {
            const voiceRes = await base44.functions.invoke('generateVoiceLine', {
                text: data.dialogue,
                npc_id: npc.id,
                emotion: data.mood || 'Neutral'
            });
            if (voiceRes.data?.audio_url) {
                audioUrl = voiceRes.data.audio_url;
            }
        } catch (err) {
            console.error("Voice generation failed:", err);
        }

        const newExchange = {
            role: 'npc',
            text: data.dialogue,
            thought: data.inner_thought,
            mood: data.mood,
            audioUrl: audioUrl
        };

        setHistory(prev => [...prev, newExchange]);
        setCurrentChoices(data.choices || []);
        
        if (data.mood_changed) {
            setMood(data.mood);
            setMoodChangeAlert({
                direction: data.mood_shift_reason?.toLowerCase().includes('improve') || data.mood === 'Resilient' || data.mood === 'Empathetic' ? 'improve' : 'worsen',
                reason: data.mood_shift_reason
            });
            setTimeout(() => setMoodChangeAlert(null), 4000);
        } else {
            setMood(data.mood || mood);
        }

        if (data.skill_updates && data.skill_updates.length > 0) {
            data.skill_updates.forEach(update => {
                toast.success(`Skill Improved: ${update.skill_key}`, {
                    description: `+${update.xp_amount} XP (${update.reason || 'Practice'})`,
                    icon: <Brain className="w-4 h-4 text-emerald-400" />
                });
            });
        }

        if (data.new_quest) {
            toast.success(`New Quest: ${data.new_quest.title}`, {
                description: "Check your Quest Log for details.",
                icon: <Scroll className="w-4 h-4 text-amber-400" />
            });
        }

        if (data.relationship_update) {
            const { trust_change, favor_change, reason } = data.relationship_update;
            if (trust_change !== 0) {
                const isPos = trust_change > 0;
                toast(
                    <div className="flex flex-col">
                        <span className="font-bold">{isPos ? 'Trust Gained' : 'Trust Lost'}</span>
                        <span className="text-xs opacity-90">{reason || (isPos ? 'Relationship improved' : 'Relationship strained')}</span>
                    </div>, 
                    {
                        icon: <Shield className={`w-4 h-4 ${isPos ? 'text-emerald-400' : 'text-red-400'}`} />,
                        duration: 3000
                    }
                );
            }
        }
        };

    const handlePlayerChoice = async (choice) => {
        // Add player message immediately
        setHistory(prev => [...prev, { role: 'player', text: choice.label }]);
        setCurrentChoices([]); // Clear choices
        setIsLoading(true);

        try {
            const res = await base44.functions.invoke('interactWithNPC', {
                character_id: characterId,
                npc_id: npc.id,
                player_input: choice.label,
                conversation_history: history // Could pass full history if needed for context window, but function currently doesn't use it fully.
            });
            handleResponse(res.data);
        } catch (err) {
            console.error("Reply failed", err);
        } finally {
            setIsLoading(false);
        }
    };

    const getMoodIcon = (m) => {
        const icons = {
            Neutral: <Meh className="w-3 h-3" />,
            Vulnerable: <Heart className="w-3 h-3" />,
            Resilient: <Shield className="w-3 h-3" />,
            Empathetic: <Sparkles className="w-3 h-3" />,
            Guarded: <AlertTriangle className="w-3 h-3" />,
            Volatile: <AlertTriangle className="w-3 h-3" />,
            Hopeful: <Smile className="w-3 h-3" />,
            Despondent: <Frown className="w-3 h-3" />
        };
        return icons[m] || <Meh className="w-3 h-3" />;
    };

    const getMoodColor = (m) => {
        const colors = {
            Neutral: 'text-slate-400 border-slate-500/50',
            Vulnerable: 'text-pink-400 border-pink-500/50',
            Resilient: 'text-green-400 border-green-500/50',
            Empathetic: 'text-blue-400 border-blue-500/50',
            Guarded: 'text-amber-400 border-amber-500/50',
            Volatile: 'text-red-400 border-red-500/50',
            Hopeful: 'text-cyan-400 border-cyan-500/50',
            Despondent: 'text-gray-400 border-gray-500/50'
        };
        return colors[m] || 'text-slate-400 border-slate-500/50';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 border border-indigo-500/30 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
                {/* Header */}
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-950">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden border border-slate-600">
                            {npc.portrait_url ? (
                                <img src={npc.portrait_url} alt={npc.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500">{npc.name.substr(0,2)}</div>
                            )}
                        </div>
                        <div>
                            <h3 className="font-bold text-white flex items-center gap-2">
                                {npc.name}
                                <Badge variant="outline" className={`text-[10px] ${getMoodColor(mood)} flex items-center gap-1`}>
                                    {getMoodIcon(mood)}
                                    {mood}
                                </Badge>
                            </h3>
                            <div className="flex items-center gap-3 text-xs text-slate-400">
                                <span>{npc.role}</span>
                                {/* Relationship Status would ideally be passed in or fetched. 
                                    Since we don't have it in props effectively updated, 
                                    we might need to fetch it or rely on toasts. 
                                    For now, we keep it simple. */}
                            </div>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Mood Change Alert */}
                {moodChangeAlert && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`mx-4 mt-2 p-2 rounded-lg border flex items-center gap-2 text-xs ${
                            moodChangeAlert.direction === 'improve' 
                                ? 'bg-green-950/30 border-green-500/30 text-green-300'
                                : 'bg-red-950/30 border-red-500/30 text-red-300'
                        }`}
                    >
                        {moodChangeAlert.direction === 'improve' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        <span>{moodChangeAlert.reason}</span>
                    </motion.div>
                )}

                {/* Chat History */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-900 to-slate-950">
                    {history.map((msg, idx) => (
                        <motion.div 
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex flex-col ${msg.role === 'player' ? 'items-end' : 'items-start'}`}
                        >
                            <div 
                                className={`max-w-[80%] p-3 rounded-lg text-sm leading-relaxed ${
                                    msg.role === 'player' 
                                    ? 'bg-indigo-600 text-white rounded-br-none' 
                                    : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
                                }`}
                            >
                                {msg.text}
                            </div>

                            {/* Voice Player for NPC */}
                            {msg.role === 'npc' && msg.audioUrl && (
                                <div className="mt-2">
                                    <VoicePlayer 
                                        audioUrl={msg.audioUrl} 
                                        text="Play voice" 
                                        autoPlay={idx === history.length - 1}
                                    />
                                </div>
                            )}

                            {/* NPC Inner Thought (Contextual Insight) */}
                            {msg.role === 'npc' && msg.thought && (
                                <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 italic max-w-[75%]">
                                    <Brain className="w-3 h-3" />
                                    <span>{msg.thought}</span>
                                </div>
                            )}
                        </motion.div>
                    ))}
                    
                    {isLoading && (
                        <div className="flex items-start">
                            <div className="bg-slate-800/50 p-3 rounded-lg rounded-bl-none border border-slate-700/50">
                                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Choices */}
                <div className="p-4 border-t border-slate-700 bg-slate-900">
                    {currentChoices.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2">
                            {currentChoices.map((choice, idx) => (
                                <Button
                                    key={idx}
                                    onClick={() => handlePlayerChoice(choice)}
                                    variant="outline"
                                    className="justify-start text-left h-auto py-3 px-4 border-slate-700 text-slate-300 hover:bg-indigo-900/20 hover:border-indigo-500 hover:text-white transition-all group"
                                >
                                    <span className="mr-2 text-indigo-500 opacity-50 group-hover:opacity-100 transition-opacity">
                                        {idx + 1}.
                                    </span>
                                    {choice.label}
                                </Button>
                            ))}
                        </div>
                    ) : (
                        !isLoading && (
                            <div className="text-center">
                                <Button onClick={onClose} variant="ghost" className="text-slate-400 hover:text-white">
                                    End Conversation
                                </Button>
                            </div>
                        )
                    )}
                </div>
            </motion.div>
        </div>
    );
}