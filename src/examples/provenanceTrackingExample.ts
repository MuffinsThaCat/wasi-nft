/**
 * Provenance Tracking Example
 * 
 * This example demonstrates how our system tracks asset provenance with blockchain anchoring,
 * allowing users to prove ownership of their assets even after they've left the marketplace.
 * 
 * The example shows:
 * 1. Creating a secure asset with blockchain registration
 * 2. Transferring the asset with blockchain-recorded provenance
 * 3. Generating a certificate of authenticity for the asset
 * 4. Verifying the ownership history both on and off-chain
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
import { ProvenanceTracker } from '../services/provenanceTracker';

/**
 * Initialize the services needed for the example
 */
async function initializeEnvironment() {
  console.log('Initializing provenance tracking environment...');
  
  // Set up filesystem and user IDs
  const fileSystem = new BrowserFileSystem();
  const creatorId = `creator_${Math.random().toString(36).substring(2, 10)}`;
  const buyerId = `buyer_${Math.random().toString(36).substring(2, 10)}`;
  
  console.log(`Creator ID: ${creatorId}`);
  console.log(`Buyer ID: ${buyerId}`);
  
  // Initialize creator's services
  const creatorAssetManager = new AssetManager({
    fileSystem,
    assetsDirectoryName: 'assets',
    metadataDirectoryName: 'metadata',
    userId: creatorId
  });
  await creatorAssetManager.initialize();
  
  const litService = new LitProtocolService(creatorId);
  const secureDirectoryManager = new SecureDirectoryManager(
    litService,
    fileSystem,
    creatorId
  );
  
  const ipfsService = new IPFSPinningService({
    apiKey: 'demo-key',
    apiSecret: 'demo-secret',
    endpoint: 'https://api.pinata.cloud/pinning/'
  });
  
  const blockchainIntegration = new BlockchainIntegration();
  const secureImageService = new SecureImageFormatService();
  
  const transferService = new TransferService(
    creatorAssetManager,
    blockchainIntegration,
    secureImageService
  );
  
  const marketplaceService = new MarketplaceService(
    creatorAssetManager,
    ipfsService,
    blockchainIntegration,
    transferService
  );
  
  const secureMarketplaceFlow = new SecureMarketplaceFlow(
    creatorAssetManager,
    ipfsService,
    marketplaceService,
    transferService,
    litService,
    secureDirectoryManager,
    fileSystem
  );
  
  // Initialize ProvenanceTracker
  const provenanceTracker = new ProvenanceTracker(
    blockchainIntegration,
    transferService,
    creatorAssetManager
  );
  
  // Initialize buyer's services
  const buyerLitService = new LitProtocolService(buyerId);
  const buyerSecureDirectoryManager = new SecureDirectoryManager(
    buyerLitService,
    fileSystem,
    buyerId
  );
  
  return {
    fileSystem,
    creatorId,
    buyerId,
    creatorAssetManager,
    litService,
    secureDirectoryManager,
    ipfsService,
    marketplaceService,
    transferService,
    secureMarketplaceFlow,
    provenanceTracker,
    buyerLitService,
    buyerSecureDirectoryManager,
    blockchainIntegration
  };
}

/**
 * Create a secure asset with blockchain registration
 */
async function createAssetWithProvenance(
  env: any
) {
  console.log('\n1. CREATING ASSET WITH BLOCKCHAIN REGISTRATION');
  console.log('-------------------------------------------');
  
  // Create a secure directory
  console.log('Selecting directory to secure...');
  const directoryHandle = await env.fileSystem.selectDirectory();
  if (!directoryHandle) {
    throw new Error('No directory selected');
  }
  
  const secureDirectory = await env.secureDirectoryManager.secureDirectory(directoryHandle.handle);
  console.log(`Directory secured with ID: ${secureDirectory.id}`);
  
  // Create a simple test asset (a canvas image)
  console.log('Creating test asset...');
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }
  
  // Draw something on the canvas
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#2ecc71');
  gradient.addColorStop(1, '#3498db');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.font = '32px Arial';
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.fillText('Blockchain-Anchored Asset', canvas.width / 2, canvas.height / 2 - 20);
  ctx.font = '18px Arial';
  ctx.fillText(`Created: ${new Date().toISOString()}`, canvas.width / 2, canvas.height / 2 + 20);
  
  // Convert to blob and file
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob!);
    }, 'image/png');
  });
  
  const file = new File([blob], 'blockchain-anchored-asset.png', { type: 'image/png' });
  
  // Create the asset
  const asset = await env.secureMarketplaceFlow.createSecureAsset(
    'Blockchain-Anchored Asset',
    'This asset has its provenance registered on the blockchain',
    file,
    secureDirectory.id
  );
  
  console.log(`Asset created with ID: ${asset.id}`);
  
  // Register provenance on blockchain
  console.log('Registering provenance on blockchain...');
  const provenanceChain = await env.provenanceTracker.registerAssetProvenance(
    asset.id,
    env.creatorId
  );
  
  console.log(`Provenance registered with ${provenanceChain.records.length} records`);
  console.log(`Blockchain verified: ${provenanceChain.blockchainVerified}`);
  
  return { asset, secureDirectory, provenanceChain };
}

/**
 * List the asset on marketplace
 */
async function listAssetOnMarketplace(
  env: any,
  asset: any,
  secureDirectory: any
) {
  console.log('\n2. LISTING ASSET ON MARKETPLACE');
  console.log('-------------------------------');
  
  // List the asset
  const listing = await env.secureMarketplaceFlow.createSecureListing(
    asset,
    secureDirectory.id,
    '1.0',
    'ETH',
    MarketplaceProvider.OUR_MARKETPLACE
  );
  
  console.log(`Asset listed with ID: ${listing.listing.id}`);
  console.log(`IPFS CID: ${listing.ipfsCid}`);
  
  return listing;
}

/**
 * Set up buyer's directory
 */
async function setupBuyerDirectory(
  env: any
) {
  console.log('\n3. SETTING UP BUYER DIRECTORY');
  console.log('-----------------------------');
  
  console.log('Selecting directory for buyer...');
  const directoryHandle = await env.fileSystem.selectDirectory();
  if (!directoryHandle) {
    throw new Error('No directory selected for buyer');
  }
  
  const buyerDirectory = await env.buyerSecureDirectoryManager.secureDirectory(directoryHandle.handle);
  console.log(`Buyer directory secured with ID: ${buyerDirectory.id}`);
  
  return buyerDirectory;
}

/**
 * Transfer the asset with blockchain-anchored provenance
 */
async function transferAssetWithProvenance(
  env: any,
  listing: any,
  buyerDirectory: any
) {
  console.log('\n4. TRANSFERRING ASSET WITH BLOCKCHAIN PROVENANCE');
  console.log('-----------------------------------------------');
  
  // Initiate transfer
  const transfer = await env.secureMarketplaceFlow.initiateSecureTransfer(
    listing.listing.id,
    env.buyerId,
    buyerDirectory.id
  );
  
  console.log(`Transfer initiated with ID: ${transfer.transferSession.id}`);
  
  // Complete the transfer
  const finalStatus = await env.secureMarketplaceFlow.completeSecureTransfer(
    transfer.transferSession.id
  );
  
  console.log(`Transfer completed with status: ${finalStatus}`);
  
  // In a real implementation, we'd get the deletion proof from the transfer
  // For demo purposes, we'll simulate it
  const deletionProof = {
    assetId: listing.listing.assetId,
    timestamp: Date.now(),
    fileHashes: ['hash1', 'hash2'],
    signatureFromOwner: 'demo_signature'
  };
  
  // Record the transfer in the provenance tracker
  console.log('Recording transfer in provenance tracker...');
  const updatedProvenance = await env.provenanceTracker.recordTransfer(
    transfer.transferSession,
    deletionProof
  );
  
  console.log(`Provenance updated with ${updatedProvenance.records.length} records`);
  console.log(`Latest owner: ${updatedProvenance.records[updatedProvenance.records.length - 1].owner}`);
  
  return { transfer, updatedProvenance };
}

/**
 * Generate and verify provenance certificate
 */
async function verifyProvenanceAndGenerateCertificate(
  env: any,
  asset: any,
  provenanceChain: any
) {
  console.log('\n5. VERIFYING PROVENANCE AND GENERATING CERTIFICATE');
  console.log('------------------------------------------------');
  
  // Verify provenance
  console.log('Verifying asset provenance...');
  const verificationResult = await env.provenanceTracker.verifyProvenance(asset.id);
  
  console.log(`Provenance verified: ${verificationResult.verified}`);
  console.log(`Blockchain verified: ${verificationResult.blockchainVerified}`);
  console.log(`Current owner: ${verificationResult.currentOwner}`);
  
  if (verificationResult.errors.length > 0) {
    console.log('Verification errors:');
    verificationResult.errors.forEach(error => console.log(` - ${error}`));
  }
  
  // Generate certificate
  console.log('\nGenerating certificate of authenticity...');
  const certificateResult = await env.provenanceTracker.generateCertificate(asset.id);
  
  if (certificateResult) {
    console.log('Certificate generated successfully');
    console.log(`Asset title: ${certificateResult.certificate.title}`);
    console.log(`Creator: ${certificateResult.certificate.creator}`);
    console.log(`Current owner: ${certificateResult.certificate.currentOwner}`);
    console.log(`Transfer history: ${certificateResult.certificate.transferHistory.length} records`);
    
    // In a real application, we'd save or display the certificate
    console.log('\nCertificate details:');
    console.log(JSON.stringify(certificateResult.certificate, null, 2));
  } else {
    console.log('Failed to generate certificate');
  }
  
  return { verificationResult, certificateResult };
}

/**
 * Demonstrate the complete flow
 */
export async function demonstrateProvenanceTracking() {
  try {
    // 1. Initialize environment
    const env = await initializeEnvironment();
    
    // 2. Create asset with blockchain registration
    const { asset, secureDirectory, provenanceChain } = await createAssetWithProvenance(env);
    
    // 3. List asset on marketplace
    const listing = await listAssetOnMarketplace(env, asset, secureDirectory);
    
    // 4. Set up buyer's directory
    const buyerDirectory = await setupBuyerDirectory(env);
    
    // 5. Transfer asset with blockchain-anchored provenance
    const { transfer, updatedProvenance } = await transferAssetWithProvenance(
      env,
      listing,
      buyerDirectory
    );
    
    // 6. Verify provenance and generate certificate
    const { verificationResult, certificateResult } = await verifyProvenanceAndGenerateCertificate(
      env,
      asset,
      updatedProvenance
    );
    
    console.log('\nPROVENANCE TRACKING DEMONSTRATION COMPLETED');
    console.log('------------------------------------------');
    console.log('1. Assets created in our system are registered on the blockchain');
    console.log('2. Even though assets remain in the user\'s filesystem, their provenance is anchored to the blockchain');
    console.log('3. When assets are transferred, the transfer is recorded on the blockchain');
    console.log('4. Users can prove ownership with certificates that reference blockchain transactions');
    console.log('5. This system provides true ownership verification even after assets leave our marketplace');
    
    return {
      assetId: asset.id,
      provenanceRecords: updatedProvenance.records.length,
      verificationSuccess: verificationResult.verified,
      certificateGenerated: !!certificateResult
    };
    
  } catch (error) {
    console.error('Error in provenance tracking demo:', error);
    throw error;
  }
}

// Add to window for manual execution
if (typeof window !== 'undefined') {
  window.runProvenanceDemo = demonstrateProvenanceTracking;
  console.log('Provenance tracking demo ready! Call window.runProvenanceDemo() to run it.');
}

// Declare the window property for TypeScript
declare global {
  interface Window {
    runProvenanceDemo: () => Promise<{
      assetId: string;
      provenanceRecords: number;
      verificationSuccess: boolean;
      certificateGenerated: boolean;
    }>;
  }
}
