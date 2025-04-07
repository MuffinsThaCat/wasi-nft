/**
 * Image Watermark Example
 * 
 * Demonstrates the application of watermarks to images when they're listed on the marketplace.
 * This example shows how the original asset remains untouched in the secure filesystem while
 * the marketplace preview is watermarked to protect against unauthorized copying.
 */

import { BrowserFileSystem } from '../core/filesystem';
import { AssetManager } from '../core/assetManager';
import { LitProtocolService, PermissionLevel } from '../services/litProtocolService';
import { SecureDirectoryManager } from '../services/secureDirectoryManager';
import { IPFSPinningService } from '../services/ipfsService';
import { MarketplaceService, MarketplaceProvider } from '../services/marketplaceService';
import { TransferService } from '../services/transferService';
import { SecureMarketplaceFlow } from '../services/secureMarketplaceFlow';
import { ImageWatermarkService } from '../services/imageWatermarkService';
import { BlockchainIntegration } from '../blockchain/integration';
import { SecureImageFormatService } from '../services/secureImageFormat';

/**
 * Demonstrates the complete image watermarking flow
 */
export async function demonstrateImageWatermarking() {
  try {
    console.log('Initializing image watermarking demo...');
    
    // Set up environment
    const fileSystem = new BrowserFileSystem();
    const userId = `user_${Math.random().toString(36).substring(2, 10)}`;
    
    // Initialize core services
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
    
    const imageWatermarkService = new ImageWatermarkService();
    
    // Step 1: Select a directory and secure it
    console.log('\n1. SELECTING DIRECTORY FOR SECURE ASSETS');
    console.log('---------------------------------------');
    console.log('Please select a directory to secure...');
    
    const directoryHandle = await fileSystem.selectDirectory();
    if (!directoryHandle) {
      throw new Error('No directory selected');
    }
    
    console.log(`Selected directory: ${directoryHandle.name}`);
    const secureDirectory = await secureDirectoryManager.secureDirectory(directoryHandle.handle);
    console.log(`Directory secured with ID: ${secureDirectory.id}`);
    
    // Step 2: Create an image asset
    console.log('\n2. CREATING AN IMAGE ASSET');
    console.log('--------------------------');
    
    // For demonstration, we'll create a canvas with some content
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
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
    ctx.font = '48px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText('WASI NFT Studio', canvas.width / 2, canvas.height / 2 - 50);
    ctx.font = '24px Arial';
    ctx.fillText('Secure Digital Asset', canvas.width / 2, canvas.height / 2 + 20);
    ctx.fillText('© ' + new Date().getFullYear(), canvas.width / 2, canvas.height / 2 + 60);
    
    // Convert canvas to blob
    const imageBlob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob!);
      }, 'image/png');
    });
    
    // Create a file from the blob
    const imageFile = new File([imageBlob], 'secure-image-asset.png', { type: 'image/png' });
    
    // Create the asset
    const asset = await secureMarketplaceFlow.createSecureAsset(
      'My Secure Image',
      'A demonstration of image watermarking in the marketplace',
      imageFile,
      secureDirectory.id
    );
    
    console.log(`Image asset created with ID: ${asset.id}`);
    
    // Step 3: List the image on the marketplace (this will apply the watermark)
    console.log('\n3. LISTING IMAGE ON MARKETPLACE WITH WATERMARK');
    console.log('---------------------------------------------');
    
    const listing = await secureMarketplaceFlow.createSecureListing(
      asset,
      secureDirectory.id,
      '1.5',
      'ETH',
      MarketplaceProvider.OUR_MARKETPLACE
    );
    
    console.log('Image successfully listed with watermark protection!');
    console.log(`Listing ID: ${listing.listing.id}`);
    console.log(`IPFS CID: ${listing.ipfsCid}`);
    console.log(`Watermarked: ${listing.watermarked ? 'Yes' : 'No'}`);
    
    // Step 4: Compare original and watermarked versions
    console.log('\n4. COMPARING ORIGINAL VS WATERMARKED VERSIONS');
    console.log('-------------------------------------------');
    
    // Get the original asset content
    const originalContent = await assetManager.getAssetContent(asset.id);
    
    if (!originalContent) {
      throw new Error('Could not retrieve original content');
    }
    
    // Get the watermarked version from IPFS
    // Note: In a real implementation, we'd get this from IPFS
    // For demo purposes, we'll create it again
    const contentToWatermark = originalContent instanceof Blob ? originalContent : new Blob([originalContent]);
    
    const watermarkedContent = await imageWatermarkService.applyWatermark(
      contentToWatermark,
      {
        listingId: asset.id,
        ownerAddress: userId,
        timestamp: Date.now(),
        customText: `${asset.title} - Preview Only`,
        opacity: 0.4,
        position: 'bottomright',
        includeInvisibleData: true
      }
    );
    
    // Check for watermark data
    const watermarkCheck = await imageWatermarkService.detectWatermark(watermarkedContent);
    
    console.log('Original asset is preserved in the secure filesystem');
    console.log('Watermarked version is what appears on the marketplace');
    console.log(`Invisible watermark detected: ${watermarkCheck.invisibleData ? 'Yes' : 'No'}`);
    
    if (watermarkCheck.invisibleData) {
      console.log('Watermark data contains:');
      console.log(JSON.stringify(watermarkCheck.invisibleData, null, 2));
    }
    
    // Watermark detection is what would allow us to trace leaks
    console.log('\nThis watermarking system allows us to:');
    console.log('1. Keep original assets pristine in the secure filesystem');
    console.log('2. Make marketplace previews traceable if they leak');
    console.log('3. Protect asset creators while maintaining usability');
    console.log('4. Automatically clean up IPFS content after successful transfers');
    
    return {
      assetId: asset.id,
      listingId: listing.listing.id,
      ipfsCid: listing.ipfsCid,
      watermarkDetected: !!watermarkCheck.invisibleData
    };
    
  } catch (error) {
    console.error('Error in image watermarking demo:', error);
    throw error;
  }
}

// Add to window for manual execution
if (typeof window !== 'undefined') {
  window.runImageWatermarkDemo = demonstrateImageWatermarking;
  console.log('Image watermarking demo ready! Call window.runImageWatermarkDemo() to run it.');
}

// Declare the window property for TypeScript
declare global {
  interface Window {
    runImageWatermarkDemo: () => Promise<{
      assetId: string;
      listingId: string;
      ipfsCid: string;
      watermarkDetected: boolean;
    }>;
  }
}
