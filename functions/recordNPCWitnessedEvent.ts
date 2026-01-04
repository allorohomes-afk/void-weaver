import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            character_id, 
            event_type, 
            description, 
            scene_id, 
            faction_id,
            intensity = 5,
            tags = []
        } = await req.json();

        if (!character_id || !event_type || !description) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Get character for Resonance Flow context
        const character = await base44.entities.Character.filter({ id: character_id }).then(r => r[0]);
        const resonanceFlow = character?.resonance_flow || 50;

        // Find NPCs who should witness this event
        let witnessNPCs = [];
        
        if (scene_id) {
            // NPCs in the current scene witness it
            const scene = await base44.entities.Scene.filter({ id: scene_id }).then(r => r[0]);
            const allNPCs = await base44.entities.NPC.list();
            
            // Find NPCs mentioned in the scene or with existing relationships
            const relationships = await base44.entities.Relationship.filter({ character_id });
            witnessNPCs = allNPCs.filter(npc => 
                relationships.some(r => r.npc_id === npc.id) ||
                (faction_id && npc.faction_id === faction_id)
            );
        } else if (faction_id) {
            // All NPCs of this faction hear about it
            witnessNPCs = await base44.entities.NPC.filter({ faction_id });
        }

        // Determine emotional impact
        const emotionalImpact = tags.includes('compassionate') || tags.includes('heroic') ? 'positive' :
                               tags.includes('aggressive') || tags.includes('harmful') ? 'negative' : 
                               'neutral';

        // Create memories for each witness
        const memories = [];
        for (const npc of witnessNPCs.slice(0, 5)) { // Limit to avoid spam
            const memory = await base44.entities.NPCMemory.create({
                npc_id: npc.id,
                character_id: character_id,
                memory_type: event_type,
                summary: description,
                emotional_impact: emotionalImpact,
                intensity: intensity,
                player_resonance_at_time: resonanceFlow,
                tags: tags,
                scene_id: scene_id,
                related_faction_id: faction_id,
                can_reference_in_dialogue: true
            });
            memories.push(memory);
        }

        return Response.json({ 
            witnessed_by: witnessNPCs.length,
            memories_created: memories.length,
            sample_witnesses: witnessNPCs.slice(0, 3).map(n => n.name)
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});