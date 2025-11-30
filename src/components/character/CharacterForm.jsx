import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, UserPlus, Loader2, Sparkles } from 'lucide-react';
import { base44 } from "@/api/base44Client";

export default function CharacterForm({ onSubmit, onCancel, isCreating }) {
  const [formData, setFormData] = useState({
    name: '',
    pronouns: '',
    skin_tone: '',
    body_type_primary: '',
    body_type_secondary: '',
    hair_length: '',
    hair_texture: '',
    hair_color: '',
    gender_presentation: '',
    age_range: '',
    face_vibe: '',
    outfit_style: 'field'
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPortrait, setGeneratedPortrait] = useState(null);
  const [generationPrompt, setGenerationPrompt] = useState('');

  const bodyTypes = ["Lean", "Average", "Broad", "Soft", "Stocky", "Tall", "Short", "Curvy", "Athletic"];
  
  const uniformDescriptions = {
    field: "dark charcoal longcoat, subtle sigil, reinforced shoulders, utility belt, boots",
    ceremonial: "deep-blue formal coat, polished insignia, refined silhouette",
    covert: "slate-grey fitted jacket, muted insignia, light armor panels"
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

    return `A cinematic portrait of a Warden with ${data.skin_tone} skin, ${bodyDescription} build, ${data.hair_length} ${data.hair_texture} ${data.hair_color} hair, ${data.face_vibe} expression, ${data.age_range}, ${data.gender_presentation} style, wearing the ${uniformDesc}. Realistic, grounded lighting.`;
  };

  const generateCharacterPortrait = async () => {
    setIsGenerating(true);
    try {
      const prompt = buildCharacterVisualPrompt(formData);
      setGenerationPrompt(prompt);
      
      const result = await base44.integrations.Core.GenerateImage({
        prompt: prompt
      });
      
      setGeneratedPortrait(result.url);
      return { url: result.url, prompt };
    } catch (error) {
      console.error("Generation failed:", error);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

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
    <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 max-h-[80vh] overflow-y-auto">
      <CardHeader className="border-b border-slate-700 sticky top-0 bg-slate-900/95 backdrop-blur z-10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">Create New Character</CardTitle>
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
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white border-b border-slate-700 pb-2">Identity</h3>
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-300">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pronouns" className="text-slate-300">Pronouns</Label>
              <Input
                id="pronouns"
                value={formData.pronouns}
                onChange={(e) => setFormData({...formData, pronouns: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="age" className="text-slate-300">Age Range</Label>
              <Input
                id="age"
                placeholder="e.g. late 20s, mid 40s"
                value={formData.age_range}
                onChange={(e) => setFormData({...formData, age_range: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>
             <div className="space-y-2">
              <Label htmlFor="gender" className="text-slate-300">Gender Presentation</Label>
              <Input
                id="gender"
                placeholder="e.g. androgynous, masculine, high femme"
                value={formData.gender_presentation}
                onChange={(e) => setFormData({...formData, gender_presentation: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>
          </div>

          {/* Appearance */}
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
              <div className="space-y-2">
                <Label htmlFor="skin" className="text-slate-300">Skin Tone</Label>
                <Input
                  id="skin"
                  value={formData.skin_tone}
                  onChange={(e) => setFormData({...formData, skin_tone: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vibe" className="text-slate-300">Face Vibe</Label>
                <Input
                  id="vibe"
                  placeholder="e.g. stoic, weary, sharp"
                  value={formData.face_vibe}
                  onChange={(e) => setFormData({...formData, face_vibe: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                 <Label htmlFor="hairlen" className="text-slate-300">Hair Length</Label>
                 <Input
                  id="hairlen"
                  value={formData.hair_length}
                  onChange={(e) => setFormData({...formData, hair_length: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                 />
              </div>
              <div className="space-y-2">
                 <Label htmlFor="hairtex" className="text-slate-300">Hair Texture</Label>
                 <Input
                  id="hairtex"
                  value={formData.hair_texture}
                  onChange={(e) => setFormData({...formData, hair_texture: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                 />
              </div>
              <div className="space-y-2">
                 <Label htmlFor="haircol" className="text-slate-300">Hair Color</Label>
                 <Input
                  id="haircol"
                  value={formData.hair_color}
                  onChange={(e) => setFormData({...formData, hair_color: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                 />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-700">
          <h3 className="text-lg font-medium text-white">Warden Uniform</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['field', 'ceremonial', 'covert'].map((style) => (
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
          
          {!generatedPortrait ? (
            <Button 
              type="button"
              onClick={generateCharacterPortrait}
              disabled={!isFormValid || isGenerating}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Portrait...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Portrait
                </>
              )}
            </Button>
          ) : (
             <Button 
              type="submit"
              disabled={isCreating || isGenerating}
              className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {isCreating ? 'Saving Character...' : 'Confirm & Create'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}