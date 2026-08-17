import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { character_id } = await req.json();

        // 1. Fetch Character Context
        const [character, skills, characterSkills, choices, journals] = await Promise.all([
            base44.entities.Character.filter({ id: character_id }).then(r => r[0]),
            base44.entities.Skill.list(),
            base44.entities.CharacterSkill.filter({ character_id }),
            base44.entities.ChoiceHistory.filter({ character_id }, '-created_date', 5),
            base44.entities.PlayerJournalEntry.filter({ character_id }, '-created_date', 3)
        ]);

        if (!character) return Response.json({ error: 'Character not found' }, { status: 404 });

        // 2. Determine Locked Skills
        const unlockedIds = new Set(characterSkills.map(cs => cs.skill_id));
        const lockedSkills = skills.filter(s => !unlockedIds.has(s.id));
        
        // Filter to next logical tier (e.g. only Tier 1 if none, or Tier 2 if Tier 1 unlocked)
        // For simplicity, we just send all locked skills and let LLM pick 3 suitable ones.

        // 3. Prepare Prompt
        const choiceSummary = await Promise.all(choices.map(async c => {
            const choice = await base44.entities.Choice.filter({ id: c.choice_id });
            return choice.length > 0 ? choice[0].label : 'Unknown';
        }));

        const journalSummary = journals.map(j => `"${j.title}": ${j.content.substring(0, 50)}...`).join('\n');

        const prompt = `
            You are a Neural Skill Advisor for a Cyberpunk RPG.
            Analyze the player's playstyle and suggest the next best 3 skills to pursue.

            Character: ${character.name}
            Stats: Insight ${character.insight}, Care ${character.care}, Resolve ${character.resolve}, Integrity ${character.integrity}
            Energy: ${character.masculine_energy}M / ${character.feminine_energy}F
            
            Recent Choices: ${choiceSummary.join(', ') || "None"}
            Recent Journal Reflections:
            ${journalSummary || "None"}

            Available Skills (Subset):
            ${lockedSkills.slice(0, 20).map(s => `- ${s.name} (${s.category} Tier ${s.tier}): ${s.description}`).join('\n')}
            
            Analysis Task:
            1. Identify the player's "Vibe" (e.g., "Compassionate Protector", "Ruthless Analyst").
            2. Recommend 3 skills that fit this path or balance their weaknesses.
            3. Provide a short, in-character rationale.

            Output JSON:
            {
                "vibe_title": "String",
                "narrative": "String (2-3 sentences)",
                "recommended_skill_names": ["Skill Name 1", "Skill Name 2", "Skill Name 3"]
            }
        `;

        // 4. Invoke LLM
        const llmRes = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    vibe_title: { type: "string" },
                    narrative: { type: "string" },
                    recommended_skill_names: { type: "array", items: { type: "string" } }
                },
                required: ["vibe_title", "narrative", "recommended_skill_names"]
            }
        });

        // 5. Match names back to IDs for frontend
        const recommendations = llmRes.recommended_skill_names.map(name => {
            const skill = skills.find(s => s.name === name);
            return skill ? skill.id : null;
        }).filter(Boolean);

        return Response.json({
            analysis: {
                vibe: llmRes.vibe_title,
                narrative: llmRes.narrative,
                skill_ids: recommendations
            }
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});