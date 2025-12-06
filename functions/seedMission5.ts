import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        // 1. Get Scenes to link
        const scenes = await base44.entities.Scene.list();
        const getSceneId = (key) => scenes.find(s => s.key === key)?.id;

        const entryId = getSceneId('mission5_entry');
        const doorId = getSceneId('mission5_hidden_door');
        const clinicId = getSceneId('mission5_clinic_return');
        const perimeterId = getSceneId('mission5_perimeter');
        const convergenceId = getSceneId('mission5_convergence');
        const exitId = getSceneId('mission5_exit');
        const act3Id = scenes.find(s => s.key === 'act3_start')?.id || exitId; // Fallback

        if (!entryId) return Response.json({ error: 'Scenes not found. Run previous step first.' }, { status: 400 });

        // 2. Create Choices
        const choicesData = [
            // Entry Choices
            { scene_id: entryId, label: "Go to the Lower District’s hidden door", next_scene_id: doorId, risk_level: "high", visual_role_hint: "protector" },
            { scene_id: entryId, label: "Return briefly to the Quiet Clinic", next_scene_id: clinicId, risk_level: "low", visual_role_hint: "supporter" },
            { scene_id: entryId, label: "Walk the perimeter and watch the streets", next_scene_id: perimeterId, risk_level: "medium", visual_role_hint: "bystander" },

            // Hidden Door Choices
            { scene_id: doorId, label: "Call softly into the dark", next_scene_id: convergenceId, risk_level: "medium", visual_role_hint: "mediator" },
            { scene_id: doorId, label: "Move toward the footsteps", next_scene_id: convergenceId, risk_level: "high", visual_role_hint: "aggressor" },
            { scene_id: doorId, label: "Retreat slightly and observe", next_scene_id: convergenceId, risk_level: "low", visual_role_hint: "bystander" },

            // Clinic Choices
            { scene_id: clinicId, label: "Ask Rhea what’s wrong", next_scene_id: convergenceId, risk_level: "medium", visual_role_hint: "supporter" },
            { scene_id: clinicId, label: "Help Soren organize supplies", next_scene_id: convergenceId, risk_level: "low", visual_role_hint: "supporter" },
            { scene_id: clinicId, label: "Watch Eliar’s body language", next_scene_id: convergenceId, risk_level: "low", visual_role_hint: "bystander" },

            // Perimeter Choices
            { scene_id: perimeterId, label: "Approach calmly", next_scene_id: convergenceId, risk_level: "medium", visual_role_hint: "mediator" },
            { scene_id: perimeterId, label: "Keep distance and listen", next_scene_id: convergenceId, risk_level: "low", visual_role_hint: "bystander" },
            { scene_id: perimeterId, label: "Walk past without stopping", next_scene_id: convergenceId, risk_level: "low", visual_role_hint: "bystander" },

            // Convergence Choices
            { scene_id: convergenceId, label: "Follow the political thread", next_scene_id: exitId, risk_level: "medium", visual_role_hint: "mediator" },
            { scene_id: convergenceId, label: "Follow the Brotherhood thread", next_scene_id: exitId, risk_level: "high", visual_role_hint: "protector" },
            { scene_id: convergenceId, label: "Follow the Lantern thread", next_scene_id: exitId, risk_level: "medium", visual_role_hint: "supporter" },

            // Exit Choices
            { scene_id: exitId, label: "Prepare for Act II Mission 6", next_scene_id: null, risk_level: "medium", visual_role_hint: "protector" } // Terminus
        ];

        const choices = await base44.entities.Choice.bulkCreate(choicesData);

        // 3. Create Reactions (including Skill-Gated ones)
        // We map choices by label to attach reactions
        const choiceMap = new Map(choices.map(c => [c.label, c.id]));
        const skills = await base44.entities.Skill.list();
        const getSkillId = (key) => skills.find(s => s.key === key)?.id;

        // Skill IDs
        const skillSoftListening = getSkillId('relational_1');
        const skillSafePositioning = getSkillId('protector_1');
        const skillConflictContainment = getSkillId('protector_2');
        const skillPeerHoldLine = getSkillId('peer_1');
        const skillPredictEscalation = getSkillId('social_3');
        const skillSpotInconsistencies = getSkillId('critical_1');

        const reactionsData = [
            // Door: Call Softly
            { 
                choice_id: choiceMap.get("Call softly into the dark"), 
                text: "A shadow detaches itself from the wall. 'You're louder than you think, Warden.' It's a warning, but not a threat.", 
                tone: "neutral" 
            },
            { 
                choice_id: choiceMap.get("Call softly into the dark"), 
                required_skill_id: skillConflictContainment,
                text: "You project a calm authority. The figure steps into the light, hands raised. 'I see you're not here to break bones. Good.'", 
                tone: "relieved" 
            },
            
            // Door: Move Toward
            { 
                choice_id: choiceMap.get("Move toward the footsteps"), 
                text: "The footsteps scramble away. A crate crashes down, blocking your path. You lost them.", 
                tone: "tense" 
            },
            { 
                choice_id: choiceMap.get("Move toward the footsteps"), 
                required_skill_id: skillSafePositioning,
                text: "You anticipate their flight path and cut them off. The runner freezes, trapped by your positioning alone.", 
                tone: "ominous" 
            },

            // Clinic: Ask Rhea
            { 
                choice_id: choiceMap.get("Ask Rhea what’s wrong"), 
                text: "Rhea looks away, scrubbing a stain on the counter. 'Nothing. Just tired.' She doesn't trust you yet.", 
                tone: "awkward" 
            },
            { 
                choice_id: choiceMap.get("Ask Rhea what’s wrong"), 
                required_skill_id: skillSoftListening,
                text: "Rhea meets your eyes, her guard dropping. 'They took her. Last night. One of the girls from the market. The Brotherhood...' She whispers the truth she's been hiding.", 
                tone: "hopeful" 
            },

            // Perimeter: Approach Calmly
            { 
                choice_id: choiceMap.get("Approach calmly"), 
                text: "The Wardens fall silent, eyeing you with suspicion. 'Lost your way, hero?' One sneers.", 
                tone: "tense" 
            },
            { 
                choice_id: choiceMap.get("Approach calmly"), 
                required_skill_id: skillPeerHoldLine,
                text: "You walk into their circle without breaking stride. Their mockery dies in their throats. You hold the silence until they look away.", 
                tone: "neutral" 
            },
        ];

        // Add defaults for others
        const processedLabels = new Set(reactionsData.map(r => {
             // Reverse lookup label from ID (inefficient but fine for script)
             return [...choiceMap.entries()].find(([k,v]) => v === r.choice_id)[0];
        }));
        
        for (const [label, id] of choiceMap.entries()) {
            if (!processedLabels.has(label)) {
                reactionsData.push({
                    choice_id: id,
                    text: "The moment passes, leaving a weight in the air.",
                    tone: "neutral"
                });
            }
        }

        await base44.entities.ReactionNode.bulkCreate(reactionsData);

        // 4. Create Clues
        const cluesData = [
            {
                scene_id: doorId,
                description: "A scuff mark on the floor suggests a struggle, but the dust is undisturbed nearby. Staged.",
                insight_requirement: 10,
                required_skill_id: skillSpotInconsistencies,
                is_truth: true
            },
            {
                scene_id: doorId,
                description: "A discarded Brotherhood sash. It's too clean to be accidental.",
                insight_requirement: 15,
                required_skill_id: skillPredictEscalation,
                is_misleading: true // It's a plant
            },
            {
                scene_id: clinicId,
                description: "Eliar arranges three vials in a triangle. A signal used by the Hidden Lanterns.",
                insight_requirement: 12,
                // required_skill_id: skillNeuroInclusiveLeadership // Assuming this exists or similar
                is_truth: true
            }
        ];
        
        await base44.entities.InvestigationClue.bulkCreate(cluesData);

        return Response.json({ status: 'success', message: 'Mission 5 Created' });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});