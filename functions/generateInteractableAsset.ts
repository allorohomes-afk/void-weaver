import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default async function handler(req) {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { interactable_id } = await req.json();
        
        // Fetch
        const items = await base44.entities.SceneInteractable.filter({ id: interactable_id });
        if (!items.length) return Response.json({ error: 'Not found' }, { status: 404 });
        
        const item = items[0];
        let visualPrompt = item.visual_prompt;
        let type = item.type;

        // Legacy Fix: Rename 'loot' to 'recover' to match new philosophy
        if (type === 'loot') {
            type = 'recover';
            await base44.entities.SceneInteractable.update(item.id, { type: 'recover' });
        }

        // Generate Visual Prompt if missing
        if (!visualPrompt) {
            const llmRes = await base44.integrations.Core.InvokeLLM({
                prompt: `Describe a 2D sci-fi RPG asset icon for: "${item.label}" (${item.description}). 
                        Style: Retro Anime, Cyberpunk, High Contrast, Isometric. 
                        Visuals ONLY. No text.
                        Example: "A glowing blue data crystal on a metal pedestal, isometric view, dark background"`,
                response_json_schema: { type: "object", properties: { prompt: { type: "string" } } }
            });
            visualPrompt = llmRes.prompt;
            await base44.entities.SceneInteractable.update(item.id, { visual_prompt: visualPrompt });
        }

        // Generate Image
        const imgRes = await base44.functions.invoke('generateLeonardoImage', {
            prompt: visualPrompt + ", isolated on dark background, game asset sprite, high quality, digital art, sharp focus, 2d game icon",
            width: 512,
            height: 512
        });

        if (imgRes.data.url) {
            await base44.entities.SceneInteractable.update(item.id, { image_url: imgRes.data.url });
            return Response.json({ url: imgRes.data.url, type });
        } else {
            throw new Error("Image generation failed");
        }

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
Deno.serve(handler);