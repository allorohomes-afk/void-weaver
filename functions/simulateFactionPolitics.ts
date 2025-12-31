import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me(); // Auth check optional for simulation but good practice
        
        // This function might be called by a cron or user action button
        const { character_id } = await req.json();

        // 1. Fetch Character & Factions
        const [character, factions, factionStatuses] = await Promise.all([
            base44.entities.Character.filter({ id: character_id }).then(r => r[0]),
            base44.entities.Faction.list(),
            base44.entities.CharacterFactionStatus.filter({ character_id })
        ]);
        
        const resonanceFlow = character?.resonance_flow || 50;
        const playerHasInfluence = resonanceFlow >= 70;
        // We need all pairs. If N=5, pairs=10. Manageable.
        
        // For this iteration, we'll pick 2 random factions to simulate an event between.
        if (factions.length < 2) return Response.json({ message: "Not enough factions" });

        const shuffled = factions.sort(() => 0.5 - Math.random());
        const sourceF = shuffled[0];
        const targetF = shuffled[1];

        // 2. Fetch recent world context
        const impacts = await base44.entities.WorldImpactNode.filter({ character_id }, '-created_date', 3);
        
        // 3. Check Player Influence
        const sourceFactionStatus = factionStatuses.find(fs => fs.faction_id === sourceF.id);
        const targetFactionStatus = factionStatuses.find(fs => fs.faction_id === targetF.id);
        const playerCanMediate = playerHasInfluence && 
            (sourceFactionStatus?.resonance_reputation || 0) >= 50 &&
            (targetFactionStatus?.resonance_reputation || 0) >= 50;
        
        // 3. Simulate Dynamic Interaction
        const prompt = `
            Simulate a political interaction between two cyberpunk factions.
            
            Faction A (Source): ${sourceF.name} - ${sourceF.description}
            Faction B (Target): ${targetF.name} - ${targetF.description}
            
            Recent World Events: ${impacts.map(i => i.title).join(', ') || "Quiet times"}
            
            ${playerCanMediate ? `
            PLAYER INFLUENCE: The Void Weaver (${character.name}) has HIGH RESONANCE FLOW (${resonanceFlow}/100) 
            and strong compassionate reputation with BOTH factions.
            - This allows diplomatic intervention possibilities
            - Tensions may be de-escalated
            - Collaborative solutions are more likely
            ` : ''}
            
            Determine:
            1. How their relationship shifts (-20 to +20). ${playerCanMediate ? 'Weight toward positive/neutral outcomes.' : ''}
            2. A short "Incident Report" describing the event (e.g. "Trade deal broken", "Joint raid success").
            ${playerCanMediate ? '3. Mention if the player\'s reputation influenced the outcome.' : ''}
            
            Output JSON:
            {
                "change_score": integer,
                "incident": "string",
                "new_status": "ally" | "friendly" | "neutral" | "tension" | "hostile" | "war",
                "player_influenced": boolean
            }
        `;

        const llmRes = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    change_score: { type: "integer" },
                    incident: { type: "string" },
                    new_status: { type: "string", enum: ["ally", "friendly", "neutral", "tension", "hostile", "war"] },
                    player_influenced: { type: "boolean" }
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

        // Generate World Event if player influenced
        if (llmRes.player_influenced && character_id) {
            await base44.entities.WorldEvent.create({
                title: `Diplomatic Breakthrough`,
                content: `${sourceF.name} and ${targetF.name}: ${llmRes.incident}. Rumors credit the Void Weaver's intervention.`,
                type: 'broadcast',
                display_duration: 2
            });
        }

        return Response.json({ 
            source: sourceF.name, 
            target: targetF.name, 
            update: relation,
            player_influenced: llmRes.player_influenced || false
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});