import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { character_id, scene_id } = await req.json();

        // Fetch Context
        const [character, politicalState, scene, factionStatuses] = await Promise.all([
            base44.entities.Character.filter({ id: character_id }).then(res => res[0]),
            base44.entities.PoliticalState.filter({ character_id: character_id }).then(res => res[0]),
            base44.entities.Scene.filter({ id: scene_id }).then(res => res[0]),
            base44.entities.CharacterFactionStatus.filter({ character_id })
        ]);
        
        const resonanceFlow = character?.resonance_flow || 50;
        const highResonance = resonanceFlow >= 70;

        if (!character) return Response.json({ error: 'Character not found' }, { status: 404 });

        // Logic to determine if we need a new event
        // We can check if an event already exists for this scene/time or just generate one randomly
        // For this implementation, we force generation if requested (usually by the frontend on scene load if none exist)

        const systemPrompt = `
            Generate a short "World Event" or "News Ticker" item for a 1980s Anime Cyberpunk RPG.
            
            Context:
            Character: ${character.name} (Insight: ${character.insight}, Care: ${character.care}, Resonance Flow: ${resonanceFlow}/100)
            Political State: Old Guard ${politicalState?.old_guard_pressure || 0}, Lantern ${politicalState?.lantern_influence || 0}
            Location: ${scene?.title || "Unknown"}
            
            ${highResonance ? `
            PLAYER REPUTATION: This character is known across factions for compassion and diplomacy.
            - Some factions may reference their collaborative reputation
            - News may hint at peaceful resolutions tied to their influence
            - Other Void Weavers may be compared to their example
            ` : ''}
            
            Output JSON:
            {
                "title": "Short Headline",
                "content": "One or two sentences max. Cryptic or propaganda. ${highResonance ? 'May subtly reference the player\'s growing reputation.' : ''}",
                "type": "broadcast" | "rumor" | "system_alert"
            }
        `;

        const llmRes = await base44.integrations.Core.InvokeLLM({
            prompt: systemPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    content: { type: "string" },
                    type: { type: "string", enum: ["broadcast", "rumor", "system_alert"] }
                },
                required: ["title", "content", "type"]
            }
        });

        // Create the event
        const newEvent = await base44.entities.WorldEvent.create({
            title: llmRes.title,
            content: llmRes.content,
            type: llmRes.type,
            trigger_scene_id: scene_id,
            display_duration: 3
        });

        return Response.json({ event: newEvent });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});