import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { character_id, npc_id, player_input, conversation_history } = await req.json();

        if (!character_id || !npc_id) {
            return Response.json({ error: 'Missing character_id or npc_id' }, { status: 400 });
        }

        // Fetch Data
        const [characters, npcs] = await Promise.all([
            base44.entities.Character.filter({ id: character_id }),
            base44.entities.NPC.filter({ id: npc_id })
        ]);

        if (characters.length === 0 || npcs.length === 0) {
            return Response.json({ error: 'Character or NPC not found' }, { status: 404 });
        }

        const character = characters[0];
        const npc = npcs[0];
        const sceneId = character.current_scene_id;

        const scenes = await base44.entities.Scene.filter({ id: sceneId });
        if (scenes.length === 0) return Response.json({ error: 'Scene not found' }, { status: 404 });
        const currentScene = scenes[0];

        // Fetch Recent World Events and Player Actions
        const [recentEvents, recentChoices] = await Promise.all([
            base44.entities.WorldEvent.filter({ is_visible_to_public: true }, '-timestamp', 5).catch(() => []),
            base44.entities.ChoiceHistory.filter({ character_id: character_id }, '-timestamp', 3).catch(() => [])
        ]);

        // Fetch Relationship & Memories
        const [relationships, memories] = await Promise.all([
            base44.entities.Relationship.filter({ character_id: character_id, npc_id: npc_id }),
            base44.entities.NPCMemory.filter({ npc_id: npc_id, character_id: character_id }, '-timestamp', 5)
        ]);

        const relationship = relationships[0] || null;
        const politicalStates = await base44.entities.PoliticalState.filter({ character_id: character_id });
        const politicalState = politicalStates[0] || null;

        // Fetch Character Skills
        const charSkills = await base44.entities.CharacterSkill.filter({ character_id: character_id, active: true });
        const allSkills = await base44.entities.Skill.list();
        const activeSkills = allSkills.filter(s => charSkills.some(cs => cs.skill_id === s.id));

        // Build System Prompt
        const systemPrompt = `
            You are ${npc.name}, a complex character in a cyberpunk RPG.
            
            CONTEXT:
            Current Scene: ${currentScene.title}
            Scene Description: ${currentScene.body_text}
            NPC: ${npc.name} (${npc.role})
            NPC Current Mood: ${npc.emotional_state || 'Neutral'} - This influences your tone, openness, and behavior
            Player: ${character.name}
            Relationship Status: Trust ${relationship?.trust || 0}, Safety ${relationship?.safety || 0}, Respect ${relationship?.respect || 0}
            
            RECENT WORLD EVENTS (You are aware of these):
            ${recentEvents.length > 0 ? recentEvents.map(e => `- ${e.title}: ${e.description}`).join('\n            ') : '- No significant events recently'}
            
            PLAYER'S RECENT ACTIONS (You may reference these if relevant):
            ${recentChoices.length > 0 ? recentChoices.map(c => `- Made a decision in scene ${c.scene_key || 'Unknown'}`).join('\n            ') : '- New arrival, no history yet'}
            
            MEMORY OF PAST CONVERSATIONS:
            ${memories.length > 0 ? memories.slice(-3).map(m => `- ${m.summary}`).join('\n            ') : '- This is your first conversation'}

            PERSONALITY:
            ${npc.personality || 'Standard personality'}
            Voice: ${npc.voice_style || 'neutral'}

            MOOD BEHAVIOR GUIDE:
            - Neutral: Professional, balanced, willing to engage
            - Vulnerable: Open, seeking support, reveals more
            - Resilient: Confident, positive, helpful
            - Empathetic: Warm, understanding, supportive
            - Guarded: Suspicious, defensive, short answers
            - Volatile: Angry, confrontational, unpredictable
            - Hopeful: Optimistic, forward-looking
            - Despondent: Defeated, cynical, minimal engagement
            
            Adjust your dialogue tone, length, and willingness to help based on your current mood.
            
            INSTRUCTIONS:
            1. Respond naturally as ${npc.name}.
            2. DYNAMIC: Reflect faction tensions if relevant (Political State: ${politicalState ? JSON.stringify(politicalState) : 'Unknown'}).
            3. REFERENCE THE WORLD: Mention recent events, the scene location, or player's known actions when relevant to make dialogue feel reactive and alive.
            4. Stay in character. Use voice/style notes if provided.
            5. Offer 2-4 response choices for the player.
            6. MOOD DYNAMICS: Based on player's approach (respectful, aggressive, empathetic), determine if your mood should shift:
               - 'improve' if they're kind/respectful/helpful
               - 'worsen' if they're rude/threatening/dismissive
               - 'neutral' if interaction is standard
            7. Return JSON only.
        `;

        const userMessage = player_input || "I want to talk.";

        const llmResponse = await base44.integrations.Core.InvokeLLM({
            prompt: systemPrompt + `\n\nPlayer says: "${userMessage}"\n\nRespond in character.`,
            response_json_schema: {
                type: "object",
                properties: {
                    dialogue: {
                        type: "string",
                        description: "NPC's spoken response"
                    },
                    inner_thought: {
                        type: "string",
                        description: "NPC's private thought (insight for player)"
                    },
                    mood: {
                        type: "string",
                        enum: ["neutral", "happy", "angry", "fearful", "suspicious", "tender"],
                        description: "Current emotional tone"
                    },
                    choices: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                label: { type: "string" },
                                tone: { type: "string", enum: ["neutral", "aggressive", "empathetic"] }
                            },
                            required: ["label"]
                        },
                        description: "Array of possible player responses"
                    },
                    mood_shift: {
                        type: "string",
                        enum: ["improve", "worsen", "neutral"],
                        description: "How this interaction affects your emotional state"
                    },
                    mood_shift_reason: {
                        type: "string",
                        description: "Brief explanation of why mood shifted"
                    },
                    suggested_emotional_state: {
                        type: "string",
                        enum: ["Neutral", "Vulnerable", "Resilient", "Empathetic", "Guarded", "Volatile", "Hopeful", "Despondent"],
                        description: "Optional: Suggest a new emotional state if a major shift occurred"
                    }
                },
                required: ["dialogue", "inner_thought", "choices"]
            }
        });

        // Apply Mood Shift
        const moodTransitions = {
            improve: {
                Guarded: 'Neutral', Volatile: 'Guarded', Despondent: 'Neutral',
                Neutral: 'Resilient', Vulnerable: 'Hopeful', Resilient: 'Empathetic',
                Empathetic: 'Empathetic', Hopeful: 'Resilient'
            },
            worsen: {
                Empathetic: 'Neutral', Resilient: 'Neutral', Hopeful: 'Vulnerable',
                Neutral: 'Guarded', Vulnerable: 'Despondent', Guarded: 'Volatile',
                Volatile: 'Volatile', Despondent: 'Despondent'
            }
        };

        let newMood = npc.emotional_state || 'Neutral';
        if (llmResponse.mood_shift && llmResponse.mood_shift !== 'neutral') {
            const transitions = moodTransitions[llmResponse.mood_shift];
            newMood = transitions[newMood] || newMood;
        }

        if (llmResponse.suggested_emotional_state) {
            newMood = llmResponse.suggested_emotional_state;
        }

        const moodChanged = newMood !== npc.emotional_state;
        if (moodChanged) {
            await base44.entities.NPC.update(npc_id, { 
                emotional_state: newMood 
            });
        }

        // Update Relationship
        let relationshipUpdate = null;
        if (player_input) {
            const tone = llmResponse.choices?.[0]?.tone || 'neutral';
            let trustChange = 0;
            if (tone === 'empathetic') trustChange = 1;
            else if (tone === 'aggressive') trustChange = -1;

            if (trustChange !== 0 && relationship) {
                await base44.entities.Relationship.update(relationship.id, {
                    trust: (relationship.trust || 0) + trustChange
                });
                relationshipUpdate = { trust_change: trustChange, reason: llmResponse.mood_shift_reason };
            }
        }

        // Save Memory
        if (player_input) {
            await base44.entities.NPCMemory.create({
                npc_id: npc_id,
                character_id: character_id,
                summary: `Player said: "${player_input}". I responded: "${llmResponse.dialogue.substring(0, 100)}..."`
            });
        }

        // Skill Progress
        let skillUpdates = [];
        if (activeSkills.length > 0 && player_input) {
            for (const skill of activeSkills) {
                if (skill.category === 'relational' && llmResponse.mood_shift === 'improve') {
                    skillUpdates.push({ skill_key: skill.key, xp_amount: 2, reason: 'Positive NPC interaction' });
                }
            }
        }

        // Quest Generation
        let newQuest = null;
        if (llmResponse.dialogue.toLowerCase().includes('help') && (relationship?.trust || 0) >= 20) {
            try {
                const questRes = await base44.functions.invoke('generateQuest', { 
                    character_id: character_id, 
                    npc_id: npc_id 
                });
                newQuest = questRes.data.quest;
            } catch (err) {
                console.error("Quest generation failed", err);
            }
        }

        return Response.json({
            dialogue: llmResponse.dialogue,
            inner_thought: llmResponse.inner_thought,
            mood: newMood,
            mood_changed: moodChanged,
            mood_shift_reason: llmResponse.mood_shift_reason,
            choices: llmResponse.choices,
            skill_updates: skillUpdates,
            relationship_update: relationshipUpdate,
            new_quest: newQuest
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});