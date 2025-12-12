import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertCircle, Radio, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function WorldContextPanel({ characterId, sceneId }) {
    const [events, setEvents] = useState([]);
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            if (!characterId) return;
            
            // Fetch active world events (could be filtered by scene or global)
            // For now, we fetch all relevant to scene + recent global
            try {
                // 1. Try to fetch existing events
                const existingEvents = await base44.entities.WorldEvent.filter({ trigger_scene_id: sceneId });
                
                if (existingEvents.length === 0) {
                    // Generate one if none exist
                    const res = await base44.functions.invoke('generateWorldContext', { character_id: characterId, scene_id: sceneId });
                    if (res.data.event) {
                        setEvents([res.data.event]);
                    }
                } else {
                    setEvents(existingEvents);
                }

                // 2. Fetch Environmental Logs
                const sceneLogs = await base44.entities.EnvironmentalLog.filter({ scene_id: sceneId });
                setLogs(sceneLogs);

            } catch (err) {
                console.error("Failed to load world context", err);
            }
        };
        fetchData();
    }, [characterId, sceneId]);

    if (events.length === 0 && logs.length === 0) return null;

    return (
        <div className="space-y-4">
            {/* News Ticker / Broadcast */}
            <AnimatePresence>
                {events.map(event => (
                    <motion.div 
                        key={event.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="bg-slate-900/80 border-l-4 border-indigo-500 p-3 rounded-r shadow-lg relative overflow-hidden group"
                    >
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />
                        <div className="flex items-start gap-3">
                            <div className="bg-indigo-900/50 p-1.5 rounded text-indigo-400 animate-pulse">
                                {event.type === 'broadcast' ? <Radio className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-1">
                                    {event.title}
                                </h4>
                                <p className="text-sm text-slate-300 font-mono leading-tight">
                                    {event.content}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* Environmental Logs */}
            <div className="space-y-2">
                {logs.map(log => (
                    <div key={log.id} className="bg-slate-950 border border-slate-800 p-3 rounded text-xs font-mono text-emerald-500/80 hover:text-emerald-400 transition-colors cursor-help">
                        <div className="flex justify-between items-center mb-1 opacity-70">
                            <span>[{log.location_tag}]</span>
                            {log.is_encrypted && <span className="text-amber-500">ENCRYPTED</span>}
                        </div>
                        <div>{log.content}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}