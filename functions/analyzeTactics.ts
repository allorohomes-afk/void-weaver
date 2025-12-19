import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default async function handler(req) {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { scene_id, character_id } = await req.json();

        // 1. Fetch Context
        const [scenes, characters] = await Promise.all([
            base44.entities.Scene.filter({ id: scene_id }),
            base44.entities.Character.filter({ id: character_id })
        ]);

        if (!scenes.length || !characters.length) return Response.json({ error: 'Not found' }, { status: 404 });
        
        const scene = scenes[0];
        const character = characters[0];

        // 2. Fetch Interactables for Context
        const interactables = await base44.entities.SceneInteractable.filter({ scene_id: scene.id, status: 'active' });
        const interactableText = interactables.map(i => `${i.label} (${i.type})`).join(', ');

        // 3. LLM Analysis
        const prompt = `
            Analyze this scene for TACTICAL and PSYCHOLOGICAL advantages.
            The goal is to resolve the situation using CRITICAL THINKING, DE-ESCALATION, or CLEVER USE OF ENVIRONMENT.
            Avoid recommending lethal force unless absolutely necessary as a last resort.

            Scene: "${scene.title}"
            Description: "${scene.body_text}"
            Available Objects: ${interactableText || "None specific"}
            
            Character Stats:
            - Insight: ${character.insight} (Perception/Analysis)
            - Care: ${character.care} (Empathy/De-escalation)
            - Resolve: ${character.resolve} (Intimidation/Willpower)
            
            Provide a "Tactical Assessment" in 3 bullet points:
            1. An observation about the threat's psychology or weakness.
            2. A non-violent approach (using Care/Resolve).
            3. An environmental/technical approach (using Insight/Objects).
            
            Tone: Military-grade tactical AI, precise, objective, encouraging smart play.
        `;

        const response = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    assessment: { 
                        type: "array", 
                        items: { type: "string" },
                        description: "List of 3 tactical tips"
                    }
                },
                required: ["assessment"]
            }
        });

        return Response.json({ assessment: response.assessment });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
Deno.serve(handler);