import { base44 } from '@/api/base44Client';

export const getLeonardoStyle = () => {
  return `Leonardo Art Style Preset: “Warden Saga — Cinematic Grounded Art”
• Realistic rendering
• Soft dramatic lighting
• Muted, unified color palette (cool greys, deep blues, warm browns)
• Painterly texture with subtle brushwork
• Cinematic composition
• Medium contrast
• Slight bloom on highlights
• Sharp eyes, expressive faces
• Soft background depth of field
• No anime, no cartoon, no over-stylized proportions
• Clothing and uniforms remain consistent with provided descriptions
• Characters appear grounded, human, emotionally readable
• Minimal fantasy exaggeration
• Moody atmosphere consistent with a “moral RPG”`;
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
  const outfitStyle = character.outfit_style || 'field';
  const uniformDescriptions = {
    field: "Dark charcoal longcoat with a subtle sigil on the chest, reinforced shoulders, simple utility belt, dark trousers and boots.",
    ceremonial: "Deep-blue formal coat with polished metal insignia, refined silhouette, ceremonial trim, polished boots.",
    covert: "Slate-grey fitted jacket with muted insignia, light armor panels, shorter tactical coat, dark boots and simple gloves."
  };
  const uniformDesc = uniformDescriptions[outfitStyle];

  const roleDescriptions = {
      protector: "The Warden's posture is calm and grounded, slightly between the aggressor and the vulnerable person, hands visible and non-threatening, expression focused and protective.",
      mediator: "The Warden stands with open posture, facing both parties, hands slightly raised in a calming gesture, expression attentive and steady.",
      supporter: "The Warden stays close to the vulnerable person, posture soft but present, attention focused on their well-being.",
      bystander: "The Warden hangs back at the edge of the scene, observing, not physically intervening.",
      aggressor: "The Warden's posture is tense and confrontational, leaning forward, body language assertive or threatening."
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
    ? `Use this reference portrait of the Warden to keep their face and uniform consistent: ${character.portrait_url}. Do not significantly change their appearance — only adjust pose, lighting, and background.` 
    : `Visuals: ${character.character_visual_prompt}. Keep the Warden’s facial features and uniform design consistent with the description.`;

  // 6. Ask LLM for prompt
  const llmResponse = await base44.integrations.Core.InvokeLLM({
    prompt: `
      I need a video generation prompt for a cinematic clip.
      
      CONTEXT:
      Character: ${character.name}
      Uniform: ${uniformDesc}
      Role/Posture: ${roleDesc}
      
      Scene: ${scene.title}
      Setting: ${scene.body_text}
      Aggressor Presence: ${aggressorDesc}
      Vulnerable Presence: ${vulnerableDesc}
      
      INSTRUCTIONS:
      Create a video-friendly prompt that summarizes:
      - Who is present visually (Warden + NPCs)
      - Where the camera is
      - What the key action is
      - Emotional tone
      
      ${referenceInstruction}
      
      CRITICAL ROLE INSTRUCTION:
      Under no circumstances should the Warden be depicted as the aggressor unless the Role/Posture explicitly says so. If the Warden is a protector or mediator, show them de-escalating, not attacking.
      
      STYLE:
      "Cinematic, grounded, realistic lighting, muted palette, steady camera, filmic quality. Warden Saga style."
      
      Output ONLY the prompt string.
    `
  });

  return {
    video_prompt: llmResponse,
    outfit_used: outfitStyle
  };
};

export const prepareSceneCinematic = async (characterId, sceneId) => {
  // 1. Check existing
  const existing = await base44.entities.SceneCinematics.filter({
    scene_id: sceneId,
    character_id: characterId 
  });

  if (existing.length > 0) {
    return {
      video_url: existing[0].video_url,
      audio_url: existing[0].audio_url
    };
  }

  // 2. Build prompt
  const { video_prompt } = await buildCinematicPrompt(characterId, sceneId);

  // 3. Generate "Video" (Cinematic Frame)
  const videoRes = await base44.integrations.Core.GenerateImage({ prompt: video_prompt });

  // 4. Create Record
  await base44.entities.SceneCinematics.create({
    scene_id: sceneId,
    character_id: characterId,
    video_url: videoRes.url,
    audio_url: null,
    prompt_used: video_prompt
  });

  return {
    video_url: videoRes.url,
    audio_url: null
  };
};

export const generateCharacterPortraitFromPhoto = async (characterId) => {
  const characters = await base44.entities.Character.filter({ id: characterId });
  const character = characters[0];

  if (!character.reference_photo_url) {
     const prompt = `${character.character_visual_prompt}. ${getLeonardoStyle()}`;
     const res = await base44.integrations.Core.GenerateImage({ prompt });
     
     await base44.entities.Character.update(characterId, { portrait_url: res.url });
     return { ...character, portrait_url: res.url };
  }

  const uniformDescriptions = {
    field: "Dark charcoal longcoat with a subtle sigil on the chest, reinforced shoulders, simple utility belt, dark trousers and boots.",
    ceremonial: "Deep-blue formal coat with polished metal insignia, refined silhouette, ceremonial trim, polished boots.",
    covert: "Slate-grey fitted jacket with muted insignia, light armor panels, shorter tactical coat, dark boots and simple gloves."
  };
  const uniformDesc = uniformDescriptions[character.outfit_style] || uniformDescriptions.field;

  const i2iPrompt = `
    Use the reference photo as the base.
    Keep core facial features, skin tone, and general proportions.
    Transform into a Warden from "Warden Saga".
    Outfit: ${uniformDesc}
    Visuals: ${character.character_visual_prompt}.
    Style: ${getLeonardoStyle()}
  `;
  
  const res = await base44.integrations.Core.GenerateImage({ 
    prompt: i2iPrompt 
  });

  // DO NOT auto-save. Return the URL for preview.
  return { ...character, portrait_url: res.url, isPreview: true };
};