
import React, { useState, useRef } from 'react';
import { ImageAspectRatio, ImageGenConfig, ImageEditConfig, GenerationStatus } from '../types';
import { Image as ImageIcon, Sparkles, Upload, Loader2, Download, Wand2, X } from 'lucide-react';

interface ImageStudioProps {
  onGenerateImage: (config: ImageGenConfig) => Promise<void>;
  onEditImage: (config: ImageEditConfig) => Promise<void>;
  status: GenerationStatus;
  resultImage: string | null;
}

const ImageStudio: React.FC<ImageStudioProps> = ({ onGenerateImage, onEditImage, status, resultImage }) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'edit'>('generate');
  
  // Generate State
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<ImageAspectRatio>('1:1');

  // Edit State
  const [editPrompt, setEditPrompt] = useState('');
  const [editImageFile, setEditImageFile] = useState<{data: string, mimeType: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBusy = status === 'generating' || status === 'checking-auth';

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        setEditImageFile({
            data: base64Data,
            mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateClick = () => {
    if (!prompt.trim()) return;
    onGenerateImage({ prompt, aspectRatio });
  };

  const handleEditClick = () => {
    if (!editPrompt.trim() || !editImageFile) return;
    onEditImage({ 
      image: editImageFile.data, 
      mimeType: editImageFile.mimeType, 
      prompt: editPrompt 
    });
  };

  const aspectRatios: ImageAspectRatio[] = ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'];

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
       {/* Header Tabs */}
       <div className="flex border-b border-slate-800 bg-slate-950">
          <button 
             onClick={() => setActiveTab('generate')}
             className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                 activeTab === 'generate' ? 'text-white border-b-2 border-indigo-500 bg-slate-900' : 'text-slate-500 hover:text-slate-300'
             }`}
          >
              <Sparkles size={16} /> Generate
          </button>
          <button 
             onClick={() => setActiveTab('edit')}
             className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                 activeTab === 'edit' ? 'text-white border-b-2 border-indigo-500 bg-slate-900' : 'text-slate-500 hover:text-slate-300'
             }`}
          >
              <Wand2 size={16} /> Edit
          </button>
       </div>

       {/* Content */}
       <div className="flex-1 overflow-y-auto p-6 custom-scrollbar flex flex-col gap-6">
           
           {/* Generate Tab */}
           {activeTab === 'generate' && (
               <div className="space-y-6">
                   <div className="space-y-2">
                       <label className="text-xs font-semibold text-slate-500 uppercase">Prompt</label>
                       <textarea
                           value={prompt}
                           onChange={(e) => setPrompt(e.target.value)}
                           placeholder="Describe the image you want to create..."
                           className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 min-h-[100px] resize-none"
                       />
                   </div>
                   
                   <div className="space-y-2">
                       <label className="text-xs font-semibold text-slate-500 uppercase">Aspect Ratio</label>
                       <div className="grid grid-cols-4 gap-2">
                           {aspectRatios.map((ratio) => (
                               <button
                                   key={ratio}
                                   onClick={() => setAspectRatio(ratio)}
                                   className={`py-2 text-xs rounded border transition-all ${
                                       aspectRatio === ratio 
                                         ? 'bg-indigo-600 border-indigo-500 text-white' 
                                         : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                                   }`}
                               >
                                   {ratio}
                               </button>
                           ))}
                       </div>
                   </div>

                   <button
                        onClick={handleGenerateClick}
                        disabled={isBusy || !prompt.trim()}
                        className={`w-full py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                            isBusy || !prompt.trim()
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-500/20'
                        }`}
                   >
                       {isBusy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                       {status === 'generating' ? 'Generating...' : 'Generate Image'}
                   </button>

                   <div className="text-center">
                        <span className="text-xs text-slate-500">Powered by Gemini 3 Pro Image</span>
                   </div>
               </div>
           )}

           {/* Edit Tab */}
           {activeTab === 'edit' && (
               <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-xs font-semibold text-slate-500 uppercase">Source Image</label>
                       {editImageFile ? (
                           <div className="relative rounded-lg overflow-hidden border border-slate-700 bg-slate-950 group">
                               <img 
                                 src={`data:${editImageFile.mimeType};base64,${editImageFile.data}`} 
                                 alt="Source" 
                                 className="w-full h-48 object-contain"
                               />
                               <button 
                                 onClick={() => setEditImageFile(null)}
                                 className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-rose-500 transition-colors"
                               >
                                   <X size={14} />
                               </button>
                           </div>
                       ) : (
                           <div 
                               onClick={() => fileInputRef.current?.click()}
                               className="h-32 border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center text-slate-500 hover:bg-slate-800/30 hover:border-slate-500 cursor-pointer transition-all"
                           >
                               <Upload size={24} className="mb-2 opacity-50" />
                               <span className="text-xs">Click to upload image to edit</span>
                           </div>
                       )}
                       <input 
                           type="file" 
                           ref={fileInputRef} 
                           onChange={handleFileUpload} 
                           className="hidden" 
                           accept="image/*"
                       />
                    </div>

                    <div className="space-y-2">
                       <label className="text-xs font-semibold text-slate-500 uppercase">Edit Instruction</label>
                       <textarea
                           value={editPrompt}
                           onChange={(e) => setEditPrompt(e.target.value)}
                           placeholder="E.g., Add a retro filter, remove the background..."
                           className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 min-h-[80px] resize-none"
                       />
                    </div>

                    <button
                        onClick={handleEditClick}
                        disabled={isBusy || !editPrompt.trim() || !editImageFile}
                        className={`w-full py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                            isBusy || !editPrompt.trim() || !editImageFile
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              : 'bg-indigo-600 text-white hover:bg-indigo-500'
                        }`}
                   >
                       {isBusy ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                       {status === 'generating' ? 'Editing...' : 'Edit Image'}
                   </button>
                   
                   <div className="text-center">
                        <span className="text-xs text-slate-500">Powered by Gemini 2.5 Flash Image</span>
                   </div>
               </div>
           )}

           {/* Result Area */}
           {resultImage && status === 'completed' && (
               <div className="mt-4 pt-6 border-t border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <div className="flex items-center justify-between mb-2">
                       <h3 className="text-sm font-semibold text-white">Result</h3>
                       <a 
                         href={resultImage} 
                         download={`adgen_image_${Date.now()}.png`} 
                         className="text-xs flex items-center gap-1 text-emerald-400 hover:text-emerald-300"
                       >
                           <Download size={14} /> Download
                       </a>
                   </div>
                   <div className="rounded-lg overflow-hidden border border-slate-700 bg-black shadow-lg">
                       <img src={resultImage} alt="Generated" className="w-full h-auto" />
                   </div>
               </div>
           )}
       </div>
    </div>
  );
};

export default ImageStudio;
