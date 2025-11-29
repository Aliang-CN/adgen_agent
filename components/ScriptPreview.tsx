import React, { useState } from 'react';
import { ScriptData, VideoAspectRatio, GenerationStatus } from '../types';
import { Play, Film, Loader2, Wand2 } from 'lucide-react';

interface ScriptPreviewProps {
  markdown: string;
  onGenerateVideo: (prompt: string, ratio: VideoAspectRatio) => void;
  status: GenerationStatus;
  lastImage?: string;
}

const ScriptPreview: React.FC<ScriptPreviewProps> = ({ markdown, onGenerateVideo, status, lastImage }) => {
  const [ratio, setRatio] = useState<VideoAspectRatio>('9:16');

  // Enhanced parser to extract script sections from Markdown with better fault tolerance
  const parseScript = (md: string): ScriptData | null => {
    if (!md) return null;
    
    // Normalize newlines
    const normalizedMd = md.replace(/\r\n/g, '\n');

    // 1. Extract Title (look for first line starting with #)
    const titleMatch = normalizedMd.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : 'Untitled Video';

    // 2. Extract Style (look for Style: or **Style:**)
    const styleMatch = normalizedMd.match(/^(?:\*\*|__)?Style:(?:\*\*|__)?\s*(.+)$/im);
    const visualStyle = styleMatch ? styleMatch[1].trim() : 'Cinematic, high contrast';

    // 3. Robust Section Extraction
    // We identify where each section starts and slice the text between them.
    const headers = [
      { key: 'hook', regex: /^##\s*Hook.*$/im },
      { key: 'body', regex: /^##\s*Body.*$/im },
      { key: 'cta', regex: /^##\s*(?:CTA|Call\s*to\s*Action).*$/im }
    ];

    // Find all headers present in the text
    const foundHeaders = headers
      .map(h => {
        const match = normalizedMd.match(h.regex);
        return match ? { ...h, index: match.index!, length: match[0].length } : null;
      })
      .filter((h): h is NonNullable<typeof h> => h !== null)
      .sort((a, b) => a.index - b.index);

    // If no structure is found yet, return null (or return partial if desired, but null keeps the placeholder view until data arrives)
    if (foundHeaders.length === 0) return null;

    const result: any = {
      title,
      visualStyle,
      hook: '',
      body: '',
      cta: ''
    };

    foundHeaders.forEach((current, i) => {
      const next = foundHeaders[i + 1];
      const start = current.index + current.length;
      const end = next ? next.index : normalizedMd.length;
      
      const sectionContent = normalizedMd.substring(start, end).trim();
      result[current.key] = sectionContent;
    });

    return result as ScriptData;
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
    const parts = [];
    if (script.visualStyle) parts.push(`Style: ${script.visualStyle}`);
    
    if (script.hook) parts.push(`Scene 1 (Hook): ${script.hook}`);
    if (script.body) parts.push(`Scene 2 (Body): ${script.body}`);
    if (script.cta) parts.push(`Scene 3 (CTA): ${script.cta}`);
    
    // Fallback prompt construction if parsing was minimal
    if (parts.length === 1 && !script.hook) {
        return `${script.title}. ${script.visualStyle}`;
    }

    return parts.join('. ');
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
          <h1 className="text-2xl font-bold text-white">{script.title || 'Untitled'}</h1>
        </div>

        <div className="space-y-1">
           <label className="text-xs font-semibold text-slate-500 uppercase">Visual Style</label>
           <div className="p-3 bg-indigo-900/20 border border-indigo-500/30 rounded-lg text-indigo-300 text-sm">
             <Wand2 size={14} className="inline mr-2" />
             {script.visualStyle || 'Default'}
           </div>
        </div>

        <div className="grid gap-4">
          <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
            <span className="text-xs font-bold text-emerald-400 uppercase mb-2 block">0:00 - 0:05 • Hook</span>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap min-h-[1.5em]">
                {script.hook || <span className="text-slate-600 italic">Generating hook...</span>}
            </p>
          </div>
          
          <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
            <span className="text-xs font-bold text-blue-400 uppercase mb-2 block">0:05 - 0:15 • Body</span>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap min-h-[1.5em]">
                {script.body || <span className="text-slate-600 italic">Generating body...</span>}
            </p>
          </div>

          <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
             <span className="text-xs font-bold text-purple-400 uppercase mb-2 block">0:15 - 0:20 • CTA</span>
             <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap min-h-[1.5em]">
                {script.cta || <span className="text-slate-600 italic">Generating CTA...</span>}
            </p>
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