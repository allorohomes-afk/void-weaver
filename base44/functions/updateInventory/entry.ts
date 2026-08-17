import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { character_id, resource_id, delta, acquisition_method } = await req.json();
        // delta: +1, -1, +5, etc.

        // 1. Fetch Character limits
        const [characters, inventory] = await Promise.all([
            base44.entities.Character.filter({ id: character_id }),
            base44.entities.CharacterInventory.filter({ character_id })
        ]);

        if (characters.length === 0) return Response.json({ error: 'Character not found' }, { status: 404 });
        const character = characters[0];
        const maxSlots = character.max_inventory_slots || 10;

        // 2. Check current stock of this item
        const existingItem = inventory.find(i => i.resource_id === resource_id);
        const currentQty = existingItem ? existingItem.quantity : 0;
        const newQty = currentQty + delta;

        if (newQty < 0) {
            return Response.json({ error: 'Insufficient quantity' }, { status: 400 });
        }

        // 3. Check Slot Limits (if adding new item type)
        if (!existingItem && delta > 0) {
            if (inventory.length >= maxSlots) {
                return Response.json({ 
                    error: 'Inventory Full', 
                    message: `Cannot carry more than ${maxSlots} distinct types of resources. Consider bartering or gifting items.` 
                }, { status: 400 });
            }
        }

        // 4. Update DB
        if (newQty === 0 && existingItem) {
            // Remove item completely
            await base44.entities.CharacterInventory.delete(existingItem.id);
        } else if (existingItem) {
            // Update quantity
            await base44.entities.CharacterInventory.update(existingItem.id, {
                quantity: newQty
            });
        } else {
            // Create new entry
            await base44.entities.CharacterInventory.create({
                character_id,
                resource_id,
                quantity: newQty,
                acquired_via: acquisition_method || 'scavenge'
            });
        }

        return Response.json({ status: 'success', new_quantity: newQty });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});