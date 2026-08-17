import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { character_id } = await req.json();

        // 1. Fetch Context
        const [history, politicalState, factions, existingImpacts] = await Promise.all([
            base44.entities.ChoiceHistory.filter({ character_id: character_id }, '-created_date', 10), // Last 10
            base44.entities.PoliticalState.filter({ character_id: character_id }).then(r => r[0]),
            base44.entities.Faction.list(),
            base44.entities.WorldImpactNode.filter({ character_id: character_id })
        ]);

        // Fetch actual choices for context
        const choiceIds = history.map(h => h.choice_id);
        const choiceDetails = [];
        for (const cid of choiceIds) {
            const c = await base44.entities.Choice.filter({ id: cid });
            if (c.length) choiceDetails.push(c[0]);
        }

        // 2. LLM Analysis
        const prompt = `
            Analyze the "World Impact" of the player's recent choices in this Cyberpunk RPG.
            
            CONTEXT:
            - Recent Choices: ${choiceDetails.map(c => `"${c.label}" (${c.risk_level} risk)`).join(', ')}
            - Political State: ${politicalState ? JSON.stringify(politicalState) : 'Stable'}
            - Existing Impacts Identified: ${existingImpacts.map(i => i.title).join(', ')}

            TASK:
            Identify 1-2 NEW tangible consequences on the game world (regions, factions, civilians).
            These should be ripple effects of their ethical stance.
            e.g. If they showed mercy to a thief -> "Thefts increase in Lower Ward but violence decreases."
            e.g. If they supported the Old Guard -> "Patrols are stricter, citizens look away in fear."
            
            Ignore consequences that are already listed in "Existing Impacts".
            
            OUTPUT JSON:
            {
                "new_impacts": [
                    {
                        "title": "Short Title",
                        "description": "2 sentences on the visible change.",
                        "region": "Affected Location",
                        "ethical_alignment": "Order" | "Chaos" | "Mercy" | "Ruthlessness" | "Balance",
                        "severity": 1-10
                    }
                ]
            }
        `;

        const llmRes = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    new_impacts: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                title: { type: "string" },
                                description: { type: "string" },
                                region: { type: "string" },
                                ethical_alignment: { type: "string", enum: ["Order", "Chaos", "Mercy", "Ruthlessness", "Balance"] },
                                severity: { type: "integer" }
                            },
                            required: ["title", "description", "region"]
                        }
                    }
                }
            }
        });

        // 3. Create Nodes
        const created = [];
        if (llmRes.new_impacts) {
            for (const impact of llmRes.new_impacts) {
                // Dedup check by title roughly
                const exists = existingImpacts.some(e => e.title === impact.title);
                if (!exists) {
                    const newRecord = await base44.entities.WorldImpactNode.create({
                        character_id: character_id,
                        ...impact,
                        is_visible: true
                    });
                    created.push(newRecord);
                }
            }
        }

        return Response.json({ created });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});