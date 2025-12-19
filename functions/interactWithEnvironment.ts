import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default async function handler(req) {
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

        // 2. Determine Outcome via LLM
        const prompt = `
            Roleplay Interaction:
            Character: ${character.name} (Insight: ${character.insight}, Care: ${character.care})
            Scene: ${scene ? scene.title : 'Unknown Location'}
            Object: ${object.label} (${object.description})
            Action: ${object.type.toUpperCase()}

            GOAL: Teach Self-Accountability and Intent vs. Impact.
            
            1. Narrate the outcome (2-3 sentences).
            2. Explicitly highlight the difference between Intent (what they wanted) and Impact (what happened to the world/others).
            3. If the action was selfish or destructive ("recover" something not theirs), show the Community Impact (e.g., someone needed that).
            4. If the action was thoughtful, show the support.

            Also return a 'result_type' and 'community_impact' (-1, 0, 1).
        `;

        const llmRes = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    narrative: { type: "string" },
                    intent_vs_impact_lesson: { type: "string", description: "Short takeaway about the impact of this choice." },
                    result_type: { type: "string", enum: ["info", "item", "damage", "nothing"] },
                    community_impact: { type: "integer", description: "-1 for negative, 1 for positive, 0 for neutral" }
                },
                required: ["narrative", "intent_vs_impact_lesson"]
            }
        });

        // 3. Update Community Sentiment
        if (llmRes.community_impact !== 0) {
             const polStates = await base44.entities.PoliticalState.filter({ character_id: character.id });
             if (polStates.length > 0) {
                 const currentSentiment = polStates[0].public_sentiment || 0;
                 await base44.entities.PoliticalState.update(polStates[0].id, {
                     public_sentiment: currentSentiment + llmRes.community_impact
                 });
             }
        }

        // 4. Mark as exhausted if it's a single-use action
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
}
Deno.serve(handler);