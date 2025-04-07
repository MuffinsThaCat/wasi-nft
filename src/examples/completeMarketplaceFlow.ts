/**
 * Complete Marketplace Flow Example
 * 
 * This example demonstrates the entire flow from:
 * 1. Creating a secure asset in a directory protected by Lit Protocol
 * 2. Listing it on a marketplace with temporary IPFS storage
 * 3. Transferring it to another user with secure permission handover
 * 4. Cleaning up IPFS content after successful transfer
 */

import { BrowserFileSystem } from '../core/filesystem';
import { AssetManager } from '../core/assetManager';
import { LitProtocolService, PermissionLevel } from '../services/litProtocolService';
import { SecureDirectoryManager } from '../services/secureDirectoryManager';
import { IPFSPinningService } from '../services/ipfsService';
import { MarketplaceService, MarketplaceProvider } from '../services/marketplaceService';
import { TransferService } from '../services/transferService';
import { SecureMarketplaceFlow } from '../services/secureMarketplaceFlow';
import { BlockchainIntegration } from '../blockchain/integration';
import { SecureImageFormatService } from '../services/secureImageFormat';

/**
 * Initialize the complete application environment
 */
async function initializeEnvironment() {
  console.log('Initializing the complete marketplace environment...');

  // 1. Set up filesystem and core components
  const fileSystem = new BrowserFileSystem();
  
  // User IDs for demo
  const creatorId = `creator_${Math.random().toString(36).substring(2, 10)}`;
  const buyerId = `buyer_${Math.random().toString(36).substring(2, 10)}`;
  
  console.log(`Creator ID: ${creatorId}`);
  console.log(`Buyer ID: ${buyerId}`);
  
  // 2. Initialize services for the creator
  // Asset Manager
  const creatorAssetManager = new AssetManager({
    fileSystem,
    assetsDirectoryName: 'assets',
    metadataDirectoryName: 'metadata',
    userId: creatorId
  });
  await creatorAssetManager.initialize();
  
  // Lit Protocol Service
  const litService = new LitProtocolService(creatorId);
  
  // Secure Directory Manager
  const secureDirectoryManager = new SecureDirectoryManager(
    litService,
    fileSystem,
    creatorId
  );
  
  // Integration services
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
  
  // 3. Create the complete secure flow service
  const secureMarketplaceFlow = new SecureMarketplaceFlow(
    creatorAssetManager,
    ipfsService,
    marketplaceService,
    transferService,
    litService,
    secureDirectoryManager,
    fileSystem
  );
  
  // 4. Initialize buyer's services
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
    buyerLitService,
    buyerSecureDirectoryManager
  };
}

/**
 * Create a secure directory and asset
 */
async function createSecureAsset(
  fileSystem: BrowserFileSystem,
  secureDirectoryManager: SecureDirectoryManager,
  secureMarketplaceFlow: SecureMarketplaceFlow
) {
  console.log('\n1. CREATING SECURE ASSET');
  console.log('---------------------------');
  
  // 1. Select and secure a directory
  console.log('Please select a directory to secure...');
  const directoryHandle = await fileSystem.selectDirectory();
  if (!directoryHandle) {
    throw new Error('No directory selected');
  }
  
  console.log(`Selected directory: ${directoryHandle.name}`);
  
  // 2. Secure the directory with Lit Protocol
  const secureDirectory = await secureDirectoryManager.secureDirectory(directoryHandle.handle);
  console.log(`Directory secured with ID: ${secureDirectory.id}`);
  
  // 3. Create a demo asset in the secure directory
  const assetContent = new File(
    [new Blob(['This is a secure digital asset protected by Lit Protocol'])],
    'secure-asset.txt',
    { type: 'text/plain' }
  );
  
  const asset = await secureMarketplaceFlow.createSecureAsset(
    'My Secure Digital Asset',
    'This asset demonstrates the filesystem-first NFT approach with Lit Protocol security',
    assetContent,
    secureDirectory.id
  );
  
  console.log(`Asset created with ID: ${asset.id}`);
  
  return { secureDirectory, asset };
}

/**
 * List the asset on the marketplace
 */
async function listAssetOnMarketplace(
  secureMarketplaceFlow: SecureMarketplaceFlow,
  asset: any,
  secureDirectory: any
) {
  console.log('\n2. LISTING ASSET ON MARKETPLACE');
  console.log('-------------------------------');
  
  // Create a marketplace listing with IPFS integration
  const listing = await secureMarketplaceFlow.createSecureListing(
    asset,
    secureDirectory.id,
    '0.5', // Price in ETH
    'ETH',
    MarketplaceProvider.OUR_MARKETPLACE
  );
  
  console.log('Asset listed successfully!');
  console.log(`Listing ID: ${listing.listing.id}`);
  console.log(`IPFS CID: ${listing.ipfsCid}`);
  console.log(`IPFS URL: https://ipfs.io/ipfs/${listing.ipfsCid}`);
  
  return listing;
}

/**
 * Create a secure directory for the buyer
 */
async function createBuyerSecureDirectory(
  fileSystem: BrowserFileSystem,
  buyerSecureDirectoryManager: SecureDirectoryManager
) {
  console.log('\n3. SETTING UP BUYER DIRECTORY');
  console.log('-----------------------------');
  
  console.log('Please select a directory for the buyer...');
  const directoryHandle = await fileSystem.selectDirectory();
  if (!directoryHandle) {
    throw new Error('No directory selected for buyer');
  }
  
  console.log(`Selected buyer directory: ${directoryHandle.name}`);
  
  // Secure the directory with Lit Protocol for the buyer
  const buyerDirectory = await buyerSecureDirectoryManager.secureDirectory(directoryHandle.handle);
  console.log(`Buyer directory secured with ID: ${buyerDirectory.id}`);
  
  return buyerDirectory;
}

/**
 * Initiate and complete the secure transfer
 */
async function transferAssetSecurely(
  secureMarketplaceFlow: SecureMarketplaceFlow,
  listing: any,
  buyerId: string,
  buyerDirectory: any
) {
  console.log('\n4. TRANSFERRING ASSET SECURELY');
  console.log('------------------------------');
  
  // Initiate the secure transfer
  const transfer = await secureMarketplaceFlow.initiateSecureTransfer(
    listing.listing.id,
    buyerId,
    buyerDirectory.id
  );
  
  console.log(`Transfer initiated with ID: ${transfer.transferSession.id}`);
  console.log(`Current status: ${transfer.transferSession.status}`);
  
  // Complete the transfer
  const finalStatus = await secureMarketplaceFlow.completeSecureTransfer(
    transfer.transferSession.id
  );
  
  console.log(`Transfer completed with status: ${finalStatus}`);
  console.log('IPFS content has been automatically unpinned');
  
  return { transfer, finalStatus };
}

/**
 * Verify the final state
 */
async function verifyFinalState(
  secureMarketplaceFlow: SecureMarketplaceFlow,
  ipfsService: IPFSPinningService,
  listing: any
) {
  console.log('\n5. VERIFYING FINAL STATE');
  console.log('------------------------');
  
  // Check if the listing has been marked as sold
  const allListings = secureMarketplaceFlow.getSecureListings();
  const activeListing = allListings.find(l => l.listing.id === listing.listing.id);
  
  console.log(`Listing still active: ${activeListing ? 'Yes' : 'No'}`);
  
  // Check if IPFS content has been cleaned up
  const isPinned = await ipfsService.isPinned(listing.ipfsCid);
  console.log(`Content still on IPFS: ${isPinned ? 'Yes' : 'No'}`);
  
  // Summary
  console.log('\nFINAL SUMMARY:');
  console.log('1. Asset was created in a secure directory protected by Lit Protocol');
  console.log('2. Asset was listed on the marketplace with IPFS integration');
  console.log('3. Asset was transferred to the buyer with secure permission handover');
  console.log('4. IPFS content was automatically cleaned up after successful transfer');
  console.log('5. Marketplace listing was marked as sold');
  
  return {
    listingActive: !!activeListing,
    ipfsContentRemoved: !isPinned
  };
}

/**
 * Run the complete end-to-end flow
 */
export async function demonstrateCompleteFlow() {
  try {
    // 1. Initialize everything
    const env = await initializeEnvironment();
    
    // 2. Create a secure asset
    const { secureDirectory, asset } = await createSecureAsset(
      env.fileSystem,
      env.secureDirectoryManager,
      env.secureMarketplaceFlow
    );
    
    // 3. List the asset on the marketplace
    const listing = await listAssetOnMarketplace(
      env.secureMarketplaceFlow,
      asset,
      secureDirectory
    );
    
    // 4. Create a secure directory for the buyer
    const buyerDirectory = await createBuyerSecureDirectory(
      env.fileSystem,
      env.buyerSecureDirectoryManager
    );
    
    // 5. Transfer the asset securely
    const transferResult = await transferAssetSecurely(
      env.secureMarketplaceFlow,
      listing,
      env.buyerId,
      buyerDirectory
    );
    
    // 6. Verify the final state
    await verifyFinalState(
      env.secureMarketplaceFlow,
      env.ipfsService,
      listing
    );
    
    console.log('\nEnd-to-end flow demonstration completed successfully!');
    
  } catch (error) {
    console.error('Error in complete flow demonstration:', error);
  }
}

// Add to window for manual execution
if (typeof window !== 'undefined') {
  window.runCompleteMarketplaceFlow = demonstrateCompleteFlow;
  console.log('Complete marketplace flow demo ready! Call window.runCompleteMarketplaceFlow() to run it.');
}

// Declare the window property for TypeScript
declare global {
  interface Window {
    runCompleteMarketplaceFlow: () => Promise<void>;
  }
}
