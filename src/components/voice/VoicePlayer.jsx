import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function VoicePlayer({ audioUrl, text, autoPlay = false, className = "" }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const audioRef = useRef(null);

    useEffect(() => {
        if (audioUrl && autoPlay) {
            handlePlay();
        }
    }, [audioUrl]);

    const handlePlay = async () => {
        if (!audioUrl) return;
        
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                setIsLoading(true);
                try {
                    await audioRef.current.play();
                    setIsPlaying(true);
                } catch (err) {
                    console.error('Audio playback failed:', err);
                } finally {
                    setIsLoading(false);
                }
            }
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
    };

    if (!audioUrl) return null;

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <audio 
                ref={audioRef} 
                src={audioUrl} 
                onEnded={handleEnded}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
            />
            <Button
                size="icon"
                variant="ghost"
                onClick={handlePlay}
                disabled={isLoading}
                className="h-8 w-8 rounded-full bg-slate-800/50 hover:bg-slate-700 border border-cyan-500/30 hover:border-cyan-400"
            >
                {isLoading ? (
                    <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                ) : isPlaying ? (
                    <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                        <Volume2 className="w-4 h-4 text-cyan-400" />
                    </motion.div>
                ) : (
                    <VolumeX className="w-4 h-4 text-slate-400" />
                )}
            </Button>
            {text && (
                <span className="text-xs text-slate-500 italic max-w-xs truncate">
                    {text}
                </span>
            )}
        </div>
    );
}