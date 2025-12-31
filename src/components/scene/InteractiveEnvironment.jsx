import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, Zap, Wifi, Package, Lock, AlertTriangle, 
  CheckCircle2, XCircle, Sparkles, TrendingUp, TrendingDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function InteractiveEnvironment({ 
  sceneId, 
  characterId, 
  character,
  onInteractionComplete 
}) {
  const [interactables, setInteractables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [interacting, setInteracting] = useState(null);
  const [scanResult, setScanResult] = useState(null);

  const iconMap = {
    examine: <Eye className="w-5 h-5" />,
    interact: <Zap className="w-5 h-5" />,
    connect: <Wifi className="w-5 h-5" />,
    recover: <Package className="w-5 h-5" />,
    hack: <Lock className="w-5 h-5" />
  };

  const typeColors = {
    examine: "border-blue-500/30 bg-blue-950/20 hover:bg-blue-950/40",
    interact: "border-amber-500/30 bg-amber-950/20 hover:bg-amber-950/40",
    connect: "border-cyan-500/30 bg-cyan-950/20 hover:bg-cyan-950/40",
    recover: "border-green-500/30 bg-green-950/20 hover:bg-green-950/40",
    hack: "border-red-500/30 bg-red-950/20 hover:bg-red-950/40"
  };

  const scanEnvironment = async () => {
    setLoading(true);
    try {
      const { base44 } = await import('@/api/base44Client');
      const res = await base44.functions.invoke('scanForInteractables', { scene_id: sceneId });
      
      if (res.data.interactables) {
        setInteractables(res.data.interactables);
        setScanResult({
          count: res.data.interactables.length,
          source: res.data.source
        });
        toast.success(`Scan complete: ${res.data.interactables.length} objects detected`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Environmental scan failed');
    } finally {
      setLoading(false);
    }
  };

  const getStatAdvantage = (type) => {
    // Determine if character has stat advantage for this action
    const { insight = 0, care = 0, resolve = 0, presence = 0 } = character || {};
    
    switch(type) {
      case 'examine':
        return insight >= 30 ? { has: true, stat: 'Insight', bonus: '+15% clarity' } : null;
      case 'connect':
        return insight >= 40 ? { has: true, stat: 'Insight', bonus: '+20% data recovery' } : null;
      case 'hack':
        return resolve >= 35 ? { has: true, stat: 'Resolve', bonus: '+25% breach chance' } : null;
      case 'interact':
        return presence >= 30 ? { has: true, stat: 'Presence', bonus: '+10% favorable outcome' } : null;
      case 'recover':
        return care >= 25 ? { has: true, stat: 'Care', bonus: 'Minimal community impact' } : null;
      default:
        return null;
    }
  };

  const handleInteract = async (item) => {
    setInteracting(item.id);
    try {
      const { base44 } = await import('@/api/base44Client');
      const res = await base44.functions.invoke('interactWithEnvironment', {
        interactable_id: item.id,
        character_id: characterId
      });

      if (res.data.narrative) {
        toast.success(
          <div className="space-y-2">
            <div className="font-bold">{item.label}</div>
            <div className="text-sm">{res.data.narrative}</div>
          </div>,
          { duration: 6000 }
        );

        // Remove used item
        setInteractables(prev => prev.filter(i => i.id !== item.id));
        
        if (onInteractionComplete) {
          onInteractionComplete(res.data);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Interaction failed');
    } finally {
      setInteracting(null);
    }
  };

  return (
    <Card className="bg-slate-900/60 backdrop-blur border-slate-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          Environmental Scan
        </h3>
        <Button
          onClick={scanEnvironment}
          disabled={loading || interactables.length > 0}
          size="sm"
          variant="outline"
          className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-950/30"
        >
          {loading ? 'Scanning...' : interactables.length > 0 ? 'Scanned' : 'Scan Area'}
        </Button>
      </div>

      {scanResult && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-2 bg-slate-950/50 rounded border border-slate-800 text-xs text-slate-400"
        >
          {scanResult.count} interactive element{scanResult.count !== 1 ? 's' : ''} detected
          {scanResult.source === 'cache' && ' (from memory)'}
        </motion.div>
      )}

      <div className="space-y-3">
        <AnimatePresence>
          {interactables.map((item, idx) => {
            const advantage = getStatAdvantage(item.type);
            const isExhausted = item.status === 'exhausted';
            
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: idx * 0.1 }}
                className={`relative p-3 rounded-lg border-2 transition-all ${
                  isExhausted 
                    ? 'opacity-40 border-slate-800 bg-slate-900/20' 
                    : typeColors[item.type]
                }`}
              >
                <div className="flex gap-3">
                  {item.image_url && (
                    <div className="w-16 h-16 rounded bg-slate-950 border border-slate-700 flex-shrink-0 overflow-hidden">
                      <img 
                        src={item.image_url} 
                        alt={item.label}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <div className="text-white">{iconMap[item.type]}</div>
                        <h4 className="font-bold text-white text-sm">{item.label}</h4>
                      </div>
                      <Badge 
                        variant="outline" 
                        className="text-[10px] border-slate-600 text-slate-400"
                      >
                        {item.type}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-slate-400 mb-2 line-clamp-2">
                      {item.description}
                    </p>

                    {advantage && (
                      <div className="flex items-center gap-1 mb-2 text-[10px] text-green-400">
                        <TrendingUp className="w-3 h-3" />
                        <span>{advantage.stat} Bonus: {advantage.bonus}</span>
                      </div>
                    )}

                    {!isExhausted && (
                      <Button
                        onClick={() => handleInteract(item)}
                        disabled={interacting === item.id}
                        size="sm"
                        className="w-full h-8 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-600"
                      >
                        {interacting === item.id ? 'Processing...' : `${item.type.charAt(0).toUpperCase() + item.type.slice(1)}`}
                      </Button>
                    )}
                  </div>
                </div>

                {isExhausted && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm rounded-lg">
                    <span className="text-xs text-slate-500 font-mono">EXHAUSTED</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {interactables.length === 0 && !loading && (
          <div className="text-center py-8 text-slate-600 text-sm">
            No interactive elements detected. Scan the environment to discover objects.
          </div>
        )}
      </div>
    </Card>
  );
}