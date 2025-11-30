import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import CharacterCard from '../components/character/CharacterCard';
import CharacterForm from '../components/character/CharacterForm';

export default function CharacterSelect() {
  const [showForm, setShowForm] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
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
        current_scene_id: null
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

  const handlePlay = (characterId) => {
    sessionStorage.setItem('selectedCharacterId', characterId);
    window.location.href = '/SceneView';
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

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Your Characters</h1>
          <p className="text-slate-300">Select a character to continue your journey</p>
        </div>

        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="mb-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
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
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}