import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { character_id, scene_context, visual_role_hint, tone } = await req.json();

        if (!character_id) {
            return Response.json({ error: 'Missing character_id' }, { status: 400 });
        }

        // 1. Fetch Character
        const characters = await base44.entities.Character.filter({ id: character_id });
        if (characters.length === 0) return Response.json({ error: 'Character not found' }, { status: 404 });
        const character = characters[0];

        // 2. Build Prompt
        const portraitUrl = character.portrait_url;
        const outfitStyle = character.outfit_style || 'field';
        const roleHint = visual_role_hint || 'neutral';
        const toneText = tone || 'cinematic';
        const contextText = scene_context || 'a scene in the city';

        // Fetch active skills for modifiers
        let skillModifiers = "";
        try {
            const charSkills = await base44.entities.CharacterSkill.filter({ character_id: character_id });
            if (charSkills.length > 0) {
                const allSkills = await base44.entities.Skill.list(); 
                const activeSkills = allSkills.filter(s => charSkills.some(cs => cs.skill_id === s.id && cs.active));
                skillModifiers = activeSkills
                    .map(s => s.cinematic_modifier)
                    .filter(Boolean)
                    .join(" ");
            }
        } catch (e) {
            console.error("Failed to fetch skill modifiers", e);
        }

        const uniformDescriptions = {
          field: "Dark charcoal longcoat with a subtle sigil on the chest, reinforced shoulders, simple utility belt, dark trousers and boots.",
          ceremonial: "Deep-blue formal coat with polished metal insignia, refined silhouette, ceremonial trim, polished boots.",
          covert: "Slate-grey fitted jacket with muted insignia, light armor panels, shorter tactical coat, dark boots and simple gloves."
        };
        const uniformDesc = uniformDescriptions[outfitStyle] || uniformDescriptions.field;

        // Construct the prompt enforcing consistency
        let prompt = `
        Subject: The Warden (central character).
        Reference Character: Use the provided reference image URL for face, skin tone, age, and head shape.
        Outfit: ${uniformDesc}
        
        Scene Context: ${contextText}
        Role/Action: ${roleHint}
        Tone: ${toneText}
        Skill Vibes/Modifiers: ${skillModifiers}

        CRITICAL INSTRUCTIONS:
        - The Warden MUST be the clear central figure.
        - The Warden MUST match the reference image face and the described uniform.
        - If other uniformed characters appear, they must have clearly different faces/hair.
        - Style: Vintage 1980s-90s anime space opera, cel-animated, hand-painted watercolor backgrounds.
        - Colors: Dark navy/slate backgrounds, neon cyan/magenta highlights.
        - Vibe: High contrast, sharp lines, retro-future technology.
        `;

        if (portraitUrl) {
            prompt += `\nReference Image URL: ${portraitUrl}`;
        } else {
             prompt += `\nVisual Description: ${character.character_visual_prompt}`;
        }

        // 3. Call GenerateImage
        const imageRes = await base44.integrations.Core.GenerateImage({ prompt });

        return Response.json({ 
            image_url: imageRes.url,
            portrait_version: character.portrait_reference_version || 1
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});