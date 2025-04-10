/**
 * Collection Manager for compressed NFTs
 * Provides functionality for creating and managing compressed NFT collections
 */
import { CompressedNFTMerkleTree, MerkleLeaf } from './merkleTree';
import { AssetMetadata } from '../types/assets';
import { verifySignature, hashContent } from '../crypto/signatures';
import { Buffer } from 'buffer';
import { v4 as uuidv4 } from 'uuid';

/**
 * Interface for collection metadata
 */
export interface CollectionMetadata {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  creator: {
    name: string;
    id?: string;
  };
  size: number;
  merkleRoot: string;
  blockchainReference?: {
    chain: string;
    contractAddress?: string;
    txHash?: string;
    blockHeight?: number;
  };
}

/**
 * Interface for a compressed NFT collection
 */
export interface CompressedCollection {
  metadata: CollectionMetadata;
  tree: CompressedNFTMerkleTree;
}

/**
 * Manager for compressed NFT collections
 */
export class CompressedCollectionManager {
  private collections: Map<string, CompressedCollection> = new Map();
  private fileSystem: any; // Replace with your file system service type
  
  /**
   * Initialize the collection manager
   * @param fileSystem File system service for persisting collections
   */
  constructor(fileSystem: any) {
    this.fileSystem = fileSystem;
  }
  
  /**
   * Create a new compressed NFT collection
   * @param name Collection name
   * @param description Collection description
   * @param creator Creator information
   * @param assets Optional initial assets for the collection
   * @returns The created collection
   */
  public async createCollection(
    name: string,
    description: string,
    creator: { name: string, id?: string },
    assets: { metadata: AssetMetadata, contentHash: string }[] = []
  ): Promise<CompressedCollection> {
    // Create leaf entries for each asset
    const leaves: MerkleLeaf[] = assets.map(asset => 
      CompressedNFTMerkleTree.createLeafFromAsset(
        asset.metadata,
        asset.contentHash,
        asset.metadata.creator.id || asset.metadata.creator.name
      )
    );
    
    // Create the Merkle tree
    const tree = new CompressedNFTMerkleTree(leaves);
    
    // Create collection metadata
    const metadata: CollectionMetadata = {
      id: uuidv4(),
      name,
      description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      creator,
      size: leaves.length,
      merkleRoot: tree.getHexRoot()
    };
    
    // Create the collection
    const collection: CompressedCollection = {
      metadata,
      tree
    };
    
    // Store the collection
    this.collections.set(metadata.id, collection);
    await this.persistCollection(collection);
    
    return collection;
  }
  
  /**
   * Add an asset to an existing collection
   * @param collectionId The collection ID
   * @param asset The asset to add
   * @returns The updated collection
   */
  public async addAssetToCollection(
    collectionId: string,
    asset: { metadata: AssetMetadata, contentHash: string }
  ): Promise<CompressedCollection> {
    const collection = this.collections.get(collectionId);
    if (!collection) {
      throw new Error(`Collection ${collectionId} not found`);
    }
    
    // Create leaf for the asset
    const leaf = CompressedNFTMerkleTree.createLeafFromAsset(
      asset.metadata,
      asset.contentHash,
      asset.metadata.creator.id || asset.metadata.creator.name
    );
    
    // Add leaf to the tree
    collection.tree.addLeaf(leaf);
    
    // Update collection metadata
    collection.metadata.size += 1;
    collection.metadata.updatedAt = Date.now();
    collection.metadata.merkleRoot = collection.tree.getHexRoot();
    
    // Persist changes
    await this.persistCollection(collection);
    
    return collection;
  }
  
  /**
   * Add multiple assets to a collection in batch
   * @param collectionId The collection ID
   * @param assets The assets to add
   * @returns The updated collection
   */
  public async addAssetsToCollection(
    collectionId: string,
    assets: { metadata: AssetMetadata, contentHash: string }[]
  ): Promise<CompressedCollection> {
    const collection = this.collections.get(collectionId);
    if (!collection) {
      throw new Error(`Collection ${collectionId} not found`);
    }
    
    // Create leaves for the assets
    const leaves: MerkleLeaf[] = assets.map(asset => 
      CompressedNFTMerkleTree.createLeafFromAsset(
        asset.metadata,
        asset.contentHash,
        asset.metadata.creator.id || asset.metadata.creator.name
      )
    );
    
    // Add leaves to the tree
    collection.tree.addLeaves(leaves);
    
    // Update collection metadata
    collection.metadata.size += leaves.length;
    collection.metadata.updatedAt = Date.now();
    collection.metadata.merkleRoot = collection.tree.getHexRoot();
    
    // Persist changes
    await this.persistCollection(collection);
    
    return collection;
  }
  
  /**
   * Verify an asset is part of a collection
   * @param collectionId The collection ID
   * @param assetId The asset ID to verify
   * @returns Verification result
   */
  public verifyAssetInCollection(
    collectionId: string,
    assetId: string
  ): { verified: boolean, proof?: Buffer[] } {
    const collection = this.collections.get(collectionId);
    if (!collection) {
      return { verified: false };
    }
    
    // Find the asset in the collection
    const result = collection.tree.findAsset(assetId);
    return {
      verified: result.verified,
      proof: result.proof
    };
  }
  
  /**
   * Get a collection by ID
   * @param collectionId The collection ID
   * @returns The collection or undefined if not found
   */
  public getCollection(collectionId: string): CompressedCollection | undefined {
    return this.collections.get(collectionId);
  }
  
  /**
   * Get all collections
   * @returns Array of all collections
   */
  public getAllCollections(): CompressedCollection[] {
    return Array.from(this.collections.values());
  }
  
  /**
   * Persist a collection to storage
   * @param collection The collection to persist
   */
  private async persistCollection(collection: CompressedCollection): Promise<void> {
    try {
      // Export the tree data
      const treeData = collection.tree.exportTree();
      
      // Create the storage structure
      const storageData = {
        metadata: collection.metadata,
        treeData
      };
      
      // Write to file system
      await this.fileSystem.writeFile(
        `collections/${collection.metadata.id}.json`,
        JSON.stringify(storageData, null, 2)
      );
    } catch (error) {
      console.error('Failed to persist collection:', error);
      throw new Error(`Failed to persist collection: ${error}`);
    }
  }
  
  /**
   * Load collections from storage
   */
  public async loadCollections(): Promise<void> {
    try {
      // Get list of collection files
      const collectionFiles = await this.fileSystem.readDirectory('collections');
      
      for (const file of collectionFiles) {
        if (file.name.endsWith('.json')) {
          // Read the collection data
          const data = await this.fileSystem.readFile(`collections/${file.name}`);
          const parsedData = JSON.parse(data);
          
          // Reconstruct the Merkle tree
          const tree = CompressedNFTMerkleTree.importTree(parsedData.treeData);
          
          // Recreate the collection
          const collection: CompressedCollection = {
            metadata: parsedData.metadata,
            tree
          };
          
          // Add to in-memory storage
          this.collections.set(collection.metadata.id, collection);
        }
      }
    } catch (error) {
      console.error('Failed to load collections:', error);
    }
  }
  
  /**
   * Update blockchain reference for a collection
   * @param collectionId Collection ID
   * @param reference Blockchain reference data
   */
  public async updateBlockchainReference(
    collectionId: string,
    reference: {
      chain: string;
      contractAddress?: string;
      txHash?: string;
      blockHeight?: number;
    }
  ): Promise<CompressedCollection> {
    const collection = this.collections.get(collectionId);
    if (!collection) {
      throw new Error(`Collection ${collectionId} not found`);
    }
    
    // Update metadata
    collection.metadata.blockchainReference = reference;
    collection.metadata.updatedAt = Date.now();
    
    // Persist changes
    await this.persistCollection(collection);
    
    return collection;
  }
}
