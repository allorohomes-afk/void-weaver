import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { character_id } = await req.json();

        // 1. Fetch Character
        const characters = await base44.entities.Character.filter({ id: character_id });
        if (characters.length === 0) return Response.json({ error: "Character not found" }, { status: 404 });
        const char = characters[0];

        // 2. Calculate Balance
        const { masculine_energy = 50, feminine_energy = 50 } = char;
        const diff = masculine_energy - feminine_energy;
        
        let targetKey = 'chapter_end_balanced';
        if (diff >= 15) targetKey = 'chapter_end_shadow_masculine';
        else if (diff <= -15) targetKey = 'chapter_end_shadow_feminine';

        // 3. Find the Scene
        const scenes = await base44.entities.Scene.filter({ key: targetKey });
        if (scenes.length === 0) return Response.json({ error: "Ending scene not found" }, { status: 404 });
        const nextScene = scenes[0];

        // 4. Find and Apply Effect Script (The "Consequence")
        const scriptKey = `effect_${targetKey}`;
        const scripts = await base44.entities.EffectScript.filter({ name: scriptKey });
        
        if (scripts.length > 0) {
            const effectData = scripts[0].effect_json;
            
            // Apply stats
            if (effectData.stats) {
                const updates = {};
                Object.keys(effectData.stats).forEach(k => {
                    updates[k] = (char[k] || 0) + effectData.stats[k];
                });
                await base44.entities.Character.update(char.id, updates);
            }

            // Create LongTermEffect record (Passive Trait)
            await base44.entities.LongTermEffect.create({
                character_id: char.id,
                name: effectData.name,
                description: effectData.description,
                effect_json: effectData.stats || {},
                remaining_scenes: 99, // Essentially permanent for the next chapter
                is_hidden: false
            });
        }

        // 5. Move Character
        await base44.entities.Character.update(char.id, {
            current_scene_id: nextScene.id
        });

        return Response.json({ 
            next_scene_id: nextScene.id,
            ending_type: targetKey
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});