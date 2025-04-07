/**
 * AI Image Generation Service
 * Provides interfaces to various AI image generation APIs
 */
import OpenAI from 'openai';
import Replicate from 'replicate';
import { generateRandomString } from '../utils/helpers';

// Type definitions for AI generation parameters
export interface GenerationParameters {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  numberOfImages?: number;
  seed?: number;
  modelProvider: 'openai' | 'stability' | 'replicate';
  modelId?: string; // Specific model ID (for Replicate, etc.)
  apiKey: string;
  extraParameters?: Record<string, any>;
}

// Generated image result
export interface GeneratedImage {
  url: string;
  base64Data?: string;
  width: number;
  height: number;
  seed: number;
  model: string;
  modelProvider: string;
  prompt: string;
  negativePrompt?: string;
  generationParams: Record<string, any>;
  generatedAt: number;
}

/**
 * AI Image Generation Service
 */
export class AIImageGenerator {
  private openaiClient: OpenAI | null = null;
  private replicateClient: Replicate | null = null;
  private stabilityApiKey: string | null = null;
  
  /**
   * Initialize with optional API keys
   */
  constructor(options?: {
    openaiApiKey?: string;
    replicateApiKey?: string;
    stabilityApiKey?: string;
  }) {
    if (options?.openaiApiKey) {
      this.openaiClient = new OpenAI({
        apiKey: options.openaiApiKey
      });
    }
    
    if (options?.replicateApiKey) {
      this.replicateClient = new Replicate({
        auth: options.replicateApiKey
      });
    }
    
    if (options?.stabilityApiKey) {
      this.stabilityApiKey = options.stabilityApiKey;
    }
  }
  
  /**
   * Generate images using the specified provider and parameters
   */
  async generateImages(params: GenerationParameters): Promise<GeneratedImage[]> {
    switch (params.modelProvider) {
      case 'openai':
        return this.generateWithOpenAI(params);
      case 'stability':
        return this.generateWithStability(params);
      case 'replicate':
        return this.generateWithReplicate(params);
      default:
        throw new Error(`Unsupported model provider: ${params.modelProvider}`);
    }
  }
  
  /**
   * Generate images with OpenAI's DALL-E
   */
  private async generateWithOpenAI(params: GenerationParameters): Promise<GeneratedImage[]> {
    // Use provided API key or previously initialized client
    const openai = this.openaiClient || new OpenAI({
      apiKey: params.apiKey
    });
    
    try {
      // Convert size to a valid OpenAI size parameter
      let size: "256x256" | "512x512" | "1024x1024" | "1792x1024" | "1024x1792";
      
      // Default to 1024x1024 but allow specific supported dimensions
      if (params.width === 1792 && params.height === 1024) {
        size = "1792x1024";
      } else if (params.width === 1024 && params.height === 1792) {
        size = "1024x1792";
      } else if (params.width === 512 && params.height === 512) {
        size = "512x512";
      } else if (params.width === 256 && params.height === 256) {
        size = "256x256";
      } else {
        // Default to square 1024x1024
        size = "1024x1024";
      }
      
      const response = await openai.images.generate({
        model: params.modelId || 'dall-e-3',
        prompt: params.prompt,
        n: params.numberOfImages || 1,
        size,
        response_format: 'b64_json',
        style: params.extraParameters?.style || 'vivid',
        quality: params.extraParameters?.quality || 'standard'
      });
      
      return response.data.map((image, index) => {
        const seed = params.seed || Math.floor(Math.random() * 1000000000);
        const generatedAt = Date.now();
        
        return {
          url: image.url || '',
          base64Data: image.b64_json,
          width: params.width || 1024,
          height: params.height || 1024,
          seed,
          model: params.modelId || 'dall-e-3',
          modelProvider: 'openai',
          prompt: params.prompt,
          negativePrompt: params.negativePrompt,
          generationParams: {
            style: params.extraParameters?.style || 'vivid',
            quality: params.extraParameters?.quality || 'standard',
            n: params.numberOfImages || 1,
            size: `${params.width || 1024}x${params.height || 1024}`
          },
          generatedAt
        };
      });
    } catch (error) {
      console.error('Error generating images with OpenAI:', error);
      throw new Error(`OpenAI generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Generate images with Stability AI
   */
  private async generateWithStability(params: GenerationParameters): Promise<GeneratedImage[]> {
    const apiKey = params.apiKey || this.stabilityApiKey;
    
    if (!apiKey) {
      throw new Error('Stability API key is required');
    }
    
    const engineId = params.modelId || 'stable-diffusion-xl-1024-v1-0';
    const apiHost = 'https://api.stability.ai';
    
    try {
      const response = await fetch(
        `${apiHost}/v1/generation/${engineId}/text-to-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            text_prompts: [
              {
                text: params.prompt,
                weight: 1
              },
              ...(params.negativePrompt ? [{
                text: params.negativePrompt,
                weight: -1
              }] : [])
            ],
            cfg_scale: params.extraParameters?.cfgScale || 7,
            height: params.height || 1024,
            width: params.width || 1024,
            samples: params.numberOfImages || 1,
            steps: params.extraParameters?.steps || 30,
            seed: params.seed || 0
          })
        }
      );
      
      if (!response.ok) {
        throw new Error(`Stability API error: ${response.statusText}`);
      }
      
      const responseData = await response.json();
      const generatedAt = Date.now();
      
      return responseData.artifacts.map((artifact: any) => {
        return {
          base64Data: artifact.base64,
          url: '', // Stability doesn't provide URLs, only base64 data
          width: params.width || 1024,
          height: params.height || 1024,
          seed: artifact.seed,
          model: engineId,
          modelProvider: 'stability',
          prompt: params.prompt,
          negativePrompt: params.negativePrompt,
          generationParams: {
            cfgScale: params.extraParameters?.cfgScale || 7,
            steps: params.extraParameters?.steps || 30,
            samples: params.numberOfImages || 1
          },
          generatedAt
        };
      });
    } catch (error) {
      console.error('Error generating images with Stability:', error);
      throw new Error(`Stability generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Generate images with Replicate
   */
  private async generateWithReplicate(params: GenerationParameters): Promise<GeneratedImage[]> {
    // Use provided API key or previously initialized client
    const replicate = this.replicateClient || new Replicate({
      auth: params.apiKey
    });
    
    try {
      // Ensure model ID is in the correct format for Replicate
      let modelId: `${string}/${string}:${string}`;
      
      if (params.modelId) {
        if (/^[^/]+\/[^:]+:[^:]+$/.test(params.modelId)) {
          // If modelId is already in correct format: owner/model:version
          modelId = params.modelId as `${string}/${string}:${string}`;
        } else {
          // If not in correct format, use default with warning
          console.warn(`Invalid Replicate model ID format: ${params.modelId}, using default`); 
          modelId = 'stability-ai/stable-diffusion:27b93a2413e7f36cd83da926f3656280b2931564ff050bf9575f1fdf9bcd7478';
        }
      } else {
        // Default model ID
        modelId = 'stability-ai/stable-diffusion:27b93a2413e7f36cd83da926f3656280b2931564ff050bf9575f1fdf9bcd7478';
      }
      
      const input = {
        prompt: params.prompt,
        negative_prompt: params.negativePrompt,
        width: params.width || 1024,
        height: params.height || 1024,
        num_outputs: params.numberOfImages || 1,
        scheduler: params.extraParameters?.scheduler || 'K_EULER',
        num_inference_steps: params.extraParameters?.steps || 50,
        guidance_scale: params.extraParameters?.guidanceScale || 7.5,
        seed: params.seed || Math.floor(Math.random() * 1000000000)
      };
      
      const output = await replicate.run(modelId, { input });
      const generatedAt = Date.now();
      
      // Replicate typically returns an array of image URLs
      if (Array.isArray(output)) {
        return output.map((url: string, index: number) => {
          return {
            url,
            width: params.width || 1024,
            height: params.height || 1024,
            seed: params.seed || Math.floor(Math.random() * 1000000000),
            model: modelId,
            modelProvider: 'replicate',
            prompt: params.prompt,
            negativePrompt: params.negativePrompt,
            generationParams: {
              scheduler: params.extraParameters?.scheduler || 'K_EULER',
              steps: params.extraParameters?.steps || 50,
              guidanceScale: params.extraParameters?.guidanceScale || 7.5,
              numOutputs: params.numberOfImages || 1
            },
            generatedAt
          };
        });
      } else {
        throw new Error('Unexpected output format from Replicate');
      }
    } catch (error) {
      console.error('Error generating images with Replicate:', error);
      throw new Error(`Replicate generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Convert a base64-encoded image to a File object
   */
  static base64ToFile(base64Data: string, filename: string, mimeType: string = 'image/png'): File {
    // Remove data URL prefix if present
    const base64Content = base64Data.includes('base64,') 
      ? base64Data.split('base64,')[1]
      : base64Data;
    
    // Decode base64 to binary
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Create Blob and File
    const blob = new Blob([bytes], { type: mimeType });
    return new File([blob], filename, { type: mimeType });
  }
}

/**
 * Generate a unique filename for an AI-generated image
 */
export function generateAiImageFilename(
  model: string,
  prompt: string,
  seed: number
): string {
  // Create short hash from prompt
  const promptHash = prompt.substring(0, 15).replace(/[^a-zA-Z0-9]/g, '');
  
  // Get model shortname
  const modelShort = model.split('/').pop()?.split(':')[0] || model;
  
  // Generate random component
  const random = generateRandomString(4);
  
  return `ai-${modelShort}-${promptHash}-${seed}-${random}.png`;
}
