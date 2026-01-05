import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { text, character_id, npc_id, emotion, voice_id } = await req.json();

        if (!text) {
            return Response.json({ error: 'Text is required' }, { status: 400 });
        }

        // Fetch character or NPC data to get voice settings
        let voiceSettings = {
            voice_id: voice_id || '21m00Tcm4TlvDq8ikWAM', // Default Rachel voice
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true
        };

        if (character_id) {
            const chars = await base44.entities.Character.filter({ id: character_id });
            if (chars[0]?.voice_settings) {
                voiceSettings = { ...voiceSettings, ...chars[0].voice_settings };
            }
        } else if (npc_id) {
            const npcs = await base44.entities.NPC.filter({ id: npc_id });
            if (npcs[0]?.voice_settings) {
                voiceSettings = { ...voiceSettings, ...npcs[0].voice_settings };
            }
        }

        // Adjust style based on emotion
        const emotionStyles = {
            'Neutral': 0.0,
            'Vulnerable': 0.3,
            'Resilient': 0.6,
            'Empathetic': 0.4,
            'Guarded': 0.7,
            'Volatile': 0.9,
            'Hopeful': 0.5,
            'Despondent': 0.2
        };
        
        if (emotion && emotionStyles[emotion] !== undefined) {
            voiceSettings.style = emotionStyles[emotion];
        }

        // Call ElevenLabs API
        const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceSettings.voice_id}`,
            {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': apiKey
                },
                body: JSON.stringify({
                    text: text,
                    model_id: 'eleven_monolingual_v1',
                    voice_settings: {
                        stability: voiceSettings.stability,
                        similarity_boost: voiceSettings.similarity_boost,
                        style: voiceSettings.style,
                        use_speaker_boost: voiceSettings.use_speaker_boost
                    }
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ElevenLabs API error: ${errorText}`);
        }

        // Get audio data
        const audioData = await response.arrayBuffer();

        // Upload to Base44 storage
        const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
        const uploadRes = await base44.asServiceRole.integrations.Core.UploadFile({
            file: audioBlob
        });

        return Response.json({
            audio_url: uploadRes.file_url,
            text: text,
            emotion: emotion,
            voice_id: voiceSettings.voice_id
        });

    } catch (error) {
        console.error('Voice generation error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});