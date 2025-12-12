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

        if (!entryId) return Response.json({ error: 'Scenes not found. Run previous step first.' }, { status: 400 });

        // 2. Create Choices
        const choicesData = [
            // Entry Choices
            { scene_id: entryId, label: "Access Sub-Sector 4's maintenance hatch", next_scene_id: doorId, risk_level: "high", visual_role_hint: "protector" },
            { scene_id: entryId, label: "Return to Med-Bay 7", next_scene_id: clinicId, risk_level: "low", visual_role_hint: "supporter" },
            { scene_id: entryId, label: "Patrol the Promenade Deck perimeter", next_scene_id: perimeterId, risk_level: "medium", visual_role_hint: "bystander" },

            // Hidden Door Choices
            { scene_id: doorId, label: "Project voice through external comms", next_scene_id: convergenceId, risk_level: "medium", visual_role_hint: "mediator" },
            { scene_id: doorId, label: "Engage thrusters to intercept", next_scene_id: convergenceId, risk_level: "high", visual_role_hint: "aggressor" },
            { scene_id: doorId, label: "Hold position and scan", next_scene_id: convergenceId, risk_level: "low", visual_role_hint: "bystander" },

            // Clinic Choices
            { scene_id: clinicId, label: "Query Rhea about her distress signal", next_scene_id: convergenceId, risk_level: "medium", visual_role_hint: "supporter" },
            { scene_id: clinicId, label: "Assist Soren with the med-synth calibration", next_scene_id: convergenceId, risk_level: "low", visual_role_hint: "supporter" },
            { scene_id: clinicId, label: "Analyze Eliar's bio-readings", next_scene_id: convergenceId, risk_level: "low", visual_role_hint: "bystander" },

            // Perimeter Choices
            { scene_id: perimeterId, label: "Initiate diplomatic protocol", next_scene_id: convergenceId, risk_level: "medium", visual_role_hint: "mediator" },
            { scene_id: perimeterId, label: "Monitor comms traffic silently", next_scene_id: convergenceId, risk_level: "low", visual_role_hint: "bystander" },
            { scene_id: perimeterId, label: "Bypass without engaging", next_scene_id: convergenceId, risk_level: "low", visual_role_hint: "bystander" },

            // Convergence Choices
            { scene_id: convergenceId, label: "Trace the political data-stream", next_scene_id: exitId, risk_level: "medium", visual_role_hint: "mediator" },
            { scene_id: convergenceId, label: "Pursue the Syndicate frequency", next_scene_id: exitId, risk_level: "high", visual_role_hint: "protector" },
            { scene_id: convergenceId, label: "Follow the Lotus signal", next_scene_id: exitId, risk_level: "medium", visual_role_hint: "supporter" },

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
                choice_id: choiceMap.get("Project voice through external comms"), 
                text: "A silhouette detaches from the steam-vent shadows. 'Your audio gain is high, Warden.' A warning, broadcast on an open channel.", 
                tone: "neutral" 
            },
            { 
                choice_id: choiceMap.get("Project voice through external comms"), 
                required_skill_id: skillConflictContainment,
                text: "You project a calm, harmonic frequency. The figure steps into the neon light, hands visible. 'I see you're not here to overload the grid. Good.'", 
                tone: "relieved" 
            },
            
            // Door: Move Toward
            { 
                choice_id: choiceMap.get("Engage thrusters to intercept"), 
                text: "The target engages optical camo. A heavy crate crashes down, blocking your path. Signal lost.", 
                tone: "tense" 
            },
            { 
                choice_id: choiceMap.get("Engage thrusters to intercept"), 
                required_skill_id: skillSafePositioning,
                text: "You calculate their trajectory and cut off the escape vector. The runner freezes, trapped by your superior positioning.", 
                tone: "ominous" 
            },

            // Clinic: Ask Rhea
            { 
                choice_id: choiceMap.get("Query Rhea about her distress signal"), 
                text: "Rhea looks away, adjusting a holographic display. 'Glitch in the system. Just tired.' Her bio-metrics show elevated stress.", 
                tone: "awkward" 
            },
            { 
                choice_id: choiceMap.get("Query Rhea about her distress signal"), 
                required_skill_id: skillSoftListening,
                text: "Rhea meets your gaze, her guard dropping. 'They took her. Last cycle. One of the couriers from the market. The Syndicate...' She whispers the truth.", 
                tone: "hopeful" 
            },

            // Perimeter: Approach Calmly
            { 
                choice_id: choiceMap.get("Initiate diplomatic protocol"), 
                text: "The Wardens silence their comms, eyeing you with suspicion. 'Lost your frequency, hero?' One sneers through their helmet speaker.", 
                tone: "tense" 
            },
            { 
                choice_id: choiceMap.get("Initiate diplomatic protocol"), 
                required_skill_id: skillPeerHoldLine,
                text: "You transmit a code of neutrality. Their mockery dies in the static. You hold the connection until they look away.", 
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
                    text: "The moment hangs in the static of the air filters.",
                    tone: "neutral"
                });
            }
        }

        await base44.entities.ReactionNode.bulkCreate(reactionsData);

        // 4. Create Clues
        const cluesData = [
            {
                scene_id: doorId,
                description: "A thermal signature on the floor suggests recent activity, but the dust layer is undisturbed. Holographic decoy.",
                insight_requirement: 10,
                required_skill_id: skillSpotInconsistencies,
                is_truth: true
            },
            {
                scene_id: doorId,
                description: "A discarded Syndicate datachip. It's too pristine to be accidental junk.",
                insight_requirement: 15,
                required_skill_id: skillPredictEscalation,
                is_misleading: true // It's a plant
            },
            {
                scene_id: clinicId,
                description: "Eliar arranges three bio-vials in a triangle. A code used by the Neon Lotus collective.",
                insight_requirement: 12,
                // required_skill_id: skillNeuroInclusiveLeadership // Assuming this exists or similar
                is_truth: true
            }
        ];
        
        await base44.entities.InvestigationClue.bulkCreate(cluesData);

        return Response.json({ status: 'success', message: 'Mission 5 Created (Retro Anime Version)' });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});