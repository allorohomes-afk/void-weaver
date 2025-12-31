import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { interactable_id, character_id } = await req.json();

        // 1. Fetch Data
        const [interactables, characters] = await Promise.all([
            base44.entities.SceneInteractable.filter({ id: interactable_id }),
            base44.entities.Character.filter({ id: character_id })
        ]);

        if (!interactables.length || !characters.length) {
            return Response.json({ error: 'Not found' }, { status: 404 });
        }

        const object = interactables[0];
        const character = characters[0];
        const sceneId = object.scene_id; // assuming object has scene_id
        
        // Fetch scene for context
        const scenes = await base44.entities.Scene.filter({ id: sceneId });
        const scene = scenes[0];

        // 2. Check Stat Advantages/Disadvantages
        const { insight = 0, care = 0, resolve = 0, presence = 0 } = character;
        let statBonus = 0;
        let statPenalty = 0;
        
        switch(object.type) {
            case 'examine':
                statBonus = insight >= 30 ? 15 : 0;
                break;
            case 'connect':
                statBonus = insight >= 40 ? 20 : 0;
                statPenalty = insight < 20 ? -15 : 0;
                break;
            case 'hack':
                statBonus = resolve >= 35 ? 25 : 0;
                statPenalty = resolve < 20 ? -20 : 0;
                break;
            case 'interact':
                statBonus = presence >= 30 ? 10 : 0;
                break;
            case 'recover':
                statBonus = care >= 25 ? 10 : 0;
                statPenalty = care < 15 ? -10 : 0;
                break;
        }

        // 3. Determine Outcome via LLM
        const prompt = `
            Roleplay Interaction:
            Character: ${character.name}
            Stats: Insight ${insight}, Care ${care}, Resolve ${resolve}, Presence ${presence}
            Scene: ${scene ? scene.title : 'Unknown Location'}
            Object: ${object.label} (${object.description})
            Action: ${object.type.toUpperCase()}
            Stat Modifier: ${statBonus > 0 ? `+${statBonus}% bonus` : statPenalty < 0 ? `${statPenalty}% penalty` : 'neutral'}

            GOALS:
            1. Narrate outcome (2-3 sentences). If stat bonus exists, show improved result. If penalty, show complication.
            2. Highlight Intent vs Impact (what they wanted vs what actually happened to the world/others).
            3. Show community consequences for selfish/destructive actions.
            4. Strategic: If this was risky but successful due to high stats, acknowledge their skill.
            
            Return: narrative, intent_vs_impact_lesson, result_type, community_impact, stat_applied (stat name if bonus/penalty was relevant).
        `;

        const llmRes = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    narrative: { type: "string" },
                    intent_vs_impact_lesson: { type: "string", description: "Short takeaway about the impact of this choice." },
                    result_type: { type: "string", enum: ["info", "item", "damage", "nothing"] },
                    community_impact: { type: "integer", description: "-1 for negative, 1 for positive, 0 for neutral" },
                    stat_applied: { type: "string", description: "Which stat influenced the outcome (if any)" }
                },
                required: ["narrative", "intent_vs_impact_lesson"]
            }
        });

        // 4. Update Community Sentiment
        if (llmRes.community_impact !== 0) {
             const polStates = await base44.entities.PoliticalState.filter({ character_id: character.id });
             if (polStates.length > 0) {
                 const currentSentiment = polStates[0].public_sentiment || 0;
                 await base44.entities.PoliticalState.update(polStates[0].id, {
                     public_sentiment: currentSentiment + llmRes.community_impact
                 });
             }
        }

        // 5. Mark as exhausted if it's a single-use action
        if (['recover', 'connect', 'hack', 'loot'].includes(object.type)) {
            await base44.entities.SceneInteractable.update(object.id, { status: 'exhausted' });
        }

        return Response.json({ 
            narrative: llmRes.narrative,
            result_type: llmRes.result_type,
            object_id: object.id
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});