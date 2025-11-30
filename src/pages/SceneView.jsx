import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import StatsPanel from '../components/scene/StatsPanel';
import RelationshipsSummary from '../components/scene/RelationshipsSummary';
import ChoiceButton from '../components/scene/ChoiceButton';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SceneView() {
  const [characterId, setCharacterId] = useState(null);
  const [isProcessingChoice, setIsProcessingChoice] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const id = sessionStorage.getItem('selectedCharacterId');
    if (!id) {
      window.location.href = '/CharacterSelect';
    } else {
      setCharacterId(id);
    }
  }, []);

  const { data: character, isLoading: characterLoading, refetch: refetchCharacter } = useQuery({
    queryKey: ['character', characterId],
    queryFn: async () => {
      const chars = await base44.entities.Character.filter({ id: characterId });
      return chars[0];
    },
    enabled: !!characterId
  });

  // Initialize character with start scene if needed
  useEffect(() => {
    const initializeCharacter = async () => {
      if (character && !character.current_scene_id) {
        const scenes = await base44.entities.Scene.filter({ key: 'first_watch_start' });
        if (scenes.length > 0) {
          await base44.entities.Character.update(character.id, {
            current_scene_id: scenes[0].id
          });
          refetchCharacter();
        }
      }
    };
    initializeCharacter();
  }, [character]);

  const { data: currentScene } = useQuery({
    queryKey: ['scene', character?.current_scene_id],
    queryFn: async () => {
      const scenes = await base44.entities.Scene.filter({ id: character.current_scene_id });
      return scenes[0];
    },
    enabled: !!character?.current_scene_id
  });

  const { data: choices = [] } = useQuery({
    queryKey: ['choices', currentScene?.id],
    queryFn: async () => {
      return await base44.entities.Choice.filter({ scene_id: currentScene.id });
    },
    enabled: !!currentScene?.id
  });

  const { data: relationships = [] } = useQuery({
    queryKey: ['relationships', characterId],
    queryFn: async () => {
      return await base44.entities.Relationship.filter({ character_id: characterId });
    },
    enabled: !!characterId
  });

  const { data: npcs = [] } = useQuery({
    queryKey: ['npcs'],
    queryFn: async () => {
      return await base44.entities.NPC.list();
    }
  });

  const handleChoice = async (choice) => {
    setIsProcessingChoice(true);
    
    try {
      // Apply effects if effect_script_id exists
      if (choice.effect_script_id) {
        const scripts = await base44.entities.EffectScript.filter({ id: choice.effect_script_id });
        if (scripts.length > 0) {
          const effectScript = scripts[0];
          const effects = effectScript.effect_json;

          // Apply stat changes
          if (effects.stats) {
            const updates = {};
            Object.keys(effects.stats).forEach(stat => {
              updates[stat] = (character[stat] || 0) + effects.stats[stat];
            });
            await base44.entities.Character.update(character.id, updates);
          }

          // Apply relationship changes
          if (effects.relationships && effects.relationships.length > 0) {
            for (const relEffect of effects.relationships) {
              let targetNpcId = relEffect.npc_id;

              // Resolve npc_key if npc_id is missing
              if (!targetNpcId && relEffect.npc_key) {
                const targetNpc = npcs.find(n => 
                  (n.key && n.key === relEffect.npc_key) || 
                  (n.name && n.name.toLowerCase() === relEffect.npc_key.toLowerCase())
                );
                if (targetNpc) targetNpcId = targetNpc.id;
              }

              if (!targetNpcId) {
                console.warn('Could not find NPC for effect:', relEffect);
                continue;
              }

              const existingRels = await base44.entities.Relationship.filter({
                character_id: character.id,
                npc_id: targetNpcId
              });

              if (existingRels.length > 0) {
                const rel = existingRels[0];
                await base44.entities.Relationship.update(rel.id, {
                  trust: (rel.trust || 0) + (relEffect.trust || 0),
                  respect: (rel.respect || 0) + (relEffect.respect || 0),
                  safety: (rel.safety || 0) + (relEffect.safety || 0),
                  influence: (rel.influence || 0) + (relEffect.influence || 0)
                });
              } else {
                await base44.entities.Relationship.create({
                  character_id: character.id,
                  npc_id: targetNpcId,
                  trust: relEffect.trust || 0,
                  respect: relEffect.respect || 0,
                  safety: relEffect.safety || 0,
                  influence: relEffect.influence || 0
                });
              }
            }
          }

          // Apply faction changes
          if (effects.factions && effects.factions.length > 0) {
            for (const factionEffect of effects.factions) {
              const existingStatuses = await base44.entities.CharacterFactionStatus.filter({
                character_id: character.id,
                faction_id: factionEffect.faction_id
              });

              if (existingStatuses.length > 0) {
                const status = existingStatuses[0];
                await base44.entities.CharacterFactionStatus.update(status.id, {
                  alignment: (status.alignment || 0) + (factionEffect.alignment || 0)
                });
              } else {
                await base44.entities.CharacterFactionStatus.create({
                  character_id: character.id,
                  faction_id: factionEffect.faction_id,
                  alignment: factionEffect.alignment || 0
                });
              }
            }
          }
        }
      }

      // Move to next scene
      let nextSceneId = choice.next_scene_id;

      // SPECIAL LOGIC: Routing to Chapter End based on Balance
      if (choice.label === "Reflect on your path") {
        const { masculine_energy = 50, feminine_energy = 50 } = character;
        const diff = masculine_energy - feminine_energy;
        
        let targetSceneKey = 'chapter_end_balanced';
        if (diff >= 15) targetSceneKey = 'chapter_end_shadow_masculine';
        else if (diff <= -15) targetSceneKey = 'chapter_end_shadow_feminine';
        else targetSceneKey = 'chapter_end_balanced';

        const targetScenes = await base44.entities.Scene.filter({ key: targetSceneKey });
        if (targetScenes.length > 0) {
          nextSceneId = targetScenes[0].id;
        }
      }

      if (nextSceneId) {
        await base44.entities.Character.update(character.id, {
          current_scene_id: nextSceneId
        });
      }

      // Evaluate Balance Workflow
      const updatedCharList = await base44.entities.Character.filter({ id: character.id });
      if (updatedCharList.length > 0) {
        const char = updatedCharList[0];
        let { 
          masculine_energy = 50, 
          feminine_energy = 50,
          presence = 0,
          insight = 0,
          resolve = 0,
          care = 0,
          fear_freeze = 0
        } = char;

        // 1. Clamp raw energy
        masculine_energy = Math.max(0, Math.min(100, masculine_energy));
        feminine_energy = Math.max(0, Math.min(100, feminine_energy));

        // 2. Compute difference
        const diff = masculine_energy - feminine_energy;
        let zone = null;

        // 3. Determine Zone
        if (diff >= -10 && diff <= 10) {
          zone = 'balanced';
        } else if (diff >= 15) {
          zone = 'shadow_masculine';
        } else if (diff <= -15) {
          zone = 'shadow_feminine';
        }

        // 4. Apply side-effects based on zone
        if (zone === 'balanced') {
          presence += 1;
          insight += 1;
          fear_freeze -= 1;
        } else if (zone === 'shadow_masculine') {
          presence += 1;
          resolve += 1;
          care -= 1;
          insight -= 1;
          fear_freeze += 1;
        } else if (zone === 'shadow_feminine') {
          care += 1;
          insight += 1;
          presence -= 1;
          resolve -= 1;
          fear_freeze += 1;
        }

        // 5. Clamp affected stats (0-100)
        const clamp = (val) => Math.max(0, Math.min(100, val));
        
        const balanceUpdates = {
          masculine_energy,
          feminine_energy,
          presence: clamp(presence),
          insight: clamp(insight),
          resolve: clamp(resolve),
          care: clamp(care),
          fear_freeze: clamp(fear_freeze)
        };

        await base44.entities.Character.update(character.id, balanceUpdates);
      }

      // Refetch everything
      queryClient.invalidateQueries();
      
    } catch (error) {
      console.error('Error processing choice:', error);
    } finally {
      setIsProcessingChoice(false);
    }
  };

  const handleBackToCharacters = () => {
    sessionStorage.removeItem('selectedCharacterId');
    window.location.href = '/CharacterSelect';
  };

  if (!characterId || characterLoading || !character) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!currentScene) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">No scene available</p>
          <Button onClick={handleBackToCharacters} variant="outline" className="border-slate-700 text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Characters
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: currentScene.background_image_url 
          ? `linear-gradient(rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.85)), url(${currentScene.background_image_url})`
          : 'linear-gradient(to bottom right, rgb(15, 23, 42), rgb(88, 28, 135), rgb(15, 23, 42))'
      }}
    >
      <div className="container mx-auto px-4 py-6">
        <Button 
          onClick={handleBackToCharacters}
          variant="ghost"
          className="mb-4 text-slate-300 hover:text-white hover:bg-slate-800/50"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Characters
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Scene content */}
            <div className="bg-slate-800/80 backdrop-blur rounded-lg p-8 border border-slate-700">
              <h1 className="text-3xl font-bold text-white mb-4">{currentScene.title}</h1>
              <div className="text-slate-200 leading-relaxed whitespace-pre-wrap">
                {currentScene.body_text}
              </div>
            </div>

            {/* Choices */}
            {currentScene.is_terminal ? (
              <div className="bg-slate-800/80 backdrop-blur rounded-lg p-8 border border-slate-700 text-center">
                <h2 className="text-2xl font-bold text-white mb-4">The End</h2>
                <p className="text-slate-300 mb-6">This chapter has concluded</p>
                <div className="flex justify-center gap-4">

                  <Button 
                    onClick={handleBackToCharacters}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                  >
                    Return to Character Selection
                  </Button>
                </div>
              </div>
            ) : choices.length > 0 ? (
              <div className="space-y-3">
                {choices.map((choice) => (
                  <ChoiceButton
                    key={choice.id}
                    choice={choice}
                    onSelect={handleChoice}
                    disabled={isProcessingChoice}
                  />
                ))}
                {isProcessingChoice && (
                  <div className="flex items-center justify-center gap-2 text-slate-300 py-4">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing your choice...</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-800/80 backdrop-blur rounded-lg p-6 border border-slate-700 text-center">
                <p className="text-slate-400 italic">No choices are defined for this scene yet.</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <StatsPanel character={character} />
            <RelationshipsSummary relationships={relationships} npcs={npcs} />
          </div>
        </div>
      </div>
    </div>
  );
}