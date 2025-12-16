import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default async function handler(req) {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        // 1. Define Scenes Data
        const scenesData = [
            {
                key: 'mission5_entry',
                title: 'Sector 4 Promenade',
                body_text: "The neon lights of the Promenade Deck flicker in the simulated rain. The air tastes of ozone and street-fried synth-noodles. You stand at the edge of the market district. Something is off. The usual crowd density is down 40%. The shadows between the stalls seem deeper, heavier. A low hum vibrates through the deck plating—unregistered power usage.",
                is_terminal: false
            },
            {
                key: 'mission5_hidden_door',
                title: 'Maintenance Hatch 4-B',
                body_text: "You track the power hum to a rusted maintenance hatch behind a noodle kiosk. The holographic 'Authorized Personnel Only' sign is glitching, flashing a Syndicate tag for a split second before resetting. Steam vents hiss rhythmically, masking the sound of movement inside. Someone is in there. Or something.",
                is_terminal: false,
                aggressor_npc_key: 'syndicate_runner'
            },
            {
                key: 'mission5_clinic_return',
                title: 'Med-Bay 7',
                body_text: "The sterile white light of the clinic is a stark contrast to the grime outside. Soren is calibrating a bio-bed, his mechanical arm whirring softly. Rhea stands by the window, staring out at the rain. She looks... diminished. Her usual sharp energy is replaced by a frayed tension. A distress signal is blinking on her console, ignored.",
                is_terminal: false,
                vulnerable_npc_key: 'rhea'
            },
            {
                key: 'mission5_perimeter',
                title: 'Sector Perimeter',
                body_text: "You loop around the upper gantry. Below, a squad of Wardens is conducting a 'random' sweep, but their formation is tactical, aggressive. They are hunting. A small drone buzzes near your ear—a friendly spotter, or a spy? The political tension in the sector is palpable. One wrong move could spark a riot.",
                is_terminal: false
            },
            {
                key: 'mission5_convergence',
                title: 'The Data Convergence',
                body_text: "All paths lead here: the sub-basement server junction. The hum is deafening now. Cables snake across the wet floor like bio-organic vines. In the center of the room, a data-node is pulsing with stolen energy. It's a localized extraction point. Someone is pulling data from the Old Guard's archives and routing it through the Lotus network.",
                is_terminal: false
            },
            {
                key: 'mission5_exit',
                title: 'Extraction Point',
                body_text: "The connection is severed. The data is secured in your drive, or lost to the void. The immediate threat has dispersed, melting back into the city's shadows. You stand on the rain-slicked landing pad. The mission is technically complete, but the questions remain. It is time to reflect on your actions before the next cycle begins.",
                is_terminal: false
            },
            // Chapter Endings
            {
                key: 'chapter_end_balanced',
                title: 'End of Chapter: The Weaver\'s Path',
                body_text: "You sit in the quiet of your quarters, balancing the data-drive in your hand. You navigated the crisis without losing yourself. You protected the vulnerable while holding your ground against the aggressors. The city is still broken, but you are not. You are the needle that stitches the void.",
                is_terminal: true
            },
            {
                key: 'chapter_end_shadow_masculine',
                title: 'End of Chapter: The Iron Fist',
                body_text: "The mission is done, but your hands are still shaking with adrenaline. You crushed the threat. You dominated the space. But in the silence, you wonder if you pushed too hard. Did you protect the city, or just conquer it? The line between Guardian and Warlord is thinner than you thought.",
                is_terminal: true
            },
            {
                key: 'chapter_end_shadow_feminine',
                title: 'End of Chapter: The Ghost',
                body_text: "You survived. You kept the peace. But you feel invisible, faded. You absorbed so much of the city's pain, mediated so many conflicts, that you're not sure where your own edges are anymore. You are a vessel for others' safety, but the vessel is cracking.",
                is_terminal: true
            }
        ];

        // 2. Create/Update Scenes
        const sceneMap = new Map(); // key -> id

        for (const sceneData of scenesData) {
            const existing = await base44.entities.Scene.filter({ key: sceneData.key });
            if (existing.length > 0) {
                await base44.entities.Scene.update(existing[0].id, sceneData);
                sceneMap.set(sceneData.key, existing[0].id);
            } else {
                const newScene = await base44.entities.Scene.create(sceneData);
                sceneMap.set(sceneData.key, newScene.id);
            }
        }

        const getId = (key) => sceneMap.get(key);

        // 3. Define Choices
        const choicesData = [
            // Entry Choices
            { scene_id: getId('mission5_entry'), label: "Access Sub-Sector 4's maintenance hatch", next_scene_id: getId('mission5_hidden_door'), risk_level: "high", visual_role_hint: "protector" },
            { scene_id: getId('mission5_entry'), label: "Return to Med-Bay 7", next_scene_id: getId('mission5_clinic_return'), risk_level: "low", visual_role_hint: "supporter" },
            { scene_id: getId('mission5_entry'), label: "Patrol the Promenade Deck perimeter", next_scene_id: getId('mission5_perimeter'), risk_level: "medium", visual_role_hint: "bystander" },

            // Hidden Door Choices
            { scene_id: getId('mission5_hidden_door'), label: "Project voice through external comms", next_scene_id: getId('mission5_convergence'), risk_level: "medium", visual_role_hint: "mediator" },
            { scene_id: getId('mission5_hidden_door'), label: "Engage thrusters to intercept", next_scene_id: getId('mission5_convergence'), risk_level: "high", visual_role_hint: "aggressor" },
            { scene_id: getId('mission5_hidden_door'), label: "Hold position and scan", next_scene_id: getId('mission5_convergence'), risk_level: "low", visual_role_hint: "bystander" },

            // Clinic Choices
            { scene_id: getId('mission5_clinic_return'), label: "Query Rhea about her distress signal", next_scene_id: getId('mission5_convergence'), risk_level: "medium", visual_role_hint: "supporter" },
            { scene_id: getId('mission5_clinic_return'), label: "Assist Soren with the med-synth calibration", next_scene_id: getId('mission5_convergence'), risk_level: "low", visual_role_hint: "supporter" },
            { scene_id: getId('mission5_clinic_return'), label: "Analyze Eliar's bio-readings", next_scene_id: getId('mission5_convergence'), risk_level: "low", visual_role_hint: "bystander" },

            // Perimeter Choices
            { scene_id: getId('mission5_perimeter'), label: "Initiate diplomatic protocol", next_scene_id: getId('mission5_convergence'), risk_level: "medium", visual_role_hint: "mediator" },
            { scene_id: getId('mission5_perimeter'), label: "Monitor comms traffic silently", next_scene_id: getId('mission5_convergence'), risk_level: "low", visual_role_hint: "bystander" },
            { scene_id: getId('mission5_perimeter'), label: "Bypass without engaging", next_scene_id: getId('mission5_convergence'), risk_level: "low", visual_role_hint: "bystander" },

            // Convergence Choices
            { scene_id: getId('mission5_convergence'), label: "Trace the political data-stream", next_scene_id: getId('mission5_exit'), risk_level: "medium", visual_role_hint: "mediator" },
            { scene_id: getId('mission5_convergence'), label: "Pursue the Syndicate frequency", next_scene_id: getId('mission5_exit'), risk_level: "high", visual_role_hint: "protector" },
            { scene_id: getId('mission5_convergence'), label: "Follow the Lotus signal", next_scene_id: getId('mission5_exit'), risk_level: "medium", visual_role_hint: "supporter" },

            // Exit Choices -> Chapter End (Route handled by SceneView logic based on label, but next_scene_id is fallback)
            { scene_id: getId('mission5_exit'), label: "Reflect on your path", next_scene_id: getId('chapter_end_balanced'), risk_level: "medium", visual_role_hint: "mediator" }
        ];

        // 4. Create/Sync Choices (Deduplicate)
        const createdChoices = [];
        for (const choice of choicesData) {
            const existing = await base44.entities.Choice.filter({ 
                scene_id: choice.scene_id, 
                label: choice.label 
            });
            if (existing.length === 0) {
                const newChoice = await base44.entities.Choice.create(choice);
                createdChoices.push(newChoice);
            } else {
                createdChoices.push(existing[0]);
            }
        }

        // 5. Create Reactions (Skill Gated)
        const choiceMap = new Map(createdChoices.map(c => [c.label, c.id]));
        const skills = await base44.entities.Skill.list();
        const getSkillId = (key) => skills.find(s => s.key === key)?.id;

        const skillSoftListening = getSkillId('relational_1');
        const skillSafePositioning = getSkillId('protector_1');
        const skillConflictContainment = getSkillId('protector_2');
        const skillPeerHoldLine = getSkillId('peer_1');

        const reactionsData = [
             { 
                choice_label: "Project voice through external comms",
                text: "A silhouette detaches from the steam-vent shadows. 'Your audio gain is high, Warden.' A warning, broadcast on an open channel.", 
                tone: "neutral" 
            },
            { 
                choice_label: "Project voice through external comms", 
                required_skill_id: skillConflictContainment,
                text: "You project a calm, harmonic frequency. The figure steps into the neon light, hands visible. 'I see you're not here to overload the grid. Good.'", 
                tone: "relieved" 
            },
            { 
                choice_label: "Engage thrusters to intercept", 
                text: "The target engages optical camo. A heavy crate crashes down, blocking your path. Signal lost.", 
                tone: "tense" 
            },
            { 
                choice_label: "Engage thrusters to intercept", 
                required_skill_id: skillSafePositioning,
                text: "You calculate their trajectory and cut off the escape vector. The runner freezes, trapped by your superior positioning.", 
                tone: "ominous" 
            },
            { 
                choice_label: "Query Rhea about her distress signal", 
                text: "Rhea looks away, adjusting a holographic display. 'Glitch in the system. Just tired.' Her bio-metrics show elevated stress.", 
                tone: "awkward" 
            },
            { 
                choice_label: "Query Rhea about her distress signal", 
                required_skill_id: skillSoftListening,
                text: "Rhea meets your gaze, her guard dropping. 'They took her. Last cycle. One of the couriers from the market. The Syndicate...' She whispers the truth.", 
                tone: "hopeful" 
            },
            { 
                choice_label: "Initiate diplomatic protocol", 
                text: "The Wardens silence their comms, eyeing you with suspicion. 'Lost your frequency, hero?' One sneers through their helmet speaker.", 
                tone: "tense" 
            },
            { 
                choice_label: "Initiate diplomatic protocol", 
                required_skill_id: skillPeerHoldLine,
                text: "You transmit a code of neutrality. Their mockery dies in the static. You hold the connection until they look away.", 
                tone: "neutral" 
            }
        ];

        for (const reaction of reactionsData) {
            if (!choiceMap.has(reaction.choice_label)) continue;
            
            const choiceId = choiceMap.get(reaction.choice_label);
            const existing = await base44.entities.ReactionNode.filter({ choice_id: choiceId, text: reaction.text });
            
            if (existing.length === 0) {
                await base44.entities.ReactionNode.create({
                    choice_id: choiceId,
                    text: reaction.text,
                    tone: reaction.tone,
                    required_skill_id: reaction.required_skill_id || null
                });
            }
        }

        return Response.json({ status: 'success', message: 'Mission 5 Scenes and Content Built' });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
Deno.serve(handler);