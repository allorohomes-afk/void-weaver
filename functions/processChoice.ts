import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { character_id, choice_id, scene_id, microquest_id } = await req.json();

        if (!character_id || !choice_id) {
            return Response.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // 1. Check ChoiceHistory
        const history = await base44.entities.ChoiceHistory.filter({
            character_id: character_id,
            choice_id: choice_id
        });

        if (history.length > 0 && history[0].applied) {
            return Response.json({ status: 'already_applied', message: 'Choice effects already applied' });
        }

        // 2. Fetch Entities
        const [characters, choices] = await Promise.all([
            base44.entities.Character.filter({ id: character_id }),
            base44.entities.Choice.filter({ id: choice_id })
        ]);

        if (characters.length === 0 || choices.length === 0) {
             return Response.json({ error: 'Entity not found' }, { status: 404 });
        }

        const character = characters[0];
        const choice = choices[0];
        let effectApplied = false;

        // 3. Process Effects
        if (choice.effect_script_id) {
            const scripts = await base44.entities.EffectScript.filter({ id: choice.effect_script_id });
            if (scripts.length > 0) {
                const effectScript = scripts[0];
                const effects = effectScript.effect_json;

                // --- Stats ---
                if (effects.stats) {
                    const updates = {};
                    Object.keys(effects.stats).forEach(stat => {
                        updates[stat] = (character[stat] || 0) + effects.stats[stat];
                    });
                    // Apply immediate updates to character object (for later balance calc)
                    Object.assign(character, updates);
                    await base44.entities.Character.update(character.id, updates);
                }

                // --- Relationships ---
                if (effects.relationships) {
                    // (Logic omitted for brevity - assuming standard processing or copy from previous SceneView logic if needed)
                    // For now, let's assume simple stat/political focus as per prompt. 
                    // To be fully correct, we should implement relationship updates here too.
                    const npcs = await base44.entities.NPC.list();
                     for (const relEffect of effects.relationships) {
                        let targetNpcId = relEffect.npc_id;
                        if (!targetNpcId && relEffect.npc_key) {
                            const targetNpc = npcs.find(n => (n.key === relEffect.npc_key) || (n.name.toLowerCase() === relEffect.npc_key.toLowerCase()));
                            if (targetNpc) targetNpcId = targetNpc.id;
                        }
                        if (targetNpcId) {
                            const existingRels = await base44.entities.Relationship.filter({ character_id: character.id, npc_id: targetNpcId });
                            if (existingRels.length > 0) {
                                const rel = existingRels[0];
                                await base44.entities.Relationship.update(rel.id, {
                                    trust: (rel.trust || 0) + (relEffect.trust || 0),
                                    respect: (rel.respect || 0) + (relEffect.respect || 0),
                                    safety: (rel.safety || 0) + (relEffect.safety || 0),
                                    influence: (rel.influence || 0) + (relEffect.influence || 0)
                                });
                            } else {
                                await base44.entities.Relationship.create({
                                    character_id: character.id,
                                    npc_id: targetNpcId,
                                    trust: relEffect.trust || 0,
                                    respect: relEffect.respect || 0,
                                    safety: relEffect.safety || 0,
                                    influence: relEffect.influence || 0
                                });
                            }
                        }
                    }
                }

                // --- Political State ---
                if (effects.political) {
                    const polStates = await base44.entities.PoliticalState.filter({ character_id: character.id });
                    let polState = polStates.length > 0 ? polStates[0] : null;
                    
                    if (!polState) {
                        polState = await base44.entities.PoliticalState.create({ character_id: character.id });
                    }

                    const polUpdates = {};
                    if (effects.political.old_guard_pressure) polUpdates.old_guard_pressure = (polState.old_guard_pressure || 0) + effects.political.old_guard_pressure;
                    if (effects.political.lantern_influence) polUpdates.lantern_influence = (polState.lantern_influence || 0) + effects.political.lantern_influence;
                    if (effects.political.brotherhood_shadow) polUpdates.brotherhood_shadow = (polState.brotherhood_shadow || 0) + effects.political.brotherhood_shadow;
                    if (effects.political.public_sentiment) polUpdates.public_sentiment = (polState.public_sentiment || 0) + effects.political.public_sentiment;
                    
                    polUpdates.last_updated_at = new Date().toISOString();
                    await base44.entities.PoliticalState.update(polState.id, polUpdates);
                }

                // --- Long Term Effects (Temporary) ---
                if (effects.duration) {
                     await base44.entities.LongTermEffect.create({
                        character_id: character.id,
                        effect_type: 'stat_buff', // simplified
                        stats_delta: effects.stats || {},
                        factions_delta: effects.factions || {},
                        permanent: false,
                        duration_scenes: effects.duration,
                        remaining_scenes: effects.duration,
                        description: `Effect from ${choice.label}`
                     });
                     // Note: We already applied stats above.
                     // The applyLongTermEffects script will handle REVERSING them when they expire.
                } 
                else if (effects.permanent) {
                    // Permanent effects are just applied once (done above).
                    // We can log them if needed.
                     await base44.entities.LongTermEffect.create({
                        character_id: character.id,
                        effect_type: 'permanent',
                        stats_delta: effects.stats || {},
                        permanent: true,
                        description: `Permanent: ${choice.label}`
                     });
                }

                effectApplied = true;
            }
        }

        // 4. Balance Workflow
        // (Re-implementing the logic from SceneView to keep it consistent and secure)
        let { masculine_energy = 50, feminine_energy = 50, presence = 0, insight = 0, resolve = 0, care = 0, fear_freeze = 0 } = character;
        
        masculine_energy = Math.max(0, Math.min(100, masculine_energy));
        feminine_energy = Math.max(0, Math.min(100, feminine_energy));
        const diff = masculine_energy - feminine_energy;
        let zone = null;
        
        if (diff >= -10 && diff <= 10) zone = 'balanced';
        else if (diff >= 15) zone = 'shadow_masculine';
        else if (diff <= -15) zone = 'shadow_feminine';

        const clamp = (val) => Math.max(0, Math.min(100, val));
        
        // Only apply balance shifts if we haven't just applied them in a previous turn for this state?
        // Actually, SceneView applied them on *every* choice. So we do it here too.
        if (zone === 'balanced') { presence += 1; insight += 1; fear_freeze -= 1; }
        else if (zone === 'shadow_masculine') { presence += 1; resolve += 1; care -= 1; insight -= 1; fear_freeze += 1; }
        else if (zone === 'shadow_feminine') { care += 1; insight += 1; presence -= 1; resolve -= 1; fear_freeze += 1; }

        await base44.entities.Character.update(character.id, {
            masculine_energy, feminine_energy,
            presence: clamp(presence), insight: clamp(insight), resolve: clamp(resolve), care: clamp(care), fear_freeze: clamp(fear_freeze)
        });

        // 5. Create ChoiceHistory
        await base44.entities.ChoiceHistory.create({
            character_id: character.id,
            choice_id: choice.id,
            effect_script_id: choice.effect_script_id,
            scene_id: scene_id,
            microquest_id: microquest_id || null,
            applied: true
        });

        // 6. Check Skill Unlocks
        let newSkills = [];
        try {
            // We call the unlock logic directly here or via invoke if passing full context
            // Since we are in backend, we can just call the logic if we extracted it, 
            // but for simplicity we'll invoke the function we just created or replicate logic.
            // Invoking self-hosted function from within function via SDK:
            const unlockRes = await base44.functions.invoke('unlockSkillIfEligible', { character_id: character.id });
            if (unlockRes.data && unlockRes.data.new_skills) {
                newSkills = unlockRes.data.new_skills;
            }
        } catch (err) {
            console.error("Skill unlock check failed", err);
        }

        return Response.json({ 
            status: 'success', 
            new_skills: newSkills, 
            selected_reaction_id: selectedReaction ? selectedReaction.id : null 
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});