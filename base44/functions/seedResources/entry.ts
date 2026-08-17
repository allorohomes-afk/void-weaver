import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const resources = [
            {
                name: "Scrap Electronics",
                description: "Salvaged circuit boards and wiring. Useful for repairs.",
                category: "raw_material",
                rarity: "common",
                sustainability_score: 8,
                icon_name: "Cpu"
            },
            {
                name: "Filtered Water",
                description: "Clean water, a precious commodity in the Undercity.",
                category: "sustenance",
                rarity: "common",
                sustainability_score: 10,
                icon_name: "Droplets"
            },
            {
                name: "Encrypted Data Shard",
                description: "Contains unknown info. Valuable to information brokers.",
                category: "data_shard",
                rarity: "uncommon",
                sustainability_score: 5,
                icon_name: "FileCode"
            },
            {
                name: "Bio-Mesh Bandage",
                description: "Advanced first-aid material. Biodegradable.",
                category: "biological",
                rarity: "uncommon",
                sustainability_score: 9,
                icon_name: "Bandage"
            },
            {
                name: "High-Capacity Battery",
                description: "Power source for tech. Often looted from corporate drones.",
                category: "tech_component",
                rarity: "rare",
                sustainability_score: 3,
                icon_name: "BatteryCharging"
            },
            {
                name: "Heirloom Seeds",
                description: "Seeds from before the collapse. Potentially life-saving.",
                category: "biological",
                rarity: "legendary",
                sustainability_score: 10,
                icon_name: "Sprout"
            }
        ];

        let createdCount = 0;
        for (const res of resources) {
            const existing = await base44.entities.Resource.filter({ name: res.name });
            if (existing.length === 0) {
                await base44.entities.Resource.create(res);
                createdCount++;
            }
        }

        return Response.json({ status: 'success', created: createdCount });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});