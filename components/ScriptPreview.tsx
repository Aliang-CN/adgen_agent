import React, { useState } from 'react';
import { ScriptData, VideoAspectRatio, GenerationStatus } from '../types';
import { Play, Film, Loader2, AlertCircle, Wand2 } from 'lucide-react';

interface ScriptPreviewProps {
  markdown: string;
  onGenerateVideo: (prompt: string, ratio: VideoAspectRatio) => void;
  status: GenerationStatus;
  lastImage?: string;
}

const ScriptPreview: React.FC<ScriptPreviewProps> = ({ markdown, onGenerateVideo, status, lastImage }) => {
  const [ratio, setRatio] = useState<VideoAspectRatio>('9:16');

  // Simple parser to extract script sections from Markdown
  const parseScript = (md: string): ScriptData | null => {
    // This regex is a heuristic based on the system prompt structure
    const titleMatch = md.match(/# (.*?)\n/);
    const styleMatch = md.match(/\*\*Style:\*\* (.*?)\n/);
    const hookMatch = md.match(/## Hook\n([\s\S]*?)(?=## Body|$)/);
    const bodyMatch = md.match(/## Body\n([\s\S]*?)(?=## CTA|$)/);
    const ctaMatch = md.match(/## CTA\n([\s\S]*?)(?=$)/);

    if (!hookMatch && !bodyMatch) return null;

    return {
      title: titleMatch ? titleMatch[1].trim() : 'Untitled Video',
      visualStyle: styleMatch ? styleMatch[1].trim() : 'Cinematic, high contrast',
      hook: hookMatch ? hookMatch[1].trim() : '',
      body: bodyMatch ? bodyMatch[1].trim() : '',
      cta: ctaMatch ? ctaMatch[1].trim() : '',
    };
  };

  const script = parseScript(markdown);

  if (!script) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center">
        <Film size={48} className="mb-4 opacity-20" />
        <p className="text-lg font-medium">No Script Detected</p>
        <p className="text-sm mt-2">Start a conversation with AdGen to generate a marketing video script.</p>
      </div>
    );
  }

  const constructPrompt = () => {
    return `Cinematic video, ${script.visualStyle}. Scene: ${script.hook}. Then: ${script.body}. ${script.cta}`;
  };

  const isBusy = status === 'generating' || status === 'polling' || status === 'checking-auth';

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur flex justify-between items-center">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Film size={18} className="text-indigo-400" />
          Script Preview
        </h2>
        <span className="text-xs text-slate-500 uppercase tracking-wider font-mono">Gemini 3 Pro</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase">Title</label>
          <h1 className="text-2xl font-bold text-white">{script.title}</h1>
        </div>

        <div className="space-y-1">
           <label className="text-xs font-semibold text-slate-500 uppercase">Visual Style</label>
           <div className="p-3 bg-indigo-900/20 border border-indigo-500/30 rounded-lg text-indigo-300 text-sm">
             <Wand2 size={14} className="inline mr-2" />
             {script.visualStyle}
           </div>
        </div>

        <div className="grid gap-4">
          <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
            <span className="text-xs font-bold text-emerald-400 uppercase mb-2 block">0:00 - 0:05 • Hook</span>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{script.hook}</p>
          </div>
          
          <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
            <span className="text-xs font-bold text-blue-400 uppercase mb-2 block">0:05 - 0:15 • Body</span>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{script.body}</p>
          </div>

          <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
             <span className="text-xs font-bold text-purple-400 uppercase mb-2 block">0:15 - 0:20 • CTA</span>
             <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{script.cta}</p>
          </div>
        </div>

        {lastImage && (
            <div className="mt-4 p-3 bg-slate-800/50 rounded border border-dashed border-slate-600">
                <p className="text-xs text-slate-400 mb-2">Using visual reference from chat:</p>
                <img src={`data:image/jpeg;base64,${lastImage}`} className="h-16 rounded object-cover" alt="Ref" />
            </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 border-t border-slate-800 bg-slate-900 z-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setRatio('9:16')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border ${
                ratio === '9:16' 
                  ? 'bg-slate-700 text-white border-slate-600' 
                  : 'text-slate-400 border-transparent hover:bg-slate-800'
              }`}
            >
              9:16 (Shorts)
            </button>
            <button
               onClick={() => setRatio('16:9')}
               className={`px-3 py-1.5 text-xs font-medium rounded-md border ${
                 ratio === '16:9' 
                   ? 'bg-slate-700 text-white border-slate-600' 
                   : 'text-slate-400 border-transparent hover:bg-slate-800'
               }`}
            >
              16:9 (Landscape)
            </button>
          </div>

          <button
            onClick={() => onGenerateVideo(constructPrompt(), ratio)}
            disabled={isBusy}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all shadow-lg ${
              isBusy 
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-indigo-500/25'
            }`}
          >
            {isBusy ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {status === 'checking-auth' ? 'Verifying Access...' : 'Creating Magic...'}
              </>
            ) : (
              <>
                <Play size={16} fill="currentColor" />
                Generate Video
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScriptPreview;
