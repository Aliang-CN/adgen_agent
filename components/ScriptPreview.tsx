import React, { useState, useEffect, useRef } from 'react';
import { ScriptData, VideoAspectRatio, GenerationStatus } from '../types';
import { Play, Film, Loader2, Wand2, RefreshCcw } from 'lucide-react';

interface AutoResizingTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
}

const AutoResizingTextarea: React.FC<AutoResizingTextareaProps> = ({ value, className, ...props }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      className={`${className} overflow-hidden`}
      {...props}
    />
  );
};

interface ScriptPreviewProps {
  markdown: string;
  onGenerateVideo: (prompt: string, ratio: VideoAspectRatio) => void;
  status: GenerationStatus;
  lastImage?: string;
}

const ScriptPreview: React.FC<ScriptPreviewProps> = ({ markdown, onGenerateVideo, status, lastImage }) => {
  const [ratio, setRatio] = useState<VideoAspectRatio>('9:16');
  const [editableScript, setEditableScript] = useState<ScriptData | null>(null);
  const [isEdited, setIsEdited] = useState(false);

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

  // Sync state with markdown stream until user edits
  useEffect(() => {
    if (!isEdited) {
      const parsed = parseScript(markdown);
      setEditableScript(parsed);
    }
  }, [markdown, isEdited]);

  const handleInputChange = (field: keyof ScriptData, value: string) => {
    if (!editableScript) return;
    setEditableScript({ ...editableScript, [field]: value });
    setIsEdited(true);
  };

  const handleReset = () => {
    setIsEdited(false); // This triggers the useEffect to re-sync with markdown prop
  };

  const constructPrompt = () => {
    if (!editableScript) return '';
    const parts = [];
    if (editableScript.visualStyle) parts.push(`Style: ${editableScript.visualStyle}`);
    
    if (editableScript.hook) parts.push(`Scene 1 (Hook): ${editableScript.hook}`);
    if (editableScript.body) parts.push(`Scene 2 (Body): ${editableScript.body}`);
    if (editableScript.cta) parts.push(`Scene 3 (CTA): ${editableScript.cta}`);
    
    // Fallback if structure is weak
    if (parts.length === 1 && !editableScript.hook) {
        return `${editableScript.title}. ${editableScript.visualStyle}`;
    }

    return parts.join('. ');
  };

  if (!editableScript) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center border-2 border-dashed border-slate-800 rounded-xl">
        <Film size={48} className="mb-4 opacity-20" />
        <p className="text-lg font-medium">No Script Detected</p>
        <p className="text-sm mt-2">Start a conversation with AdGen to generate a marketing video script.</p>
      </div>
    );
  }

  const isBusy = status === 'generating' || status === 'polling' || status === 'checking-auth';

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur flex justify-between items-center">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Film size={18} className="text-indigo-400" />
          Script Preview
        </h2>
        <div className="flex items-center gap-2">
           {isEdited && (
             <button 
                onClick={handleReset}
                title="Reset to original AI generated script"
                className="text-xs flex items-center gap-1 text-slate-400 hover:text-white transition-colors mr-2"
             >
                <RefreshCcw size={12} /> Reset
             </button>
           )}
           <span className="text-xs text-slate-500 uppercase tracking-wider font-mono">Gemini 3 Pro</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase">Title</label>
          <input 
            type="text"
            value={editableScript.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className="w-full bg-transparent border-0 border-b border-transparent hover:border-slate-700 focus:border-indigo-500 text-2xl font-bold text-white focus:ring-0 px-0 transition-colors"
          />
        </div>

        <div className="space-y-1">
           <label className="text-xs font-semibold text-slate-500 uppercase">Visual Style</label>
           <div className="flex items-start gap-2 p-3 bg-indigo-900/20 border border-indigo-500/30 rounded-lg text-indigo-300 text-sm focus-within:ring-1 focus-within:ring-indigo-500/50">
             <Wand2 size={16} className="mt-0.5 flex-shrink-0" />
             <AutoResizingTextarea
               value={editableScript.visualStyle}
               onChange={(e) => handleInputChange('visualStyle', e.target.value)}
               rows={1}
               className="w-full bg-transparent border-0 p-0 text-indigo-300 focus:ring-0 resize-none"
             />
           </div>
        </div>

        <div className="grid gap-4">
          <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 focus-within:border-indigo-500/50 transition-colors">
            <span className="text-xs font-bold text-emerald-400 uppercase mb-2 block">0:00 - 0:05 • Hook</span>
            <AutoResizingTextarea
              value={editableScript.hook}
              onChange={(e) => handleInputChange('hook', e.target.value)}
              placeholder="Generating hook..."
              className="w-full bg-transparent border-0 focus:ring-0 p-0 text-slate-300 text-sm leading-relaxed resize-none min-h-[3em]"
              rows={2}
            />
          </div>
          
          <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 focus-within:border-indigo-500/50 transition-colors">
            <span className="text-xs font-bold text-blue-400 uppercase mb-2 block">0:05 - 0:15 • Body</span>
            <AutoResizingTextarea
              value={editableScript.body}
              onChange={(e) => handleInputChange('body', e.target.value)}
              placeholder="Generating body..."
              className="w-full bg-transparent border-0 focus:ring-0 p-0 text-slate-300 text-sm leading-relaxed resize-none min-h-[4.5em]"
              rows={4}
            />
          </div>

          <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 focus-within:border-indigo-500/50 transition-colors">
             <span className="text-xs font-bold text-purple-400 uppercase mb-2 block">0:15 - 0:20 • CTA</span>
             <AutoResizingTextarea
              value={editableScript.cta}
              onChange={(e) => handleInputChange('cta', e.target.value)}
              placeholder="Generating CTA..."
              className="w-full bg-transparent border-0 focus:ring-0 p-0 text-slate-300 text-sm leading-relaxed resize-none min-h-[3em]"
              rows={2}
            />
          </div>
        </div>

        {lastImage && (
            <div className="mt-4 p-3 bg-slate-800/50 rounded border border-dashed border-slate-600 flex items-center gap-4">
                <img src={`data:image/jpeg;base64,${lastImage}`} className="h-12 w-12 rounded object-cover border border-slate-600" alt="Ref" />
                <p className="text-xs text-slate-400">Using visual reference from chat for generation.</p>
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