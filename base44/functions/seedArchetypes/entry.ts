import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const archetypes = [
            {
                name: "The Wounded Healer",
                social_mask: "Benevolent, calm, seemingly endless patience. A rock for others.",
                true_nature: "Exhausted, cynical, and barely holding back a tidal wave of grief.",
                speaking_style: "Soft-spoken, uses medical or organic metaphors. Pauses frequently to 'assess' the listener.",
                behavioral_traits: ["Rubs sanitized hands together", "Avoids direct eye contact when discussing loss", "Checks pulse of self or others unconsciously"],
                vocal_tics: ["Starts sentences with 'Listen...'", "Sighs deeply before bad news"],
                motivations: "To save everyone so they don't have to feel the pain of loss again.",
                core_fear: "Being helpless while someone suffers.",
                core_desire: "To fix the unfixable.",
                stress_triggers: ["Unnecessary violence", "Ignorance of biology/health"],
                stress_response: "Becomes coldly clinical and detached. Stops using names, refers to people as 'subjects' or 'casualties'."
            },
            {
                name: "The Information Broker",
                social_mask: "Charming, fast-talking, eager to please but transaction-focused.",
                true_nature: "Paranoid, lonely, and desperate for a connection that isn't a trade.",
                speaking_style: "Rapid-fire, laden with tech-slang and street jargon. Never answers a question directly.",
                behavioral_traits: ["Constantly glances at exits", "Taps rhythms on data-pads", "Laughs too loud at bad jokes"],
                vocal_tics: ["Ends sentences with 'you scan?'", "Refers to self in third person occasionally"],
                motivations: "To be the most valuable person in the room so they aren't discarded.",
                core_fear: "Irrelevance. Being 'offline'.",
                core_desire: "To know the one secret that makes them safe.",
                stress_triggers: ["Silence", "Being ignored", "Physical threats"],
                stress_response: "Manic babbling, offering up secrets they shouldn't, attempting to buy their way out."
            }
        ];

        for (const arch of archetypes) {
            const existing = await base44.entities.PersonalityArchetype.filter({ name: arch.name });
            if (existing.length === 0) {
                await base44.entities.PersonalityArchetype.create(arch);
            } else {
                await base44.entities.PersonalityArchetype.update(existing[0].id, arch);
            }
        }

        return Response.json({ status: 'success', message: 'Archetypes seeded' });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});