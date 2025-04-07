export interface GenerationParameters {
    prompt: string;
    negativePrompt?: string;
    width?: number;
    height?: number;
    numberOfImages?: number;
    seed?: number;
    modelProvider: 'openai' | 'stability' | 'replicate';
    modelId?: string;
    apiKey: string;
    extraParameters?: Record<string, any>;
}
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
export declare class AIImageGenerator {
    private openaiClient;
    private replicateClient;
    private stabilityApiKey;
    /**
     * Initialize with optional API keys
     */
    constructor(options?: {
        openaiApiKey?: string;
        replicateApiKey?: string;
        stabilityApiKey?: string;
    });
    /**
     * Generate images using the specified provider and parameters
     */
    generateImages(params: GenerationParameters): Promise<GeneratedImage[]>;
    /**
     * Generate images with OpenAI's DALL-E
     */
    private generateWithOpenAI;
    /**
     * Generate images with Stability AI
     */
    private generateWithStability;
    /**
     * Generate images with Replicate
     */
    private generateWithReplicate;
    /**
     * Convert a base64-encoded image to a File object
     */
    static base64ToFile(base64Data: string, filename: string, mimeType?: string): File;
}
/**
 * Generate a unique filename for an AI-generated image
 */
export declare function generateAiImageFilename(model: string, prompt: string, seed: number): string;
