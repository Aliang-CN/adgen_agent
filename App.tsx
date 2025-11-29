
import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Sparkles, AlertTriangle, Download, RefreshCw, Film, Video, Image as ImageIcon } from 'lucide-react';
import ChatMessage from './components/ChatMessage';
import ScriptPreview from './components/ScriptPreview';
import ImageStudio from './components/ImageStudio';
import { 
  sendMessageStream, 
  generateVeoVideo, 
  generateImage, 
  editImage, 
  checkPaidKeyAuth, 
  promptPaidKeyAuth 
} from './services/geminiService';
import { Message, GenerationStatus, VideoAspectRatio, Attachment, ImageGenConfig, ImageEditConfig } from './types';

function App() {
  // State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'model',
      content: "Hi! I'm **AdGen**. I can help you create stunning marketing videos and images.\n\nUse the **Video Studio** to script and generate videos with Veo, or switch to **Image Studio** to create and edit visuals.",
    }
  ]);
  const [input, setInput] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<Attachment | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  
  // Right Panel State
  const [activeStudio, setActiveStudio] = useState<'video' | 'image'>('video');
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>('idle');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Ref for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle File Upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 20MB Limit for inlineData safety
      if (file.size > 20 * 1024 * 1024) {
        alert("File size exceeds 20MB limit. Please upload a smaller file.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Get the base64 data part
        const base64Data = base64String.split(',')[1];
        
        const type = file.type.startsWith('video/') ? 'video' : 'image';
        
        setSelectedMedia({
          type,
          mimeType: file.type,
          data: base64Data
        });
      };
      reader.readAsDataURL(file);
    }
    // Reset input value so the same file can be selected again if needed
    event.target.value = '';
  };

  // Handle Send Message
  const handleSendMessage = async () => {
    if ((!input.trim() && !selectedMedia) || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      attachment: selectedMedia || undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    const currentMedia = selectedMedia; // Capture for current turn
    setSelectedMedia(null);
    setIsTyping(true);

    // Placeholder for AI response
    const botMessageId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: botMessageId, role: 'model', content: '', isStreaming: true }]);

    try {
      const prompt = userMessage.content || (currentMedia?.type === 'video' ? "Analyze this video style and content" : "Analyze this image");
      const attachmentPayload = currentMedia ? { mimeType: currentMedia.mimeType, data: currentMedia.data } : undefined;

      const stream = sendMessageStream(prompt, attachmentPayload);
      
      let fullContent = '';
      
      for await (const chunk of stream) {
        fullContent += chunk;
        setMessages(prev => prev.map(msg => 
          msg.id === botMessageId 
            ? { ...msg, content: fullContent } 
            : msg
        ));
      }

      setMessages(prev => prev.map(msg => 
        msg.id === botMessageId 
          ? { ...msg, isStreaming: false } 
          : msg
      ));

    } catch (err) {
      console.error(err);
    } finally {
      setIsTyping(false);
    }
  };

  // Shared Auth Check Helper
  const ensureAuth = async (): Promise<boolean> => {
    setErrorMsg(null);
    setGenerationStatus('checking-auth');
    try {
      const hasKey = await checkPaidKeyAuth();
      if (!hasKey) {
        setGenerationStatus('idle');
        const confirm = window.confirm("This feature requires a paid API key via Google AI Studio. Open selection dialog?");
        if (confirm) {
          await promptPaidKeyAuth();
        }
        return false;
      }
      return true;
    } catch (e) {
      console.error("Auth check failed", e);
      return false;
    }
  };

  // Handle Video Generation
  const handleGenerateVideo = async (prompt: string, aspectRatio: VideoAspectRatio, referenceImage?: { data: string, mimeType: string }) => {
    if (!(await ensureAuth())) return;

    setGenerationStatus('generating');
    setVideoUrl(null);
    
    try {
      const url = await generateVeoVideo({
        prompt,
        aspectRatio,
        resolution: '720p',
        referenceImage: referenceImage?.data,
        referenceImageMimeType: referenceImage?.mimeType
      });
      setVideoUrl(url);
      setGenerationStatus('completed');
    } catch (err: any) {
      console.error(err);
      setGenerationStatus('error');
      if (err.message === 'AUTH_REQUIRED') {
         setErrorMsg("Authentication failed. Please select a valid API Key.");
         await promptPaidKeyAuth();
      } else {
        setErrorMsg("Video generation failed. " + (err.message || ""));
      }
    }
  };

  // Handle Image Generation
  const handleGenerateImage = async (config: ImageGenConfig) => {
    if (!(await ensureAuth())) return;

    setGenerationStatus('generating');
    setGeneratedImageUrl(null);

    try {
      const base64Image = await generateImage(config);
      setGeneratedImageUrl(base64Image);
      setGenerationStatus('completed');
    } catch (err: any) {
      console.error(err);
      setGenerationStatus('error');
      if (err.message === 'AUTH_REQUIRED') {
        setErrorMsg("Authentication failed. Please select a valid API Key.");
        await promptPaidKeyAuth();
      } else {
        setErrorMsg("Image generation failed. " + (err.message || ""));
      }
    }
  };

  // Handle Image Edit
  const handleEditImage = async (config: ImageEditConfig) => {
    // Note: Gemini 2.5 Flash Image uses standard key, but we treat it similarly for consistency if needed,
    // though strictly it might not force paid key selection like Veo/Imagen 3 Pro. 
    // We will assume standard env key is fine unless it fails, but for simplicity we don't block on checkPaidKeyAuth for Flash
    // unless strictly required. However, app consistency suggests using the same flow if we want to be safe.
    // Let's just run it.
    
    setGenerationStatus('generating');
    setGeneratedImageUrl(null);

    try {
      const base64Image = await editImage(config);
      setGeneratedImageUrl(base64Image);
      setGenerationStatus('completed');
    } catch (err: any) {
      console.error(err);
      setGenerationStatus('error');
      setErrorMsg("Image editing failed. " + (err.message || ""));
    }
  };

  // Find the latest script in the chat history
  const latestScriptMarkdown = [...messages].reverse().find(m => m.role === 'model' && m.content.includes('# '))?.content || '';
  
  // Find last image for script preview visualization
  const lastUserImageAttachment = [...messages].reverse().find(
    m => m.role === 'user' && m.attachment?.type === 'image'
  )?.attachment;

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      
      {/* Navbar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles size={18} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">AdGen Agent</h1>
          <span className="text-xs bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20 ml-2">Beta</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-400">
           <a href="#" className="hover:text-white transition-colors">Documentation</a>
           <div className="w-px h-4 bg-slate-700"></div>
           <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
             <span>Veo 3.1 & Gemini 3 Pro</span>
           </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left: Chat Area */}
        <section className="flex-1 flex flex-col min-w-[320px] max-w-xl border-r border-slate-800 bg-slate-950 relative">
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/50 backdrop-blur-sm">
            {selectedMedia && (
              <div className="mb-3 relative inline-block">
                {selectedMedia.type === 'image' ? (
                  <img 
                    src={`data:${selectedMedia.mimeType};base64,${selectedMedia.data}`} 
                    alt="Preview" 
                    className="h-16 w-16 object-cover rounded-lg border border-slate-600"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-lg border border-slate-600 bg-slate-800 flex items-center justify-center">
                    <Video size={24} className="text-slate-400" />
                  </div>
                )}
                <button 
                  onClick={() => setSelectedMedia(null)}
                  className="absolute -top-2 -right-2 bg-slate-700 rounded-full p-1 hover:bg-slate-600 text-white"
                >
                  <span className="sr-only">Remove</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
            )}
            
            <div className="flex gap-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                accept="image/*,video/*"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-3 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-xl transition-all"
                title="Attach Image or Video"
              >
                <Paperclip size={20} />
              </button>
              
              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Describe your idea, ask for edits, or upload media..."
                  className="w-full bg-slate-800 text-white placeholder-slate-500 rounded-xl py-3 px-4 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 border border-slate-700 resize-none h-[50px] max-h-[120px]"
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={isTyping || (!input.trim() && !selectedMedia)}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${
                    input.trim() || selectedMedia
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:scale-105'
                      : 'bg-transparent text-slate-600 cursor-not-allowed'
                  }`}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
            <p className="text-center text-[10px] text-slate-600 mt-2">
              Gemini 3 Pro can make mistakes. Check generated scripts.
            </p>
          </div>
        </section>

        {/* Right: Studio Panel */}
        <section className="flex-[1.5] bg-slate-900/30 p-6 flex flex-col gap-6 overflow-hidden">
          
          {/* Studio Toggle */}
          <div className="flex items-center gap-4 mb-2">
            <button
               onClick={() => setActiveStudio('video')}
               className={`text-sm font-semibold px-4 py-2 rounded-lg transition-all ${
                  activeStudio === 'video' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'
               }`}
            >
              Video Studio
            </button>
            <button
               onClick={() => setActiveStudio('image')}
               className={`text-sm font-semibold px-4 py-2 rounded-lg transition-all ${
                  activeStudio === 'image' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'
               }`}
            >
              Image Studio
            </button>
          </div>

          <div className="flex-1 flex gap-6 min-h-0">
            {/* Left Column of Right Panel: Config */}
            <div className="flex-1 min-w-[350px]">
               {activeStudio === 'video' ? (
                 <ScriptPreview 
                   markdown={latestScriptMarkdown} 
                   onGenerateVideo={handleGenerateVideo}
                   status={generationStatus}
                   lastImageAttachment={lastUserImageAttachment ? { data: lastUserImageAttachment.data, mimeType: lastUserImageAttachment.mimeType } : undefined}
                 />
               ) : (
                 <ImageStudio 
                    onGenerateImage={handleGenerateImage}
                    onEditImage={handleEditImage}
                    status={generationStatus}
                    resultImage={generatedImageUrl}
                 />
               )}
            </div>

            {/* Right Column of Right Panel: Result (Only for Video Studio, as Image Studio has inline result) */}
            {activeStudio === 'video' && (
                <div className="flex-1 bg-black rounded-xl border border-slate-800 overflow-hidden relative shadow-2xl flex flex-col">
                  <div className="p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur flex justify-between items-center z-10">
                    <h3 className="text-white font-semibold text-sm">Video Output</h3>
                    {videoUrl && (
                      <a href={videoUrl} download="adgen_video.mp4" className="text-xs flex items-center gap-1 text-emerald-400 hover:text-emerald-300">
                        <Download size={14} /> Download
                      </a>
                    )}
                  </div>
                  
                  <div className="flex-1 flex items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-950 relative">
                    
                    {generationStatus === 'idle' && !videoUrl && (
                      <div className="text-center text-slate-600">
                        <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-700 mx-auto mb-4 flex items-center justify-center">
                          <Film size={24} />
                        </div>
                        <p>Ready to generate</p>
                      </div>
                    )}

                    {(generationStatus === 'generating' || generationStatus === 'polling') && (
                      <div className="text-center text-indigo-400">
                        <div className="relative w-20 h-20 mx-auto mb-6">
                          <div className="absolute inset-0 border-4 border-indigo-500/30 rounded-full"></div>
                          <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                          <Sparkles className="absolute inset-0 m-auto text-indigo-300 animate-pulse" size={24} />
                        </div>
                        <h4 className="text-lg font-medium text-white mb-2">Generating...</h4>
                        <p className="text-sm text-slate-400 max-w-xs mx-auto">
                          Creating your masterpiece using Google GenAI models.
                        </p>
                      </div>
                    )}

                    {generationStatus === 'checking-auth' && (
                      <div className="text-center text-indigo-400 animate-pulse">
                        <p>Verifying API Access...</p>
                      </div>
                    )}

                    {generationStatus === 'error' && (
                      <div className="text-center text-rose-500 px-6">
                        <AlertTriangle size={48} className="mx-auto mb-4 opacity-80" />
                        <p className="font-medium mb-2">Generation Failed</p>
                        <p className="text-sm text-slate-400">{errorMsg}</p>
                        <button 
                          onClick={() => setGenerationStatus('idle')}
                          className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm text-white transition-colors"
                        >
                          <RefreshCw size={14} className="inline mr-2"/>
                          Reset
                        </button>
                      </div>
                    )}

                    {videoUrl && generationStatus === 'completed' && (
                      <video 
                        src={videoUrl} 
                        controls 
                        autoPlay 
                        loop 
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
