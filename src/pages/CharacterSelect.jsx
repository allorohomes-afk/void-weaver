import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { UserPlus, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import CharacterCard from '../components/character/CharacterCard';
import CharacterForm from '../components/character/CharacterForm';

export default function CharacterSelect() {
  const [showForm, setShowForm] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [bgUrl, setBgUrl] = useState(localStorage.getItem('character_select_bg_url'));
  const [isGeneratingBg, setIsGeneratingBg] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const getUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    getUser();
  }, []);

  const { data: characters, isLoading } = useQuery({
    queryKey: ['characters', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.Character.filter({ user_id: currentUser.id }, '-created_date');
    },
    enabled: !!currentUser,
    initialData: []
  });

  const createCharacterMutation = useMutation({
    mutationFn: async (characterData) => {
      // Fetch default start scene
      let startSceneId = null;
      try {
        const scenes = await base44.entities.Scene.filter({ key: 'first_watch_start' });
        if (scenes.length > 0) startSceneId = scenes[0].id;
      } catch (e) {
        console.error("Failed to fetch start scene", e);
      }

      return await base44.entities.Character.create({
        ...characterData,
        user_id: currentUser.id,
        presence: 0,
        insight: 0,
        resolve: 0,
        integrity: 0,
        care: 0,
        masculine_energy: 50,
        feminine_energy: 50,
        fear_freeze: 0,
        retaliation_risk: 0,
        current_scene_id: startSceneId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters'] });
      setShowForm(false);
    }
  });

  const updateCharacterMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.Character.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters'] });
      setShowForm(false);
      setEditingCharacter(null);
    }
  });

  const deleteCharacterMutation = useMutation({
    mutationFn: async (characterId) => {
      return await base44.entities.Character.delete(characterId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters'] });
    }
  });

  const handleDelete = (character) => {
    if (window.confirm(`Are you sure you want to delete ${character.name}? This cannot be undone.`)) {
      deleteCharacterMutation.mutate(character.id);
    }
  };

  const handlePlay = (characterId) => {
    sessionStorage.setItem('selectedCharacterId', characterId);
    window.location.href = '/SceneView';
  };

  const handlePortrait = (characterId) => {
    sessionStorage.setItem('selectedCharacterId', characterId);
    window.location.href = '/PortraitCreatorPage';
  };

  const handleCreateCharacter = (data) => {
    if (editingCharacter) {
      updateCharacterMutation.mutate({ id: editingCharacter.id, data });
    } else {
      createCharacterMutation.mutate(data);
    }
  };

  const handleEdit = (character) => {
    setEditingCharacter(character);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCharacter(null);
  };

  const generateBackground = async () => {
    if (!confirm("Generate a new AI background? This uses credits.")) return;
    
    setIsGeneratingBg(true);
    try {
        const res = await base44.functions.invoke('generateLeonardoImage', {
            prompt: "Futuristic high-tech character creation interface background, cyberpunk laboratory, data streams, neon blue and purple lighting, dark atmosphere, depth of field, 8k resolution, cinematic, highly detailed, sci-fi interior, wide angle",
            width: 1472,
            height: 832
        });
        
        if (res.data.url) {
            setBgUrl(res.data.url);
            localStorage.setItem('character_select_bg_url', res.data.url);
            toast.success("New background generated!");
        } else {
            throw new Error(res.data.error || "Generation failed");
        }
    } catch (error) {
        console.error(error);
        toast.error("Failed to generate background");
    } finally {
        setIsGeneratingBg(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#020617] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
    }

    return (
    <div 
        className="min-h-screen bg-cover bg-center bg-fixed p-6 relative transition-all duration-1000"
        style={{
            backgroundImage: bgUrl ? `linear-gradient(rgba(2, 6, 23, 0.85), rgba(15, 23, 42, 0.9)), url(${bgUrl})` : undefined,
            backgroundColor: !bgUrl ? '#020617' : undefined
        }}
    >
      {/* Fallback gradient if no image */}
      {!bgUrl && <div className="absolute inset-0 bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#020617] -z-10"></div>}

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 font-orbitron">Your Characters</h1>
            <p className="text-slate-300 font-rajdhani">Select a character to continue your journey</p>
          </div>
          
          <Button
            onClick={generateBackground}
            disabled={isGeneratingBg}
            variant="ghost"
            size="sm"
            className="text-slate-500 hover:text-cyan-400 hover:bg-slate-900/50"
            title="Generate New Background Theme"
          >
            {isGeneratingBg ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
          </Button>
        </div>

        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="mb-6 bg-slate-900 border border-cyan-500 text-cyan-400 hover:bg-cyan-950 hover:text-cyan-100 hover:shadow-[0_0_20px_rgba(14,165,233,0.5)] hover:border-cyan-300 transition-all duration-300 uppercase tracking-widest font-bold shadow-[0_0_10px_rgba(14,165,233,0.1)] relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(14,165,233,0.1)_50%,transparent_75%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[length:250%_250%] animate-shimmer" />
            <UserPlus className="w-5 h-5 mr-2" />
            Create New Character
          </Button>
        )}

        {showForm && (
          <div className="mb-6">
            <CharacterForm
              initialData={editingCharacter}
              onSubmit={handleCreateCharacter}
              onCancel={handleCancel}
              isCreating={createCharacterMutation.isPending || updateCharacterMutation.isPending}
            />
          </div>
        )}

        {isLoading ? (
          <div className="text-white text-center py-12">Loading characters...</div>
        ) : characters.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg mb-4">No characters yet</p>
            <p className="text-slate-500">Create your first character to begin</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {characters.map((character) => (
              <CharacterCard
                key={character.id}
                character={character}
                onPlay={handlePlay}
                onEdit={handleEdit}
                onPortrait={handlePortrait}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}