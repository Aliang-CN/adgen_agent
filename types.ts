
export interface Attachment {
  type: 'image' | 'video';
  mimeType: string;
  data: string; // Base64
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  attachment?: Attachment;
  isStreaming?: boolean;
}

export interface ScriptData {
  title: string;
  hook: string;
  body: string;
  cta: string;
  visualStyle: string;
}

export type VideoAspectRatio = '16:9' | '9:16';
export type VideoResolution = '720p' | '1080p';

export interface VideoConfig {
  prompt: string;
  aspectRatio: VideoAspectRatio;
  resolution: VideoResolution;
  referenceImage?: string; // Base64
}

export type GenerationStatus = 'idle' | 'checking-auth' | 'generating' | 'polling' | 'completed' | 'error';
