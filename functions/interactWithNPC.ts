import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { character_id, npc_id, player_input, conversation_history = [] } = await req.json();

        // 1. Fetch Data
        const [character, npc, relationship, memories, politicalState] = await Promise.all([
            base44.entities.Character.filter({ id: character_id }).then(r => r[0]),
            base44.entities.NPC.filter({ id: npc_id }).then(r => r[0]),
            base44.entities.Relationship.filter({ character_id: character_id, npc_id: npc_id }).then(r => r[0]),
            base44.entities.NPCMemory.filter({ character_id: character_id, npc_id: npc_id }),
            base44.entities.PoliticalState.filter({ character_id: character_id }).then(r => r[0])
        ]);

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

        // 3. Construct System Prompt
        const systemPrompt = `
            You are roleplaying as ${npc.name}, a ${npc.role} (${npc.archetype}) in a 1980s Anime Cyberpunk RPG.
            
            TONE: 80s sci-fi anime dub, emotional, atmospheric, slightly melodramatic but grounded in the setting.
            
            NPC PROFILE:
            Role: ${npc.role}
            Archetype: ${npc.archetype}
            
            RELATIONSHIP TO PLAYER:
            ${relContext}
            
            PLAYER CHARACTER STATS:
            ${charStats}
            
            SHARED MEMORIES:
            ${memoryContext || "None"}
            
            POLITICAL CLIMATE:
            ${politics}
            
            INSTRUCTIONS:
            - Respond to the player's input (or start conversation if input is empty).
            - React DYNAMICALLY to the player's Insight, Care, and Resolve. If Insight is high, be more guarded or impressed. If Care is high, be more vulnerable.
            - Reference past memories if relevant.
            - If Trust is high (>5), you may offer a hint or a side job.
            - If Safety is low (< -3), be hostile or fearful.
            
            OUTPUT JSON:
            {
                "dialogue": "The NPC's spoken line.",
                "inner_thought": "Short internal monologue showing their true feeling (optional).",
                "mood": "neutral" | "angry" | "happy" | "fearful" | "suspicious" | "tender",
                "choices": [
                    { "label": "Player response option 1", "tone": "agressive/empathetic/analytical" },
                    { "label": "Player response option 2", "tone": "..." },
                    { "label": "Player response option 3", "tone": "..." }
                ],
                "memory_update": { "type": "respect/fear/etc", "notes": "Short summary of this interaction to save" } (optional, if significant)
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
                    memory_update: {
                        type: "object",
                        properties: {
                            type: { type: "string" },
                            notes: { type: "string" }
                        }
                    }
                },
                required: ["dialogue", "choices"]
            }
        });

        // 5. Handle Memory Update (Side Effect)
        if (llmRes.memory_update) {
            // Check if we should add a new memory
            // For now, let's just create it. 
            // In a real app we might debounce or limit memories.
            await base44.entities.NPCMemory.create({
                npc_id: npc.id,
                character_id: character.id,
                memory_type: llmRes.memory_update.type || 'neutral',
                intensity: 1, // Default, logic could be improved
                notes: llmRes.memory_update.notes
            });
        }

        return Response.json(llmRes);

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});