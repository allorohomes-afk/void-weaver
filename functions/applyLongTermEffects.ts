import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { character_id } = await req.json();

        if (!character_id) {
            return Response.json({ error: 'Missing character_id' }, { status: 400 });
        }

        // 1. Fetch Active Temporary Effects
        // We filter for active ones (remaining_scenes > 0)
        // Ideally we'd filter in DB, but let's fetch for this char.
        const allEffects = await base44.entities.LongTermEffect.filter({ character_id: character_id });
        const activeEffects = allEffects.filter(e => !e.permanent && (e.remaining_scenes > 0));

        if (activeEffects.length === 0) {
            return Response.json({ status: 'no_updates' });
        }

        // 2. Decrement and Check Expiration
        const expiredEffects = [];
        
        for (const effect of activeEffects) {
            const newRemaining = effect.remaining_scenes - 1;
            
            if (newRemaining <= 0) {
                // Expired!
                expiredEffects.push(effect);
                await base44.entities.LongTermEffect.delete(effect.id); // Or mark inactive
            } else {
                // Just decrement
                await base44.entities.LongTermEffect.update(effect.id, { remaining_scenes: newRemaining });
            }
        }

        // 3. Revert Expired Stats
        if (expiredEffects.length > 0) {
            const characters = await base44.entities.Character.filter({ id: character_id });
            if (characters.length > 0) {
                const character = characters[0];
                const reversionUpdates = {};
                let hasUpdates = false;

                for (const eff of expiredEffects) {
                    if (eff.stats_delta) {
                        Object.keys(eff.stats_delta).forEach(stat => {
                            // Revert: subtract the delta
                            const currentVal = reversionUpdates[stat] !== undefined ? reversionUpdates[stat] : (character[stat] || 0);
                            reversionUpdates[stat] = currentVal - eff.stats_delta[stat];
                            hasUpdates = true;
                        });
                    }
                    // Handle faction reversions if needed
                }

                if (hasUpdates) {
                    await base44.entities.Character.update(character.id, reversionUpdates);
                }
            }
        }

        return Response.json({ 
            status: 'success', 
            expired_count: expiredEffects.length,
            active_count: activeEffects.length - expiredEffects.length 
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});