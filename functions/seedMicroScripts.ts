import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default async function handler(req) {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const scripts = [
            { name: "micro_grounding_breath", effect_json: { stats: { fear_freeze: -1, presence: 1 } } },
            { name: "micro_emotional_name", effect_json: { stats: { insight: 1, fear_freeze: -1 } } },
            { name: "micro_peer_resist", effect_json: { stats: { resolve: 1, masculine_energy: 1 } } },
            { name: "micro_social_read", effect_json: { stats: { insight: 1, care: 1 } } },
            { name: "micro_critical_spot", effect_json: { stats: { insight: 1, integrity: 1 } } },
            { name: "micro_protector_stance", effect_json: { stats: { masculine_energy: 1, resolve: 1 } } },
            { name: "micro_deescalation_voice", effect_json: { stats: { care: 1, feminine_energy: 1 } } },
            { name: "micro_relational_soothe", effect_json: { stats: { care: 1, safety: 1 } } }
        ];

        let createdCount = 0;
        const currentScripts = await base44.entities.EffectScript.list();

        for (const s of scripts) {
            const exists = currentScripts.find(cs => cs.name === s.name);
            if (!exists) {
                await base44.entities.EffectScript.create(s);
                createdCount++;
            } else {
                // Optional: Update existing if needed, but for now just skip
            }
        }

        return Response.json({ created: createdCount, message: "Micro-skill scripts seeded" });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}