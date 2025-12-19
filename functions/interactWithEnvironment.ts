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
            Character: ${character.name} (Insight: ${character.insight}, Care: ${character.care}, Tech Skill: ${character.skill_tech || 'average'})
            Scene: ${scene ? scene.title : 'Unknown Location'}
            Object: ${object.label} (${object.description})
            Action: ${object.type.toUpperCase()}

            Write a short paragraph describing what happens. 
            - If it's a 'hack' and they have low Insight, maybe they fail.
            - If 'loot', maybe they find something small.
            - If 'examine', reveal a detail.
            
            Keep it strictly narrative. 2-3 sentences.
            
            Also return a 'result_type': 'info', 'item', 'damage', 'nothing'.
        `;

        const llmRes = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    narrative: { type: "string" },
                    result_type: { type: "string", enum: ["info", "item", "damage", "nothing"] }
                },
                required: ["narrative"]
            }
        });

        // 3. Mark as exhausted if it's a loot/hack action that shouldn't be repeated
        if (['loot', 'hack'].includes(object.type)) {
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