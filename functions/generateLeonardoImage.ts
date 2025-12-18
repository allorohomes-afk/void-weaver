import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const LEONARDO_API_KEY = Deno.env.get("Leonardo_Ai_API");

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        if (!LEONARDO_API_KEY) return Response.json({ error: 'Leonardo API Key not configured' }, { status: 500 });

        const { prompt, width = 1024, height = 768, init_image_url } = await req.json();

        if (!prompt) return Response.json({ error: 'Missing prompt' }, { status: 400 });

        let controlnets = [];
        
        // --- 1. Upload Init Image (if provided) ---
        if (init_image_url) {
            try {
                // A. Get Presigned URL
                const ext = init_image_url.split('.').pop().split('?')[0] || 'jpg';
                const initResp = await fetch('https://cloud.leonardo.ai/api/rest/v1/init_image', {
                    method: 'POST',
                    headers: {
                        'accept': 'application/json',
                        'content-type': 'application/json',
                        'authorization': `Bearer ${LEONARDO_API_KEY}`
                    },
                    body: JSON.stringify({ extension: ext })
                });

                if (initResp.ok) {
                    const initData = await initResp.json();
                    const uploadData = initData.uploadInitImage;

                    // B. Fetch Image Data
                    const imgResp = await fetch(init_image_url);
                    if (imgResp.ok) {
                        const imgBlob = await imgResp.blob();

                        // C. Upload to S3
                        // Note: Leonardo S3 fields need to be handled if provided, but usually it's a PUT to 'url' 
                        // or POST to 'url' with fields.
                        // The API returns 'url' and 'fields' (stringified JSON).
                        // If 'fields' is present, it's a POST with FormData.
                        
                        if (uploadData.fields) {
                            const fields = JSON.parse(uploadData.fields);
                            const formData = new FormData();
                            Object.entries(fields).forEach(([k, v]) => formData.append(k, v));
                            formData.append('file', imgBlob);
                            
                            await fetch(uploadData.url, {
                                method: 'POST',
                                body: formData
                            });
                        } else {
                            // Simple PUT
                            await fetch(uploadData.url, {
                                method: 'PUT',
                                body: imgBlob
                            });
                        }

                        // D. Add to ControlNets (Character Reference)
                        controlnets.push({
                            initImageId: uploadData.id,
                            preprocessorId: 133, // Character Reference
                            strengthType: "High"
                        });
                    }
                }
            } catch (err) {
                console.error("Failed to process init_image_url:", err);
                // Continue without reference if upload fails
            }
        }

        // --- 2. Generate ---
        const payload = {
            prompt: prompt,
            width: width,
            height: height,
            num_images: 1,
            alchemy: true,
            photoReal: false,
            presetStyle: "DYNAMIC",
            modelId: "e316348f-c0c3-4d6a-9527-660c22dc9142", // Phoenix
            controlnets: controlnets.length > 0 ? controlnets : undefined
        };

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
            const err = await genResp.text();
            throw new Error(`Leonardo Gen Failed: ${err}`);
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
                else if (job && job.status === 'FAILED') throw new Error("Generation Failed");
            }
        }

        if (!imageUrl) throw new Error("Timeout");

        return Response.json({ url: imageUrl });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});