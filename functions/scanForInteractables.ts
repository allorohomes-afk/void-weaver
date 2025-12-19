import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default async function handler(req) {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { scene_id } = await req.json();

        // 1. Check if we already have interactables
        const existing = await base44.entities.SceneInteractable.filter({ scene_id, status: 'active' });
        if (existing.length > 0) {
            return Response.json({ interactables: existing, source: 'cache' });
        }

        // 2. Fetch Scene Context
        const scenes = await base44.entities.Scene.filter({ id: scene_id });
        if (!scenes.length) return Response.json({ error: 'Scene not found' }, { status: 404 });
        const scene = scenes[0];

        // 3. LLM Generation
        const prompt = `
            Analyze this scene description from a sci-fi RPG:
            Title: "${scene.title}"
            Description: "${scene.body_text}"

            Identify 3-4 specific, interesting objects or features the player could interact with.
            Types: 'examine' (look closer), 'interact' (use/touch), 'hack' (terminals/tech), 'loot' (search for items).
            
            Return ONLY a JSON array of objects with keys: "label", "type", "description".
            Example: [{"label": "Broken Datapad", "type": "hack", "description": "A cracked screen flickering with code"}, {"label": "Strange Moss", "type": "examine", "description": "Glowing fungal growth"}]
        `;

        const response = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    interactables: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                label: { type: "string" },
                                type: { type: "string", enum: ["examine", "interact", "hack", "loot"] },
                                description: { type: "string" }
                            },
                            required: ["label", "type", "description"]
                        }
                    }
                }
            }
        });

        // 4. Save to DB
        const newInteractables = [];
        if (response.interactables && Array.isArray(response.interactables)) {
            for (const item of response.interactables) {
                const created = await base44.entities.SceneInteractable.create({
                    scene_id: scene.id,
                    label: item.label,
                    type: item.type,
                    description: item.description,
                    status: 'active'
                });
                newInteractables.push(created);
            }
        }

        return Response.json({ interactables: newInteractables, source: 'generated' });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
Deno.serve(handler);