import { base44 } from '@/api/base44Client';

export const getLeonardoStyle = () => {
  return `Style: Vintage 1980s-90s anime space opera, cel-animated with hand-painted watercolor backgrounds. 
Color Palette: Dark, deep navy and slate backgrounds (#020617, #0f172a), accented with vibrant neon cyan (#0ea5e9), electric blue, amber, and occasional magenta/red highlights. 
Mood: Optimistic, clean, and sleek, evoking classic sci-fi with a nostalgic, analog feel. 
Technique: High contrast, crisp lines, subtle film grain, flat cel shading for artistic elements, and glowing borders/digital display aesthetics for UI components. 
Elements: Incorporates HUD overlays, scanlines, grid patterns, subtle glow effects, sharp edges, and geometric panel designs. 
Avoids modern CGI or 3D rendering; maintains a hand-drawn, 2D illustrative quality.`;
};

export const buildCinematicPrompt = async (characterId, sceneId) => {
  // 1. Fetch Character
  const characters = await base44.entities.Character.filter({ id: characterId });
  const character = characters[0];

  // 2. Fetch Scene
  const scenes = await base44.entities.Scene.filter({ id: sceneId });
  const scene = scenes[0];

  // 3. Fetch Last Choice (to determine role)
  // We look for the most recent reaction node for this character to find the choice
  let visualRoleHint = "neutral";
  if (character.recent_reaction_node_id) {
      const reactions = await base44.entities.ReactionNode.filter({ id: character.recent_reaction_node_id });
      if (reactions.length > 0) {
          const choices = await base44.entities.Choice.filter({ id: reactions[0].choice_id });
          if (choices.length > 0 && choices[0].visual_role_hint) {
              visualRoleHint = choices[0].visual_role_hint;
          }
      }
  }

  // 4. Decide outfit & role description
  const outfitStyle = character.outfit_style || 'streetops';
  const uniformDescriptions = {
    streetops: "Dark charcoal synth-leather jacket with neon piping, reinforced shoulder pads, utility belt with glowing data-ports, and heavy-duty combat boots. Think 80s anime space marine.",
    starfleet: "Crisp, azure-blue tunic with gold braiding, high collar, polished chrome insignia, white gloves, and sleek, form-fitting trousers. Inspired by classic sci-fi captains.",
    infiltrationsuit: "Jet-black chameleon-weave stealth suit, minimal reflective surfaces, integrated comms unit, and low-profile tactical boots. Sleek, sharp, and designed for shadows."
  };
  const uniformDesc = uniformDescriptions[outfitStyle] || uniformDescriptions.streetops;

  const roleDescriptions = {
      protector: "The Void Weaver's posture is calm and grounded, slightly between the aggressor and the vulnerable person, hands visible and non-threatening, expression focused and protective.",
      mediator: "The Void Weaver stands with open posture, facing both parties, hands slightly raised in a calming gesture, expression attentive and steady.",
      supporter: "The Void Weaver stays close to the vulnerable person, posture soft but present, attention focused on their well-being.",
      bystander: "The Void Weaver hangs back at the edge of the scene, observing, not physically intervening.",
      aggressor: "The Void Weaver's posture is tense and confrontational, leaning forward, body language assertive or threatening."
  };
  const roleDesc = roleDescriptions[visualRoleHint] || roleDescriptions.bystander;

  // 5. Determine Aggressor/Vulnerable descriptions
  const aggressorDesc = scene.aggressor_npc_key 
    ? `The aggressor NPC (${scene.aggressor_npc_key}) has dominant, intrusive, or threatening posture, leaning toward the vulnerable person.` 
    : "";
  const vulnerableDesc = scene.vulnerable_npc_key 
    ? `The vulnerable NPC (${scene.vulnerable_npc_key}) shows fear, exhaustion, flinching, or guardedness.` 
    : "";

  const referenceInstruction = character.portrait_url 
    ? `Use this reference portrait of the Void Weaver to keep their face and uniform consistent: ${character.portrait_url}. Do not significantly change their appearance — only adjust pose, lighting, and background.` 
    : `Visuals: ${character.character_visual_prompt}. Keep the Void Weaver’s facial features and uniform design consistent with the description.`;

  // 6. Ask LLM for prompt
  const llmResponse = await base44.integrations.Core.InvokeLLM({
    prompt: `
      I need a visual description for a cinematic scene.
      
      CONTEXT:
      Character Role/Posture: ${roleDesc}
      Scene: ${scene.title}
      Setting: ${scene.body_text}
      Aggressor Presence: ${aggressorDesc}
      Vulnerable Presence: ${vulnerableDesc}
      
      INSTRUCTIONS:
      Summarize the visual action:
      - Who is present
      - Key action / tension
      - Environment
      
      Output ONLY the description string.
    `
  });

  return {
    video_prompt: llmResponse,
    outfit_used: outfitStyle,
    visual_role_hint: visualRoleHint
  };
};

export const prepareSceneCinematic = async (characterId, sceneId) => {
    // 1. Fetch Character to check version
    const characters = await base44.entities.Character.filter({ id: characterId });
    const character = characters[0];
    const currentVersion = character.portrait_reference_version || 1;

    // 2. Check existing
    const existing = await base44.entities.SceneCinematics.filter({
        scene_id: sceneId,
        character_id: characterId 
    });

    if (existing.length > 0) {
        const record = existing[0];
        // Check for stale version
        if ((record.portrait_version || 0) === currentVersion) {
             return {
                video_url: record.video_url,
                audio_url: record.audio_url
             };
        }
        // If stale, we will regenerate below (and update/replace)
        await base44.entities.SceneCinematics.delete(record.id);
    }

    // 3. Build context
    const { video_prompt, visual_role_hint } = await buildCinematicPrompt(characterId, sceneId);

    // 4. Generate "Video" (Cinematic Frame) using Warden Helper
    let videoUrl = null;
    try {
        const imgRes = await base44.functions.invoke('generateWardenCinematicImage', {
            character_id: characterId,
            scene_context: video_prompt,
            visual_role_hint: visual_role_hint,
            tone: 'cinematic'
        });
        if (imgRes.data && imgRes.data.image_url) {
            videoUrl = imgRes.data.image_url;
        }
    } catch (err) {
        console.error("Warden image generation failed", err);
        return null; 
    }

    // 5. Create Record
    if (videoUrl) {
        await base44.entities.SceneCinematics.create({
            scene_id: sceneId,
            character_id: characterId,
            video_url: videoUrl,
            audio_url: null,
            prompt_used: video_prompt,
            portrait_version: currentVersion
        });
    }

    return {
        video_url: videoUrl,
        audio_url: null,
        fallback_used: imgRes.data?.fallback_used,
        fallback_reason: imgRes.data?.fallback_reason
    };
};

export const generateCharacterPortraitFromPhoto = async (characterId) => {
  const characters = await base44.entities.Character.filter({ id: characterId });
  const character = characters[0];

  let prompt = "";
  if (!character.reference_photo_url) {
     prompt = `${character.character_visual_prompt}. ${getLeonardoStyle()}`;
  } else {
      const uniformDescriptions = {
        streetops: "Dark charcoal synth-leather jacket with neon piping, reinforced shoulder pads, utility belt with glowing data-ports, and heavy-duty combat boots. Think 80s anime space marine.",
        starfleet: "Crisp, azure-blue tunic with gold braiding, high collar, polished chrome insignia, white gloves, and sleek, form-fitting trousers. Inspired by classic sci-fi captains.",
        infiltrationsuit: "Jet-black chameleon-weave stealth suit, minimal reflective surfaces, integrated comms unit, and low-profile tactical boots. Sleek, sharp, and designed for shadows."
      };
      const uniformDesc = uniformDescriptions[character.outfit_style] || uniformDescriptions.streetops;

      prompt = `
        Use the reference photo as the base.
        Keep core facial features, skin tone, and general proportions.
        Transform into a Void Weaver.
        Outfit: ${uniformDesc}
        Visuals: ${character.character_visual_prompt}.
        Style: ${getLeonardoStyle()}
      `;
  }

  // Use Leonardo backend function
  const res = await base44.functions.invoke('generateLeonardoImage', { 
    prompt: prompt,
    width: 768,
    height: 1024, // Portrait
    init_image_url: character.reference_photo_url
  });

  if (res.data.error) throw new Error(res.data.error);

  const newUrl = res.data.url;

  if (!character.reference_photo_url) {
     // Auto-save if no reference (first time gen)
     await base44.entities.Character.update(characterId, { portrait_url: newUrl });
     return { ...character, portrait_url: newUrl };
  }

  // DO NOT auto-save. Return the URL for preview.
  return { ...character, portrait_url: newUrl, isPreview: true };
};