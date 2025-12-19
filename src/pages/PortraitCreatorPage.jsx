import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Upload, User, ArrowLeft, Camera, Save, History, RotateCcw, X } from 'lucide-react';
import { getLeonardoStyle, generateCharacterPortraitFromPhoto } from '@/components/cinematicWorkflow';
import PortraitHistoryList from '@/components/character/PortraitHistoryList';

function ReferenceGallery({ characterId }) {
    const { data: refs, refetch } = useQuery({
        queryKey: ['charRefs', characterId],
        queryFn: async () => base44.entities.CharacterReferenceImage.filter({ character_id: characterId }),
        enabled: !!characterId
    });

    const uploadMutation = useMutation({
        mutationFn: async (file) => {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            await base44.entities.CharacterReferenceImage.create({
                character_id: characterId,
                image_url: file_url,
                image_type: 'pose'
            });
        },
        onSuccess: () => refetch()
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => base44.entities.CharacterReferenceImage.delete(id),
        onSuccess: () => refetch()
    });

    const handleUpload = (e) => {
        const file = e.target.files[0];
        if(file) uploadMutation.mutate(file);
    };

    return (
        <div className="flex flex-wrap justify-center gap-2">
            {refs?.map(ref => (
                <div key={ref.id} className="relative w-16 h-16 rounded border border-slate-700 overflow-hidden group">
                    <img src={ref.image_url} className="w-full h-full object-cover" />
                    <button 
                        onClick={() => deleteMutation.mutate(ref.id)}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 transition-opacity"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ))}
            <label className="w-16 h-16 rounded border border-dashed border-slate-700 flex items-center justify-center cursor-pointer hover:bg-slate-800 hover:border-slate-500 transition-colors">
                {uploadMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin text-slate-500"/> : <Upload className="w-4 h-4 text-slate-500" />}
                <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploadMutation.isPending} />
            </label>
        </div>
    );
}

export default function PortraitCreatorPage() {
  const [characterId, setCharacterId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);

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

  const handleManualPortraitUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Character.update(characterId, { portrait_url: file_url });
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
      const res = await generateCharacterPortraitFromPhoto(characterId);
      setPreviewUrl(res.portrait_url);
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleSavePortrait = async () => {
    if (!previewUrl) return;
    try {
        await base44.functions.invoke('saveCharacterPortrait', {
            character_id: characterId,
            portrait_url: previewUrl,
            notes: "Generated via Portrait Creator"
        });
        setPreviewUrl(null);
        refetch();
    } catch (err) {
        console.error("Failed to save portrait", err);
    }
  };

  const handleRevert = async (historyItem) => {
      try {
          await base44.functions.invoke('saveCharacterPortrait', {
              character_id: characterId,
              portrait_url: historyItem.portrait_url,
              notes: `Reverted to version from ${new Date(historyItem.created_date).toLocaleDateString()}`,
              reverted_from_id: historyItem.id
          });
          refetch();
          setHistoryOpen(false);
      } catch (err) {
          console.error("Revert failed", err);
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
                <p className="text-slate-400 text-sm">Upload a selfie or photo to use as a base for your Void Weaver.</p>
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
                        <span className="text-slate-500 text-sm">Main Reference</span>
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

            {/* Additional References Gallery */}
            <div className="space-y-2">
                <h3 className="text-sm font-medium text-slate-400 text-center">Additional Angles / Expressions</h3>
                <ReferenceGallery characterId={characterId} />
            </div>

            {uploading && <div className="text-center text-indigo-400">Uploading...</div>}

            <div className="border-t border-slate-800 pt-6 text-center space-y-4">
                <h2 className="text-xl text-white font-semibold">2. Generate Void Weaver Portrait</h2>
                <p className="text-slate-400 text-sm">Generate a cinematic portrait combining your photo with your Void Weaver traits.</p>
                
                <Button 
                    onClick={handleGenerate} 
                    disabled={generating}
                    className="w-full max-w-xs bg-indigo-600 hover:bg-indigo-700"
                >
                    {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <User className="mr-2 h-4 w-4" />}
                    {character.reference_photo_url ? 'Generate from Photo' : 'Generate from Description'}
                </Button>

                <div className="pt-4 flex flex-col items-center">
                    <div className="relative flex py-2 items-center w-full max-w-xs">
                        <div className="flex-grow border-t border-slate-700"></div>
                        <span className="flex-shrink mx-4 text-slate-500 text-xs">OR UPLOAD DIRECTLY</span>
                        <div className="flex-grow border-t border-slate-700"></div>
                    </div>
                    
                    <Button 
                        variant="outline"
                        onClick={() => document.getElementById('manual-portrait-upload').click()}
                        disabled={uploading}
                        className="w-full max-w-xs border-slate-700 text-slate-300 hover:bg-slate-800"
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Final Portrait
                    </Button>
                    <input 
                        id="manual-portrait-upload" 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleManualPortraitUpload}
                    />
                </div>
            </div>

            {(previewUrl || character.portrait_url) && (
                <div className="border-t border-slate-800 pt-6 text-center">
                     <h3 className="text-lg text-white font-medium mb-4">{previewUrl ? "Preview (Unsaved)" : "Current Portrait"}</h3>
                     <div className="w-64 h-64 mx-auto rounded-lg overflow-hidden border-2 border-indigo-500 shadow-2xl shadow-indigo-900/20 relative">
                        <img src={previewUrl || character.portrait_url} alt="Result" className="w-full h-full object-cover" />
                     </div>

                     {previewUrl && (
                        <div className="mt-4 flex justify-center gap-3">
                            <Button 
                                onClick={handleSavePortrait}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                Save New Portrait
                            </Button>
                            <Button 
                                variant="outline"
                                onClick={() => setPreviewUrl(null)}
                                className="border-slate-600 text-slate-300"
                            >
                                Discard
                            </Button>
                        </div>
                     )}

                     {!previewUrl && (
                         <div className="mt-4">
                            <Button
                                variant="ghost"
                                onClick={() => setHistoryOpen(!historyOpen)}
                                className="text-slate-400 hover:text-white"
                            >
                                <History className="w-4 h-4 mr-2" />
                                {historyOpen ? "Hide History" : "Portrait History"}
                            </Button>
                         </div>
                     )}
                </div>
            )}
            
            {historyOpen && <PortraitHistoryList characterId={characterId} onRevert={handleRevert} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}