
import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";
import { DEFAULT_MODEL_TEXT, SYSTEM_PROMPT } from "../constants";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async getChatResponse(message: string, history: any[] = []) {
    try {
      const chat = this.ai.chats.create({
        model: DEFAULT_MODEL_TEXT,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          thinkingConfig: { thinkingBudget: 32768 }
        },
      });

      const response = await chat.sendMessage({ message });
      return {
        text: response.text,
        sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
      };
    } catch (error) {
      console.error("Gemini Error:", error);
      throw error;
    }
  }

  async generateImage(prompt: string, aspectRatio: string = "1:1", size: string = "1K") {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts: [{ text: prompt }] },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any,
            imageSize: size as any
          }
        }
      });

      const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      if (imagePart?.inlineData) {
        return `data:image/png;base64,${imagePart.inlineData.data}`;
      }
      return null;
    } catch (error) {
      console.error("Image Gen Error:", error);
      throw error;
    }
  }

  async generateVideo(prompt: string, imageBase64?: string) {
    try {
      const config: any = {
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      };

      if (imageBase64) {
        config.image = {
          imageBytes: imageBase64.split(',')[1],
          mimeType: 'image/png'
        };
      }

      let operation = await this.ai.models.generateVideos(config);
      
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await this.ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error("Video Gen Error:", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
