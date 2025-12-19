import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default async function handler(req) {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        // 1. Define Scenes Data
        const scenesData = [
            {
                key: 'mission6_start',
                title: 'The Summons',
                body_text: "You stand on the platform of the Spire Elevator, the city sprawling beneath you like a circuit board of light and shadow. The summons was absolute: 'Report to the High Council.' No reasons given. The air here is thin, recycled, and smells of expensive perfume and ozone. Your data-drive from the sub-basement feels heavy in your pocket. The doors slide open.",
                is_terminal: false
            },
            {
                key: 'mission6_elevator',
                title: 'Ascension',
                body_text: "The elevator is a glass cylinder rising through the smog layer. Inside, it's just you and Orion, a junior attaché for the Lantern faction. He's checking his datapad nervously, glancing at your uniform. 'The Council is... divided,' he murmurs, not making eye contact. 'Your actions in Sector 4 have stirred the pot. I'd advise caution.'",
                is_terminal: false,
                vulnerable_npc_key: 'orion'
            },
            {
                key: 'mission6_chamber',
                title: 'The Hall of Whispers',
                body_text: "The Council Chamber is a vast, circular room with a floor of transparent polymer looking down at the city. Three figures sit on the raised dais. Councilor Vane (Old Guard, stern), Representative Liora (Lantern, calculating), and a shadowy projection representing the Brotherhood. 'Warden,' Vane begins, his voice amplified. 'Explain your interference.'",
                is_terminal: false,
                aggressor_npc_key: 'vane'
            },
            {
                key: 'mission6_verdict',
                title: 'The Verdict',
                body_text: "The Council confers in silence, sharing data via neural link. The tension is thick enough to choke on. Finally, Liora speaks. 'Unorthodox... but effective.' Vane grunts. The Brotherhood projection merely flickers. 'You are cleared for duty, Warden. But know this: the Spire is watching.'",
                is_terminal: false
            },
            {
                key: 'mission6_exit',
                title: 'New Assignment',
                body_text: "You are dismissed. As you leave the Spire, your comms buzz. It's a encrypted coordinate package. A new sector. A new problem. The game has changed. You are no longer just a street-level operator; you are a piece on the board now.",
                is_terminal: true
            }
        ];

        // 2. Create/Update Scenes
        const sceneMap = new Map(); // key -> id

        for (const sceneData of scenesData) {
            const existing = await base44.asServiceRole.entities.Scene.filter({ key: sceneData.key });
            if (existing.length > 0) {
                await base44.asServiceRole.entities.Scene.update(existing[0].id, sceneData);
                sceneMap.set(sceneData.key, existing[0].id);
            } else {
                const newScene = await base44.asServiceRole.entities.Scene.create(sceneData);
                sceneMap.set(sceneData.key, newScene.id);
            }
        }

        const getId = (key) => sceneMap.get(key);

        // 2.5 Define Effect Scripts
        const effectsData = [
            { name: "effect_m6_caution_high", effect_json: { stats: { insight: 5, masculine_energy: -5 }, political: { old_guard_pressure: -1 } } },
            { name: "effect_m6_bold_high", effect_json: { stats: { presence: 5, masculine_energy: 5 }, political: { lantern_influence: 1 } } },
            { name: "effect_m6_diplomat_med", effect_json: { stats: { care: 5, feminine_energy: 5 }, political: { public_sentiment: 1 } } },
            { name: "effect_m6_rebel_high", effect_json: { stats: { integrity: 5, resolve: 5 }, political: { brotherhood_shadow: 1 } } }
        ];

        const effectMap = new Map();
        for (const effect of effectsData) {
            const existing = await base44.asServiceRole.entities.EffectScript.filter({ name: effect.name });
            if (existing.length > 0) {
                effectMap.set(effect.name, existing[0].id);
            } else {
                const newEffect = await base44.asServiceRole.entities.EffectScript.create(effect);
                effectMap.set(effect.name, newEffect.id);
            }
        }
        const getEffect = (name) => effectMap.get(name);

        // 2.6 Define MicroQuests
        const microQuestsData = [
            {
                key: "mq_m6_politics",
                title: "Survive the Politics",
                body_text: "Navigate the High Council hearing without getting sanctioned.",
                unlock_condition: "Mission 6 Start",
                completion_criteria: { scene_visit: "mission6_verdict" }
            }
        ];

        for (const mq of microQuestsData) {
            const existing = await base44.asServiceRole.entities.MicroQuest.filter({ key: mq.key });
            if (existing.length === 0) {
                await base44.asServiceRole.entities.MicroQuest.create(mq);
            } else {
                await base44.asServiceRole.entities.MicroQuest.update(existing[0].id, mq);
            }
        }

        // 3. Define Choices
        const choicesData = [
            // Start
            { scene_id: getId('mission6_start'), label: "Step into the elevator", next_scene_id: getId('mission6_elevator'), risk_level: "low", visual_role_hint: "neutral", effect_script_id: null },

            // Elevator
            { scene_id: getId('mission6_elevator'), label: "Ask Orion for intel on the Council", next_scene_id: getId('mission6_chamber'), risk_level: "medium", visual_role_hint: "mediator", effect_script_id: getEffect("effect_m6_caution_high") },
            { scene_id: getId('mission6_elevator'), label: "Stay silent and observe him", next_scene_id: getId('mission6_chamber'), risk_level: "low", visual_role_hint: "bystander", effect_script_id: getEffect("effect_m6_caution_high") },
            { scene_id: getId('mission6_elevator'), label: "Intimidate him into talking", next_scene_id: getId('mission6_chamber'), risk_level: "high", visual_role_hint: "aggressor", effect_script_id: getEffect("effect_m6_bold_high") },

            // Chamber
            { scene_id: getId('mission6_chamber'), label: "Defend your actions with logic", next_scene_id: getId('mission6_verdict'), risk_level: "medium", visual_role_hint: "mediator", effect_script_id: getEffect("effect_m6_diplomat_med") },
            { scene_id: getId('mission6_chamber'), label: "Challenge Vane's authority", next_scene_id: getId('mission6_verdict'), risk_level: "high", visual_role_hint: "protector", effect_script_id: getEffect("effect_m6_rebel_high") },
            { scene_id: getId('mission6_chamber'), label: "Appeal to Liora's pragmatism", next_scene_id: getId('mission6_verdict'), risk_level: "medium", visual_role_hint: "supporter", effect_script_id: getEffect("effect_m6_bold_high") },

            // Verdict
            { scene_id: getId('mission6_verdict'), label: "Accept the assignment", next_scene_id: getId('mission6_exit'), risk_level: "low", visual_role_hint: "neutral", effect_script_id: null }
        ];

        // 4. Create/Sync Choices
        const createdChoices = [];
        for (const choice of choicesData) {
            const existing = await base44.asServiceRole.entities.Choice.filter({ 
                scene_id: choice.scene_id, 
                label: choice.label 
            });
            if (existing.length === 0) {
                const newChoice = await base44.asServiceRole.entities.Choice.create(choice);
                createdChoices.push(newChoice);
            } else {
                await base44.asServiceRole.entities.Choice.update(existing[0].id, choice);
                createdChoices.push(existing[0]);
            }
        }

        // 5. Create Reactions
        const choiceMap = new Map(createdChoices.map(c => [c.label, c.id]));
        const reactionsData = [
            { 
                choice_label: "Ask Orion for intel on the Council",
                text: "Orion sighs, checking the door. 'Vane wants a scapegoat. Liora wants a tool. Don't give Vane an inch, or he'll bury you.'", 
                tone: "nervous" 
            },
            { 
                choice_label: "Intimidate him into talking",
                text: "Orion flinches, dropping his datapad. 'Okay! Look, they know about the data! Just... don't mention the Brotherhood, alright?'", 
                tone: "fearful" 
            },
            { 
                choice_label: "Defend your actions with logic",
                text: "Liora nods slowly. 'The data supports his claim. Casualty rates were minimal.' Vane scowls but stays silent.", 
                tone: "neutral" 
            },
            { 
                choice_label: "Challenge Vane's authority",
                text: "Vane stands up, slamming his hand on the console. 'You forget your place, Warden!' But the Brotherhood projection shifts... seemingly amused.", 
                tone: "tense" 
            }
        ];

        for (const reaction of reactionsData) {
            if (!choiceMap.has(reaction.choice_label)) continue;
            const choiceId = choiceMap.get(reaction.choice_label);
            const existing = await base44.asServiceRole.entities.ReactionNode.filter({ choice_id: choiceId, text: reaction.text });
            if (existing.length === 0) {
                await base44.asServiceRole.entities.ReactionNode.create({
                    choice_id: choiceId,
                    text: reaction.text,
                    tone: reaction.tone
                });
            }
        }

        return Response.json({ status: 'success', message: 'Mission 6 Content Built' });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
Deno.serve(handler);