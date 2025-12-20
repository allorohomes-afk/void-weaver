import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me(); // Auth check optional for simulation but good practice
        
        // This function might be called by a cron or user action button
        const { character_id } = await req.json();

        // 1. Fetch Factions and Relations
        const factions = await base44.entities.Faction.list();
        // We need all pairs. If N=5, pairs=10. Manageable.
        
        // For this iteration, we'll pick 2 random factions to simulate an event between.
        if (factions.length < 2) return Response.json({ message: "Not enough factions" });

        const shuffled = factions.sort(() => 0.5 - Math.random());
        const sourceF = shuffled[0];
        const targetF = shuffled[1];

        // 2. Fetch recent world context
        const impacts = await base44.entities.WorldImpactNode.filter({ character_id }, '-created_date', 3);
        
        // 3. Simulate Dynamic Interaction
        const prompt = `
            Simulate a political interaction between two cyberpunk factions.
            
            Faction A (Source): ${sourceF.name} - ${sourceF.description}
            Faction B (Target): ${targetF.name} - ${targetF.description}
            
            Recent World Events: ${impacts.map(i => i.title).join(', ') || "Quiet times"}
            
            Determine:
            1. How their relationship shifts (-20 to +20).
            2. A short "Incident Report" describing the event (e.g. "Trade deal broken", "Joint raid success").
            
            Output JSON:
            {
                "change_score": integer,
                "incident": "string",
                "new_status": "ally" | "friendly" | "neutral" | "tension" | "hostile" | "war"
            }
        `;

        const llmRes = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    change_score: { type: "integer" },
                    incident: { type: "string" },
                    new_status: { type: "string", enum: ["ally", "friendly", "neutral", "tension", "hostile", "war"] }
                },
                required: ["change_score", "incident"]
            }
        });

        // 4. Update or Create Relation
        const existing = await base44.entities.FactionRelation.filter({
            source_faction_id: sourceF.id,
            target_faction_id: targetF.id
        });

        let relation;
        if (existing.length > 0) {
            const currentScore = existing[0].relationship_score || 0;
            const newScore = Math.max(-100, Math.min(100, currentScore + llmRes.change_score));
            
            relation = await base44.entities.FactionRelation.update(existing[0].id, {
                relationship_score: newScore,
                status: llmRes.new_status,
                last_incident_summary: llmRes.incident
            });
        } else {
            relation = await base44.entities.FactionRelation.create({
                source_faction_id: sourceF.id,
                target_faction_id: targetF.id,
                relationship_score: llmRes.change_score,
                status: llmRes.new_status,
                last_incident_summary: llmRes.incident
            });
        }

        return Response.json({ 
            source: sourceF.name, 
            target: targetF.name, 
            update: relation 
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});