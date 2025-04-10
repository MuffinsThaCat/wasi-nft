/**
 * Social Media Verification Example
 * 
 * This example demonstrates how our system handles the export and verification
 * of digital assets shared on social media platforms, using steganographic
 * watermarking to embed ownership data.
 * 
 * The example shows:
 * 1. Creating an asset with provenance tracking
 * 2. Preparing the asset for social media sharing with embedded ownership data
 * 3. Simulating copying/downloading of the shared image
 * 4. Verifying the ownership of the "copied" image
 */

import { BrowserFileSystem } from '../core/filesystem';
import { AssetManager } from '../core/assetManager';
import { BlockchainIntegration } from '../blockchain/integration';
import { ProvenanceTracker } from '../services/provenanceTracker';
import { TransferService } from '../services/transferService';
import { SecureImageFormatService } from '../services/secureImageFormat';
import { SocialMediaExportService } from '../services/socialMediaExportService';

/**
 * Initialize the services needed for the example
 */
async function initializeEnvironment() {
  console.log('Initializing social media verification environment...');
  
  // Set up filesystem and user ID
  const fileSystem = new BrowserFileSystem();
  const userId = `creator_${Math.random().toString(36).substring(2, 10)}`;
  console.log(`User ID: ${userId}`);
  
  // Initialize core services
  const assetManager = new AssetManager({
    fileSystem,
    assetsDirectoryName: 'assets',
    metadataDirectoryName: 'metadata',
    userId
  });
  await assetManager.initialize();
  
  const blockchainIntegration = new BlockchainIntegration();
  const secureImageService = new SecureImageFormatService();
  
  const transferService = new TransferService(
    assetManager,
    blockchainIntegration,
    secureImageService
  );
  
  // Initialize ProvenanceTracker
  const provenanceTracker = new ProvenanceTracker(
    blockchainIntegration,
    transferService,
    assetManager
  );
  
  // Initialize SocialMediaExportService
  const socialMediaExportService = new SocialMediaExportService(
    assetManager,
    provenanceTracker,
    blockchainIntegration
  );
  
  return {
    userId,
    assetManager,
    blockchainIntegration,
    provenanceTracker,
    socialMediaExportService
  };
}

/**
 * Create a test asset with provenance tracking
 * @param env Environment with initialized services
 * @returns The created asset ID
 */
async function createTestAsset(env: any): Promise<string> {
  console.log('Creating test asset with provenance tracking...');
  
  // Create test image data - in a real scenario this would be an actual image
  const imageData = new Uint8Array(1024).fill(0);
  imageData[0] = 0x89; // PNG magic number start
  imageData[1] = 0x50;
  imageData[2] = 0x4E;
  imageData[3] = 0x47;
  
  // Create asset with the test image
  const assetId = await env.assetManager.createAsset({
    content: imageData.buffer,
    metadata: {
      title: 'Social Media Test Image',
      description: 'Test image for social media sharing with ownership verification',
      creator: env.userId,
      createdAt: Date.now(),
      type: 'image/png'
    }
  });
  
  console.log(`Created asset with ID: ${assetId}`);
  
  // Register the asset with provenance tracker
  const provenanceChain = await env.provenanceTracker.registerAssetProvenance(
    assetId,
    env.userId
  );
  
  console.log(`Registered asset provenance with ${provenanceChain.records.length} initial record(s)`);
  console.log(`Asset fingerprint: ${provenanceChain.contentFingerprint}`);
  
  return assetId;
}

/**
 * Prepare an asset for social media sharing
 * @param env Environment with initialized services
 * @param assetId Asset ID to prepare
 * @returns Object containing share-ready image and verification data
 */
async function prepareForSocialMediaSharing(env: any, assetId: string): Promise<any> {
  console.log(`Preparing asset ${assetId} for social media sharing...`);
  
  // Use the social media export service to prepare the image
  const exportResult = await env.socialMediaExportService.prepareImageForSharing(
    assetId,
    {
      addVisibleAttribution: true, // Add a small visible attribution
      watermarkStrength: 75, // Higher strength for better robustness
      exportQuality: 90 // Good quality for social media
    }
  );
  
  console.log('Image prepared for sharing with embedded ownership data');
  console.log(`Verification URL: ${exportResult.verificationUrl}`);
  console.log('Embedded ownership data:', exportResult.ownershipData);
  
  return exportResult;
}

/**
 * Simulate copying/downloading an image from social media
 * @param sharedImage The image that was shared
 * @returns A "copied" version of the image
 */
async function simulateSocialMediaCopying(sharedImage: Blob): Promise<Blob> {
  console.log('Simulating someone copying/downloading the shared image...');
  
  // In a real scenario, the image would be downloaded, possibly re-encoded,
  // saved by a third party, etc. For this example, we'll just create a copy.
  const imageArrayBuffer = await sharedImage.arrayBuffer();
  const copiedImage = new Blob([imageArrayBuffer], { type: sharedImage.type });
  
  console.log(`"Copied" image created (${copiedImage.size} bytes)`);
  
  return copiedImage;
}

/**
 * Verify ownership of a "copied" image
 * @param env Environment with initialized services
 * @param copiedImage The image to verify
 * @returns Verification result
 */
async function verifyImageOwnership(env: any, copiedImage: Blob): Promise<any> {
  console.log('Verifying ownership of the copied image...');
  
  // Use the social media export service to verify the image
  const verificationResult = await env.socialMediaExportService.verifyImageOwnership(copiedImage);
  
  if (verificationResult.verified) {
    console.log('✓ Image ownership VERIFIED');
    console.log(`Owner: ${verificationResult.currentOwner}`);
    console.log(`Asset ID: ${verificationResult.assetId}`);
    console.log(`Timestamp: ${verificationResult.timestamp}`);
  } else {
    console.log('✗ Image ownership FAILED verification');
    console.log('Errors:', verificationResult.errors);
    
    if (verificationResult.ownershipData) {
      console.log('Embedded data found but verification failed:');
      console.log(`Claimed owner: ${verificationResult.ownershipData.owner}`);
      console.log(`Asset ID: ${verificationResult.ownershipData.assetId}`);
    } else {
      console.log('No ownership data found in the image');
    }
  }
  
  return verificationResult;
}

/**
 * Run the full social media verification demo
 */
async function demonstrateSocialMediaVerification(): Promise<{
  assetId: string;
  verified: boolean;
  ownerMatches: boolean;
}> {
  try {
    // Initialize the environment
    const env = await initializeEnvironment();
    
    // Create a test asset with provenance tracking
    const assetId = await createTestAsset(env);
    
    // Prepare the asset for social media sharing
    const shareReadyAsset = await prepareForSocialMediaSharing(env, assetId);
    
    // Simulate someone copying/downloading the shared image
    const copiedImage = await simulateSocialMediaCopying(shareReadyAsset.imageBlob);
    
    // Verify ownership of the "copied" image
    const verificationResult = await verifyImageOwnership(env, copiedImage);
    
    return {
      assetId,
      verified: verificationResult.verified,
      ownerMatches: verificationResult.matchesBlockchain
    };
  } catch (error) {
    console.error('Error in social media verification demo:', error);
    throw error;
  }
}

// Add to window for manual execution
if (typeof window !== 'undefined') {
  (window as any).runSocialMediaVerificationDemo = demonstrateSocialMediaVerification;
  console.log('Social media verification demo ready! Call window.runSocialMediaVerificationDemo() to run it.');
}

// For TypeScript, define the Window interface extension
declare global {
  interface Window {
    runSocialMediaVerificationDemo: () => Promise<{
      assetId: string;
      verified: boolean;
      ownerMatches: boolean;
    }>;
  }
}

export { demonstrateSocialMediaVerification };
