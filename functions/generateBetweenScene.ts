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
        const [characters, prevScenes, choices, effectScripts] = await Promise.all([
            base44.entities.Character.filter({ id: character_id }),
            base44.entities.Scene.filter({ id: previous_scene_id }),
            previous_choice_id ? base44.entities.Choice.filter({ id: previous_choice_id }) : [],
            base44.entities.EffectScript.list() // Fetch all to find by name
        ]);

        if (characters.length === 0 || prevScenes.length === 0) {
             return Response.json({ error: 'Character or Scene not found' }, { status: 404 });
        }

        const character = characters[0];
        const prevScene = prevScenes[0];
        const prevChoice = choices.length > 0 ? choices[0] : null;

        // 2. Determine Category
        let category = 'walkway';
        
        // Simple rule-based categorization (enhanced by available data)
        const sceneText = (prevScene.body_text || "").toLowerCase() + (prevScene.title || "").toLowerCase();
        const choiceText = prevChoice ? (prevChoice.label || "").toLowerCase() + (prevChoice.description || "").toLowerCase() : "";
        
        // Heuristics based on keywords/tags if available (or simple text analysis)
        if (prevChoice && prevChoice.risk_level === 'high') {
            category = 'emotional_regulation'; // High risk often means adrenaline
        } else if (sceneText.includes('investigat') || sceneText.includes('clue') || sceneText.includes('question')) {
             category = 'critical_thought';
        } else if (sceneText.includes('fight') || sceneText.includes('argu') || sceneText.includes('threat')) {
             category = 'peer_reaction';
        } else if (prevScene.vulnerable_npc_key) {
             category = 'micro_skill';
        } else if (sceneText.includes('crowd') || sceneText.includes('market') || sceneText.includes('street')) {
             category = 'environmental';
        }

        // Override if specific choice hint exists (optional, but good for precision)
        if (prevChoice && prevChoice.visual_role_hint === 'aggressor') category = 'emotional_regulation';
        if (prevChoice && prevChoice.visual_role_hint === 'mediator') category = 'micro_skill';

        // 3. Generate Text via LLM
        const prompt = `
            Write a short cinematic 'between scene' moment in the category: ${category}.
            The goal is to show the world reacting to the player, the player processing emotions, and subtle social dynamics men often overlook.
            
            Context:
            Scene: ${prevScene.title}
            Action Taken: ${prevChoice ? prevChoice.label : "Moving through"}
            Character: ${character.name} (${character.face_vibe})

            Include:
            - peer reactions (mocking, praise, confusion, quiet respect)
            - environmental cues (who watches, who looks away)
            - opportunities for self-awareness
            - one small emotional shift
            
            Do NOT moralize or explain — show through behavior.
            Keep it under 6 sentences.
            Output ONLY the scene text.
        `;

        const generatedText = await base44.integrations.Core.InvokeLLM({
            prompt: prompt
        });

        // 4. Create BetweenScene Record
        const betweenScene = await base44.entities.BetweenScene.create({
            trigger_scene_id: previous_scene_id,
            trigger_choice_id: previous_choice_id || null,
            character_id: character_id,
            text: generatedText,
            category: category
        });

        // 5. Generate Micro-Choices (Deterministic Mapping)
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
            microChoices
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});