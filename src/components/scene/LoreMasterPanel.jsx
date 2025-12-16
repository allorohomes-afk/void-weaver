import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Send, Loader2, X, Terminal } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoreMasterPanel({ characterId, isOpen, onClose }) {
    const [question, setQuestion] = useState("");
    const [history, setHistory] = useState([
        { role: 'ai', text: "Archive Interface Initialized. Awaiting query..." }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history]);

    const handleAsk = async (e) => {
        e.preventDefault();
        if (!question.trim() || isLoading) return;

        const q = question;
        setQuestion("");
        setHistory(prev => [...prev, { role: 'user', text: q }]);
        setIsLoading(true);

        try {
            const res = await base44.functions.invoke('askLoreMaster', {
                character_id: characterId,
                question: q
            });
            
            setHistory(prev => [...prev, { role: 'ai', text: res.data.answer }]);
        } catch (err) {
            setHistory(prev => [...prev, { role: 'ai', text: "ERROR: Connection to Archive severed. Please retry." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ x: '100%', opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: '100%', opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="fixed inset-y-0 right-0 z-50 w-full sm:w-[400px] bg-slate-950/95 border-l border-cyan-900/50 shadow-2xl backdrop-blur-md flex flex-col"
                >
                    {/* Header */}
                    <div className="p-4 border-b border-cyan-900/30 flex justify-between items-center bg-cyan-950/20">
                        <div className="flex items-center gap-2 text-cyan-400">
                            <Terminal className="w-5 h-5" />
                            <h2 className="font-mono font-bold tracking-wider">THE ARCHIVE</h2>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose} className="text-cyan-600 hover:text-cyan-400 hover:bg-cyan-950/30">
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Chat Area */}
                    <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                        <div className="space-y-4">
                            {history.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div 
                                        className={`max-w-[85%] p-3 rounded-lg text-sm font-mono leading-relaxed ${
                                            msg.role === 'user' 
                                            ? 'bg-cyan-900/40 text-cyan-100 border border-cyan-700/50' 
                                            : 'bg-slate-900/80 text-cyan-300/90 border border-slate-800'
                                        }`}
                                    >
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 text-cyan-500 animate-spin" />
                                        <span className="text-xs font-mono text-cyan-500 animate-pulse">Accessing Neural Database...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    {/* Input Area */}
                    <div className="p-4 border-t border-cyan-900/30 bg-slate-900/50">
                        <form onSubmit={handleAsk} className="flex gap-2">
                            <Input 
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                placeholder="Query the lore..."
                                className="bg-slate-950 border-cyan-900/50 text-cyan-100 focus:border-cyan-500/50 placeholder:text-cyan-900"
                            />
                            <Button type="submit" disabled={isLoading || !question.trim()} className="bg-cyan-900/50 hover:bg-cyan-800 border border-cyan-700/50 text-cyan-100">
                                <Send className="w-4 h-4" />
                            </Button>
                        </form>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}