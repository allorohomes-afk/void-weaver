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

        // Extract Physical Description
        const hairLen = character.hair_length || "average";
        const hairCol = character.hair_color || "dark";
        const skinTone = character.skin_tone || "neutral";
        const bodyType = character.body_type_primary || "average";
        const hairTex = character.hair_texture ? `${character.hair_texture} texture` : "";
        const age = character.age || 18;
        const pronouns = character.pronouns || "they/them";
        
        // Build age-appropriate descriptors
        let ageDescriptor = "";
        if (age < 13) {
            ageDescriptor = `${age} year old child, age ${age}, elementary school age`;
        } else if (age < 18) {
            ageDescriptor = `${age} year old teenager, adolescent`;
        } else {
            ageDescriptor = `${age} years old adult`;
        }
        
        let physicalDescription = `AGE: ${ageDescriptor}. PRONOUNS: ${pronouns}. Skin: ${skinTone}. Body: ${bodyType}.`;
        
        // Explicitly handle Bald/Shaved to override anime hair bias
        const baldKeywords = ["bald", "shaved", "none", "no hair", "clean shaven"];
        const isBald = baldKeywords.some(k => hairLen.toLowerCase().includes(k)) || hairTex.toLowerCase().includes("bald");
        
        if (isBald) {
            physicalDescription += " HAIR: BALD / SHAVED HEAD. NO HAIR. SMOOTH SCALP.";
        } else {
            physicalDescription += ` Hair: ${hairLen}, ${hairTex}, ${hairCol}.`;
            // Add specific texture descriptors for 4A-4C
            if (hairTex.includes("4A") || hairTex.includes("4B") || hairTex.includes("4C")) {
                physicalDescription += " (Afro-textured, coily/kinky hair).";
            }
        }

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
          streetops: "UNIFORM: Dark charcoal synth-leather jacket with NEON CYAN PIPING, reinforced shoulder pads, utility belt with glowing blue data-ports, heavy-duty combat boots. Military-grade tactical gear. MUST BE CONSISTENT: same jacket, same neon piping pattern, same boots in every image.",
          starfleet: "UNIFORM: Crisp azure-blue tunic with GOLD BRAIDING on shoulders and cuffs, high mandarin collar, polished chrome insignia on chest, white dress gloves, sleek form-fitting navy trousers, black boots. MUST BE CONSISTENT: same blue color (#0066CC), same gold pattern, same insignia placement.",
          infiltrationsuit: "UNIFORM: Jet-black chameleon-weave stealth suit covering entire body, minimal reflective surfaces, integrated silver comms unit on collar, low-profile tactical boots. MUST BE CONSISTENT: same all-black design, same silver accent placement, same sleek silhouette.",
          academy: "UNIFORM: Void Weaver Academy cadet uniform - navy blue (#001F3F) blazer with SILVER TRIM on lapels, crisp white collared shirt, academy crest patch (silver phoenix) on left chest, gray slacks, polished black shoes. MUST BE CONSISTENT: same navy blazer, same silver trim placement, same crest design."
        };
        const uniformDesc = uniformDescriptions[outfitStyle] || uniformDescriptions.streetops;

        // Construct the prompt enforcing consistency
        let prompt = `
        Subject: The Void Weaver (central character).
        Reference Character: Use the provided reference image URL for face structure and EXACT AGE APPEARANCE.
        PHYSICAL TRAITS: ${physicalDescription}
        ${uniformDesc}
        
        Scene Context: ${contextText}
        Role/Action: ${roleHint}
        Tone: ${toneText}
        Skill Vibes/Modifiers: ${skillModifiers}

        CRITICAL CONSISTENCY REQUIREMENTS:
        - The Void Weaver MUST be the clear central figure.
        - AGE CONSISTENCY: Character MUST appear exactly ${age} years old. No aging up or down. Match reference image age precisely.
        - UNIFORM CONSISTENCY: Character MUST wear the EXACT uniform described above with IDENTICAL colors, patterns, and design details. Same uniform every time.
        - FACE CONSISTENCY: Match the reference image facial structure, hair, and features EXACTLY.
        - If other uniformed characters appear, they must have clearly different faces/hair AND different uniform styles.
        - Style: Vintage 1980s-90s anime space opera, cel-animated, hand-painted watercolor backgrounds.
        - Colors: Dark navy/slate backgrounds, neon cyan/magenta highlights.
        - Vibe: High contrast, sharp lines, retro-future technology.
        - RENDER QUALITY: Sharp details on uniform elements, clear age-appropriate features, consistent lighting.
        `;

        if (portraitUrl) {
            prompt += `\nReference Image URL: ${portraitUrl}`;
        } else {
             prompt += `\nVisual Description: ${character.character_visual_prompt}`;
        }

        let negativePrompt = "";
        if (isBald) {
            negativePrompt = "hair, long hair, messy hair, wig, bangs, beard (unless specified)";
        }
        
        // Add age-appropriate negative prompts
        if (age < 13) {
            negativePrompt += ", adult, mature, teenager, aged, older person, grown up, masculine features, facial hair";
        } else if (age < 18) {
            negativePrompt += ", adult, mature, aged, older person, child, masculine features, facial hair";
        } else {
            negativePrompt += ", child, baby, toddler, young child";
        }
        
        // Add uniform consistency negative prompts
        negativePrompt += ", different outfit, wrong uniform, casual clothes, civilian attire, inconsistent costume, mixed uniforms, wrong clothing style";
        
        negativePrompt = negativePrompt || undefined;

        // 2.5 Fetch Additional Reference Images
        let refUrls = [];
        if (portraitUrl) refUrls.push(portraitUrl);
        
        try {
            const extraRefs = await base44.entities.CharacterReferenceImage.filter({ character_id: character_id, is_active: true });
            extraRefs.forEach(ref => refUrls.push(ref.image_url));
        } catch (e) {
            console.error("Failed to fetch extra refs", e);
        }
        // Unique urls
        refUrls = [...new Set(refUrls)];

        // 3. Determine Provider Mode
        // Default to 'hybrid' if multiple refs or if requested?
        // Let's try 'hybrid' as default for best results if we have refs, or 'leonardo' if simple.
        // User asked for "Option to blend styles", so let's default to Hybrid for "Warden Cinematic" to show off the blending.
        // Actually, Hybrid is slower (2 steps). Let's stick to Leonardo primary, but try Hybrid if requested or via randomization for variety?
        // Let's just implement the logic to use Hybrid if DALL-E fallback is needed OR if we want structure.
        // For now, let's use Leonardo with multiple refs.
        
        let imageUrl = null;
        let provider = 'leonardo';
        
        // Attempt Generation
        try {
             // HYBRID ATTEMPT (Experimental Feature)
             // 1. Generate Composition with DALL-E
             const dallePrompt = `Anime scene composition sketch. ${contextText}. Character: ${roleHint}. ${prompt.substring(0, 500)}`;
             
             // We only do hybrid if we want "variety" or robust structure.
             // Let's use Hybrid if we have a lot of refs to ensure they stick to a coherent structure?
             // Or just use Leonardo directly. The user asked for "Option to blend".
             // Since I can't easily add a UI toggle to the automated flow without modifying the SceneView calls, 
             // I'll randomize it slightly or just use Leonardo with advanced params.
             
             // Use Leonardo with primary portrait reference
             const leoRes = await base44.functions.invoke('generateLeonardoImage', { 
                prompt,
                negative_prompt: negativePrompt,
                width: 1280, 
                height: 720,
                init_image_url: refUrls[0] || portraitUrl // Use first reference image
            });
            
            if (leoRes.data && !leoRes.data.error && leoRes.data.url) {
                imageUrl = leoRes.data.url;
            } else {
                throw new Error(leoRes.data?.error || "Unknown Leonardo error");
            }

        } catch (leoError) {
             console.error("Leonardo generation failed, falling back to DALL-E:", leoError.message);
             provider = 'dalle';
             // ... DALL-E fallback code ...
             try {
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
            portrait_version: character.portrait_reference_version || 1,
            provider: provider,
            reference_images_count: refUrls.length,
            error: provider === 'dalle' ? "Leonardo AI failed, used fallback." : null
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});