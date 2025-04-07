/**
 * AI Art Service
 * Bridges AI image generation with asset management
 */
import { GenerationParameters, GeneratedImage } from './generators';
import { AssetManager } from '../core/assetManager';
/**
 * AI Art Service configuration
 */
export interface AiArtServiceConfig {
    openaiApiKey?: string;
    stabilityApiKey?: string;
    replicateApiKey?: string;
    defaultModelProvider?: 'openai' | 'stability' | 'replicate';
    defaultModelId?: string;
}
/**
 * AI Art Service Result
 */
export interface AiArtResult {
    generatedImage: GeneratedImage;
    assetMetadata: any;
}
/**
 * AI Art Service
 * Combines AI image generation with asset management
 */
export declare class AiArtService {
    private generator;
    private assetManager;
    private config;
    /**
     * Initialize with asset manager and optional configuration
     */
    constructor(assetManager: AssetManager, config?: AiArtServiceConfig);
    /**
     * Generate AI art and create asset in one operation
     */
    generateAndCreateAsset(params: GenerationParameters & {
        title: string;
        description: string;
        creatorName: string;
        editions?: number;
    }): Promise<AiArtResult>;
    /**
     * Generate multiple AI art variations and create assets for all of them
     */
    generateVariationsAndCreateAssets(baseParams: GenerationParameters & {
        title: string;
        description: string;
        creatorName: string;
        editions?: number;
        numberOfVariations?: number;
    }): Promise<AiArtResult[]>;
    /**
     * Register a batch of AI assets on the blockchain
     */
    registerAiAssetsOnBlockchain(assetIds: string[], network: string): Promise<Array<{
        assetId: string;
        transactionHash: string;
        url: string;
    }>>;
    /**
     * Update configuration
     */
    updateConfig(config: Partial<AiArtServiceConfig>): void;
}
