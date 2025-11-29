
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
  referenceImageMimeType?: string;
}

export type ImageAspectRatio = '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '9:16' | '16:9' | '21:9';

export interface ImageGenConfig {
  prompt: string;
  aspectRatio: ImageAspectRatio;
}

export interface ImageEditConfig {
  image: string; // Base64
  mimeType: string;
  prompt: string;
}

export type GenerationStatus = 'idle' | 'checking-auth' | 'generating' | 'polling' | 'completed' | 'error';
