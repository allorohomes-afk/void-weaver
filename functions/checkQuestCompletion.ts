import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { character_id } = await req.json();

        // 1. Fetch active quests
        const activeQuests = await base44.entities.CharacterMicroQuest.filter({
            character_id: character_id,
            status: 'active'
        });

        if (activeQuests.length === 0) {
            return Response.json({ completed: [] });
        }

        // 2. Fetch necessary context (Character, Clues)
        const [character, foundClues] = await Promise.all([
            base44.entities.Character.filter({ id: character_id }).then(r => r[0]),
            base44.entities.CharacterInvestigationClue.filter({ character_id: character_id })
        ]);

        const completed = [];

        for (const cq of activeQuests) {
            const mq = (await base44.entities.MicroQuest.filter({ id: cq.microquest_id }))[0];
            if (!mq || !mq.completion_criteria) continue;

            const criteria = mq.completion_criteria;
            let met = true;

            // Check Stats
            if (criteria.stats) {
                for (const [stat, val] of Object.entries(criteria.stats)) {
                    if ((character[stat] || 0) < val) met = false;
                }
            }

            // Check Clue Count
            if (criteria.clue_count) {
                if (foundClues.length < criteria.clue_count) met = false;
            }

            // Check Specific Clue
            if (criteria.required_clue_id) {
                // This assumes criteria stores ID. If it stores KEY, we'd need to map.
                // Let's assume for now it might match by checking the clue ID or we need to fetch clues to match keys.
                // Simplified: assuming we check against found clues' IDs.
                // But foundClues has `clue_id`.
                const hasClue = foundClues.some(fc => fc.clue_id === criteria.required_clue_id);
                if (!hasClue) met = false;
            }

             // Check Deception/Truth Count
            if (criteria.caught_lies_count) {
                const caught = foundClues.filter(fc => fc.detected_lie).length;
                if (caught < criteria.caught_lies_count) met = false;
            }

            if (met) {
                // Mark complete
                await base44.entities.CharacterMicroQuest.update(cq.id, { status: 'completed' });
                
                // Apply Rewards
                if (mq.reward_effect_script_id) {
                     const scripts = await base44.entities.EffectScript.filter({ id: mq.reward_effect_script_id });
                     if (scripts.length > 0) {
                         const effects = scripts[0].effect_json;
                         if (effects.stats) {
                             const updates = {};
                             Object.keys(effects.stats).forEach(s => updates[s] = (character[s]||0) + effects.stats[s]);
                             await base44.entities.Character.update(character.id, updates);
                         }
                         // (Could handle other effects too)
                     }
                }

                completed.push(mq);
            }
        }

        return Response.json({ completed });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});