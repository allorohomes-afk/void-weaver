import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { character_id, previous_scene_id, previous_choice_id } = await req.json();

        if (!character_id || !previous_scene_id) {
            return Response.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        // 1. Fetch Context
        const [characters, prevScenes, choices, effectScripts, microQuests] = await Promise.all([
            base44.entities.Character.filter({ id: character_id }),
            base44.entities.Scene.filter({ id: previous_scene_id }),
            previous_choice_id ? base44.entities.Choice.filter({ id: previous_choice_id }) : [],
            base44.entities.EffectScript.list(),
            base44.entities.MicroQuest.list()
        ]);

        if (characters.length === 0 || prevScenes.length === 0) {
             return Response.json({ error: 'Character or Scene not found' }, { status: 404 });
        }

        const character = characters[0];
        const prevScene = prevScenes[0];
        const prevChoice = choices.length > 0 ? choices[0] : null;

        // 2. Determine Category
        let category = 'walkway';
        const sceneText = (prevScene.body_text || "").toLowerCase() + (prevScene.title || "").toLowerCase();
        
        if (prevChoice && prevChoice.risk_level === 'high') {
            category = 'emotional_regulation';
        } else if (sceneText.includes('investigat') || sceneText.includes('clue')) {
             category = 'critical_thought';
        } else if (sceneText.includes('fight') || sceneText.includes('argu') || sceneText.includes('threat')) {
             category = 'peer_reaction';
        } else if (prevScene.vulnerable_npc_key) {
             category = 'micro_skill';
        } else if (sceneText.includes('crowd') || sceneText.includes('market')) {
             category = 'environmental';
        }

        if (prevChoice && prevChoice.visual_role_hint === 'aggressor') category = 'emotional_regulation';
        if (prevChoice && prevChoice.visual_role_hint === 'mediator') category = 'micro_skill';

        const isChild = (character.age || 18) < 18;

        // 3. Generate Content via LLM (Text + NPC Updates + Visual Prompt)
        const systemPrompt = `
            You are generating a "Between Scene" moment for a "Warden Saga" - a retro 1980s-90s anime space opera RPG.
            Category: ${category}
            AUDIENCE: ${isChild ? `Child (Age ${character.age}). Keep language simple, inspiring, and safe.` : "Adult. Gritty and complex."}
            
            Context:
            Scene: ${prevScene.title}
            Action: ${prevChoice ? prevChoice.label : "Transition"}
            Character: ${character.name} (${character.face_vibe}, ${character.outfit_style} uniform)

            Style Guide:
            - Mood: Optimistic, clean, sleek, nostalgic sci-fi.
            - Visuals: Neon cyan, deep navy, HUD overlays, scanlines, analog technology, high contrast.
            - Tone: Classic anime melodrama mixed with grounded emotion.
            - RESTRICTIONS: NO RELIGIOUS REFERENCES (gods, demons, angels, prayer, holy, etc). Use sci-fi/tech terms only.

            Outputs needed:
            1. Cinematic Text (3-6 sentences): Describe the moment using anime tropes (dramatic lighting, internal monologues) and sci-fi elements (holograms, mechs, starships).
               - IMPORTANT: The Character has hair length: "${character.hair_length || 'average'}". If "bald" or "shaved", DO NOT describe wind in hair or brushing hair back.
            2. Visual Prompt: For AI image generation. Vintage 1980s anime style, cel-shaded, hand-painted background aesthetic.
            3. NPC Memory Updates: Identify if any named NPCs (from context) should remember this moment (respect, fear, safety, etc).
        `;

        const llmRes = await base44.integrations.Core.InvokeLLM({
            prompt: systemPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    scene_text: { type: "string" },
                    visual_prompt: { type: "string" },
                    npc_updates: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                npc_name_reference: { type: "string" },
                                memory_type: { type: "string", enum: ["respect", "fear", "safety", "distrust", "admiration"] },
                                intensity: { type: "integer", minimum: 1, maximum: 3 }
                            },
                            required: ["npc_name_reference", "memory_type", "intensity"]
                        }
                    }
                },
                required: ["scene_text", "visual_prompt", "npc_updates"]
            }
        });

        const { scene_text, visual_prompt, npc_updates } = llmRes;

        // 4. Generate Image (Using Warden Cinematic Helper)
        let imageUrl = null;
        let portraitVersion = character.portrait_reference_version || 1;
        try {
            const imgRes = await base44.functions.invoke('generateWardenCinematicImage', {
                character_id: character.id,
                scene_context: `${prevScene.title} - ${category}. ${visual_prompt}`,
                visual_role_hint: prevChoice ? prevChoice.visual_role_hint : 'neutral',
                tone: 'cinematic'
            });
            if (imgRes.data && imgRes.data.image_url) {
                imageUrl = imgRes.data.image_url;
                portraitVersion = imgRes.data.portrait_version;
            }
        } catch (err) {
            console.error("Image generation failed", err);
        }

        // 5. Check MicroQuest Triggers
        let triggeredMQId = null;
        const potentialMQs = [];
        
        // Define Logic
        if ((character.presence || 0) > 2) potentialMQs.push('mq_talk_friend');
        if ((character.care || 0) > 2) potentialMQs.push('mq_check_woman');
        if ((character.insight || 0) > 2) potentialMQs.push('mq_follow_boy');
        if ((character.care || 0) > 3) potentialMQs.push('mq_quiet_clinic');
        if ((character.resolve || 0) > 2) potentialMQs.push('mq_whispering_warden');
        // Jalen logic requires relationship lookup, skipping for speed or assuming 'safety' implicit in context
        
        // Find one valid MQ
        for (const key of potentialMQs) {
            const mq = microQuests.find(m => m.key === key);
            if (mq) {
                // Check if already active/completed
                const existing = await base44.entities.CharacterMicroQuest.filter({
                    character_id: character.id,
                    microquest_id: mq.id
                });
                if (existing.length === 0) {
                    triggeredMQId = mq.id;
                    // Auto-assign
                    await base44.entities.CharacterMicroQuest.create({
                        character_id: character.id,
                        microquest_id: mq.id,
                        status: 'active'
                    });
                    break; // Only one at a time
                }
            }
        }

        // 6. Create BetweenScene Record
        const betweenScene = await base44.entities.BetweenScene.create({
            trigger_scene_id: previous_scene_id,
            trigger_choice_id: previous_choice_id || null,
            character_id: character_id,
            text: scene_text,
            category: category,
            next_microquest_scene_id: triggeredMQId,
            image_url: imageUrl,
            portrait_version: portraitVersion
        });

        // 7. Handle NPC Memory Updates
        if (npc_updates && npc_updates.length > 0) {
            const allNpcs = await base44.entities.NPC.list();
            for (const update of npc_updates) {
                const targetNpc = allNpcs.find(n => n.name.toLowerCase().includes(update.npc_name_reference.toLowerCase()) || n.key === update.npc_name_reference.toLowerCase());
                if (targetNpc) {
                    await base44.entities.NPCMemory.create({
                        npc_id: targetNpc.id,
                        character_id: character.id,
                        memory_type: update.memory_type,
                        intensity: update.intensity,
                        notes: `Generated from BSL: ${category}`,
                        reaction_node_id: null // Linked to BSL context
                    });
                }
            }
        }

        // 8. Generate Micro-Choices
        const microChoices = [];
        const skillMap = {
            'emotional_regulation': [
                { label: "Steady your breath before moving on", type: "grounding", script: "micro_grounding_breath" },
                { label: "Name the emotion in your chest", type: "emotional_literacy", script: "micro_emotional_name" }
            ],
            'peer_reaction': [
                { label: "Let the comment pass without absorbing it", type: "peer_resistance", script: "micro_peer_resist" },
                { label: "Notice the tension in their shoulders", type: "social_reading", script: "micro_social_read" }
            ],
            'critical_thought': [
                { label: "Catch the inconsistency in what you heard", type: "critical_thought", script: "micro_critical_spot" },
                { label: "Observe who is watching from the edges", type: "social_reading", script: "micro_social_read" }
            ],
            'micro_skill': [
                { label: "Position yourself to see the whole space", type: "protector_stance", script: "micro_protector_stance" },
                { label: "Lower your voice to de-escalate", type: "de_escalation", script: "micro_deescalation_voice" }
            ],
            'environmental': [
                { label: "Orient yourself to the exits", type: "grounding", script: "micro_grounding_breath" },
                { label: "Read the mood of the crowd", type: "social_reading", script: "micro_social_read" }
            ],
            'walkway': [
                { label: "Walk with deliberate calm", type: "grounding", script: "micro_grounding_breath" },
                { label: "Offer a nodding acknowledgement", type: "relational_skill", script: "micro_relational_soothe" }
            ]
        };

        const choicesToCreate = skillMap[category] || skillMap['walkway'];

        for (const mc of choicesToCreate) {
            const script = effectScripts.find(s => s.name === mc.script);
            if (script) {
                const createdMC = await base44.entities.BetweenSceneMicroChoice.create({
                    between_scene_id: betweenScene.id,
                    label: mc.label,
                    skill_type: mc.type,
                    effect_script_id: script.id
                });
                microChoices.push(createdMC);
            }
        }

        return Response.json({
            betweenScene,
            microChoices,
            unlockedMicroQuestId: triggeredMQId
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});