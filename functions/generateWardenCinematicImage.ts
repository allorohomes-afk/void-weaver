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
        const outfitStyle = character.outfit_style || 'streetops';
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
          streetops: "Dark charcoal synth-leather jacket with neon piping, reinforced shoulder pads, utility belt with glowing data-ports, and heavy-duty combat boots. Think 80s anime space marine.",
          starfleet: "Crisp, azure-blue tunic with gold braiding, high collar, polished chrome insignia, white gloves, and sleek, form-fitting trousers. Inspired by classic sci-fi captains.",
          infiltrationsuit: "Jet-black chameleon-weave stealth suit, minimal reflective surfaces, integrated comms unit, and low-profile tactical boots. Sleek, sharp, and designed for shadows."
        };
        const uniformDesc = uniformDescriptions[outfitStyle] || uniformDescriptions.streetops;

        // Construct the prompt enforcing consistency
        let prompt = `
        Subject: The Void Weaver (central character).
        Reference Character: Use the provided reference image URL for face, skin tone, age, and head shape.
        Outfit: ${uniformDesc}
        
        Scene Context: ${contextText}
        Role/Action: ${roleHint}
        Tone: ${toneText}
        Skill Vibes/Modifiers: ${skillModifiers}

        CRITICAL INSTRUCTIONS:
        - The Void Weaver MUST be the clear central figure.
        - The Void Weaver MUST match the reference image face and the described uniform.
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

        // 3. Call GenerateImage (Try Leonardo -> Fallback to DALL-E)
        let imageUrl = null;
        
        try {
            const leoRes = await base44.functions.invoke('generateLeonardoImage', { 
                prompt,
                width: 1280, // Cinematic aspect
                height: 720
            });
            
            if (leoRes.data && !leoRes.data.error && leoRes.data.url) {
                imageUrl = leoRes.data.url;
            } else {
                throw new Error(leoRes.data?.error || "Unknown Leonardo error");
            }
        } catch (leoError) {
            console.error("Leonardo generation failed, falling back to DALL-E:", leoError.message);
            
            try {
                // Fallback to DALL-E
                const dalleRes = await base44.integrations.Core.GenerateImage({
                    prompt: prompt + " Anime style, cinematic, high quality, 1980s retro anime aesthetic." 
                });
                imageUrl = dalleRes.url;
            } catch (dalleError) {
                console.error("DALL-E generation failed:", dalleError);
                throw new Error("All image generation methods failed. Visual systems offline.");
            }
        }

        return Response.json({ 
            image_url: imageUrl,
            portrait_version: character.portrait_reference_version || 1
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});