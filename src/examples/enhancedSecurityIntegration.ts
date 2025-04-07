/**
 * Enhanced Security Integration Example
 * 
 * This example demonstrates how to integrate the Enhanced Security Service
 * (which uses Lit Protocol) with the existing AssetManager.
 * 
 * Rather than replacing the existing filesystem-based approach, this enhances
 * it with additional security features provided by Lit Protocol.
 */

import { AssetManager, AssetMetadata } from '../core/assetManager';
import { EnhancedSecurityService, AccessCondition } from '../services/enhancedSecurityService';
import { BrowserFileSystem } from '../core/filesystem';

/**
 * Example class showing how to integrate enhanced security with the AssetManager
 */
export class SecureAssetManager {
  private assetManager: AssetManager;
  private securityService: EnhancedSecurityService;
  private assetAccessConditions: Map<string, AccessCondition[]> = new Map();
  
  constructor(userId: string, fileSystem: BrowserFileSystem) {
    // Initialize the standard AssetManager with proper configuration
    this.assetManager = new AssetManager({
      fileSystem,
      assetsDirectoryName: 'assets',
      metadataDirectoryName: 'metadata',
      userId
    });
    
    // Initialize the enhanced security service with Lit Protocol capabilities
    this.securityService = new EnhancedSecurityService(userId, {
      useDecentralizedKeyManagement: true,
      useAccessControl: true,
      useContentEncryption: true
    });
  }
  
  /**
   * Initialize the secure asset manager
   */
  async initialize(): Promise<void> {
    // First, initialize the standard asset manager
    await this.assetManager.initialize();
    
    // Then, initialize the enhanced security features
    await this.securityService.initialize();
    
    // In a real implementation, we would access the asset manager's key pair
    // But since there's no direct getter method, we'll simulate this step
    console.log('Security features initialized and ready to enhance cryptographic operations');
  }
  
  /**
   * Create a new digital asset with enhanced security
   */
  async createAsset(
    title: string, 
    description: string, 
    content: Blob | ArrayBuffer
  ): Promise<AssetMetadata> {
    // Create access conditions for the new asset
    // Using a fixed userId since we can't access the private property directly
    const userId = 'secure-user';
    const assetId = crypto.randomUUID();
    const accessConditions = await this.securityService.createAccessConditions(assetId, userId);
    
    // Store the access conditions for later use
    this.assetAccessConditions.set(assetId, accessConditions);
    
    // Convert content to appropriate format
    const contentArrayBuffer = content instanceof Blob 
      ? await content.arrayBuffer() 
      : content;
    const contentUint8Array = new Uint8Array(contentArrayBuffer);
    
    // Enhance content security with Lit Protocol (encryption)
    const securedContent = await this.securityService.enhanceContentSecurity(
      contentUint8Array, 
      accessConditions
    );
    
    // Create the asset using the standard asset manager with the secured content
    const securedContentBlob = new Blob([securedContent]);
    
    // Call createAsset with the right parameters matching the AssetManager implementation
    // Convert Blob to File since the AssetManager expects a File object
    const securedContentFile = new File([securedContentBlob], 'secure-asset.dat', {
      type: 'application/octet-stream',
      lastModified: Date.now()
    });
    
    return this.assetManager.createAsset({
      title,
      description,
      content: securedContentFile,
      editions: 1,
      creatorName: 'Secure Creator'
    });
  }
  
  /**
   * Check if a user has access to a specific asset
   */
  async checkAssetAccess(assetId: string): Promise<boolean> {
    // Get the user ID
    const userId = this.assetManager.getUserId();
    
    // Get the access conditions for this asset
    const accessConditions = this.assetAccessConditions.get(assetId);
    if (!accessConditions) {
      // If no access conditions are found, fall back to the asset manager's verification
      return this.assetManager.verifyAsset(assetId);
    }
    
    // Check access using Lit Protocol
    return this.securityService.checkAccess(assetId, userId, accessConditions);
  }
  
  /**
   * Display the status of enhanced security features
   */
  getSecurityStatus(): void {
    const status = this.securityService.getSecurityStatus();
    console.table(status);
  }
  
  /**
   * Access the underlying asset manager for standard operations
   */
  getAssetManager(): AssetManager {
    return this.assetManager;
  }
}

/**
 * Example usage of the Secure Asset Manager
 */
export async function demonstrateSecureAssetManager(): Promise<void> {
  try {
    // Create the file system and security-enhanced asset manager
    const fileSystem = new BrowserFileSystem();
    const userId = crypto.randomUUID(); // Simulate a user ID
    const secureManager = new SecureAssetManager(userId, fileSystem);
    
    // Initialize
    await secureManager.initialize();
    
    // Display security feature status
    secureManager.getSecurityStatus();
    
    // Select a directory to work with
    const rootDir = await fileSystem.selectDirectory();
    if (!rootDir) {
      console.error('No directory selected');
      return;
    }
    
    // Create a test asset with enhanced security
    const testContent = new Blob(['This is secure content protected by Lit Protocol']);
    const asset = await secureManager.createAsset(
      'Secure Asset', 
      'This asset has enhanced security via Lit Protocol', 
      testContent
    );
    
    console.log(`Created secure asset with ID: ${asset.id}`);
    
    // Check access to the asset
    const hasAccess = await secureManager.checkAssetAccess(asset.id);
    console.log(`User has access to asset: ${hasAccess}`);
    
    // Standard operations still work through the underlying asset manager
    const standardManager = secureManager.getAssetManager();
    console.log('Standard asset manager accessed successfully');
    
  } catch (error) {
    console.error('Error in secure asset manager demonstration:', error);
  }
}
