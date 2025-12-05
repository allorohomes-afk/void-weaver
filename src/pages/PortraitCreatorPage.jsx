import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Upload, User, ArrowLeft, Camera } from 'lucide-react';
import { getLeonardoStyle, generateCharacterPortraitFromPhoto } from '@/components/cinematicWorkflow';

export default function PortraitCreatorPage() {
  const [characterId, setCharacterId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const id = sessionStorage.getItem('selectedCharacterId');
    if (id) setCharacterId(id);
  }, []);

  const { data: character, refetch } = useQuery({
    queryKey: ['character', characterId],
    queryFn: async () => {
        const res = await base44.entities.Character.filter({ id: characterId });
        return res[0];
    },
    enabled: !!characterId
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Character.update(characterId, { reference_photo_url: file_url });
      refetch();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateCharacterPortraitFromPhoto(characterId);
      refetch();
    } catch (err) {
        console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  if (!character) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-8">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white">Portrait Creator</h1>
            <Button variant="ghost" className="text-slate-400" onClick={() => window.history.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
        </div>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6 space-y-6">
            <div className="text-center space-y-2">
                <h2 className="text-xl text-white font-semibold">1. Upload Reference Photo</h2>
                <p className="text-slate-400 text-sm">Upload a selfie or photo to use as a base for your Warden.</p>
            </div>

            <div className="flex justify-center">
                {character.reference_photo_url ? (
                    <div className="relative w-48 h-48 rounded-lg overflow-hidden border-2 border-slate-700">
                        <img src={character.reference_photo_url} alt="Ref" className="w-full h-full object-cover" />
                        <Button 
                            size="icon" 
                            variant="secondary" 
                            className="absolute top-2 right-2 h-8 w-8"
                            onClick={() => document.getElementById('file-upload').click()}
                        >
                            <Upload className="h-4 w-4" />
                        </Button>
                    </div>
                ) : (
                    <div 
                        onClick={() => document.getElementById('file-upload').click()}
                        className="w-48 h-48 rounded-lg border-2 border-dashed border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-slate-800/50 transition-colors"
                    >
                        <Camera className="h-8 w-8 text-slate-500 mb-2" />
                        <span className="text-slate-500 text-sm">Click to Upload</span>
                    </div>
                )}
                <input 
                    id="file-upload" 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleFileUpload}
                />
            </div>

            {uploading && <div className="text-center text-indigo-400">Uploading...</div>}

            <div className="border-t border-slate-800 pt-6 text-center space-y-4">
                <h2 className="text-xl text-white font-semibold">2. Generate Warden Portrait</h2>
                <p className="text-slate-400 text-sm">Generate a cinematic portrait combining your photo with your character traits.</p>
                
                <Button 
                    onClick={handleGenerate} 
                    disabled={generating || !character.reference_photo_url}
                    className="w-full max-w-xs bg-indigo-600 hover:bg-indigo-700"
                >
                    {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <User className="mr-2 h-4 w-4" />}
                    Generate Portrait
                </Button>
            </div>

            {character.portrait_url && (
                <div className="border-t border-slate-800 pt-6 text-center">
                     <h3 className="text-lg text-white font-medium mb-4">Result</h3>
                     <div className="w-64 h-64 mx-auto rounded-lg overflow-hidden border-2 border-indigo-500 shadow-2xl shadow-indigo-900/20">
                        <img src={character.portrait_url} alt="Result" className="w-full h-full object-cover" />
                     </div>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}