import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { character_id, scene_id } = await req.json();

        if (!character_id || !scene_id) {
            return Response.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // Fetch Data
        const [character, scene, choices] = await Promise.all([
            base44.entities.Character.filter({ id: character_id }).then(r => r[0]),
            base44.entities.Scene.filter({ id: scene_id }).then(r => r[0]),
            base44.entities.Choice.filter({ scene_id })
        ]);

        const resonanceFlow = character.resonance_flow || 50;

        // Only high Resonance Flow unlocks diplomatic alternatives
        if (resonanceFlow < 70) {
            return Response.json({ 
                diplomatic_available: false,
                message: 'Resonance Flow too low for diplomatic solutions'
            });
        }

        // Check if scene involves conflict (aggressor/vulnerable NPCs)
        if (!scene.aggressor_npc_key && !scene.vulnerable_npc_key) {
            return Response.json({ 
                diplomatic_available: false,
                message: 'No conflict to mediate in this scene'
            });
        }

        // Check if a diplomatic choice already exists
        const hasDiplomatic = choices.some(c => 
            c.visual_role_hint === 'mediator' || 
            c.label.toLowerCase().includes('mediate') ||
            c.label.toLowerCase().includes('diplomatic')
        );

        if (hasDiplomatic) {
            return Response.json({ 
                diplomatic_available: true,
                message: 'Diplomatic option already present',
                existing: true
            });
        }

        // Generate Dynamic Diplomatic Choice
        const prompt = `
            A Void Weaver with HIGH RESONANCE FLOW (${resonanceFlow}/100) is witnessing a conflict.
            
            Scene: ${scene.title}
            Context: ${scene.body_text}
            Aggressor: ${scene.aggressor_npc_key || 'Unknown'}
            Vulnerable: ${scene.vulnerable_npc_key || 'Unknown'}
            
            The player's emotional intelligence and reputation for compassion have UNLOCKED a diplomatic solution.
            
            Generate a unique choice that:
            1. De-escalates through empathy and understanding
            2. Addresses root causes, not symptoms
            3. Requires genuine emotional labor from the player
            4. Honors both parties' dignity
            
            Output JSON:
            {
                "label": "Choice text (45 chars max)",
                "description": "Detailed explanation of the approach",
                "resonance_impact": 15 to 20 (high reward for high difficulty)
            }
        `;

        const llmRes = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    label: { type: "string" },
                    description: { type: "string" },
                    resonance_impact: { type: "integer" }
                },
                required: ["label", "description"]
            }
        });

        // Create the diplomatic choice
        const diplomaticChoice = await base44.entities.Choice.create({
            scene_id: scene.id,
            label: llmRes.label,
            description: llmRes.description,
            next_scene_id: null, // Will advance to standard next scene
            risk_level: 'high',
            visual_role_hint: 'mediator',
            resonance_impact: llmRes.resonance_impact || 15
        });

        return Response.json({
            diplomatic_available: true,
            choice: diplomaticChoice,
            message: 'High Resonance Flow unlocked a diplomatic path'
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});