import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { character_id } = await req.json();

        // 1. Fetch World State
        const [character, factions, impacts] = await Promise.all([
            base44.entities.Character.filter({ id: character_id }).then(r => r[0]),
            base44.entities.Faction.list(),
            base44.entities.WorldImpactNode.filter({ character_id }, '-created_date', 5)
        ]);

        // 2. Prompt for Procedural Quest
        const prompt = `
            Generate a procedural "Micro-Quest" for a Cyberpunk RPG.
            
            Character: ${character.name} (Role: Void Weaver/Agent)
            Factions: ${factions.map(f => f.name).join(', ')}
            Recent World Impacts: ${impacts.map(i => i.title).join(', ')}
            
            Goal: Create a small, actionable mission that fits the current world state.
            It should be a "Gig" or "Task" offered by a faction or discovered via observation.
            
            Output JSON:
            {
                "title": "Quest Title",
                "description": "Brief briefing...",
                "source_faction_name": "One of the factions or 'Independent'",
                "unlock_condition": "Reason it unlocked (e.g. 'Due to rising tension in...')"
            }
        `;

        const llmRes = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    source_faction_name: { type: "string" },
                    unlock_condition: { type: "string" }
                },
                required: ["title", "description"]
            }
        });

        // 3. Create MicroQuest Entity
        // Note: procedural quests might clutter the main MicroQuest table if we aren't careful.
        // For now, we'll treat them as standard MicroQuests but maybe with a special key prefix.
        const questKey = `proc_${Date.now()}_${Math.floor(Math.random()*1000)}`;
        
        const newQuest = await base44.entities.MicroQuest.create({
            key: questKey,
            title: llmRes.title,
            body_text: `${llmRes.description}\n\n[Source: ${llmRes.source_faction_name}]`,
            unlock_condition: llmRes.unlock_condition,
            completion_criteria: { type: "manual_check" } // Simplified for procedural
        });

        // 4. Assign to Character
        await base44.entities.CharacterMicroQuest.create({
            character_id: character.id,
            microquest_id: newQuest.id,
            status: 'active'
        });

        return Response.json({ quest: newQuest });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});