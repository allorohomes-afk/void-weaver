import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default async function handler(req) {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { character_id, npc_id, concept, source } = await req.json();

        // 1. Fetch Context
        const [character, npc, politicalState] = await Promise.all([
            base44.entities.Character.filter({ id: character_id }).then(r => r[0]),
            npc_id ? base44.entities.NPC.filter({ id: npc_id }).then(r => r[0]) : null,
            base44.entities.PoliticalState.filter({ character_id: character_id }).then(r => r[0])
        ]);

        if (!character) return Response.json({ error: 'Character not found' }, { status: 404 });

        // 2. Prompt LLM for Quest Structure
        const prompt = `
            Generate a dynamic side quest (MicroQuest) for a cyberpunk narrative game.
            
            Character: ${character.name} (Role: Warden)
            Character Stats: Care ${character.care}, Insight ${character.insight}, Resolve ${character.resolve}, Integrity ${character.integrity}
            NPC Contact: ${npc ? npc.name + " (" + npc.role + ")" : "Anonymous Source"}
            Quest Concept: ${concept || "A favor for the faction"}
            Context: ${source || "Interaction"}
            Political State: Old Guard ${politicalState?.old_guard_pressure || 0}, Lantern ${politicalState?.lantern_influence || 0}
            
            The quest should be short, narrative-focused, and fit the "Void Weaver" setting.
            TAILOR THE QUEST TO THE CHARACTER'S STATS:
            - High Insight -> Investigation/Mystery focus.
            - High Care -> Rescue/Support/Mediation focus.
            - High Resolve -> Defense/Confrontation focus.
            
            Output JSON:
            {
                "title": "Quest Title",
                "body_text": "The narrative briefing of the quest.",
                "objectives": ["Objective 1", "Objective 2"],
                "completion_logic": { "required_clues": 1, "required_stat": "insight", "required_stat_value": 15 },
                "rewards": {
                    "stats": { "insight": 2, "care": 1 },
                    "political": { "lantern_influence": 1 },
                    "relationship_trust_bump": 2
                }
            }
        `;

        const llmRes = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    body_text: { type: "string" },
                    objectives: { type: "array", items: { type: "string" } },
                    completion_logic: { type: "object", additionalProperties: true },
                    rewards: { 
                        type: "object",
                        properties: {
                            stats: { type: "object", additionalProperties: { type: "integer" } },
                            political: { type: "object", additionalProperties: { type: "integer" } },
                            relationship_trust_bump: { type: "integer" }
                        }
                    }
                },
                required: ["title", "body_text"]
            }
        });

        // 3. Create Rewards Script
        let rewardScriptId = null;
        if (llmRes.rewards) {
            const effectJson = {
                stats: llmRes.rewards.stats,
                political: llmRes.rewards.political
            };
            
            // Handle relationship bump dynamically if NPC exists
            if (npc && llmRes.rewards.relationship_trust_bump) {
                effectJson.relationships = [{
                    npc_id: npc.id,
                    trust: llmRes.rewards.relationship_trust_bump
                }];
            }

            const script = await base44.entities.EffectScript.create({
                name: `Reward: ${llmRes.title}`,
                effect_json: effectJson
            });
            rewardScriptId = script.id;
        }

        // 4. Create MicroQuest
        // Generate a unique key
        const questKey = `mq_gen_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        
        const microQuest = await base44.entities.MicroQuest.create({
            key: questKey,
            title: llmRes.title,
            body_text: llmRes.body_text,
            reward_effect_script_id: rewardScriptId,
            unlock_condition: "Generated via interaction",
            completion_criteria: llmRes.completion_logic || {}
        });

        // 5. Assign to Character
        await base44.entities.CharacterMicroQuest.create({
            character_id: character.id,
            microquest_id: microQuest.id,
            status: 'active'
        });

        return Response.json({ 
            status: 'success', 
            quest: microQuest,
            objectives: llmRes.objectives
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}