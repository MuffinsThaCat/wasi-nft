/**
 * AI Art Service
 * Bridges AI image generation with asset management
 */
import { AIImageGenerator, GenerationParameters, GeneratedImage } from './generators';
import { AssetManager } from '../core/assetManager';
import { generateAiImageFilename } from './generators';

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
  assetMetadata: any; // AssetMetadata from asset manager
}

/**
 * AI Art Service
 * Combines AI image generation with asset management
 */
export class AiArtService {
  private generator: AIImageGenerator;
  private assetManager: AssetManager;
  private config: AiArtServiceConfig;
  
  /**
   * Initialize with asset manager and optional configuration
   */
  constructor(assetManager: AssetManager, config: AiArtServiceConfig = {}) {
    this.assetManager = assetManager;
    this.config = config;
    
    this.generator = new AIImageGenerator({
      openaiApiKey: config.openaiApiKey,
      stabilityApiKey: config.stabilityApiKey,
      replicateApiKey: config.replicateApiKey
    });
  }
  
  /**
   * Generate AI art and create asset in one operation
   */
  async generateAndCreateAsset(
    params: GenerationParameters & {
      title: string;
      description: string;
      creatorName: string;
      editions?: number;
    }
  ): Promise<AiArtResult> {
    // Set default provider if not specified
    const generationParams: GenerationParameters = {
      ...params,
      modelProvider: params.modelProvider || this.config.defaultModelProvider || 'openai',
      modelId: params.modelId || this.config.defaultModelId
    };
    
    try {
      // Generate AI image
      const generatedImages = await this.generator.generateImages(generationParams);
      
      if (generatedImages.length === 0) {
        throw new Error('No images were generated');
      }
      
      // Use the first generated image
      const image = generatedImages[0];
      
      // Generate filename for the AI image
      const filename = generateAiImageFilename(
        image.model,
        params.prompt,
        image.seed
      );
      
      // Convert base64 data to File object if available
      let imageFile: File;
      
      if (image.base64Data) {
        imageFile = AIImageGenerator.base64ToFile(
          image.base64Data,
          filename,
          'image/png'
        );
      } else if (image.url) {
        // Fetch the image from the URL
        const response = await fetch(image.url);
        const blob = await response.blob();
        imageFile = new File([blob], filename, { type: blob.type });
      } else {
        throw new Error('No image data available');
      }
      
      // Create asset with AI metadata
      const asset = await this.assetManager.createAiArtAsset({
        title: params.title,
        description: params.description,
        content: imageFile,
        editions: params.editions || 1,
        creatorName: params.creatorName,
        aiGeneration: {
          model: image.model,
          modelProvider: image.modelProvider,
          prompt: image.prompt,
          negativePrompt: image.negativePrompt,
          seed: image.seed,
          resolution: {
            width: image.width,
            height: image.height
          },
          generationDate: image.generatedAt,
          // Include other parameters from the generation
          ...generationParams.extraParameters,
          // Store the complete generation parameters
          extraParameters: image.generationParams
        }
      });
      
      return {
        generatedImage: image,
        assetMetadata: asset
      };
    } catch (error) {
      console.error('Error in generateAndCreateAsset:', error);
      throw new Error(`Failed to generate and create asset: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Generate multiple AI art variations and create assets for all of them
   */
  async generateVariationsAndCreateAssets(
    baseParams: GenerationParameters & {
      title: string;
      description: string;
      creatorName: string;
      editions?: number;
      numberOfVariations?: number;
    }
  ): Promise<AiArtResult[]> {
    const numberOfVariations = baseParams.numberOfVariations || baseParams.numberOfImages || 4;
    
    // Make sure we're requesting the right number of images
    const generationParams: GenerationParameters = {
      ...baseParams,
      numberOfImages: numberOfVariations,
      modelProvider: baseParams.modelProvider || this.config.defaultModelProvider || 'openai',
      modelId: baseParams.modelId || this.config.defaultModelId
    };
    
    try {
      // Generate multiple AI images
      const generatedImages = await this.generator.generateImages(generationParams);
      
      if (generatedImages.length === 0) {
        throw new Error('No images were generated');
      }
      
      const results: AiArtResult[] = [];
      
      // Process each generated image
      for (let i = 0; i < generatedImages.length; i++) {
        const image = generatedImages[i];
        
        // Generate filename for the AI image
        const filename = generateAiImageFilename(
          image.model,
          baseParams.prompt,
          image.seed
        );
        
        // Convert base64 data to File object if available
        let imageFile: File;
        
        if (image.base64Data) {
          imageFile = AIImageGenerator.base64ToFile(
            image.base64Data,
            filename,
            'image/png'
          );
        } else if (image.url) {
          // Fetch the image from the URL
          const response = await fetch(image.url);
          const blob = await response.blob();
          imageFile = new File([blob], filename, { type: blob.type });
        } else {
          console.warn('Skipping image with no data');
          continue;
        }
        
        // Create a unique title for each variation
        const title = `${baseParams.title} #${i + 1}`;
        
        // Create asset with AI metadata
        const asset = await this.assetManager.createAiArtAsset({
          title,
          description: baseParams.description,
          content: imageFile,
          editions: baseParams.editions || 1,
          creatorName: baseParams.creatorName,
          aiGeneration: {
            model: image.model,
            modelProvider: image.modelProvider,
            prompt: image.prompt,
            negativePrompt: image.negativePrompt,
            seed: image.seed,
            resolution: {
              width: image.width,
              height: image.height
            },
            generationDate: image.generatedAt,
            // Include other parameters from the generation
            ...generationParams.extraParameters,
            // Store the complete generation parameters
            extraParameters: image.generationParams
          }
        });
        
        results.push({
          generatedImage: image,
          assetMetadata: asset
        });
      }
      
      return results;
    } catch (error) {
      console.error('Error in generateVariationsAndCreateAssets:', error);
      throw new Error(`Failed to generate variations: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Register a batch of AI assets on the blockchain
   */
  async registerAiAssetsOnBlockchain(
    assetIds: string[],
    network: string
  ): Promise<Array<{ assetId: string; transactionHash: string; url: string }>> {
    try {
      // Connect wallet if not already connected
      if (!this.assetManager.isWalletConnected()) {
        await this.assetManager.connectWallet();
      }
      
      // Register assets in batch with correct network parameter format
      const results = await this.assetManager.batchRegisterOnBlockchain(assetIds, { 
        network 
      });
      
      // Process the results based on the actual return type from assetManager
      return results.map(result => ({
        assetId: result.id, // Use the id field from the result
        transactionHash: result.blockchain?.transactionHash || '',
        url: result.blockchain?.network ? 
          `https://snowtrace.io/tx/${result.blockchain.transactionHash}` : 
          ''
      }));
    } catch (error) {
      console.error('Error registering AI assets on blockchain:', error);
      throw new Error(`Failed to register assets: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<AiArtServiceConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Recreate generator with updated config
    this.generator = new AIImageGenerator({
      openaiApiKey: this.config.openaiApiKey,
      stabilityApiKey: this.config.stabilityApiKey,
      replicateApiKey: this.config.replicateApiKey
    });
  }
}
