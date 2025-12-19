import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { character_id, npc_id, player_input, conversation_history = [] } = await req.json();

        // 1. Fetch Data
        const character = await base44.entities.Character.filter({ id: character_id }).then(r => r[0]);
        if (!character) return Response.json({ error: 'Character not found' }, { status: 404 });

        const [npc, relationship, memories, politicalState, currentScene, allSkills] = await Promise.all([
            base44.entities.NPC.filter({ id: npc_id }).then(r => r[0]),
            base44.entities.Relationship.filter({ character_id: character_id, npc_id: npc_id }).then(r => r[0]),
            base44.entities.NPCMemory.filter({ character_id: character_id, npc_id: npc_id }),
            base44.entities.PoliticalState.filter({ character_id: character_id }).then(r => r[0]),
            character.current_scene_id ? base44.entities.Scene.filter({ id: character.current_scene_id }).then(r => r[0]) : null,
            base44.entities.Skill.list()
        ]);

        let archetypeData = null;
        if (npc && npc.personality_archetype_id) {
            const archetypes = await base44.entities.PersonalityArchetype.filter({ id: npc.personality_archetype_id });
            if (archetypes.length > 0) archetypeData = archetypes[0];
        }

        let archetypeData = null;
        if (npc && npc.personality_archetype_id) {
            const archetypes = await base44.entities.PersonalityArchetype.filter({ id: npc.personality_archetype_id });
            if (archetypes.length > 0) archetypeData = archetypes[0];
        }

        if (!character || !npc) return Response.json({ error: 'Data not found' }, { status: 404 });

        // 2. Build Context String
        const memoryContext = memories.map(m => `- [${m.memory_type.toUpperCase()}] ${m.notes} (Intensity: ${m.intensity})`).join('\n');
        
        const relContext = relationship ? 
            `Trust: ${relationship.trust}, Respect: ${relationship.respect}, Safety: ${relationship.safety}` : 
            "No prior relationship established.";

        const charStats = `
            Insight: ${character.insight}
            Care: ${character.care}
            Resolve: ${character.resolve}
            Integrity: ${character.integrity}
            Energy: ${character.masculine_energy}M / ${character.feminine_energy}F
        `;

        const politics = politicalState ? `Old Guard: ${politicalState.old_guard_pressure}, Lantern: ${politicalState.lantern_influence}` : "Unknown";
        const sceneContext = currentScene ? `LOCATION: ${currentScene.title}\nATMOSPHERE: ${currentScene.body_text}` : "Location: Unknown";

        const isChild = (character.age || 18) < 18;

        // 3. Construct System Prompt
        const systemPrompt = `
            You are roleplaying as ${npc.name}, a ${npc.role} (${npc.archetype}) in a 1980s Anime Cyberpunk RPG.
            TARGET AUDIENCE: ${isChild ? "CHILD (Age " + character.age + ")" : "ADULT"}.
            
            TONE: ${isChild ? "Friendly, Mentor-like, Simple Language, Encouraging." : "80s sci-fi anime dub, Gritty."} ${npc.voice_style ? `Specific Voice: ${npc.voice_style}` : ''}
            PERSONALITY: ${npc.personality || "Standard cyberpunk archetype"}
            
            CURRENT SCENE CONTEXT:
            ${sceneContext}
            
            NPC PROFILE:
            Role: ${npc.role}
            Archetype: ${npc.archetype}
            Emotional State: ${npc.emotional_state || 'Neutral'}
            ${archetypeData ? `
            ARCHETYPE TRAITS (${archetypeData.name}):
            - Behaviors: ${archetypeData.behavioral_traits ? archetypeData.behavioral_traits.join(', ') : 'None'}
            - Vocal Tics: ${archetypeData.vocal_tics ? archetypeData.vocal_tics.join(', ') : 'None'}
            - Motivation: ${archetypeData.motivations}
            - Core Fear: ${archetypeData.core_fear}
            - Core Desire: ${archetypeData.core_desire}
            ` : ''}
            
            RELATIONSHIP TO PLAYER:
            ${relContext}
            
            PLAYER CHARACTER STATS & DESCRIPTION:
            ${charStats}
            Current Emotional State: ${character.emotional_state || 'Neutral'}
            Visuals: ${character.character_visual_prompt || "Standard uniform"}
            Hair: ${character.hair_length || "average"}. (If "bald" or "shaved", the player has NO hair).
            
            SHARED MEMORIES:
            ${memoryContext || "None"}
            
            POLITICAL CLIMATE:
            ${politics}
            
            AVAILABLE SKILLS:
            ${allSkills.map(s => `- ${s.name} (Key: ${s.key}): ${s.description}`).join('\n')}

            INSTRUCTIONS:
            - Respond to the player's input.
            - NO RELIGIOUS REFERENCES. Do not use terms like "god", "pray", "holy", "demon", "angel", "sacred", etc. Use tech/sci-fi metaphors instead (e.g. "void", "signal", "glitch", "code").
            - IF DESCRIBING THE PLAYER: Ensure physical descriptions match their stats (e.g. if Bald, do not mention wind in hair).
            - React DYNAMICALLY to the player's stats and history:
                - High Care (>70): NPC feels safer, opens up emotionally, tone softens.
                - Low Care (<30): NPC is guarded, cynical, or feels unheard.
                - High Masculine Energy (>70): NPC respects directness/action, may challenge passivity.
                - High Feminine Energy (>70): NPC responds to connection/nuance, may be overwhelmed by aggression.
                - High Insight (>70): NPC knows they can't lie to the player; they are more direct with truth.
            - Reference past memories if relevant.
            - If the player demonstrates a specific skill through their words or approach (e.g. empathy -> relational, logic -> critical_thought), AWARD XP.
            - If Trust is high or the conversation warrants it, you may OFFER A QUEST (a favor, investigation, or mission).
            - SUGGEST DIALOGUE CHOICES that foster EMPATHY and SELF-REFLECTION if the context allows. Help the player explore emotional depth.
            
            OUTPUT JSON:
            {
                "dialogue": "The NPC's spoken line.",
                "inner_thought": "Short internal monologue showing their true feeling (optional).",
                "mood": "neutral" | "angry" | "happy" | "fearful" | "suspicious" | "tender",
                "new_npc_emotional_state": "Neutral" | "Vulnerable" | "Resilient" | "Empathetic" | "Guarded" | "Volatile" | "Hopeful" | "Despondent",
                "choices": [
                    { "label": "Player response option 1", "tone": "aggressive/empathetic/analytical" },
                    { "label": "Player response option 2", "tone": "..." }
                ],
                "memory_update": { "type": "respect/fear/etc", "notes": "Short summary" } (optional),
                "skill_updates": [
                    { "skill_key": "relational_1", "xp_amount": 10, "reason": "Showed empathy" }
                ] (optional, max 1-2 skills),
                "quest_offer": { "concept": "Investigate the leaking power conduit in Sector 4" } (optional, only if relevant)
            }
        `;

        const userPrompt = player_input ? `Player says: "${player_input}"` : "Player approaches you to talk.";

        // 4. Call LLM
        const llmRes = await base44.integrations.Core.InvokeLLM({
            prompt: `${systemPrompt}\n\n${userPrompt}`,
            response_json_schema: {
                type: "object",
                properties: {
                    dialogue: { type: "string" },
                    inner_thought: { type: "string" },
                    mood: { type: "string" },
                    choices: { 
                        type: "array", 
                        items: { 
                            type: "object", 
                            properties: {
                                label: { type: "string" },
                                tone: { type: "string" }
                            },
                            required: ["label"]
                        } 
                    },
                    new_npc_emotional_state: { type: "string", enum: ["Neutral", "Vulnerable", "Resilient", "Empathetic", "Guarded", "Volatile", "Hopeful", "Despondent"] },
                    memory_update: {
                        type: "object",
                        properties: {
                            type: { type: "string" },
                            notes: { type: "string" }
                        }
                    },
                    skill_updates: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                skill_key: { type: "string" },
                                xp_amount: { type: "integer" },
                                reason: { type: "string" }
                            },
                            required: ["skill_key", "xp_amount"]
                        }
                    }
                },
                required: ["dialogue", "choices"]
            }
        });

        // 5. Update NPC Emotional State
        if (llmRes.new_npc_emotional_state) {
            await base44.entities.NPC.update(npc.id, { emotional_state: llmRes.new_npc_emotional_state });
        }

        // 6. Handle Memory Update (Side Effect)
        if (llmRes.memory_update) {
            await base44.entities.NPCMemory.create({
                npc_id: npc.id,
                character_id: character.id,
                memory_type: llmRes.memory_update.type || 'neutral',
                intensity: 1,
                notes: llmRes.memory_update.notes
            });
        }

        // 6. Handle Skill Updates
        if (llmRes.skill_updates && llmRes.skill_updates.length > 0) {
            for (const update of llmRes.skill_updates) {
                const existing = await base44.entities.SkillProgression.filter({ 
                    character_id: character.id, 
                    skill_key: update.skill_key 
                });

                if (existing.length > 0) {
                    await base44.entities.SkillProgression.update(existing[0].id, {
                        current_xp: (existing[0].current_xp || 0) + update.xp_amount,
                        last_updated_at: new Date().toISOString()
                    });
                } else {
                    await base44.entities.SkillProgression.create({
                        character_id: character.id,
                        skill_key: update.skill_key,
                        current_xp: update.xp_amount,
                        level: 1,
                        last_updated_at: new Date().toISOString()
                    });
                }
            }
        }

        // 7. Handle Quest Generation
        let newQuest = null;
        if (llmRes.quest_offer) {
            try {
                // Call generateQuest function
                const questRes = await base44.functions.invoke('generateQuest', {
                    character_id: character.id,
                    npc_id: npc.id,
                    concept: llmRes.quest_offer.concept,
                    source: "NPC Interaction"
                });
                
                if (questRes.data && questRes.data.status === 'success') {
                    newQuest = questRes.data.quest;
                }
            } catch (err) {
                console.error("Failed to generate quest:", err);
            }
        }

        return Response.json({
            ...llmRes,
            new_quest: newQuest
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});