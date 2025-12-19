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

            Identify 2-3 specific, meaningful objects or features.
            PHILOSOPHY: We do not use "Loot". We use "Recover" or "Salvage". Items should test the player's values (e.g. recovering data vs respecting privacy).
            Types: 'examine' (investigate), 'interact' (use/operate), 'connect' (tech/terminals), 'recover' (take with purpose).
            
            Return ONLY a JSON array of objects with keys: "label", "type", "description", "visual_prompt".
            "visual_prompt": A description to generate a 2D sci-fi RPG asset image of this object. Retro anime style.
            Example: [{"label": "Private Log", "type": "connect", "description": "A personal diary left open.", "visual_prompt": "A glowing holographic diary on a metal table, retro anime style, isometric"}]
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
                                type: { type: "string", enum: ["examine", "interact", "connect", "recover"] },
                                description: { type: "string" },
                                visual_prompt: { type: "string" }
                            },
                            required: ["label", "type", "description", "visual_prompt"]
                        }
                    }
                }
            }
        });

        // 4. Generate Images & Save
        const newInteractables = [];
        if (response.interactables && Array.isArray(response.interactables)) {
            // Process sequentially to avoid rate limits or handle gracefully
            for (const item of response.interactables) {
                let imageUrl = null;
                try {
                    // Quick generation for asset
                    const imgRes = await base44.functions.invoke('generateLeonardoImage', {
                        prompt: item.visual_prompt + ", isolated on dark background, high quality game asset, 2d sprite style",
                        width: 512,
                        height: 512
                    });
                    if (imgRes.data.url) imageUrl = imgRes.data.url;
                } catch (e) {
                    console.error("Failed to gen image for item", item.label, e);
                }

                const created = await base44.entities.SceneInteractable.create({
                    scene_id: scene.id,
                    label: item.label,
                    type: item.type,
                    description: item.description,
                    image_url: imageUrl,
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