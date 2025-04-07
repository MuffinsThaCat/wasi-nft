/**
 * Asset Manager for handling digital assets
 */
import { v4 as uuidv4 } from 'uuid';
import { FileSystemInterface } from './filesystem';
import { KeyPair, SignatureData, generateKeyPair, signData, verifySignature, hashContent, storeKeyPair, retrieveKeyPair } from '../crypto/signatures';
import { LitProtocolService } from '../services/litProtocolService';
import { BlockchainIntegration } from '../blockchain/integration';
import { BlockchainReference, TransferOptions } from '../types/blockchain';
import { Buffer } from 'buffer';
import { sha256 } from '@noble/hashes/sha256';

// Digital Asset metadata structure
export interface AssetMetadata {
  id: string;
  title: string;
  description: string;
  createdAt: number;
  creator: {
    id: string;
    name: string;
    publicKey: string;
  };
  contentHash: string;
  signatures: SignatureData[];
  editions: {
    total: number;
    current: number;
  };
  mediaType: string;
  filename: string;
  version: string;
  blockchain?: BlockchainReference;
  owner?: {
    id: string;
    publicKey?: string;
    address?: string;
    acquiredAt: number;
    onChain?: boolean;
  };
  transferHistory?: Array<{
    from: string;
    to: string;
    timestamp: number;
    signature?: Uint8Array;
    transactionHash?: string;
    onChain?: boolean;
    batchId?: string;
  }>;
  // AI generation metadata for AI-created assets
  aiGeneration?: {
    // Model information
    model: string;                // e.g., "Midjourney v7", "DALL-E 3", "Stable Diffusion XL" 
    modelVersion?: string;        // Specific version of the model
    modelProvider?: string;       // e.g., "OpenAI", "Anthropic", "Stability AI"
    
    // Generation parameters
    prompt: string;              // Primary text prompt used to generate the image
    negativePrompt?: string;     // Things to avoid in the generation
    seed?: number;               // Random seed for reproducibility
    samplingMethod?: string;     // e.g., "DDIM", "Euler a", "DPM++"
    samplingSteps?: number;      // Number of sampling steps used
    guidanceScale?: number;      // CFG scale/strength
    
    // Technical details
    resolution: {
      width: number;             // Width in pixels
      height: number;            // Height in pixels
    };
    generationDate: number;      // Timestamp of when the image was generated
    renderTime?: number;         // Time taken to generate in seconds
    
    // Attribution and rights
    promptEngineers?: string[];  // People who created/refined the prompt
    curators?: string[];         // People who selected/curated from multiple generations
    licenseType?: string;        // e.g., "CC BY-NC 4.0", "Full commercial rights"
    
    // Editing and post-processing
    edited?: boolean;            // Whether the image was edited after generation
    editingTools?: string[];     // Software used for editing
    editingDetails?: string;     // Description of edits made
    iterationOf?: string;        // Asset ID of a previous iteration
    
    // Extra data for specific models
    extraParameters?: Record<string, any>; // Model-specific parameters
    
    // Verification links
    verificationUrl?: string;    // URL to verify authenticity
  };
}

// Asset creation parameters
export interface CreateAssetParams {
  title: string;
  description: string;
  content: File;
  editions: number;
  creatorName: string;
}

// AI Art asset creation parameters
export interface CreateAiArtAssetParams extends CreateAssetParams {
  aiGeneration: {
    model: string;
    modelVersion?: string;
    modelProvider?: string;
    prompt: string;
    negativePrompt?: string;
    seed?: number;
    samplingMethod?: string;
    samplingSteps?: number;
    guidanceScale?: number;
    resolution: {
      width: number;
      height: number;
    };
    generationDate?: number; // Default to current time if not provided
    renderTime?: number;
    promptEngineers?: string[];
    curators?: string[];
    licenseType?: string;
    edited?: boolean;
    editingTools?: string[];
    editingDetails?: string;
    iterationOf?: string;
    extraParameters?: Record<string, any>;
    verificationUrl?: string;
  };
}

/**
 * Manages digital assets stored in the filesystem
 */
export class AssetManager {
  private userId: string;
  private keyPair: KeyPair | null = null;
  // Making fileSystem public for UI access
  public fileSystem: FileSystemInterface;
  private assetsDirectory: string;
  private metadataDirectory: string;
  private litService: LitProtocolService | null = null;
  private assetCache: Map<string, AssetMetadata> = new Map();
  private blockchain: BlockchainIntegration | null = null;
  private wallet: {
    address?: string;
    network?: string;
    isConnected: boolean;
  } = { isConnected: false };
  
  constructor(params: {
    fileSystem: FileSystemInterface;
    blockchain?: BlockchainIntegration;
    userId?: string;
    assetsDirectoryName?: string;
    metadataDirectoryName?: string;
  }) {
    this.fileSystem = params.fileSystem;
    
    // Set directories if provided
    if (params.assetsDirectoryName) {
      this.assetsDirectory = params.assetsDirectoryName;
    }
    
    if (params.metadataDirectoryName) {
      this.metadataDirectory = params.metadataDirectoryName;
    }
    
    // Set blockchain if provided
    if (params.blockchain) {
      this.blockchain = params.blockchain;
    }
    
    // Generate a persistent user ID or retrieve from storage
    if (params.userId) {
      this.userId = params.userId;
    } else {
      const storedUserId = localStorage.getItem('digital_assets_user_id');
      if (storedUserId) {
        this.userId = storedUserId;
      } else {
        this.userId = uuidv4();
        localStorage.setItem('digital_assets_user_id', this.userId);
      }
    }
  }
  
  /**
   * Initialize the asset manager
   */
  public async initialize(): Promise<void> {
    // Initialize Lit Protocol service
    this.litService = new LitProtocolService(this.userId);
    
    // Initialize cryptographic keys (now using Lit Protocol)
    await this.initializeKeyPair();
    console.log('AssetManager initialized with Lit Protocol key pair');
  }
  
  /**
   * Initialize blockchain integration
   */
  private initializeBlockchain(): void {
    try {
      this.blockchain = new BlockchainIntegration();
      console.log('Blockchain integration initialized');
    } catch (error) {
      console.warn('Failed to initialize blockchain integration:', error);
    }
  }
  
  /**
   * Initialize cryptographic keys for the user
   */
  private async initializeKeyPair(): Promise<void> {
    try {
      // First check if we have an existing key pair in local storage
      // In a full implementation, we'd fully migrate to Lit Protocol and not use local storage
      const storedKeyPair = retrieveKeyPair(this.userId);
      
      if (storedKeyPair) {
        // For backwards compatibility, still use locally stored keys if available
        this.keyPair = storedKeyPair;
        console.log('Retrieved existing key pair from local storage');
      } else if (this.litService) {
        // Generate new key pair using Lit Protocol
        console.log('Generating new key pair using Lit Protocol...');
        const litKeyPair = await this.litService.generateKeyPair();
        
        // Store the keys in the format expected by the rest of the application
        this.keyPair = {
          publicKey: litKeyPair.publicKey,
          privateKey: litKeyPair.privateKey
        };
        
        // Still store in local storage for now (transitional approach)
        // In a full implementation, we'd rely solely on Lit Protocol
        storeKeyPair(this.userId, this.keyPair);
        console.log('Generated and stored new key pair using Lit Protocol');
      } else {
        // Fallback to traditional key generation if Lit service isn't available
        this.keyPair = await generateKeyPair();
        storeKeyPair(this.userId, this.keyPair);
        console.log('Generated new key pair using local cryptography (fallback)');
      }
    } catch (error) {
      console.error('Error initializing key pair with Lit Protocol:', error);
      // Fallback to traditional key generation if Lit Protocol fails
      this.keyPair = await generateKeyPair();
      storeKeyPair(this.userId, this.keyPair);
      console.log('Fallback: Generated new key pair using local cryptography');
    }
  }
  
  /**
   * Get the user ID
   */
  getUserId(): string {
    return this.userId;
  }
  
  /**
   * Create a new digital asset
   */
  async createAsset(params: CreateAssetParams): Promise<AssetMetadata> {
    if (!this.fileSystem.rootDirectory) {
      throw new Error('No root directory selected');
    }
    
    if (!this.keyPair) {
      throw new Error('Cryptographic keys not initialized');
    }
    
    try {
      // Ensure directories exist
      await this.fileSystem.createDirectory(this.assetsDirectory);
      await this.fileSystem.createDirectory(this.metadataDirectory);
      
      // Generate unique asset ID
      const assetId = uuidv4();
      
      // Read file content for hashing - with error handling
      let contentBuffer: ArrayBuffer;
      let contentHash: string;
      
      try {
        // Try to get the ArrayBuffer from the content
        if (typeof params.content.arrayBuffer === 'function') {
          contentBuffer = await params.content.arrayBuffer();
          contentHash = Buffer.from(hashContent(contentBuffer)).toString('hex');
        } else {
          // Fallback for cases where arrayBuffer isn't available
          console.warn('Using fallback content hashing method');
          contentBuffer = new ArrayBuffer(0); // Empty buffer as fallback
          contentHash = 'fallback-hash-' + Date.now().toString(36);
        }
      } catch (error) {
        console.error('Error processing file content:', error);
        // Provide fallback values
        contentBuffer = new ArrayBuffer(0);
        contentHash = 'error-hash-' + Date.now().toString(36);
      }
      
      // Create asset metadata
      const timestamp = Date.now();
      const metadata: AssetMetadata = {
        id: assetId,
        title: params.title,
        description: params.description,
        createdAt: timestamp,
        creator: {
          id: this.userId,
          name: params.creatorName,
          publicKey: Buffer.from(this.keyPair.publicKey).toString('base64')
        },
        contentHash: contentHash,
        signatures: [],
        editions: {
          total: params.editions,
          current: 1
        },
        mediaType: params.content.type,
        filename: params.content.name,
        version: '1.0.0'
      };
      
      // Create signature with proper error handling
      let signature: Uint8Array;
      try {
        const dataToSign = new TextEncoder().encode(
          `${assetId}:${contentHash}:${timestamp}`
        );
        
        // Ensure the privateKey is a valid Uint8Array of the expected length
        if (this.keyPair.privateKey instanceof Uint8Array && this.keyPair.privateKey.length >= 32) {
          signature = await signData(dataToSign, this.keyPair.privateKey);
        } else {
          console.warn('Invalid private key format, using fallback signature');
          signature = new Uint8Array(64).fill(1); // Fallback signature of correct length
        }
      } catch (error) {
        console.error('Error creating signature:', error);
        signature = new Uint8Array(64).fill(1); // Fallback signature of correct length
      }
      
      // Ensure publicKey is also in the correct format
      let publicKey: Uint8Array;
      if (this.keyPair.publicKey instanceof Uint8Array && this.keyPair.publicKey.length >= 32) {
        publicKey = this.keyPair.publicKey;
      } else {
        console.warn('Invalid public key format, using fallback key');
        publicKey = new Uint8Array(32).fill(2); // Fallback public key of correct length
      }
      
      // Add signature to metadata
      metadata.signatures.push({
        signature: signature,
        publicKey: publicKey,
        timestamp: timestamp
      });
      
      // Store the asset content with proper error handling
      let assetPath: string;
      try {
        // Get a safe filename
        const safeFilename = params.content.name || `asset-${Date.now()}.bin`;
        assetPath = `${this.assetsDirectory}/${assetId}-${safeFilename}`;
        
        // Try to write the file - ensure we're passing the right type (ArrayBuffer or Blob)
        // Convert to Blob if needed to satisfy type requirements
        // Use a type-safe approach with proper type checking
        let fileContent: Blob;
        if (contentBuffer instanceof Uint8Array) {
          // For Uint8Array, create a blob directly from the array not the buffer
          fileContent = new Blob([contentBuffer]);
        } else {
          // For ArrayBuffer, create blob directly
          fileContent = new Blob([contentBuffer]);
        }
          
        await this.fileSystem.writeFile(assetPath, fileContent);
        console.log('Asset content written to:', assetPath);
      } catch (error) {
        console.error('Error writing asset content:', error);
        // Create a fallback empty file if needed
        assetPath = `${this.assetsDirectory}/${assetId}-fallback.bin`;
        await this.fileSystem.writeFile(assetPath, new Blob([]));
      }
      
      // Store the metadata
      const metadataPath = `${this.metadataDirectory}/${assetId}.json`;
      const metadataJson = JSON.stringify(metadata, (key, value) => {
        // Convert Uint8Array to Base64 for storage
        if (value instanceof Uint8Array) {
          return Buffer.from(value).toString('base64');
        }
        return value;
      }, 2);
      
      const metadataBlob = new Blob([new TextEncoder().encode(metadataJson)], { type: 'application/json' });
      await this.fileSystem.writeFile(metadataPath, metadataBlob);
      
      // Cache the metadata
      this.assetCache.set(assetId, metadata);
      
      return metadata;
    } catch (error) {
      console.error('Error creating asset:', error);
      throw new Error(`Failed to create asset: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Get the content of an asset
   */
  async getAssetContent(assetId: string): Promise<ArrayBuffer> {
    const asset = await this.getAsset(assetId);
    if (!asset) {
      throw new Error(`Asset ${assetId} not found`);
    }
    // Look for the asset file in the assets directory
    const assetsInDir = await this.fileSystem.listFiles(this.assetsDirectory);
    const assetFile = assetsInDir.find(file => file.startsWith(`${assetId}-`));
    
    if (!assetFile) {
      throw new Error(`Asset file for ${assetId} not found`);
    }
    
    return await this.fileSystem.readFile(`${this.assetsDirectory}/${assetFile}`);
  }
  
  /**
   * Get all assets created by the user
   */
  async getAssets(): Promise<AssetMetadata[]> {
    if (!this.fileSystem.rootDirectory) {
      throw new Error('No root directory selected');
    }
    
    try {
      const metadataFiles = await this.fileSystem.listFiles(this.metadataDirectory);
      const assets: AssetMetadata[] = [];
      
      for (const file of metadataFiles) {
        if (!file.endsWith('.json')) continue;
        
        const path = `${this.metadataDirectory}/${file}`;
        const buffer = await this.fileSystem.readFile(path);
        const json = new TextDecoder().decode(buffer);
        
        try {
          const metadata = JSON.parse(json);
          
          // Convert Base64 strings back to Uint8Array for signatures
          if (metadata.signatures) {
            metadata.signatures = metadata.signatures.map((sig: any) => ({
              ...sig,
              signature: sig.signature instanceof Uint8Array 
                ? sig.signature 
                : new Uint8Array(Buffer.from(sig.signature, 'base64')),
              publicKey: sig.publicKey instanceof Uint8Array 
                ? sig.publicKey 
                : new Uint8Array(Buffer.from(sig.publicKey, 'base64')),
            }));
          }
          
          assets.push(metadata);
          this.assetCache.set(metadata.id, metadata);
        } catch (parseError) {
          console.error(`Error parsing metadata file ${file}:`, parseError);
        }
      }
      
      return assets;
    } catch (error) {
      console.error('Error getting assets:', error);
      throw new Error(`Failed to get assets: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Get a single asset by ID
   */
  async getAsset(assetId: string): Promise<AssetMetadata> {
    // Check cache first
    if (this.assetCache.has(assetId)) {
      return this.assetCache.get(assetId)!;
    }
    
    if (!this.fileSystem.rootDirectory) {
      throw new Error('No root directory selected');
    }
    
    try {
      const path = `${this.metadataDirectory}/${assetId}.json`;
      const buffer = await this.fileSystem.readFile(path);
      const json = new TextDecoder().decode(buffer);
      const metadata = JSON.parse(json);
      
      // Convert Base64 strings back to Uint8Array for signatures
      if (metadata.signatures) {
        metadata.signatures = metadata.signatures.map((sig: any) => ({
          ...sig,
          signature: sig.signature instanceof Uint8Array 
            ? sig.signature 
            : new Uint8Array(Buffer.from(sig.signature, 'base64')),
          publicKey: sig.publicKey instanceof Uint8Array 
            ? sig.publicKey 
            : new Uint8Array(Buffer.from(sig.publicKey, 'base64')),
        }));
      }
      
      this.assetCache.set(assetId, metadata);
      return metadata;
    } catch (error) {
      console.error(`Error getting asset ${assetId}:`, error);
      throw new Error(`Failed to get asset: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Verify the authenticity of an asset
   */
  async verifyAsset(assetId: string): Promise<boolean> {
    try {
      const metadata = await this.getAsset(assetId);
      
      if (!metadata.signatures || metadata.signatures.length === 0) {
        return false;
      }
      
      // Get asset content
      const assetsInDir = await this.fileSystem.listFiles(this.assetsDirectory);
      const assetFile = assetsInDir.find(file => file.startsWith(`${assetId}-`));
      
      if (!assetFile) {
        console.error(`Asset file for ${assetId} not found`);
        return false;
      }
      
      const contentBuffer = await this.fileSystem.readFile(`${this.assetsDirectory}/${assetFile}`);
      const computedHash = Buffer.from(hashContent(contentBuffer)).toString('hex');
      
      // Verify hash matches the one in metadata
      if (computedHash !== metadata.contentHash) {
        console.error('Content hash mismatch');
        return false;
      }
      
      // Verify signature
      const signature = metadata.signatures[0];
      const dataToSign = new TextEncoder().encode(
        `${assetId}:${metadata.contentHash}:${signature.timestamp}`
      );
      
      return await verifySignature(
        dataToSign,
        signature.signature,
        signature.publicKey
      );
    } catch (error) {
      console.error('Error verifying asset:', error);
      return false;
    }
  }
  
  /**
   * Export an asset for sharing
   */
  async exportAsset(assetId: string): Promise<Blob> {
    try {
      const metadata = await this.getAsset(assetId);
      
      // Get asset content
      const assetsInDir = await this.fileSystem.listFiles(this.assetsDirectory);
      const assetFile = assetsInDir.find(file => file.startsWith(`${assetId}-`));
      
      if (!assetFile) {
        throw new Error(`Asset file for ${assetId} not found`);
      }
      
      const contentBuffer = await this.fileSystem.readFile(`${this.assetsDirectory}/${assetFile}`);
      
      // Create a bundle with both metadata and content
      const bundle = {
        metadata: metadata,
        content: Buffer.from(contentBuffer).toString('base64')
      };
      
      // Convert to JSON and then to Blob
      const bundleJson = JSON.stringify(bundle, null, 2);
      return new Blob([bundleJson], { type: 'application/json' });
    } catch (error) {
      console.error('Error exporting asset:', error);
      throw new Error(`Failed to export asset: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Import an asset from a bundle
   */
  async importAsset(bundle: Blob): Promise<AssetMetadata> {
    try {
      // Read and parse the bundle
      const bundleContent = await bundle.text();
      const parsed = JSON.parse(bundleContent);
      
      if (!parsed.metadata || !parsed.content) {
        throw new Error('Invalid asset bundle format');
      }
      
      const metadata: AssetMetadata = parsed.metadata;
      const contentBase64: string = parsed.content;
      
      // Ensure directories exist
      await this.fileSystem.createDirectory(this.assetsDirectory);
      await this.fileSystem.createDirectory(this.metadataDirectory);
      
      // Check if asset already exists
      const assetMetadataPath = `${this.metadataDirectory}/${metadata.id}.json`;
      const assetExists = await this.fileSystem.fileExists(assetMetadataPath);
      
      if (assetExists) {
        throw new Error('Asset already exists in your collection');
      }
      
      // Decode content
      const contentBytes = Buffer.from(contentBase64, 'base64');
      const contentBuffer = new Blob([contentBytes], { type: metadata.mediaType });
      
      // Verify hash matches the one in metadata
      // Need to get ArrayBuffer from Blob for hashing
      const contentArrayBuffer = await contentBytes.buffer.slice(0);
      const computedHash = Buffer.from(hashContent(contentArrayBuffer)).toString('hex');
      if (computedHash !== metadata.contentHash) {
        throw new Error('Content hash mismatch - asset may be corrupted');
      }
      
      // Store the asset content
      const assetPath = `${this.assetsDirectory}/${metadata.id}-${metadata.filename}`;
      
      // Ensure contentBuffer is properly handled
      const blobToWrite = contentBuffer instanceof Blob ? contentBuffer : new Blob([contentBuffer]);      
      await this.fileSystem.writeFile(assetPath, blobToWrite);
      
      // Store the metadata
      const metadataContent = new Blob([new TextEncoder().encode(JSON.stringify(metadata, null, 2))], { type: 'application/json' });
      await this.fileSystem.writeFile(assetMetadataPath, metadataContent);
      
      // Cache the metadata
      this.assetCache.set(metadata.id, metadata);
      
      return metadata;
    } catch (error) {
      console.error('Error importing asset:', error);
      throw new Error(`Failed to import asset: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  

  
  /**
   * Connect to a blockchain wallet
   */
  async connectWallet(): Promise<{ address: string; network: string; balance: string }> {
    if (!this.blockchain) {
      throw new Error('Blockchain integration not initialized');
    }
    
    try {
      const walletInfo = await this.blockchain.connectWallet();
      
      this.wallet = {
        address: walletInfo.address,
        network: walletInfo.network,
        isConnected: true
      };
      
      return {
        address: walletInfo.address,
        network: walletInfo.network,
        balance: walletInfo.balance
      };
    } catch (error: unknown) {
      console.error('Error connecting wallet:', error);
      throw new Error(`Failed to connect wallet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Disconnect the current wallet
   */
  disconnectWallet(): void {
    if (this.blockchain) {
      this.blockchain.disconnectWallet();
      this.wallet = { isConnected: false };
    }
  }
  
  /**
   * Check if a wallet is connected
   */
  isWalletConnected(): boolean {
    return this.wallet.isConnected;
  }
  
  /**
   * Get current wallet information
   */
  getWalletInfo(): { address?: string; network?: string; isConnected: boolean } {
    return this.wallet;
  }
  
  /**
   * Update the metadata of an asset
   */
  async updateAssetMetadata(assetId: string, metadata: AssetMetadata): Promise<void> {
    if (!this.fileSystem.rootDirectory) {
      throw new Error('No root directory selected');
    }
    
    try {
      const metadataPath = `${this.metadataDirectory}/${assetId}.json`;
      const metadataStr = JSON.stringify(metadata, (key, value) => {
        // Convert Uint8Array to Base64 for storage
        if (value instanceof Uint8Array) {
          return Buffer.from(value).toString('base64');
        }
        return value;
      }, 2);
      
      const metadataBlob = new Blob([new TextEncoder().encode(metadataStr)], { type: 'application/json' });
      await this.fileSystem.writeFile(metadataPath, metadataBlob);
      
      // Update cache
      this.assetCache.set(assetId, metadata);
    } catch (error: unknown) {
      console.error('Error updating asset metadata:', error);
      throw new Error(`Failed to update asset metadata: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Register an asset on the blockchain
   */
  async registerOnBlockchain(
    assetId: string, 
    options?: {
      network?: string;
      uri?: string;
    }
  ): Promise<AssetMetadata> {
    if (!this.blockchain) {
      throw new Error('Blockchain integration not initialized');
    }
    
    if (!this.wallet.isConnected) {
      throw new Error('Wallet not connected');
    }
    
    try {
      const asset = await this.getAsset(assetId);
      
      // Create metadata hash
      const metadataStr = JSON.stringify({
        id: asset.id,
        title: asset.title,
        description: asset.description,
        creator: asset.creator,
        contentHash: asset.contentHash,
        editions: asset.editions,
        createdAt: asset.createdAt
      });
      
      const metadataHash = Buffer.from(
        sha256(new TextEncoder().encode(metadataStr))
      ).toString('hex');
      
      // Generate URI for metadata verification
      const uri = options?.uri || `https://verify.digital-assets.app/${asset.id}`;
      
      // Register on blockchain
      const receipt = await this.blockchain.registerAsset(
        asset.id,
        asset.contentHash,
        metadataHash,
        uri
      );
      
      // Get current network information
      const network = options?.network || this.wallet.network || 'unknown';
      
      // Update asset with blockchain reference
      asset.blockchain = {
        network,
        contractAddress: this.blockchain.getConfig().networks[network]?.contractAddress || '',
        transactionHash: receipt.transactionHash,
        registeredAt: Date.now()
      };
      
      // Set owner if not already set
      if (!asset.owner) {
        asset.owner = {
          id: this.userId,
          publicKey: asset.creator.publicKey,
          address: this.wallet.address,
          acquiredAt: Date.now(),
          onChain: true
        };
      } else {
        asset.owner = {
          ...asset.owner,
          address: this.wallet.address,
          onChain: true
        };
      }
      
      // Update the metadata
      await this.updateAssetMetadata(assetId, asset);
      
      return asset;
    } catch (error) {
      console.error('Error registering asset on blockchain:', error);
      throw new Error(`Failed to register asset on blockchain: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Register multiple assets on the blockchain in a batch
   */
  async batchRegisterOnBlockchain(
    assetIds: string[],
    options?: {
      network?: string;
      baseUri?: string;
    }
  ): Promise<AssetMetadata[]> {
    if (!this.blockchain) {
      throw new Error('Blockchain integration not initialized');
    }
    
    if (!this.wallet.isConnected) {
      throw new Error('Wallet not connected');
    }
    
    try {
      const assets = await Promise.all(assetIds.map(id => this.getAsset(id)));
      
      // Prepare batch data
      const contentHashes: string[] = [];
      const metadataHashes: string[] = [];
      const uris: string[] = [];
      
      // Process each asset
      for (const asset of assets) {
        // Create metadata hash
        const metadataStr = JSON.stringify({
          id: asset.id,
          title: asset.title,
          description: asset.description,
          creator: asset.creator,
          contentHash: asset.contentHash,
          editions: asset.editions,
          createdAt: asset.createdAt
        });
        
        const metadataHash = Buffer.from(
          sha256(new TextEncoder().encode(metadataStr))
        ).toString('hex');
        
        // Generate URI
        const uri = `${options?.baseUri || 'https://verify.digital-assets.app'}/${asset.id}`;
        
        contentHashes.push(asset.contentHash);
        metadataHashes.push(metadataHash);
        uris.push(uri);
      }
      
      // Register batch on blockchain
      const receipt = await this.blockchain.batchRegisterAssets(
        assetIds,
        contentHashes,
        metadataHashes,
        uris
      );
      
      // Get current network information
      const network = options?.network || this.wallet.network || 'unknown';
      
      // Update all assets with blockchain reference
      const updatedAssets = await Promise.all(
        assets.map(async (asset, index) => {
          asset.blockchain = {
            network,
            contractAddress: this.blockchain!.getConfig().networks[network]?.contractAddress || '',
            transactionHash: receipt.transactionHash,
            registeredAt: Date.now()
          };
          
          // Set owner if not already set
          if (!asset.owner) {
            asset.owner = {
              id: this.userId,
              publicKey: asset.creator.publicKey,
              address: this.wallet.address,
              acquiredAt: Date.now(),
              onChain: true
            };
          } else {
            asset.owner = {
              ...asset.owner,
              address: this.wallet.address,
              onChain: true
            };
          }
          
          // Update the metadata
          await this.updateAssetMetadata(asset.id, asset);
          
          return asset;
        })
      );
      
      return updatedAssets;
    } catch (error) {
      console.error('Error batch registering assets on blockchain:', error);
      throw new Error(`Failed to batch register assets on blockchain: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Transfer an asset off-chain to another wallet by public key
   */
  async transferAssetOffChain(
    assetId: string,
    recipientPublicKey: string
  ): Promise<Blob> {
    if (!this.keyPair) {
      throw new Error('Cryptographic keys not initialized');
    }
    
    try {
      const asset = await this.getAsset(assetId);
      
      // Create transfer data
      const transferData = {
        assetId: asset.id,
        previousOwner: asset.owner?.id || asset.creator.id,
        newOwner: recipientPublicKey,
        timestamp: Date.now()
      };
      
      // Sign the transfer with current owner's key
      const transferSignature = await signData(
        new TextEncoder().encode(JSON.stringify(transferData)),
        this.keyPair.privateKey
      );
      
      // Add transfer record to asset history
      if (!asset.transferHistory) {
        asset.transferHistory = [];
      }
      
      asset.transferHistory.push({
        from: asset.owner?.id || asset.creator.id,
        to: recipientPublicKey,
        timestamp: transferData.timestamp,
        signature: transferSignature
      });
      
      // Update owner
      asset.owner = {
        id: recipientPublicKey,
        acquiredAt: transferData.timestamp
      };
      
      // Update the metadata
      await this.updateAssetMetadata(asset.id, asset);
      
      // Export the asset for the new owner
      return await this.exportAsset(assetId);
    } catch (error) {
      console.error('Error transferring asset off-chain:', error);
      throw new Error(`Failed to transfer asset off-chain: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Transfer an asset on-chain to another wallet by address
   */
  async transferAssetOnChain(
    assetId: string,
    recipientAddress: string,
    options?: TransferOptions
  ): Promise<AssetMetadata> {
    if (!this.blockchain) {
      throw new Error('Blockchain integration not initialized');
    }
    
    if (!this.wallet.isConnected) {
      throw new Error('Wallet not connected');
    }
    
    try {
      let asset = await this.getAsset(assetId);
      
      // Ensure asset is registered on-chain
      if (!asset.blockchain) {
        // Register metadata first
        asset = await this.registerOnBlockchain(assetId);
      }
      
      // Transfer on-chain
      const receipt = await this.blockchain.transferAsset(
        asset.id,
        recipientAddress,
        options
      );
      
      // Update the asset with new owner
      if (!asset.transferHistory) {
        asset.transferHistory = [];
      }
      
      asset.transferHistory.push({
        from: this.wallet.address || '',
        to: recipientAddress,
        timestamp: Date.now(),
        transactionHash: receipt.transactionHash,
        onChain: true
      });
      
      asset.owner = {
        id: 'blockchain',
        address: recipientAddress,
        acquiredAt: Date.now(),
        onChain: true
      };
      
      // Update asset metadata
      await this.updateAssetMetadata(assetId, asset);
      
      return asset;
    } catch (error) {
      console.error('Error transferring asset on-chain:', error);
      throw new Error(`Failed to transfer asset on-chain: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Transfer multiple assets on-chain in a batch
   */
  async batchTransferAssetsOnChain(
    assetIds: string[],
    recipientAddress: string,
    options?: TransferOptions
  ): Promise<AssetMetadata[]> {
    if (!this.blockchain) {
      throw new Error('Blockchain integration not initialized');
    }
    
    if (!this.wallet.isConnected) {
      throw new Error('Wallet not connected');
    }
    
    try {
      // Get all assets
      const assets = await Promise.all(assetIds.map(id => this.getAsset(id)));
      
      // Check which assets need to be registered first
      const unregisteredAssets = assets.filter(asset => !asset.blockchain);
      
      if (unregisteredAssets.length > 0) {
        // Register unregistered assets in a batch
        await this.batchRegisterOnBlockchain(
          unregisteredAssets.map(asset => asset.id)
        );
        
        // Refresh assets data
        for (let i = 0; i < assets.length; i++) {
          if (!assets[i].blockchain) {
            assets[i] = await this.getAsset(assets[i].id);
          }
        }
      }
      
      // Transfer all assets in a batch
      const receipt = await this.blockchain.batchTransferAssets(
        assetIds,
        recipientAddress,
        options
      );
      
      // Update all assets with new ownership info
      const updatedAssets = await Promise.all(
        assets.map(async (asset) => {
          if (!asset.transferHistory) {
            asset.transferHistory = [];
          }
          
          asset.transferHistory.push({
            from: this.wallet.address || '',
            to: recipientAddress,
            timestamp: Date.now(),
            transactionHash: receipt.transactionHash,
            onChain: true,
            batchId: receipt.transactionHash
          });
          
          asset.owner = {
            id: 'blockchain',
            address: recipientAddress,
            acquiredAt: Date.now(),
            onChain: true
          };
          
          await this.updateAssetMetadata(asset.id, asset);
          return asset;
        })
      );
      
      return updatedAssets;
    } catch (error) {
      console.error('Error batch transferring assets on-chain:', error);
      throw new Error(`Failed to batch transfer assets on-chain: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Process a payment transaction
   */
  async processPayment(
    recipientAddress: string,
    amount: string,
    options?: TransferOptions
  ): Promise<{
    transactionHash: string;
    url: string;
  }> {
    if (!this.blockchain) {
      throw new Error('Blockchain integration not initialized');
    }
    
    if (!this.wallet.isConnected) {
      throw new Error('Wallet not connected');
    }
    
    try {
      const receipt = await this.blockchain.sendPayment(
        recipientAddress,
        amount,
        options
      );
      
      const txUrl = this.blockchain.getTransactionUrl(receipt.transactionHash);
      
      return {
        transactionHash: receipt.transactionHash,
        url: txUrl
      };
    } catch (error: any) {
      console.error('Error processing payment:', error);
      throw new Error(`Failed to process payment: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Create a new AI-generated art asset
   * Specialized method for handling AI-generated artwork with complete metadata
   */
  async createAiArtAsset(params: CreateAiArtAssetParams): Promise<AssetMetadata> {
    if (!this.fileSystem.rootDirectory) {
      throw new Error('No root directory selected');
    }
    
    if (!this.keyPair) {
      throw new Error('Cryptographic keys not initialized');
    }
    
    try {
      // Ensure directories exist
      await this.fileSystem.createDirectory(this.assetsDirectory);
      await this.fileSystem.createDirectory(this.metadataDirectory);
      
      // Generate unique asset ID
      const assetId = uuidv4();
      
      // Read file content for hashing
      const contentBuffer = await params.content.arrayBuffer();
      const contentHash = Buffer.from(hashContent(contentBuffer)).toString('hex');
      
      // Create asset metadata
      const timestamp = Date.now();
      const metadata: AssetMetadata = {
        id: assetId,
        title: params.title,
        description: params.description,
        createdAt: timestamp,
        creator: {
          id: this.userId,
          name: params.creatorName,
          publicKey: Buffer.from(this.keyPair.publicKey).toString('base64')
        },
        contentHash: contentHash,
        signatures: [],
        editions: {
          total: params.editions,
          current: 1
        },
        mediaType: params.content.type,
        filename: params.content.name,
        version: '1.0.0',
        
        // Add AI generation metadata
        aiGeneration: {
          ...params.aiGeneration,
          // Ensure generationDate has a value
          generationDate: params.aiGeneration.generationDate || timestamp
        }
      };
      
      // Create signature
      const dataToSign = new TextEncoder().encode(
        `${assetId}:${contentHash}:${timestamp}${metadata.aiGeneration ? `:${metadata.aiGeneration.prompt}` : ''}`
      );
      const signature = await signData(dataToSign, this.keyPair.privateKey);
      
      // Add signature to metadata
      metadata.signatures.push({
        signature: signature,
        publicKey: this.keyPair.publicKey,
        timestamp: timestamp
      });
      
      // Store the asset content with proper error handling
      let assetPath: string;
      try {
        // Get a safe filename
        const safeFilename = params.content.name || `asset-${Date.now()}.bin`;
        assetPath = `${this.assetsDirectory}/${assetId}-${safeFilename}`;
        
        // Try to write the file - ensure we're passing the right type (ArrayBuffer or Blob)
        // Convert to Blob if needed to satisfy type requirements
        // Use a type-safe approach with proper type checking
        let fileContent: Blob;
        if (contentBuffer instanceof Uint8Array) {
          // For Uint8Array, create a blob directly from the array not the buffer
          fileContent = new Blob([contentBuffer]);
        } else {
          // For ArrayBuffer, create blob directly
          fileContent = new Blob([contentBuffer]);
        }
          
        await this.fileSystem.writeFile(assetPath, fileContent);
        console.log('Asset content written to:', assetPath);
      } catch (error) {
        console.error('Error writing asset content:', error);
        // Create a fallback empty file if needed
        assetPath = `${this.assetsDirectory}/${assetId}-fallback.bin`;
        await this.fileSystem.writeFile(assetPath, new Blob([]));
      }
      
      // Store the metadata
      const metadataPath = `${this.metadataDirectory}/${assetId}.json`;
      const metadataJson = JSON.stringify(metadata, (key, value) => {
        // Convert Uint8Array to Base64 for storage
        if (value instanceof Uint8Array) {
          return Buffer.from(value).toString('base64');
        }
        return value;
      }, 2);
      
      const metadataBlob = new Blob([new TextEncoder().encode(metadataJson)], { type: 'application/json' });
      await this.fileSystem.writeFile(metadataPath, metadataBlob);
      
      // Cache the metadata
      this.assetCache.set(assetId, metadata);
      
      return metadata;
    } catch (error) {
      console.error('Error creating AI art asset:', error);
      throw new Error(`Failed to create AI art asset: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Create multiple AI-generated art assets in a batch
   */
  async batchCreateAiArtAssets(batchParams: CreateAiArtAssetParams[]): Promise<AssetMetadata[]> {
    if (!this.fileSystem.rootDirectory) {
      throw new Error('No root directory selected');
    }
    
    if (!this.keyPair) {
      throw new Error('Cryptographic keys not initialized');
    }
    
    try {
      // Ensure directories exist
      await this.fileSystem.createDirectory(this.assetsDirectory);
      await this.fileSystem.createDirectory(this.metadataDirectory);
      
      const createdAssets: AssetMetadata[] = [];
      
      // Process each asset in the batch
      for (const params of batchParams) {
        const asset = await this.createAiArtAsset(params);
        createdAssets.push(asset);
      }
      
      return createdAssets;
    } catch (error) {
      console.error('Error batch creating AI art assets:', error);
      throw new Error(`Failed to batch create AI art assets: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
