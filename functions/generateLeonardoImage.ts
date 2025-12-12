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

        // Parse input
        const { prompt, width = 1024, height = 768, init_image_url } = await req.json();

        if (!prompt) {
            return Response.json({ error: 'Missing prompt' }, { status: 400 });
        }

        // Prepare payload
        const payload = {
            prompt: prompt,
            width: width,
            height: height,
            num_images: 1,
            alchemy: true,
            photoReal: false,
            presetStyle: "DYNAMIC", // Good for anime/cinematic
            modelId: "e316348f-c0c3-4d6a-9527-660c22dc9142", // Leonardo Phoenix
            contrastRatio: 0.5,
        };

        // Note: Leonardo API 'controlNet' or 'imagePrompts' for Character Reference usually requires
        // uploading the image first to get an ID. 
        // For this implementation, we will stick to Text-to-Image with the detailed prompt
        // unless we implement the full upload flow. 
        // However, if we wanted to do simple Image-to-Image (init strength), we could use 'init_image_id'
        // but that also requires upload.
        // For now, we rely on the prompt's descriptive power and the Phoenix model.

        // 1. Initiate Generation
        const initResp = await fetch('https://cloud.leonardo.ai/api/rest/v1/generations', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'authorization': `Bearer ${LEONARDO_API_KEY}`
            },
            body: JSON.stringify(payload)
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
        
        while (!imageUrl && attempts < 45) { // 45 seconds timeout
            await new Promise(r => setTimeout(r, 1000));
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
        console.error("Leonardo generation error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});