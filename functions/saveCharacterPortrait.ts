import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { character_id, portrait_url, notes, reverted_from_id } = await req.json();

        if (!character_id || !portrait_url) {
            return Response.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        // 1. Fetch Character
        const characters = await base44.entities.Character.filter({ id: character_id });
        if (characters.length === 0) return Response.json({ error: 'Character not found' }, { status: 404 });
        const character = characters[0];

        // 2. Insert into PortraitHistory
        await base44.entities.PortraitHistory.create({
            character_id: character_id,
            portrait_url: portrait_url,
            notes: notes || 'Manual save',
            reverted_from_id: reverted_from_id || null
        });

        // 3. Update Character
        const currentVersion = character.portrait_reference_version || 0;
        
        // Regenerate visual prompt to ensure consistency with new portrait
        // We assume the new portrait dictates the look.
        // For now, we keep the text prompt but mark the update.
        // A full "extract features from image" via LLM could go here if we had vision capabilities enabled in this turn,
        // but typically we just update the record to point to the new URL.

        await base44.entities.Character.update(character_id, {
            portrait_url: portrait_url,
            portrait_reference_version: currentVersion + 1,
            last_updated_portrait_at: new Date().toISOString()
        });

        return Response.json({ success: true, portrait_url });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});