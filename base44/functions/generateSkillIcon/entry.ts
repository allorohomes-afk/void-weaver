import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { skill_id } = await req.json();
        if (!skill_id) return Response.json({ error: 'Missing skill_id' }, { status: 400 });

        // 1. Fetch Skill
        const skills = await base44.entities.Skill.filter({ id: skill_id });
        if (skills.length === 0) return Response.json({ error: 'Skill not found' }, { status: 404 });
        const skill = skills[0];

        // 2. Build Prompt
        const prompt = `
            Subject: Icon for RPG Skill "${skill.name}"
            Category: ${skill.category}
            Tier: ${skill.tier}
            Context: ${skill.description}
            
            Style: Minimalist symbolic icon, metallic trim, soft lanternlight highlights, fantasy-military aesthetic, elegant geometric forms, deep blue and silver palette.
            Format: Icon, centered, dark background or transparent if possible.
            Quality: High detail, sharp lines.
        `;

        // 3. Generate Image
        const imageRes = await base44.integrations.Core.GenerateImage({ prompt });
        
        // 4. Update Skill
        await base44.entities.Skill.update(skill.id, {
            icon_url: imageRes.url
        });

        return Response.json({ 
            status: 'success', 
            icon_url: imageRes.url 
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});