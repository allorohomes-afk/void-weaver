import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default async function handler(req) {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { question, character_id } = await req.json();

        // 1. Fetch World Context
        // We fetch summaries to keep context window manageable
        const [factions, npcs, worldEvents, politicalState] = await Promise.all([
            base44.entities.Faction.list(),
            base44.entities.NPC.list(),
            base44.entities.WorldEvent.filter({ active: true }),
            character_id ? base44.entities.PoliticalState.filter({ character_id }).then(r => r[0]) : null
        ]);

        // 2. Format Context
        const factionContext = factions.map(f => `${f.name}: ${f.description}`).join('\n');
        const npcContext = npcs.map(n => `${n.name} (${n.role}, ${n.archetype})`).join('\n');
        const eventContext = worldEvents.map(e => `${e.headline}: ${e.description}`).join('\n');
        const politics = politicalState ? 
            `Old Guard Pressure: ${politicalState.old_guard_pressure}, Lantern Influence: ${politicalState.lantern_influence}` : 
            "Political state unclear.";

        // 3. Construct Prompt
        const prompt = `
            You are "The Archive", a semi-sentient, slightly glitchy cyberpunk database for the game "Void Weaver".
            
            WORLD LORE:
            
            FACTIONS:
            ${factionContext}
            
            KEY FIGURES (NPCs):
            ${npcContext}
            
            CURRENT EVENTS:
            ${eventContext}
            
            POLITICAL CLIMATE:
            ${politics}
            
            INSTRUCTIONS:
            - Answer the player's question based strictly on the provided lore.
            - If the information is missing, speculate vaguely or say the data is corrupted/redacted.
            - Tone: Analytical, slightly cryptic, retro-tech interface. Use terms like "Query received", "Parsing...", "Data fragment retrieved".
            - Keep answers concise (max 3-4 sentences) unless asked for detail.
            
            PLAYER QUESTION:
            "${question}"
        `;

        // 4. Call LLM
        const response = await base44.integrations.Core.InvokeLLM({
            prompt: prompt
        });

        return Response.json({ 
            answer: response 
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}