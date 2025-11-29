
import { GoogleGenAI, Chat, Part } from "@google/genai";
import { VideoConfig, ImageGenConfig, ImageEditConfig } from "../types";

// System instruction for the AdGen Agent
const SYSTEM_INSTRUCTION = `
You are AdGen Agent, an expert video marketing director and scriptwriter.
Your goal is to help users create high-converting marketing videos.

Capabilities:
1. Analyze images (products, styles) and videos to understand brand identity, pacing, color grading, and aesthetics.
2. Generate structured video scripts (Hook -> Body -> CTA) based on visual inputs.
3. Refine scripts based on user feedback.

Output Format:
When generating a script, use the following Markdown format so the UI can parse it:

# [Video Title]
**Style:** [Visual Style Description]
## Hook
[Script for the first 3-5 seconds]
## Body
[Main value proposition and visuals]
## CTA
[Call to action]

Tone: Professional, creative, and concise.
`;

let chatSession: Chat | null = null;
let genAI: GoogleGenAI | null = null;

const getGenAI = (apiKey?: string): GoogleGenAI => {
  // Always recreate with current key if provided, or use env
  // This ensures we pick up keys selected via window.aistudio
  return new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
};

export const initializeChat = () => {
  const ai = getGenAI();
  chatSession = ai.chats.create({
    model: 'gemini-3-pro-preview', // Using 3 Pro for superior reasoning and multimodal video understanding
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
    },
  });
  return chatSession;
};

export async function* sendMessageStream(message: string, attachment?: { mimeType: string, data: string }) {
  if (!chatSession) {
    initializeChat();
  }

  const parts: Part[] = [];
  
  // Attach media (image or video) if present. 
  // Gemini 3 Pro natively handles both image and video via inlineData.
  if (attachment) {
    console.log(`[Gemini Service] Attaching media: ${attachment.mimeType}`);
    parts.push({
      inlineData: {
        mimeType: attachment.mimeType,
        data: attachment.data,
      },
    });
  }
  
  parts.push({ text: message });

  try {
    const responseStream = await chatSession!.sendMessageStream({
      message: parts,
    });

    for await (const chunk of responseStream) {
      yield chunk.text;
    }
  } catch (error) {
    console.error("Chat error:", error);
    yield "Sorry, I encountered an error processing your request. Please try again.";
  }
}

/**
 * Checks if the user has selected a paid API key (Required for Veo and Gemini 3 Pro Image).
 */
export const checkPaidKeyAuth = async (): Promise<boolean> => {
  const win = window as any;
  if (win.aistudio && win.aistudio.hasSelectedApiKey) {
    return await win.aistudio.hasSelectedApiKey();
  }
  return true; 
};

export const promptPaidKeyAuth = async (): Promise<void> => {
  const win = window as any;
  if (win.aistudio && win.aistudio.openSelectKey) {
    await win.aistudio.openSelectKey();
  }
};

/**
 * Generates an image using Gemini 3 Pro Image Preview
 */
export const generateImage = async (config: ImageGenConfig): Promise<string> => {
  const ai = getGenAI(process.env.API_KEY);
  
  console.log("Starting Image generation with:", config);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: config.prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: config.aspectRatio,
          imageSize: '1K',
        }
      }
    });

    // Extract image from response parts
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("No image data found in response");
  } catch (error: any) {
    console.error("Image Gen Error:", error);
    if (error.message && error.message.includes("Requested entity was not found")) {
      throw new Error("AUTH_REQUIRED");
    }
    throw error;
  }
};

/**
 * Edits an image using Gemini 2.5 Flash Image
 */
export const editImage = async (config: ImageEditConfig): Promise<string> => {
  const ai = getGenAI(process.env.API_KEY);
  
  console.log("Starting Image Edit with prompt:", config.prompt);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Nano banana series for fast editing
      contents: {
        parts: [
          {
            inlineData: {
              data: config.image,
              mimeType: config.mimeType,
            },
          },
          { text: config.prompt },
        ],
      },
      // Note: responseMimeType/responseSchema not supported for nano banana
    });

    // Extract image from response parts
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("No edited image data found in response");
  } catch (error: any) {
    console.error("Image Edit Error:", error);
    throw error;
  }
};

/**
 * Generates a video using Veo 3.1
 */
export const generateVeoVideo = async (config: VideoConfig): Promise<string> => {
  const ai = getGenAI(process.env.API_KEY);

  console.log("Starting Veo generation with:", config);

  try {
    const modelId = 'veo-3.1-fast-generate-preview'; 
    let operation;

    // Check if we have a reference image (Image-to-Video)
    if (config.referenceImage) {
      console.log("Generating with reference image, mimeType:", config.referenceImageMimeType);
      operation = await ai.models.generateVideos({
        model: modelId,
        prompt: config.prompt,
        image: {
          imageBytes: config.referenceImage,
          mimeType: config.referenceImageMimeType || 'image/jpeg', 
        },
        config: {
          numberOfVideos: 1,
          resolution: config.resolution,
          aspectRatio: config.aspectRatio,
        }
      });
    } else {
      // Text-to-Video
      operation = await ai.models.generateVideos({
        model: modelId,
        prompt: config.prompt,
        config: {
          numberOfVideos: 1,
          resolution: config.resolution,
          aspectRatio: config.aspectRatio,
        }
      });
    }

    console.log("Video operation started. Polling...");
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
      operation = await ai.operations.getVideosOperation({ operation: operation });
      console.log("Polling status:", operation.metadata);
    }

    if (operation.error) {
      throw new Error(operation.error.message || "Video generation failed");
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) {
      throw new Error("No video URI returned");
    }

    return `${videoUri}&key=${process.env.API_KEY}`;

  } catch (error: any) {
    console.error("Veo Error:", error);
    if (error.message && error.message.includes("Requested entity was not found")) {
      throw new Error("AUTH_REQUIRED");
    }
    throw error;
  }
};
