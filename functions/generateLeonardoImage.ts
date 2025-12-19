import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const LEONARDO_API_KEY = Deno.env.get("Leonardo_Ai_API");

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        
        // Debugging API Key (Safety check)
        if (!LEONARDO_API_KEY) {
            console.error("Leonardo API Key is missing from environment variables");
            return Response.json({ error: 'Configuration Error: Leonardo_Ai_API secret is missing' }, { status: 500 });
        }

        const payload = {
            prompt: prompt,
            width: width,
            height: height,
            num_images: 1,
            modelId: "ac614f96-1082-45bf-be9d-757f2d31c174", // DreamShaper v7
            controlnets: controlnets.length > 0 ? controlnets : undefined,
            init_image_id: initImageIdForGuidance || undefined, // Use DALL-E image as base
            init_strength: initImageIdForGuidance ? 0.35 : undefined // Low strength to allow style change but keep comp
        };

        // --- 2. Generate (Standard Configuration) ---
        // Using DreamShaper v7 for reliability if Phoenix/Alchemy is causing issues
        const payload = {
            prompt: prompt,
            width: width,
            height: height,
            num_images: 1,
            // alchemy: true, // Disabled to ensure compatibility
            // presetStyle: "DYNAMIC", // Disabled
            modelId: "ac614f96-1082-45bf-be9d-757f2d31c174", // DreamShaper v7
            controlnets: controlnets.length > 0 ? controlnets : undefined
        };

        console.log("Sending generation request to Leonardo AI...");
        const genResp = await fetch('https://cloud.leonardo.ai/api/rest/v1/generations', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'authorization': `Bearer ${LEONARDO_API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        if (!genResp.ok) {
            const errText = await genResp.text();
            console.error("Leonardo Generation Failed:", errText);
            return Response.json({ error: `Leonardo API Error: ${genResp.status} - ${errText}` }, { status: 500 });
        }

        const genData = await genResp.json();
        const generationId = genData.sdGenerationJob.generationId;

        // --- 3. Poll ---
        let imageUrl = null;
        let attempts = 0;
        while (!imageUrl && attempts < 60) {
            await new Promise(r => setTimeout(r, 1000));
            attempts++;
            const pollResp = await fetch(`https://cloud.leonardo.ai/api/rest/v1/generations/${generationId}`, {
                method: 'GET',
                headers: { 'authorization': `Bearer ${LEONARDO_API_KEY}` }
            });
            if (pollResp.ok) {
                const pollData = await pollResp.json();
                const job = pollData.generations_by_pk;
                if (job && job.status === 'COMPLETE') imageUrl = job.generated_images[0].url;
                else if (job && job.status === 'FAILED') {
                    console.error("Job status FAILED");
                    return Response.json({ error: "Leonardo Generation Job Failed" }, { status: 500 });
                }
            }
        }

        if (!imageUrl) return Response.json({ error: "Generation timed out" }, { status: 504 });

        return Response.json({ url: imageUrl });

    } catch (error) {
        console.error("Function Handler Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});