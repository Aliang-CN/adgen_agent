
import { GoogleGenAI, Chat, Part } from "@google/genai";
import { VideoConfig } from "../types";

// System instruction for the AdGen Agent
const SYSTEM_INSTRUCTION = `
You are AdGen Agent, an expert video marketing director and scriptwriter.
Your goal is to help users create high-converting marketing videos.

Capabilities:
1. Analyze images (products, styles) and videos to understand brand identity, pacing, and aesthetics.
2. Generate structured video scripts (Hook -> Body -> CTA).
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

const getGenAI = (): GoogleGenAI => {
  if (!genAI) {
    // We strictly use the env variable as requested
    genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return genAI;
};

export const initializeChat = () => {
  const ai = getGenAI();
  chatSession = ai.chats.create({
    model: 'gemini-3-pro-preview', // Using 3 Pro for superior reasoning
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
  
  if (attachment) {
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
 * Checks if the user has selected a paid API key for Veo.
 */
export const checkVeoAuth = async (): Promise<boolean> => {
  const win = window as any;
  if (win.aistudio && win.aistudio.hasSelectedApiKey) {
    return await win.aistudio.hasSelectedApiKey();
  }
  // If the window object isn't present (e.g. dev environment outside specific container), 
  // we assume standard env key is sufficient or let it fail gracefully.
  // However, for this demo's requirements, we simulate the check.
  return true; 
};

export const promptVeoAuth = async (): Promise<void> => {
  const win = window as any;
  if (win.aistudio && win.aistudio.openSelectKey) {
    await win.aistudio.openSelectKey();
  }
};

/**
 * Generates a video using Veo 3.1
 */
export const generateVeoVideo = async (config: VideoConfig): Promise<string> => {
  // Re-initialize GenAI to ensure we pick up any newly selected key from window context if applicable
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Construct the prompt with style
  const fullPrompt = config.prompt; 

  console.log("Starting Veo generation with:", config);

  try {
    // Using Veo 3.1 Fast for better interactivity, or standard generate-preview
    const modelId = 'veo-3.1-fast-generate-preview'; 

    let operation;

    // Check if we have a reference image (Image-to-Video)
    if (config.referenceImage) {
      operation = await ai.models.generateVideos({
        model: modelId,
        prompt: fullPrompt,
        image: {
          imageBytes: config.referenceImage,
          mimeType: 'image/jpeg', // Assuming jpeg for simplicity
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
        prompt: fullPrompt,
        config: {
          numberOfVideos: 1,
          resolution: config.resolution,
          aspectRatio: config.aspectRatio,
        }
      });
    }

    // Polling loop
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

    // Append API Key to the download link as required by the docs
    const finalUrl = `${videoUri}&key=${process.env.API_KEY}`;
    return finalUrl;

  } catch (error: any) {
    console.error("Veo Error:", error);
    // Handle the specific "Requested entity was not found" for auth issues
    if (error.message && error.message.includes("Requested entity was not found")) {
      throw new Error("AUTH_REQUIRED");
    }
    throw error;
  }
};
