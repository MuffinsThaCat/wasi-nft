/**
 * Mixed Art Source Example
 * 
 * Demonstrates that our marketplace flow works seamlessly with both:
 * 1. AI-generated art from our AIImageGenerator
 * 2. Regular art files imported from the user's filesystem
 * 
 * Both types of assets are handled identically in the marketplace flow.
 */

import { BrowserFileSystem } from '../core/filesystem';
import { AssetManager } from '../core/assetManager';
import { LitProtocolService } from '../services/litProtocolService';
import { SecureDirectoryManager } from '../services/secureDirectoryManager';
import { IPFSPinningService } from '../services/ipfsService';
import { MarketplaceService, MarketplaceProvider } from '../services/marketplaceService';
import { TransferService } from '../services/transferService';
import { SecureMarketplaceFlow } from '../services/secureMarketplaceFlow';
import { BlockchainIntegration } from '../blockchain/integration';
import { SecureImageFormatService } from '../services/secureImageFormat';
import { AIImageGenerator, GenerationParameters } from '../ai/generators';

/**
 * Initialize core services
 */
async function initializeEnvironment() {
  const fileSystem = new BrowserFileSystem();
  const userId = `user_${Math.random().toString(36).substring(2, 10)}`;
  
  const assetManager = new AssetManager({
    fileSystem,
    assetsDirectoryName: 'assets',
    metadataDirectoryName: 'metadata',
    userId
  });
  await assetManager.initialize();
  
  const litService = new LitProtocolService(userId);
  const secureDirectoryManager = new SecureDirectoryManager(
    litService,
    fileSystem,
    userId
  );
  
  const ipfsService = new IPFSPinningService({
    apiKey: 'demo-key',
    apiSecret: 'demo-secret',
    endpoint: 'https://api.pinata.cloud/pinning/'
  });
  
  const blockchainIntegration = new BlockchainIntegration();
  const secureImageService = new SecureImageFormatService();
  
  const transferService = new TransferService(
    assetManager,
    blockchainIntegration,
    secureImageService
  );
  
  const marketplaceService = new MarketplaceService(
    assetManager,
    ipfsService,
    blockchainIntegration,
    transferService
  );
  
  const secureMarketplaceFlow = new SecureMarketplaceFlow(
    assetManager,
    ipfsService,
    marketplaceService,
    transferService,
    litService,
    secureDirectoryManager,
    fileSystem
  );
  
  return {
    fileSystem,
    userId,
    assetManager,
    litService,
    secureDirectoryManager,
    ipfsService,
    marketplaceService,
    transferService,
    secureMarketplaceFlow
  };
}

/**
 * Create a secure directory
 */
async function createSecureDirectory(
  fileSystem: BrowserFileSystem,
  secureDirectoryManager: SecureDirectoryManager
) {
  console.log('Please select a directory to secure...');
  const directoryHandle = await fileSystem.selectDirectory();
  if (!directoryHandle) {
    throw new Error('No directory selected');
  }
  
  console.log(`Selected directory: ${directoryHandle.name}`);
  const secureDirectory = await secureDirectoryManager.secureDirectory(directoryHandle.handle);
  console.log(`Directory secured with ID: ${secureDirectory.id}`);
  
  return secureDirectory;
}

/**
 * Create an AI-generated asset
 */
async function createAIGeneratedAsset(
  secureMarketplaceFlow: SecureMarketplaceFlow,
  secureDirectoryId: string,
  apiKey: string
) {
  console.log('\n1. CREATING AI-GENERATED ASSET');
  console.log('----------------------------');
  
  // Initialize AI generator
  const aiGenerator = new AIImageGenerator({
    openaiApiKey: apiKey
  });
  
  // Generate an image
  console.log('Generating AI image...');
  const params: GenerationParameters = {
    prompt: 'A beautiful landscape with mountains and a lake at sunset',
    width: 512,
    height: 512,
    numberOfImages: 1,
    modelProvider: 'openai',
    apiKey: apiKey
  };
  
  try {
    const generatedImages = await aiGenerator.generateImages(params);
    
    if (generatedImages.length === 0) {
      throw new Error('No images were generated');
    }
    
    // Convert the first generated image to a file
    const image = generatedImages[0];
    console.log(`AI image generated with model: ${image.model}`);
    
    // Convert base64 to blob if available
    let imageBlob: Blob;
    if (image.base64Data) {
      const binary = atob(image.base64Data.split(',')[1]);
      const array = [];
      for (let i = 0; i < binary.length; i++) {
        array.push(binary.charCodeAt(i));
      }
      imageBlob = new Blob([new Uint8Array(array)], { type: 'image/png' });
    } else {
      // Fetch from URL if base64 not available
      const response = await fetch(image.url);
      imageBlob = await response.blob();
    }
    
    const aiImageFile = new File([imageBlob], 'ai-generated-image.png', { type: 'image/png' });
    
    // Create asset
    const asset = await secureMarketplaceFlow.createSecureAsset(
      'AI Generated Landscape',
      `Created with ${image.model} - Prompt: ${image.prompt}`,
      aiImageFile,
      secureDirectoryId
    );
    
    console.log(`AI asset created with ID: ${asset.id}`);
    
    return asset;
  } catch (error) {
    console.error('Error generating AI image:', error);
    // Fallback to creating a canvas image if AI generation fails
    return createCanvasImage(secureMarketplaceFlow, secureDirectoryId, 'AI Mockup Image');
  }
}

/**
 * Create a canvas image (fallback method)
 */
async function createCanvasImage(
  secureMarketplaceFlow: SecureMarketplaceFlow,
  secureDirectoryId: string,
  title: string
) {
  // Create a canvas with some content
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }
  
  // Create a gradient background
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#3498db');
  gradient.addColorStop(1, '#8e44ad');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add some text
  ctx.font = '24px Arial';
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.fillText(title, canvas.width / 2, canvas.height / 2);
  ctx.font = '16px Arial';
  ctx.fillText('Fallback Image', canvas.width / 2, canvas.height / 2 + 30);
  
  // Convert canvas to blob
  const imageBlob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob!);
    }, 'image/png');
  });
  
  // Create a file from the blob
  const imageFile = new File([imageBlob], 'canvas-image.png', { type: 'image/png' });
  
  // Create the asset
  const asset = await secureMarketplaceFlow.createSecureAsset(
    title,
    'Created with canvas as a fallback',
    imageFile,
    secureDirectoryId
  );
  
  console.log(`Canvas asset created with ID: ${asset.id}`);
  return asset;
}

/**
 * Import an existing image from filesystem
 */
async function importExistingImage(
  fileSystem: BrowserFileSystem,
  secureMarketplaceFlow: SecureMarketplaceFlow,
  secureDirectoryId: string
) {
  console.log('\n2. IMPORTING EXISTING NON-AI ARTWORK');
  console.log('----------------------------------');
  
  console.log('Please select an image file to import...');
  
  try {
    // Allow user to select an image file
    // Use the native window.showOpenFilePicker API since it's not in our BrowserFileSystem
    if (!window.showOpenFilePicker) {
      throw new Error('File picker API not supported in this browser');
    }
    
    const [fileHandle] = await window.showOpenFilePicker({
      types: [
        {
          description: 'Images',
          accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
          }
        }
      ],
      multiple: false
    });
    
    // Get the file from the handle
    const file = await fileHandle.getFile();
    console.log(`Selected file: ${file.name} (${file.type})`);
    
    // Create the asset
    const asset = await secureMarketplaceFlow.createSecureAsset(
      `Imported Artwork: ${file.name.split('.')[0]}`,
      'Imported from local filesystem (non-AI generated)',
      file,
      secureDirectoryId
    );
    
    console.log(`Imported asset created with ID: ${asset.id}`);
    return asset;
  } catch (error) {
    console.error('Error importing image:', error);
    // Use fallback method if file selection fails
    console.log('Using fallback method to create test image...');
    return createCanvasImage(secureMarketplaceFlow, secureDirectoryId, 'Fallback Non-AI Image');
  }
}

/**
 * List both assets on the marketplace
 */
async function listAssetsOnMarketplace(
  secureMarketplaceFlow: SecureMarketplaceFlow,
  secureDirectoryId: string,
  aiAsset: any,
  regularAsset: any
) {
  console.log('\n3. LISTING BOTH ASSETS ON MARKETPLACE');
  console.log('-----------------------------------');
  
  // List AI asset
  console.log('Listing AI-generated asset...');
  const aiListing = await secureMarketplaceFlow.createSecureListing(
    aiAsset,
    secureDirectoryId,
    '0.5',
    'ETH',
    MarketplaceProvider.OUR_MARKETPLACE
  );
  
  // List regular asset
  console.log('Listing regular imported asset...');
  const regularListing = await secureMarketplaceFlow.createSecureListing(
    regularAsset,
    secureDirectoryId,
    '0.75',
    'ETH',
    MarketplaceProvider.OUR_MARKETPLACE
  );
  
  console.log('\nBoth assets successfully listed with watermark protection!');
  console.log(`AI Asset - Listing ID: ${aiListing.listing.id}, IPFS CID: ${aiListing.ipfsCid}`);
  console.log(`Regular Asset - Listing ID: ${regularListing.listing.id}, IPFS CID: ${regularListing.ipfsCid}`);
  
  return { aiListing, regularListing };
}

/**
 * Demonstrate the complete flow
 */
export async function demonstrateMixedArtSources(openaiApiKey?: string) {
  try {
    console.log('Initializing mixed art sources demo...');
    
    // 1. Set up environment
    const env = await initializeEnvironment();
    
    // 2. Create secure directory
    const secureDirectory = await createSecureDirectory(
      env.fileSystem,
      env.secureDirectoryManager
    );
    
    // 3. Create AI-generated asset
    // Use provided API key or skip AI generation
    const apiKey = openaiApiKey || '';
    const aiAsset = apiKey ? 
      await createAIGeneratedAsset(env.secureMarketplaceFlow, secureDirectory.id, apiKey) :
      await createCanvasImage(env.secureMarketplaceFlow, secureDirectory.id, 'AI Asset Placeholder');
    
    // 4. Import regular asset
    const regularAsset = await importExistingImage(
      env.fileSystem,
      env.secureMarketplaceFlow,
      secureDirectory.id
    );
    
    // 5. List both assets
    const listings = await listAssetsOnMarketplace(
      env.secureMarketplaceFlow,
      secureDirectory.id,
      aiAsset,
      regularAsset
    );
    
    console.log('\nDEMONSTRATION SUMMARY:');
    console.log('1. Both AI-generated and regular imported art work perfectly with our system');
    console.log('2. Both types are watermarked identically when listed on the marketplace');
    console.log('3. The same secure transfer process applies to both asset types');
    console.log('4. Original assets remain unwatermarked in the secure filesystem');
    
    return {
      aiAssetId: aiAsset.id,
      regularAssetId: regularAsset.id,
      aiListingId: listings.aiListing.listing.id,
      regularListingId: listings.regularListing.listing.id
    };
    
  } catch (error) {
    console.error('Error in mixed art sources demo:', error);
    throw error;
  }
}

// Add to window for manual execution
if (typeof window !== 'undefined') {
  window.runMixedArtDemo = (openaiApiKey?: string) => demonstrateMixedArtSources(openaiApiKey);
  console.log('Mixed art sources demo ready! Call window.runMixedArtDemo(optionalApiKey) to run it.');
}

// Declare the window property for TypeScript
declare global {
  interface Window {
    runMixedArtDemo: (openaiApiKey?: string) => Promise<{
      aiAssetId: string;
      regularAssetId: string;
      aiListingId: string;
      regularListingId: string;
    }>;
  }
}
