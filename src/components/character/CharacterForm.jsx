import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, UserPlus, Loader2, Sparkles, Upload, Camera } from 'lucide-react';
import { base44 } from "@/api/base44Client";
import { getLeonardoStyle } from '@/components/cinematicWorkflow';
import { toast } from "sonner";

export default function CharacterForm({ onSubmit, onCancel, isCreating, initialData }) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    pronouns: initialData?.pronouns || '',
    skin_tone: initialData?.skin_tone || '',
    body_type_primary: initialData?.body_type_primary || '',
    body_type_secondary: initialData?.body_type_secondary || '',
    hair_length: initialData?.hair_length || '',
    hair_texture: initialData?.hair_texture || '',
    hair_color: initialData?.hair_color || '',
    eye_color: initialData?.eye_color || '',
    gender_presentation: initialData?.gender_presentation || '',
    age_range: initialData?.age_range || '',
    face_vibe: initialData?.face_vibe || '',
    outfit_style: initialData?.outfit_style || 'streetops',
    reference_photo_url: initialData?.reference_photo_url || ''
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [generatedPortrait, setGeneratedPortrait] = useState(initialData?.portrait_url || null);
  const [generationPrompt, setGenerationPrompt] = useState(initialData?.character_visual_prompt || '');

  const bodyTypes = ["Lean", "Average", "Broad", "Soft", "Stocky", "Tall", "Short", "Curvy", "Athletic"];
  
  const uniformDescriptions = {
    streetops: "Dark charcoal synth-leather jacket with neon piping, reinforced shoulder pads, utility belt with glowing data-ports, and heavy-duty combat boots. Think 80s anime space marine.",
    starfleet: "Crisp, azure-blue tunic with gold braiding, high collar, polished chrome insignia, white gloves, and sleek, form-fitting trousers. Inspired by classic sci-fi captains.",
    infiltrationsuit: "Jet-black chameleon-weave stealth suit, minimal reflective surfaces, integrated comms unit, and low-profile tactical boots. Sleek, sharp, and designed for shadows."
  };

  const handleBodyTypeToggle = (type) => {
    if (formData.body_type_primary === type) {
      setFormData({ ...formData, body_type_primary: formData.body_type_secondary, body_type_secondary: '' });
    } else if (formData.body_type_secondary === type) {
      setFormData({ ...formData, body_type_secondary: '' });
    } else if (!formData.body_type_primary) {
      setFormData({ ...formData, body_type_primary: type });
    } else if (!formData.body_type_secondary) {
      setFormData({ ...formData, body_type_secondary: type });
    }
  };

  const buildCharacterVisualPrompt = (data) => {
    const bodyDescription = data.body_type_secondary 
      ? `${data.body_type_primary} and ${data.body_type_secondary}`
      : data.body_type_primary;
    
    const uniformDesc = uniformDescriptions[data.outfit_style];

    return `A cinematic portrait of a Void Weaver with ${data.skin_tone} skin, ${data.eye_color ? `${data.eye_color} eyes, ` : ''}${bodyDescription} build, ${data.hair_length} ${data.hair_texture} ${data.hair_color} hair, ${data.face_vibe} expression, ${data.age_range}, ${data.gender_presentation} style, wearing the ${uniformDesc}. Realistic, grounded lighting.`;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, reference_photo_url: file_url }));
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const generateCharacterPortrait = async () => {
    setIsGenerating(true);
    try {
      let prompt;
      let result;

      if (formData.reference_photo_url) {
         const uniformDesc = uniformDescriptions[formData.outfit_style];
         prompt = `
            Use the reference photo as the base.
            Keep core facial features, skin tone, and general proportions.
            Transform into a Void Weaver.
            Outfit: ${uniformDesc}
            Visuals: ${buildCharacterVisualPrompt(formData)}.
            Style: ${getLeonardoStyle()}
            Ref: ${formData.reference_photo_url}
          `;
      } else {
         prompt = buildCharacterVisualPrompt(formData);
      }
      
      setGenerationPrompt(prompt);
      
      result = await base44.integrations.Core.GenerateImage({
        prompt: prompt
      });
      
      setGeneratedPortrait(result.url);
      return { url: result.url, prompt };
    } catch (error) {
      console.error("Generation failed:", error);
      toast.error("Failed to generate portrait");
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
        toast.error("Character name is required");
        return;
    }

    // First generate portrait if not already done
    let portraitUrl = generatedPortrait;
    let prompt = generationPrompt;

    if (!portraitUrl) {
      const result = await generateCharacterPortrait();
      if (result) {
        portraitUrl = result.url;
        prompt = result.prompt;
      }
    }

    // Then submit everything
    onSubmit({
      ...formData,
      pronouns: formData.pronouns.trim() || 'they/them',
      character_visual_prompt: prompt,
      portrait_url: portraitUrl
    });
  };

  const isFormValid = formData.name && formData.skin_tone && formData.body_type_primary && 
                     formData.hair_color && formData.age_range && formData.face_vibe;

  return (
    <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 max-h-[80vh] overflow-y-auto flex flex-col">
      <CardHeader className="border-b border-slate-700 sticky top-0 bg-slate-900/95 backdrop-blur z-20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">{initialData ? 'Edit Character' : 'Create New Character'}</CardTitle>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onCancel}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-8 overflow-visible">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Identity Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white border-b border-slate-700 pb-2">Identity</h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-slate-300">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                  placeholder="Character Name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pronouns" className="text-slate-300">Pronouns</Label>
                <Input
                  id="pronouns"
                  value={formData.pronouns}
                  onChange={(e) => setFormData({...formData, pronouns: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                  placeholder="they/them"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="age" className="text-slate-300">Age Range</Label>
                <Input
                  id="age"
                  placeholder="e.g. late 20s, mid 40s"
                  value={formData.age_range}
                  onChange={(e) => setFormData({...formData, age_range: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
               <div className="space-y-1.5">
                <Label htmlFor="gender" className="text-slate-300">Gender Presentation</Label>
                <Input
                  id="gender"
                  placeholder="e.g. androgynous, masculine"
                  value={formData.gender_presentation}
                  onChange={(e) => setFormData({...formData, gender_presentation: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>
          </div>

          {/* Appearance Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white border-b border-slate-700 pb-2">Appearance</h3>
            
            <div className="space-y-2">
              <Label className="text-slate-300">Body Type (Select up to 2)</Label>
              <div className="flex flex-wrap gap-2">
                {bodyTypes.map(type => {
                  const isSelected = formData.body_type_primary === type || formData.body_type_secondary === type;
                  return (
                    <Button
                      key={type}
                      type="button"
                      size="sm"
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => handleBodyTypeToggle(type)}
                      className={isSelected 
                        ? "bg-indigo-600 hover:bg-indigo-700 border-indigo-600" 
                        : "border-slate-600 text-slate-300 hover:bg-slate-800"}
                    >
                      {type}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="skin" className="text-slate-300">Skin Tone</Label>
                <Input
                  id="skin"
                  value={formData.skin_tone}
                  onChange={(e) => setFormData({...formData, skin_tone: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vibe" className="text-slate-300">Face Vibe</Label>
                <Input
                  id="vibe"
                  placeholder="e.g. stoic, weary"
                  value={formData.face_vibe}
                  onChange={(e) => setFormData({...formData, face_vibe: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                 <Label htmlFor="hairlen" className="text-slate-300">Hair Length</Label>
                 <Input
                  id="hairlen"
                  value={formData.hair_length}
                  onChange={(e) => setFormData({...formData, hair_length: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                 />
              </div>
              <div className="space-y-1.5">
                 <Label htmlFor="hairtex" className="text-slate-300">Hair Texture</Label>
                 <Input
                  id="hairtex"
                  value={formData.hair_texture}
                  onChange={(e) => setFormData({...formData, hair_texture: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                 />
              </div>
              <div className="space-y-1.5">
                 <Label htmlFor="haircol" className="text-slate-300">Hair Color</Label>
                 <Input
                  id="haircol"
                  value={formData.hair_color}
                  onChange={(e) => setFormData({...formData, hair_color: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                 />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                  <Label htmlFor="eyecol" className="text-slate-300">Eye Color</Label>
                  <Input
                   id="eyecol"
                   value={formData.eye_color}
                   onChange={(e) => setFormData({...formData, eye_color: e.target.value})}
                   className="bg-slate-900 border-slate-700 text-white"
                  />
               </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-700">
          <h3 className="text-lg font-medium text-white">Void Weaver Uniform</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['streetops', 'starfleet', 'infiltrationsuit'].map((style) => (
              <div 
                key={style}
                onClick={() => setFormData({...formData, outfit_style: style})}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  formData.outfit_style === style 
                    ? 'bg-indigo-900/40 border-indigo-500 ring-1 ring-indigo-500' 
                    : 'bg-slate-800 border-slate-600 hover:border-slate-500'
                }`}
              >
                <div className="font-medium text-white capitalize mb-1">{style}</div>
                <div className="text-xs text-slate-400 leading-relaxed">
                  {uniformDescriptions[style]}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reference Photo Upload */}
        <div className="space-y-4 pt-4 border-t border-slate-700">
           <h3 className="text-lg font-medium text-white">Visual Reference (Optional)</h3>
           <div className="flex items-center gap-4">
              {formData.reference_photo_url ? (
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-600">
                      <img src={formData.reference_photo_url} alt="Ref" className="w-full h-full object-cover" />
                      <Button
                          size="icon"
                          variant="secondary"
                          className="absolute top-1 right-1 h-6 w-6 bg-slate-900/80 hover:bg-slate-900"
                          onClick={() => setFormData({...formData, reference_photo_url: ''})}
                      >
                          <X className="h-3 w-3 text-white" />
                      </Button>
                  </div>
              ) : (
                  <div 
                      onClick={() => document.getElementById('form-file-upload').click()}
                      className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-slate-800/50 transition-colors"
                  >
                      {isUploading ? <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" /> : <Camera className="h-6 w-6 text-slate-500" />}
                  </div>
              )}
              <div className="flex-1">
                  <p className="text-sm text-slate-400 mb-2">Upload a selfie or reference photo to personalize the generation.</p>
                  <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => document.getElementById('form-file-upload').click()}
                      disabled={isUploading}
                      className="border-slate-600 text-slate-300"
                  >
                      <Upload className="w-4 h-4 mr-2" />
                      {isUploading ? 'Uploading...' : 'Upload Photo'}
                  </Button>
                  <input 
                      id="form-file-upload" 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleFileUpload}
                  />
              </div>
           </div>
        </div>

        {/* Preview Section */}
        {generatedPortrait && (
          <div className="mt-6 p-4 bg-slate-950/50 rounded-lg border border-slate-800 text-center">
            <h3 className="text-slate-300 mb-3 text-sm uppercase tracking-wide">Visual Confirmation</h3>
            <div className="relative w-64 h-64 mx-auto rounded-lg overflow-hidden shadow-2xl border border-slate-700">
               <img src={generatedPortrait} alt="Character Portrait" className="w-full h-full object-cover" />
            </div>
            <p className="text-slate-500 text-xs mt-3 italic px-8">{generationPrompt}</p>
          </div>
        )}

        <div className="flex gap-3 pt-6">
          <Button 
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </Button>
          
          <Button 
            type="button"
            onClick={generateCharacterPortrait}
            disabled={!isFormValid || isGenerating}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                {generatedPortrait ? 'Regenerate' : 'Generate'}
              </>
            )}
          </Button>

          {generatedPortrait && (
             <Button 
              type="submit"
              onClick={handleSubmit}
              disabled={isCreating || isGenerating}
              className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {isCreating ? 'Saving...' : (initialData ? 'Update Character' : 'Confirm & Create')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}