import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default async function handler(req) {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        // 1. Define Child Storyline Scenes
        const scenesData = [
            {
                key: 'young_guardians_intro',
                title: 'The Spark Academy',
                body_text: "You stand in the Great Hall of the Spark Academy. Holographic stars float above your head. It's your first day as a Junior Guardian. The air hums with excitement. Other young students are gathering around the central datastream, looking nervous but eager. You feel a small buzz in your pocket—your very first Datapad is activating.",
                is_terminal: false
            },
            {
                key: 'yg_classroom',
                title: 'Simulation Room 101',
                body_text: "The room changes around you. One moment it's a classroom, the next it's a simulation of a busy city street. 'Welcome, Young Guardians,' a soft voice echoes. 'Today we learn about Observation. Not just seeing with your eyes, but with your feelings.' A holographic child is crying on a bench nearby.",
                is_terminal: false,
                vulnerable_npc_key: 'holo_child'
            },
            {
                key: 'yg_playground',
                title: 'The Sky-Deck Playground',
                body_text: "Recess! The playground overlooks the entire city. Ships zoom by in the distance. A group of older kids is playing 'Energy Ball', but they aren't letting the smaller ones join in. One of the smaller kids looks at you, hoping for help.",
                is_terminal: false
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

        // 2.5 Define Child-Friendly Effects
        const effectsData = [
            { name: "effect_yg_empathy_boost", effect_json: { stats: { care: 5, insight: 2 } } },
            { name: "effect_yg_bravery_boost", effect_json: { stats: { resolve: 5, presence: 2 } } },
            { name: "effect_yg_calm_mind", effect_json: { stats: { fear_freeze: -2, insight: 5 } } },
            { name: "effect_yg_teamwork", effect_json: { stats: { feminine_energy: 5, masculine_energy: 5 } } }
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

        // 3. Define Choices (Simplified for Kids)
        const choicesData = [
            // Intro Choices
            { scene_id: getId('young_guardians_intro'), label: "Check your Datapad for messages", next_scene_id: getId('yg_classroom'), risk_level: "low", visual_role_hint: "supporter", effect_script_id: getEffect("effect_yg_calm_mind") },
            { scene_id: getId('young_guardians_intro'), label: "Introduce yourself to the group", next_scene_id: getId('yg_classroom'), risk_level: "medium", visual_role_hint: "mediator", effect_script_id: getEffect("effect_yg_teamwork") },
            
            // Classroom Choices
            { scene_id: getId('yg_classroom'), label: "Sit next to the crying child and ask what's wrong", next_scene_id: getId('yg_playground'), risk_level: "low", visual_role_hint: "supporter", effect_script_id: getEffect("effect_yg_empathy_boost") },
            { scene_id: getId('yg_classroom'), label: "Look for an adult or teacher to help", next_scene_id: getId('yg_playground'), risk_level: "low", visual_role_hint: "protector", effect_script_id: getEffect("effect_yg_bravery_boost") },
            
            // Playground Choices
            { scene_id: getId('yg_playground'), label: "Ask the older kids to let everyone play", next_scene_id: getId('young_guardians_intro'), risk_level: "medium", visual_role_hint: "mediator", effect_script_id: getEffect("effect_yg_bravery_boost") },
            { scene_id: getId('yg_playground'), label: "Start a new game with the smaller kids", next_scene_id: getId('young_guardians_intro'), risk_level: "low", visual_role_hint: "supporter", effect_script_id: getEffect("effect_yg_teamwork") }
        ];

        // 4. Create/Sync Choices
        for (const choice of choicesData) {
            const existing = await base44.asServiceRole.entities.Choice.filter({ 
                scene_id: choice.scene_id, 
                label: choice.label 
            });
            if (existing.length === 0) {
                await base44.asServiceRole.entities.Choice.create(choice);
            } else {
                await base44.asServiceRole.entities.Choice.update(existing[0].id, choice);
            }
        }

        return Response.json({ status: 'success', start_scene_id: getId('young_guardians_intro') });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
Deno.serve(handler);