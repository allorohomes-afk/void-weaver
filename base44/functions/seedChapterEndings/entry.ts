import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // 1. Define the Narratives
        const endings = [
            {
                key: "chapter_end_balanced",
                title: "The Weaver's Loom",
                body_text: "You stand at the intersection of action and understanding. The chaos of the Undercity doesn't look like noise anymore; it looks like a pattern waiting to be rewoven. You haven't forced your will upon the world, nor have you surrendered to its currents. You are moving with it.\n\nPeople look at you differently now—not with fear, and not with pity, but with a quiet recognition. You are becoming a node in the network, a point where things connect.",
                background_image_url: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop",
                effect: {
                    name: "State: Harmonized",
                    description: "You perceive connections others miss. Social friction is reduced.",
                    stats: { insight: 2, presence: 1 },
                    energies: { masculine_energy: 0, feminine_energy: 0 } // Stabilize
                }
            },
            {
                key: "chapter_end_shadow_masculine",
                title: "The Solitary Blade",
                body_text: "You have cut through the noise, but you have also cut your ties. The path behind you is clear, carved by decisive action and unwavering will, but it is empty. In your drive to fix, to solve, and to conquer the immediate threats, you have become a force of nature—feared, respected, but isolated.\n\n The Undercity moves out of your way now. Not out of cooperation, but out of self-preservation.",
                background_image_url: "https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?q=80&w=2544&auto=format&fit=crop",
                effect: {
                    name: "State: Imposing",
                    description: "Your presence demands space. Intimidation is easier; connection is harder.",
                    stats: { presence: 3, care: -2 },
                    energies: { masculine_energy: 5, feminine_energy: -5 } // Reinforce the shadow loop
                }
            },
            {
                key: "chapter_end_shadow_feminine",
                title: "The Echo Chamber",
                body_text: "You have listened, you have felt, and you have absorbed. But in doing so, you have become saturated with the sorrows of the Spire. You understand everyone, yet you struggle to stand for yourself. The boundaries between you and the world have thinned to the point of transparency.\n\nOthers feel safe with you, perhaps too safe. They see you as a vessel for their burdens, a listener who will not fight back.",
                background_image_url: "https://images.unsplash.com/photo-1518544806308-2853462d90ac?q=80&w=2070&auto=format&fit=crop",
                effect: {
                    name: "State: Permeable",
                    description: "You absorb the emotions of others. Trust is gained easily, but resilience is taxed.",
                    stats: { care: 3, resolve: -2 },
                    energies: { masculine_energy: -5, feminine_energy: 5 } // Reinforce the shadow loop
                }
            }
        ];

        let results = [];

        for (const end of endings) {
            // Check if scene exists
            const existingScenes = await base44.entities.Scene.filter({ key: end.key });
            let sceneId;

            if (existingScenes.length > 0) {
                sceneId = existingScenes[0].id;
                // Update content if needed
                await base44.entities.Scene.update(sceneId, {
                    title: end.title,
                    body_text: end.body_text,
                    background_image_url: end.background_image_url,
                    is_terminal: true
                });
            } else {
                const newScene = await base44.entities.Scene.create({
                    key: end.key,
                    title: end.title,
                    body_text: end.body_text,
                    background_image_url: end.background_image_url,
                    is_terminal: true
                });
                sceneId = newScene.id;
            }

            // Create/Update Effect Script associated with this ending (to be called by concludeChapter)
            const scriptKey = `effect_${end.key}`;
            const existingScripts = await base44.entities.EffectScript.filter({ name: scriptKey });
            
            if (existingScripts.length === 0) {
                await base44.entities.EffectScript.create({
                    name: scriptKey,
                    effect_json: end.effect
                });
            }

            results.push({ key: end.key, id: sceneId });
        }

        return Response.json({ status: 'success', endings: results });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});