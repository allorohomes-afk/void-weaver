import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const LEONARDO_API_KEY = Deno.env.get("Leonardo_Ai_API");

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!LEONARDO_API_KEY) {
            return Response.json({ error: 'Leonardo API Key not configured' }, { status: 500 });
        }

        const prompt = "A sleek, minimalist app logo for 'Void Weaver'. A stylized hexagonal portal or loom weaving digital light threads. 1980s anime sci-fi aesthetic, synthwave palette (deep slate, neon cyan, subtle magenta). Vector art, flat design, white background, high contrast, professional app icon style.";

        // 1. Initiate Generation
        const initResp = await fetch('https://cloud.leonardo.ai/api/rest/v1/generations', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'authorization': `Bearer ${LEONARDO_API_KEY}`
            },
            body: JSON.stringify({
                prompt: prompt,
                width: 1024,
                height: 1024,
                num_images: 1,
                alchemy: true,
                photoReal: false,
                presetStyle: "LEONARDO", // Using general style or omit for default
                modelId: "e316348f-c0c3-4d6a-9527-660c22dc9142" // Leonardo Phoenix
            })
        });

        if (!initResp.ok) {
            const err = await initResp.text();
            throw new Error(`Leonardo Init Failed: ${err}`);
        }

        const initData = await initResp.json();
        const generationId = initData.sdGenerationJob.generationId;

        // 2. Poll for Result
        let imageUrl = null;
        let attempts = 0;
        
        while (!imageUrl && attempts < 30) {
            await new Promise(r => setTimeout(r, 1000)); // Wait 1s
            attempts++;

            const pollResp = await fetch(`https://cloud.leonardo.ai/api/rest/v1/generations/${generationId}`, {
                method: 'GET',
                headers: {
                    'accept': 'application/json',
                    'authorization': `Bearer ${LEONARDO_API_KEY}`
                }
            });

            if (pollResp.ok) {
                const pollData = await pollResp.json();
                const generation = pollData.generations_by_pk;
                
                if (generation && generation.status === 'COMPLETE') {
                    imageUrl = generation.generated_images[0].url;
                } else if (generation && generation.status === 'FAILED') {
                    throw new Error("Generation Failed");
                }
            }
        }

        if (!imageUrl) {
            throw new Error("Generation timed out");
        }

        return Response.json({ url: imageUrl });

    } catch (error) {
        console.error("Logo generation error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});