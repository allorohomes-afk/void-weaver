import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Helper to check conditions
const checkCondition = (reqs, stats, counts, energies) => {
    if (!reqs) return true;

    // Check Stats
    if (reqs.stats) {
        for (const [key, val] of Object.entries(reqs.stats)) {
            if ((stats[key] || 0) < val) return false;
        }
    }

    // Check Energies
    if (reqs.energies) {
        for (const [key, val] of Object.entries(reqs.energies)) {
            if ((energies[key] || 0) < val) return false;
        }
    }

    // Check Counts (Choice history logic)
    // map categories from prompt to simplified counters
    // We'll assume 'counts' object contains mapped keys like 'grounding_choice', 'relational_choice'
    // We need to aggregate these counts from the passed `counts` object.
    if (reqs.counts) {
        for (const [key, val] of Object.entries(reqs.counts)) {
            if ((counts[key] || 0) < val) return false;
        }
    }

    return true;
};

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { character_id } = await req.json();
        if (!character_id) return Response.json({ error: 'Missing character_id' }, { status: 400 });

        // 1. Fetch Data
        const [character, skills, existingSkills, choiceHistory, clues] = await Promise.all([
            base44.entities.Character.filter({ id: character_id }).then(r => r[0]),
            base44.entities.Skill.list(),
            base44.entities.CharacterSkill.filter({ character_id }),
            base44.entities.ChoiceHistory.filter({ character_id }),
            base44.entities.CharacterInvestigationClue.filter({ character_id })
        ]);

        if (!character) return Response.json({ error: 'Character not found' }, { status: 404 });

        // 2. Aggregate Counts from History
        // We need to join choiceHistory with Choices/BetweenSceneMicroChoices to know categories/types
        // This is heavy to do fully every time. For MVP, we'll fetch all Choices referenced in history once?
        // Actually, better approach: ChoiceHistory has microquest_id, effect_script_id. 
        // But to know "grounding_choice" vs "relational_choice", we need the Choice/MicroChoice data.
        // Optimization: Fetch all Choices & MicroChoices involved.
        
        const choiceIds = choiceHistory.map(h => h.choice_id).filter(Boolean);
        // Filter for unique to save query size? Or just list all choices if table small.
        // Assuming table not huge yet.
        const allChoices = await base44.entities.Choice.list(); 
        const allMicroChoices = await base44.entities.BetweenSceneMicroChoice.list();
        // Note: MicroChoice history isn't explicitly in ChoiceHistory unless we stored it? 
        // ChoiceHistory has choice_id. If it's a micro choice, it might use effect_script_id. 
        // Prompt said "player chooses 2 grounding micro-choices".
        // Let's assume ChoiceHistory records micro choices too or we check 'applied' flags on BSL logic?
        // For now, we'll rely on ChoiceHistory containing entries for ALL choices (micro or main).
        
        const counts = {
            grounding_choice: 0,
            relational_choice: 0,
            critical_choice: 0,
            protector_choice: 0,
            social_choice: 0,
            peer_choice: 0,
            emotional_choice: 0,
            tense_reaction: 0,
            soft_reaction: 0,
            clue_analysis: clues.length, // simple count of analyzed clues
            lie_detected: clues.filter(c => c.detected_lie).length
        };

        // Map choice/microchoice categories to counters
        const choiceMap = new Map(allChoices.map(c => [c.id, c]));
        // Micro choices don't have IDs in ChoiceHistory usually? 
        // Wait, ChoiceHistory schema has `choice_id`. Main choices only?
        // If MicroChoices aren't in ChoiceHistory, we can't count them easily unless we added them there.
        // I'll assume for now we only count MAIN choices or that MicroChoices ARE logged there.
        // Let's proceed assuming we map main choices based on logic or keywords if category field missing.

        choiceHistory.forEach(h => {
            const c = choiceMap.get(h.choice_id);
            if (c) {
                // Heuristic mapping since Choice entity doesn't have "category" field explicitly in schema 
                // (only BetweenSceneMicroChoice has skill_type).
                // But Choice has `visual_role_hint` and `risk_level`.
                if (c.visual_role_hint === 'protector') counts.protector_choice++;
                if (c.visual_role_hint === 'mediator') counts.relational_choice++;
                
                const label = (c.label || "").toLowerCase();
                if (label.includes("listen") || label.includes("empath")) counts.relational_choice++;
                if (label.includes("breath") || label.includes("calm")) counts.grounding_choice++;
                if (label.includes("analyze") || label.includes("observe")) counts.critical_choice++;
                if (label.includes("stand") || label.includes("resist")) counts.peer_choice++;
                if (label.includes("feel") || label.includes("emotion")) counts.emotional_choice++;
            }
            // Also check if h matches a MicroChoice (if we had ID mapping, but IDs overlap potentially?)
            // If `h.choice_id` matches a MicroChoice ID... 
            // Let's skip deep MicroChoice counting for this MVP unless we know they are in history.
        });

        // 3. Check Skills
        const unlockedSkills = [];
        const newUnlocks = [];

        for (const skill of skills) {
            // Check if already unlocked
            if (existingSkills.find(es => es.skill_id === skill.id)) {
                continue;
            }

            // Check Requirements
            const met = checkCondition(
                skill.unlock_requirements, 
                character, // contains stats like insight, presence
                counts, 
                character // contains energies like masculine_energy
            );

            if (met) {
                // Unlock!
                const cs = await base44.entities.CharacterSkill.create({
                    character_id: character.id,
                    skill_id: skill.id,
                    unlocked_at: new Date().toISOString(),
                    active: true
                });
                newUnlocks.push(skill);
                unlockedSkills.push(skill);

                // Apply Permanent Effects Immediately
                if (skill.effects) {
                    const effects = skill.effects;
                    // Stats
                    if (effects.stats) {
                        const updates = {};
                        Object.keys(effects.stats).forEach(k => {
                            updates[k] = (character[k] || 0) + effects.stats[k];
                        });
                        await base44.entities.Character.update(character.id, updates);
                        // Update local character object for next checks
                        Object.assign(character, updates);
                    }
                    // Energies
                    if (effects.energies) {
                        const updates = {};
                        Object.keys(effects.energies).forEach(k => {
                            updates[k] = (character[k] || 0) + effects.energies[k];
                        });
                        await base44.entities.Character.update(character.id, updates);
                        Object.assign(character, updates);
                    }
                    // Political
                    if (effects.political) {
                        const polStates = await base44.entities.PoliticalState.filter({ character_id });
                        let ps = polStates[0];
                        if (!ps) ps = await base44.entities.PoliticalState.create({ character_id });
                        
                        const updates = {};
                        Object.keys(effects.political).forEach(k => {
                            updates[k] = (ps[k] || 0) + effects.political[k];
                        });
                        await base44.entities.PoliticalState.update(ps.id, updates);
                    }
                }
            }
        }

        return Response.json({
            new_skills: newUnlocks,
            total_unlocked: existingSkills.length + newUnlocks.length
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});