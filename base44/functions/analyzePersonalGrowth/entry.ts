import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { character_id } = await req.json();

        // 1. Fetch Deep Context
        const [character, choiceHistory, relationships, questLog] = await Promise.all([
            base44.entities.Character.filter({ id: character_id }).then(r => r[0]),
            base44.entities.ChoiceHistory.filter({ character_id: character_id }, '-created_date', 20), // Last 20 choices
            base44.entities.Relationship.filter({ character_id: character_id }),
            base44.entities.CharacterMicroQuest.filter({ character_id: character_id })
        ]);

        if (!character) return Response.json({ error: 'Character not found' }, { status: 404 });

        // 2. Fetch Choice Details for Tone Analysis
        let choiceTones = [];
        let riskProfile = { low: 0, medium: 0, high: 0 };
        
        // We need to look up the choices to get their metadata
        // Optimization: We could fetch all relevant choices in one go if we had 'in' query, 
        // but for now we'll do a focused fetch for the unique IDs in history.
        const choiceIds = [...new Set(choiceHistory.map(h => h.choice_id))];
        // Fetching manually in loop for now as bulk fetch by ID list isn't standard in this SDK version yet?
        // Actually, let's just infer from the history if we saved metadata there? We didn't save tone/risk.
        // We'll rely on the character stats as the *result* of those choices.
        
        // 3. Construct Profile
        const statsProfile = `
            Insight: ${character.insight} (Awareness)
            Care: ${character.care} (Empathy)
            Resolve: ${character.resolve} (Willpower)
            Integrity: ${character.integrity} (Moral Consistency)
            Energy: ${character.masculine_energy}M / ${character.feminine_energy}F
            Current Emotional State: ${character.emotional_state || 'Neutral'}
        `;

        const relProfile = relationships.map(r => `Trust with NPC_${r.npc_id.substr(0,4)}: ${r.trust}`).join(', ');
        const questCount = questLog.filter(q => q.status === 'completed').length;

        // 4. LLM Analysis
        const prompt = `
            Analyze the "Personal Growth" of this RPG character based on their stats and history.
            
            CONTEXT:
            The game focuses on emotional intelligence, critical thinking, and non-lethal conflict resolution.
            We are tracking their evolution from a standard "Warden" to something more profound.

            DATA:
            ${statsProfile}
            Relationships Summary: ${relProfile}
            Quests Completed: ${questCount}
            Recent History Count: ${choiceHistory.length} interactions analyzed.

            TASK:
            Generate a psychological profile of their growth.
            1. Archetype Title: A poetic, 2-3 word title (e.g. "The Wounded Healer", "The Stoic Shield", "The Radical Empath").
            2. Narrative Summary: A deep, 2-3 sentence reflection on how they have changed. Focus on internal shifts (fear to courage, apathy to care).
            3. Core Values: 3 abstract values they seem to prioritize (e.g. Justice, Mercy, Truth, Efficiency).
            4. Dominant Emotions: 2-3 emotional states that define them currently.
            5. World Impact: How their internal state is reflecting on the game world (e.g. "Your calm presence is lowering crime rates in Sector 4").

            OUTPUT JSON:
            {
                "archetype_title": "String",
                "narrative_summary": "String",
                "core_values": ["String", "String", "String"],
                "dominant_emotions": ["String", "String"],
                "world_impact_summary": "String"
            }
        `;

        const llmRes = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    archetype_title: { type: "string" },
                    narrative_summary: { type: "string" },
                    core_values: { type: "array", items: { type: "string" } },
                    dominant_emotions: { type: "array", items: { type: "string" } },
                    world_impact_summary: { type: "string" }
                },
                required: ["archetype_title", "narrative_summary"]
            }
        });

        // 5. Store Record
        // Check if one exists for today/this chapter? 
        // For now, we just create a new one (history log) or update the latest if it's recent.
        // Let's just create a new one to show progression over time if viewing history.
        
        await base44.entities.PersonalGrowthRecord.create({
            character_id: character_id,
            archetype_title: llmRes.archetype_title,
            narrative_summary: llmRes.narrative_summary,
            core_values: llmRes.core_values,
            dominant_emotions: llmRes.dominant_emotions,
            world_impact_summary: llmRes.world_impact_summary,
            evolution_stage: Math.floor((character.insight + character.care + character.resolve) / 10) // Rough level calculation
        });

        return Response.json(llmRes);

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});