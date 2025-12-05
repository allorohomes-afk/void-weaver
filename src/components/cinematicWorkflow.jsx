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

  // 3. Decide outfit
  const outfitUsed = character.outfit_style;

  // 4. Ask LLM for prompt
  const llmResponse = await base44.integrations.Core.InvokeLLM({
    prompt: `
      I need a video generation prompt for a cinematic clip.
      
      Context:
      Character: ${character.name}
      Visuals: ${character.character_visual_prompt || 'A generic Warden'}
      Outfit: ${outfitUsed}
      
      Scene: ${scene.title}
      Setting: ${scene.body_text}
      
      Task:
      Create a video-friendly prompt that summarizes:
      - Who is present visually
      - Where the camera is
      - What the key action is
      - Emotional tone
      
      Incorporate a simplified version of the character's visuals (skin, hair, build, age, gender, uniform) and the scene environment.
      
      Use this style note: "Cinematic, grounded, realistic lighting, muted palette, steady camera, filmic quality."
      
      Output ONLY the prompt string.
    `
  });

  return {
    video_prompt: llmResponse,
    outfit_used: outfitUsed
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

  const i2iPrompt = `
    Use the reference photo as the base.
    Keep core facial features, skin tone, and general proportions.
    Transform into a Warden from "Warden Saga".
    Outfit: ${character.outfit_style} uniform.
    Visuals: ${character.character_visual_prompt}.
    Style: ${getLeonardoStyle()}
  `;
  
  const res = await base44.integrations.Core.GenerateImage({ 
    prompt: i2iPrompt 
  });

  await base44.entities.Character.update(characterId, { portrait_url: res.url });
  return { ...character, portrait_url: res.url };
};