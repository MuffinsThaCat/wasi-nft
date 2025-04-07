/**
 * Secure Directory Example with Lit Protocol
 * 
 * This example demonstrates how to use the SecureDirectoryManager to
 * create and share secure directories using Lit Protocol for decentralized
 * access control with your filesystem-based digital assets.
 */

// Declare the custom window property for TypeScript
declare global {
  interface Window {
    runSecureDirectoryDemo: () => Promise<void>;
  }
}

import { BrowserFileSystem } from '../core/filesystem';
import { LitProtocolService, PermissionLevel } from '../services/litProtocolService';
import { SecureDirectoryManager } from '../services/secureDirectoryManager';
import { AssetManager } from '../core/assetManager';

/**
 * Initialize a secure filesystem with Lit Protocol permissions
 */
async function initializeSecureFilesystem() {
  try {
    console.log('Initializing secure filesystem with Lit Protocol permissions...');
    
    // Initialize the browser filesystem
    const fileSystem = new BrowserFileSystem();
    
    // Generate a user ID (in a real app, this would come from authentication)
    const userId = `user_${Math.random().toString(36).substring(2, 10)}`;
    console.log(`User ID: ${userId}`);
    
    // Initialize Lit Protocol service
    const litService = new LitProtocolService(userId);
    
    // Initialize the secure directory manager
    const secureDirectoryManager = new SecureDirectoryManager(
      litService,
      fileSystem,
      userId
    );
    
    // Create the standard asset manager 
    const assetManager = new AssetManager({
      fileSystem,
      assetsDirectoryName: 'assets',
      metadataDirectoryName: 'metadata',
      userId
    });
    
    // Initialize asset manager (sets up cryptographic keys)
    await assetManager.initialize();
    console.log('Asset manager initialized with cryptographic keys');
    
    return {
      fileSystem,
      litService,
      secureDirectoryManager,
      assetManager,
      userId
    };
  } catch (error) {
    console.error('Error initializing secure filesystem:', error);
    throw error;
  }
}

/**
 * Create a secure directory and set up permissions
 */
async function createSecureDirectory(
  secureDirectoryManager: SecureDirectoryManager, 
  fileSystem: BrowserFileSystem
) {
  try {
    console.log('Select a directory to secure...');
    
    // Ask user to select a directory
    const directoryHandle = await fileSystem.selectDirectory();
    if (!directoryHandle) {
      console.error('No directory selected');
      return null;
    }
    
    console.log(`Selected directory: ${directoryHandle.name}`);
    
    // Secure the directory with Lit Protocol
    const secureDirectory = await secureDirectoryManager.secureDirectory(directoryHandle.handle);
    
    console.log('Directory secured successfully!');
    console.log('Directory ID:', secureDirectory.id);
    console.log('Owner:', secureDirectory.ownerAddress);
    
    return secureDirectory;
  } catch (error) {
    console.error('Error creating secure directory:', error);
    return null;
  }
}

/**
 * Share a secure directory with another user
 */
async function shareDirectoryWithUser(
  secureDirectoryManager: SecureDirectoryManager,
  directoryId: string,
  recipientUserId: string
) {
  try {
    console.log(`Sharing directory ${directoryId} with user ${recipientUserId}...`);
    
    // Share with READ permission that expires in 7 days
    const success = await secureDirectoryManager.shareDirectory(
      directoryId,
      recipientUserId,
      PermissionLevel.READ,
      7 // Expires in 7 days
    );
    
    if (success) {
      console.log('Directory shared successfully!');
      
      // Get and display all permissions for this directory
      const permissions = await secureDirectoryManager.getDirectoryPermissions(directoryId);
      console.log('Current directory permissions:');
      console.table(permissions);
    } else {
      console.error('Failed to share directory');
    }
    
    return success;
  } catch (error) {
    console.error('Error sharing directory:', error);
    return false;
  }
}

/**
 * Create an asset in a secure directory
 */
async function createAssetInSecureDirectory(
  assetManager: AssetManager,
  secureDirectoryManager: SecureDirectoryManager,
  directoryId: string
) {
  try {
    // First, verify directory access
    const hasAccess = await secureDirectoryManager.verifyDirectoryAccess(
      directoryId,
      PermissionLevel.WRITE // Need write permission to create assets
    );
    
    if (!hasAccess) {
      console.error('No permission to create assets in this directory');
      return null;
    }
    
    console.log('Creating new asset in secure directory...');
    
    // Create a simple text asset
    const assetContent = new File(
      [new Blob(['This is a secure asset protected by Lit Protocol directory permissions'])],
      'secure-text.txt',
      { type: 'text/plain' }
    );
    
    // Create the asset using the asset manager
    const asset = await assetManager.createAsset({
      title: 'Secure Directory Asset',
      description: 'This asset is protected by Lit Protocol directory permissions',
      content: assetContent,
      editions: 1,
      creatorName: 'Secure Creator'
    });
    
    console.log('Asset created successfully!');
    console.log('Asset ID:', asset.id);
    
    return asset;
  } catch (error) {
    console.error('Error creating asset in secure directory:', error);
    return null;
  }
}

/**
 * Access an asset with permission verification
 */
async function accessSecureAsset(
  assetManager: AssetManager,
  secureDirectoryManager: SecureDirectoryManager,
  directoryId: string,
  assetId: string
) {
  try {
    // First, verify directory access
    const hasAccess = await secureDirectoryManager.verifyDirectoryAccess(
      directoryId,
      PermissionLevel.READ // Need read permission to access assets
    );
    
    if (!hasAccess) {
      console.error('No permission to access assets in this directory');
      return false;
    }
    
    console.log(`Accessing asset ${assetId} in secure directory...`);
    
    // Access the asset through the asset manager
    // We could add additional verification here for asset-specific permissions
    const assetMetadata = await assetManager.getAsset(assetId);
    
    if (!assetMetadata) {
      console.error('Asset not found');
      return false;
    }
    
    console.log('Asset accessed successfully!');
    console.log('Asset metadata:', assetMetadata);
    
    return true;
  } catch (error) {
    console.error('Error accessing secure asset:', error);
    return false;
  }
}

/**
 * Demonstrate the complete secure directory workflow
 */
export async function demonstrateSecureDirectory() {
  try {
    // Initialize everything
    const { 
      fileSystem, 
      litService, 
      secureDirectoryManager, 
      assetManager, 
      userId 
    } = await initializeSecureFilesystem();
    
    // Create a secure directory
    const secureDirectory = await createSecureDirectory(secureDirectoryManager, fileSystem);
    if (!secureDirectory) return;
    
    // Create a second user for sharing demonstration
    const friendUserId = `user_${Math.random().toString(36).substring(2, 10)}`;
    console.log(`Friend user ID: ${friendUserId}`);
    
    // Share the directory with the friend
    await shareDirectoryWithUser(secureDirectoryManager, secureDirectory.id, friendUserId);
    
    // Create an asset in the secure directory
    const asset = await createAssetInSecureDirectory(
      assetManager,
      secureDirectoryManager,
      secureDirectory.id
    );
    if (!asset) return;
    
    // Simulate the friend accessing the asset
    console.log('\nSimulating friend access:');
    const simulatedFriendLitService = new LitProtocolService(friendUserId);
    const simulatedFriendDirectoryManager = new SecureDirectoryManager(
      simulatedFriendLitService,
      fileSystem,
      friendUserId
    );
    
    // Friend should be able to read but not modify
    const canRead = await simulatedFriendDirectoryManager.verifyDirectoryAccess(
      secureDirectory.id,
      PermissionLevel.READ
    );
    console.log(`Friend can read directory: ${canRead}`);
    
    const canWrite = await simulatedFriendDirectoryManager.verifyDirectoryAccess(
      secureDirectory.id,
      PermissionLevel.WRITE
    );
    console.log(`Friend can modify directory: ${canWrite}`);
    
    // Revoke friend's access
    console.log('\nRevoking friend access:');
    await secureDirectoryManager.revokeAccess(secureDirectory.id, friendUserId);
    
    // Verify access has been revoked
    const accessAfterRevoke = await simulatedFriendDirectoryManager.verifyDirectoryAccess(
      secureDirectory.id,
      PermissionLevel.READ
    );
    console.log(`Friend can still access after revocation: ${accessAfterRevoke}`);
    
    console.log('\nSecure directory demonstration complete!');
  } catch (error) {
    console.error('Error in secure directory demonstration:', error);
  }
}

// Run the demonstration when this module is executed directly
if (typeof window !== 'undefined') {
  window.runSecureDirectoryDemo = demonstrateSecureDirectory;
  console.log('Secure directory demo ready! Call window.runSecureDirectoryDemo() to run it.');
}
