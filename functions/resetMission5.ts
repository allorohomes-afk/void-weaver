import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default async function handler(req) {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { character_id } = await req.json();
        if (!character_id) return Response.json({ error: 'Missing character_id' }, { status: 400 });

        // 1. Find all Mission 5 Scenes
        // We fetch all scenes and filter in memory since startswith might not be supported in filter
        const allScenes = await base44.entities.Scene.list();
        const missionScenes = allScenes.filter(s => s.key && s.key.startsWith('mission5_'));
        const missionSceneIds = missionScenes.map(s => s.id);

        if (missionSceneIds.length === 0) {
            return Response.json({ error: 'Mission 5 scenes not found' }, { status: 404 });
        }

        // 2. Delete Choice History for these scenes
        const history = await base44.entities.ChoiceHistory.filter({ character_id });
        const historyToDelete = history.filter(h => missionSceneIds.includes(h.scene_id));

        for (const h of historyToDelete) {
            await base44.entities.ChoiceHistory.delete(h.id);
        }

        // 3. Reset Character to Entry
        const entryScene = missionScenes.find(s => s.key === 'mission5_entry');
        if (entryScene) {
            await base44.entities.Character.update(character_id, {
                current_scene_id: entryScene.id
            });
        }

        return Response.json({ 
            status: 'success', 
            message: `Reset complete. Deleted ${historyToDelete.length} history records.`,
            entry_scene_id: entryScene?.id 
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}