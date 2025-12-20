import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { character_id, npc_id, action, description, value, type, favor_id } = await req.json();
        // action: 'create', 'complete', 'renege'

        if (action === 'create') {
            const favor = await base44.entities.Favor.create({
                character_id,
                npc_id,
                description,
                value: value || 'minor',
                type: type || 'owed_by_player',
                status: 'active',
                created_at: new Date().toISOString()
            });
            return Response.json({ status: 'created', favor });
        }

        if (action === 'complete' || action === 'renege') {
             if (!favor_id) return Response.json({ error: 'Missing favor_id' }, { status: 400 });
             
             const favor = await base44.entities.Favor.update(favor_id, {
                 status: action === 'complete' ? 'fulfilled' : 'reneged',
                 updated_at: new Date().toISOString()
             });

             // Update Relationship Impact
             const favors = await base44.entities.Favor.filter({ id: favor_id });
             if (favors.length > 0) {
                 const f = favors[0];
                 const npcId = f.npc_id;
                 
                 // Fetch current relationship
                 const rels = await base44.entities.Relationship.filter({ character_id: character_id, npc_id: npcId });
                 if (rels.length > 0) {
                     const rel = rels[0];
                     let trustDelta = 0;
                     
                     if (action === 'complete') {
                         if (f.value === 'minor') trustDelta = 5;
                         if (f.value === 'standard') trustDelta = 10;
                         if (f.value === 'major') trustDelta = 20;
                     } else { // renege
                         if (f.value === 'minor') trustDelta = -10;
                         if (f.value === 'standard') trustDelta = -20;
                         if (f.value === 'major') trustDelta = -40;
                     }

                     await base44.entities.Relationship.update(rel.id, {
                         trust: (rel.trust || 0) + trustDelta
                     });
                 }
             }

             return Response.json({ status: 'updated', favor });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});