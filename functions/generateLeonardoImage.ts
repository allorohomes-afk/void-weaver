import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const LEONARDO_API_KEY = Deno.env.get("Leonardo_Ai_API");

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        
        if (!LEONARDO_API_KEY) {
            console.error("Leonardo API Key is missing");
            return Response.json({ error: 'Configuration Error: Leonardo_Ai_API secret is missing' }, { status: 500 });
        }

        const { 
            prompt, 
            width = 1024, 
            height = 768, 
            init_image_url, 
            negative_prompt,
            controlnets = [] 
        } = await req.json();

        if (!prompt) {
            return Response.json({ error: 'Prompt is required' }, { status: 400 });
        }

        let initImageId = undefined;

        // --- 1. Handle Init Image Upload if provided ---
        if (init_image_url) {
            console.log("Processing init image...", init_image_url);
            try {
                // A. Fetch the image data
                const imgResp = await fetch(init_image_url);
                if (!imgResp.ok) throw new Error("Failed to fetch reference image");
                const imgBlob = await imgResp.blob();
                const fileExt = init_image_url.split('.').pop().split('?')[0] || 'jpg';

                // B. Get Presigned URL from Leonardo
                const preResp = await fetch('https://cloud.leonardo.ai/api/rest/v1/init-image', {
                    method: 'POST',
                    headers: {
                        'accept': 'application/json',
                        'content-type': 'application/json',
                        'authorization': `Bearer ${LEONARDO_API_KEY}`
                    },
                    body: JSON.stringify({ extension: fileExt })
                });

                if (!preResp.ok) {
                    const err = await preResp.text();
                    console.error("Leonardo Init Image Error:", err);
                    // Continue without init image rather than failing? Or fail? 
                    // Let's fail so user knows why it didn't look like them.
                    throw new Error(`Leonardo Init Image Error: ${err}`);
                }

                const preData = await preResp.json();
                const uploadUrl = preData.uploadInitImage.url;
                const imageId = preData.uploadInitImage.id;
                const fields = preData.uploadInitImage.fields ? JSON.parse(preData.uploadInitImage.fields) : null;

                // C. Upload the image
                // Leonardo returns a presigned PUT url usually, or fields for POST.
                // Recent docs say it returns `url` and `fields`. If fields exist, it's a POST (S3).
                // If fields is null/empty, it might be a PUT.
                
                if (fields) {
                    // S3 Multipart POST
                    const formData = new FormData();
                    Object.entries(fields).forEach(([k, v]) => formData.append(k, v));
                    formData.append('file', imgBlob);
                    
                    const uploadResp = await fetch(uploadUrl, {
                        method: 'POST',
                        body: formData
                    });
                    if (!uploadResp.ok) throw new Error("Failed to upload image to Leonardo S3");
                } else {
                    // PUT
                    const uploadResp = await fetch(uploadUrl, {
                        method: 'PUT',
                        body: imgBlob
                    });
                     if (!uploadResp.ok) throw new Error("Failed to upload image to Leonardo via PUT");
                }

                initImageId = imageId;
                console.log("Init image uploaded successfully, ID:", initImageId);

            } catch (err) {
                console.error("Init Image processing failed:", err);
                // Return error to frontend so they can retry or remove image
                return Response.json({ error: `Failed to process reference image: ${err.message}` }, { status: 500 });
            }
        }

        // --- 2. Generate Image ---
        const payload = {
            prompt,
            negative_prompt,
            width,
            height,
            num_images: 1,
            modelId: "ac614f96-1082-45bf-be9d-757f2d31c174", // DreamShaper v7
            init_image_id: initImageId,
            init_strength: initImageId ? 0.35 : undefined, // Moderate strength to keep likeness
            controlnets: controlnets.length > 0 ? controlnets : undefined
        };

        console.log("Sending generation request...", { ...payload, prompt: prompt.substring(0, 50) + "..." });

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

        // --- 3. Poll for Completion ---
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
                
                if (job && job.status === 'COMPLETE') {
                    imageUrl = job.generated_images[0].url;
                } else if (job && job.status === 'FAILED') {
                    console.error("Job status FAILED");
                    return Response.json({ error: "Leonardo Generation Job Failed" }, { status: 500 });
                }
            }
        }

        if (!imageUrl) return Response.json({ error: "Generation timed out" }, { status: 504 });

        return Response.json({ url: imageUrl, prompt });

    } catch (error) {
        console.error("Handler Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});