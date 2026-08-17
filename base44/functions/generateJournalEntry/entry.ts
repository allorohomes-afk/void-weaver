import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { character_id } = await req.json();

        // 1. Fetch Context
        const [character, history, scene] = await Promise.all([
            base44.entities.Character.filter({ id: character_id }).then(r => r[0]),
            base44.entities.ChoiceHistory.filter({ character_id }, '-created_date', 3),
            base44.entities.Character.filter({ id: character_id }).then(async c => {
                 if(c[0].current_scene_id) {
                     const s = await base44.entities.Scene.filter({ id: c[0].current_scene_id });
                     return s[0];
                 }
                 return null;
            })
        ]);

        if (!character) return Response.json({ error: 'Character not found' }, { status: 404 });

        // 2. Prepare Prompt
        const historyContext = await Promise.all(history.map(async h => {
             const c = await base44.entities.Choice.filter({ id: h.choice_id });
             return c.length > 0 ? `Chose "${c[0].label}"` : 'Unknown choice';
        }));

        const prompt = `
            Write a personal journal entry for a Cyberpunk RPG character.
            
            Character: ${character.name}
            Archetype/Vibe: ${character.face_vibe || 'Determined'}
            Current Emotional State: ${character.emotional_state || 'Neutral'}
            Stats: Insight ${character.insight}, Care ${character.care}
            
            Recent Events:
            - Location: ${scene ? scene.title : 'Unknown'}
            - Recent Choices: ${historyContext.join(', ')}
            
            Instructions:
            - First person perspective ("I...").
            - Reflect on the recent choices and how they felt.
            - If "Care" is high, focus on people/feelings.
            - If "Insight" is high, focus on patterns/truth.
            - Keep it gritty, authentic, and under 150 words.
            - Provide a Title and a Mood Tag.
            
            Output JSON:
            {
                "title": "Short poetic title",
                "content": "The journal text...",
                "mood_tag": "Melancholic" | "Determined" | "Anxious" | "Peaceful" | "Angry",
                "reflection_depth": 1-10
            }
        `;

        // 3. Generate
        const llmRes = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    content: { type: "string" },
                    mood_tag: { type: "string" },
                    reflection_depth: { type: "integer" }
                },
                required: ["title", "content", "mood_tag"]
            }
        });

        // 4. Save
        const entry = await base44.entities.PlayerJournalEntry.create({
            character_id: character.id,
            scene_id: character.current_scene_id,
            title: llmRes.title,
            content: llmRes.content,
            mood_tag: llmRes.mood_tag,
            reflection_depth: llmRes.reflection_depth || 5
        });

        return Response.json({ entry });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});