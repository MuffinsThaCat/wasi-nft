/**
 * AI Data Manager Service
 * Manages AI training data as verifiable digital assets with NFT capabilities
 */
import { v4 as uuidv4 } from 'uuid';
import { sha256 } from '@noble/hashes/sha256';
import { Buffer } from 'buffer';
import * as ed25519 from '@noble/ed25519';

import { AIDataItem, AIDataItemMetadata, AIDataset, AIDatasetMetadata } from '../types/aiData';
import { CompressedNFTMerkleTree, MerkleLeaf } from '../merkle/merkleTree';
import { CompressedCollectionManager, CollectionMetadata } from '../merkle/collectionManager';
import { CompressedNFTService } from '../blockchain/compressedNFT';
import { hashContent, signData, verifySignature } from '../crypto/signatures';

interface FileSystemInterface {
  writeFile(path: string, data: string | ArrayBuffer): Promise<void>;
  readFile(path: string): Promise<any>;
  readDirectory(path: string): Promise<any[]>;
  deleteFile(path: string): Promise<void>;
  createDirectory(path: string): Promise<void>;
}

/**
 * Service for managing AI data assets and datasets
 */
export class AIDataManager {
  private fileSystem: FileSystemInterface;
  private compressedCollectionManager: CompressedCollectionManager | null = null;
  private blockchainService: CompressedNFTService | null = null;
  
  constructor(fileSystem: FileSystemInterface) {
    this.fileSystem = fileSystem;
  }
  
  /**
   * Set the compressed collection manager for NFT integration
   */
  public setCompressedCollectionManager(manager: CompressedCollectionManager): void {
    this.compressedCollectionManager = manager;
  }
  
  /**
   * Set the blockchain service for on-chain registration
   */
  public setBlockchainService(service: CompressedNFTService): void {
    this.blockchainService = service;
  }
  
  /**
   * Create a new AI data item 
   */
  public async createDataItem(
    content: ArrayBuffer, 
    metadata: Partial<AIDataItemMetadata>,
    privateKey: Uint8Array
  ): Promise<AIDataItem> {
    // Generate hash of content
    const contentHash = Buffer.from(await this.hashData(content)).toString('hex');
    
    // Create complete metadata
    const completeMetadata: AIDataItemMetadata = {
      id: metadata.id || uuidv4(),
      title: metadata.title || 'Untitled Data',
      description: metadata.description || '',
      dataType: metadata.dataType || 'mixed',
      contentType: metadata.contentType || 'application/octet-stream',
      size: content.byteLength,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      creator: metadata.creator || { name: 'Unknown' },
      license: metadata.license || 'All Rights Reserved',
      tags: metadata.tags || [],
      usageRestrictions: metadata.usageRestrictions || [],
      aiApplications: metadata.aiApplications || [],
      verificationMethod: metadata.verificationMethod || 'both',
      contentHash,
      // Add required fields for AssetMetadata compatibility
      editions: 1,
      signatures: {
        creator: Buffer.from(privateKey).toString('base64').substring(0, 10) + '...',
        timestamp: Date.now().toString()
      },
      ...metadata
    };
    
    // Generate signature for the metadata
    const metadataBytes = new TextEncoder().encode(JSON.stringify(completeMetadata));
    const signature = await signData(metadataBytes, privateKey);
    
    // Store the data item
    await this.storeDataItem({
      metadata: completeMetadata,
      content
    }, signature);
    
    return {
      metadata: completeMetadata,
      content
    };
  }
  
  /**
   * Store a data item in the filesystem
   */
  private async storeDataItem(item: AIDataItem, signature: Uint8Array): Promise<void> {
    try {
      // Ensure directories exist
      await this.ensureDirectories();
      
      // Store metadata with signature
      const metadataWithSig = {
        ...item.metadata,
        signature: Buffer.from(signature).toString('base64')
      };
      
      // Write metadata file
      await this.fileSystem.writeFile(
        `ai-data/items/${item.metadata.id}.json`,
        JSON.stringify(metadataWithSig, null, 2)
      );
      
      // Write content file
      await this.fileSystem.writeFile(
        `ai-data/content/${item.metadata.id}.data`,
        // Ensure we're passing an ArrayBuffer
        Buffer.isBuffer(item.content) ? item.content.buffer : item.content
      );
      
      console.log(`Data item ${item.metadata.id} stored successfully`);
    } catch (error) {
      console.error('Failed to store data item:', error);
      throw new Error(`Failed to store data item: ${error}`);
    }
  }
  
  /**
   * Ensure required directories exist
   */
  private async ensureDirectories(): Promise<void> {
    try {
      await this.fileSystem.createDirectory('ai-data');
      await this.fileSystem.createDirectory('ai-data/items');
      await this.fileSystem.createDirectory('ai-data/content');
      await this.fileSystem.createDirectory('ai-data/datasets');
    } catch (error) {
      // Ignore errors if directories already exist
      console.log('Directory check completed');
    }
  }
  
  /**
   * Load a data item by ID
   */
  public async loadDataItem(id: string): Promise<AIDataItem> {
    try {
      // Read metadata
      const metadataStr = await this.fileSystem.readFile(`ai-data/items/${id}.json`);
      const metadata = JSON.parse(metadataStr) as AIDataItemMetadata;
      
      // Read content
      const content = await this.fileSystem.readFile(`ai-data/content/${id}.data`);
      
      return { metadata, content };
    } catch (error) {
      console.error(`Failed to load data item ${id}:`, error);
      throw new Error(`Failed to load data item: ${error}`);
    }
  }
  
  /**
   * Verify a data item's integrity and signature
   */
  public async verifyDataItem(
    item: AIDataItem,
    signature: Uint8Array | string,
    publicKey: Uint8Array | string
  ): Promise<boolean> {
    try {
      // Convert signature and public key if needed
      const sigBytes = typeof signature === 'string' 
        ? new Uint8Array(Buffer.from(signature, 'base64'))
        : signature;
        
      const pubKeyBytes = typeof publicKey === 'string'
        ? new Uint8Array(Buffer.from(publicKey, 'base64'))
        : publicKey;
      
      // Convert content to ArrayBuffer if it's a Buffer
      const contentBuffer = Buffer.isBuffer(item.content) 
        ? item.content.buffer as ArrayBuffer
        : item.content;
      
      // Verify content hash
      const computedHash = Buffer.from(hashContent(contentBuffer)).toString('hex');
      const storedHash = item.metadata.contentHash;
      
      if (computedHash !== storedHash) {
        console.error('Content hash verification failed');
        return false;
      }
      
      // Verify signature
      const metadataBytes = new TextEncoder().encode(JSON.stringify(item.metadata));
      const isValid = await verifySignature(metadataBytes, sigBytes, pubKeyBytes);
      
      return isValid;
    } catch (error) {
      console.error('Verification error:', error);
      return false;
    }
  }
  
  /**
   * Create a dataset from multiple data items
   */
  public async createDataset(
    metadata: Partial<AIDatasetMetadata>,
    itemIds: string[]
  ): Promise<AIDataset> {
    try {
      // Load all items to calculate total size and validate
      let totalSize = 0;
      const items: AIDataItem[] = [];
      
      for (const id of itemIds) {
        const item = await this.loadDataItem(id);
        items.push(item);
        totalSize += item.metadata.size;
      }
      
      // Create dataset metadata
      const datasetMetadata: AIDatasetMetadata = {
        id: metadata.id || uuidv4(),
        name: metadata.name || 'Untitled Dataset',
        description: metadata.description || '',
        dataType: this.determineDataType(items) || metadata.dataType || 'mixed',
        itemCount: itemIds.length,
        totalSize,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        creator: metadata.creator || { name: 'Unknown' },
        license: metadata.license || 'All Rights Reserved',
        tags: metadata.tags || [],
        ...metadata
      };
      
      // Create the dataset
      const dataset: AIDataset = {
        metadata: datasetMetadata,
        items: itemIds
      };
      
      // Store the dataset
      await this.storeDataset(dataset);
      
      return dataset;
    } catch (error) {
      console.error('Failed to create dataset:', error);
      throw new Error(`Failed to create dataset: ${error}`);
    }
  }
  
  /**
   * Determine the predominant data type from a collection of items
   */
  private determineDataType(items: AIDataItem[]): 'image' | 'text' | 'audio' | 'video' | 'structured' | 'mixed' {
    const types = new Map<string, number>();
    
    for (const item of items) {
      const type = item.metadata.dataType;
      types.set(type, (types.get(type) || 0) + 1);
    }
    
    let maxType = 'mixed';
    let maxCount = 0;
    
    for (const [type, count] of types.entries()) {
      if (count > maxCount) {
        maxType = type;
        maxCount = count;
      }
    }
    
    // If less than 70% of items are of the same type, consider it mixed
    if (maxCount / items.length < 0.7) {
      return 'mixed';
    }
    
    return maxType as any;
  }
  
  /**
   * Store a dataset in the filesystem
   */
  private async storeDataset(dataset: AIDataset): Promise<void> {
    try {
      await this.ensureDirectories();
      
      await this.fileSystem.writeFile(
        `ai-data/datasets/${dataset.metadata.id}.json`,
        JSON.stringify(dataset, null, 2)
      );
      
      console.log(`Dataset ${dataset.metadata.id} stored successfully`);
    } catch (error) {
      console.error('Failed to store dataset:', error);
      throw new Error(`Failed to store dataset: ${error}`);
    }
  }
  
  /**
   * Load a dataset by ID
   */
  public async loadDataset(id: string): Promise<AIDataset> {
    try {
      const datasetStr = await this.fileSystem.readFile(`ai-data/datasets/${id}.json`);
      return JSON.parse(datasetStr) as AIDataset;
    } catch (error) {
      console.error(`Failed to load dataset ${id}:`, error);
      throw new Error(`Failed to load dataset: ${error}`);
    }
  }
  
  /**
   * Get all datasets
   */
  public async getAllDatasets(): Promise<AIDatasetMetadata[]> {
    try {
      const files = await this.fileSystem.readDirectory('ai-data/datasets');
      const datasets: AIDatasetMetadata[] = [];
      
      for (const file of files) {
        if (file.name.endsWith('.json')) {
          const datasetStr = await this.fileSystem.readFile(`ai-data/datasets/${file.name}`);
          const dataset = JSON.parse(datasetStr) as AIDataset;
          datasets.push(dataset.metadata);
        }
      }
      
      return datasets;
    } catch (error) {
      console.error('Failed to get datasets:', error);
      return [];
    }
  }
  
  /**
   * Create an NFT collection from a dataset
   * Uses the compressed NFT implementation for efficient storage
   */
  public async createDatasetCollection(datasetId: string): Promise<CollectionMetadata | null> {
    if (!this.compressedCollectionManager) {
      throw new Error('Compressed collection manager not set');
    }
    
    try {
      // Load the dataset
      const dataset = await this.loadDataset(datasetId);
      
      // Load all items to include in the Merkle tree
      const items = await Promise.all(
        dataset.items.map(id => this.loadDataItem(id))
      );
      
      // Prepare leaf entries for the Merkle tree
      // Convert AIDataItemMetadata to AssetMetadata format
      const leafEntries = items.map(item => {
        // Create an object that matches the expected AssetMetadata shape
        return {
          metadata: {
            id: item.metadata.id,
            title: item.metadata.title,
            description: item.metadata.description,
            createdAt: item.metadata.createdAt,
            updatedAt: item.metadata.updatedAt,
            creator: item.metadata.creator,
            editions: item.metadata.editions,
            signatures: item.metadata.signatures,
            // Map blockchain property to BlockchainReference format
            blockchain: item.metadata.blockchain ? {
              chain: item.metadata.blockchain.chain,
              contractAddress: item.metadata.blockchain.contractAddress,
              tokenId: item.metadata.blockchain.tokenId,
              transactionHash: item.metadata.blockchain.transactionHash || '',
              network: item.metadata.blockchain.chain, // Use chain as network
              registeredAt: Date.now() // Default timestamp
            } : undefined
          },
          contentHash: item.metadata.contentHash
        };
      });
      
      // Create the collection
      const collection = await this.compressedCollectionManager.createCollection(
        dataset.metadata.name,
        dataset.metadata.description,
        {
          name: dataset.metadata.creator.name,
          id: dataset.metadata.creator.id
        },
        leafEntries
      );
      
      // Update the dataset with the Merkle root
      dataset.metadata.merkleRoot = collection.tree.getHexRoot();
      await this.storeDataset(dataset);
      
      return collection.metadata;
    } catch (error) {
      console.error('Failed to create dataset collection:', error);
      return null;
    }
  }
  
  /**
   * Register a dataset collection on the blockchain
   */
  public async registerDatasetOnBlockchain(
    datasetId: string, 
    collectionId: string
  ): Promise<any> {
    if (!this.blockchainService) {
      throw new Error('Blockchain service not set');
    }
    
    if (!this.compressedCollectionManager) {
      throw new Error('Compressed collection manager not set');
    }
    
    try {
      // Load dataset
      const dataset = await this.loadDataset(datasetId);
      
      // Get collection
      const collection = this.compressedCollectionManager.getCollection(collectionId);
      if (!collection) {
        throw new Error(`Collection ${collectionId} not found`);
      }
      
      // Connect to the contract
      // In a real implementation, this would use the actual deployed contract address
      await this.blockchainService.connect('0x1234567890abcdef1234567890abcdef12345678');
      
      // Create metadata URI (would typically be an IPFS URI in production)
      const metadataURI = `ipfs://dataset/${datasetId}`;
      
      // Register on blockchain
      const result = await this.blockchainService.registerCollection(
        collectionId,
        collection.metadata.merkleRoot,
        dataset.metadata.itemCount,
        metadataURI
      );
      
      // Update dataset with blockchain reference
      dataset.metadata.blockchainReference = {
        chain: 'avalanche',
        contractAddress: '0x1234567890abcdef1234567890abcdef12345678',
        transactionHash: result.txHash,
        blockNumber: result.blockNumber
      };
      
      await this.storeDataset(dataset);
      
      return result;
    } catch (error) {
      console.error('Failed to register dataset on blockchain:', error);
      throw error;
    }
  }
  
  /**
   * Verify an item is part of a dataset using Merkle proof
   */
  public async verifyItemInDataset(
    datasetId: string,
    itemId: string
  ): Promise<boolean> {
    if (!this.compressedCollectionManager) {
      throw new Error('Compressed collection manager not set');
    }
    
    try {
      // Load dataset
      const dataset = await this.loadDataset(datasetId);
      if (!dataset.metadata.merkleRoot) {
        throw new Error('Dataset does not have a Merkle root');
      }
      
      // Check if item is listed in dataset
      if (!dataset.items.includes(itemId)) {
        return false;
      }
      
      // Get all collections and find the one with matching root
      const collections = this.compressedCollectionManager.getAllCollections();
      const collection = collections.find(c => c.metadata.merkleRoot === dataset.metadata.merkleRoot);
      
      if (!collection) {
        throw new Error('Collection with matching Merkle root not found');
      }
      
      // Load the item to verify
      const item = await this.loadDataItem(itemId);
      
      // Create leaf for verification
      const leaf = CompressedNFTMerkleTree.createLeafFromAsset(
        item.metadata as any,
        item.metadata.contentHash,
        item.metadata.creator.id || item.metadata.creator.name
      );
      
      // Verify the item is in the collection
      return collection.tree.verify(leaf, collection.tree.getProof(leaf));
    } catch (error) {
      console.error('Failed to verify item in dataset:', error);
      return false;
    }
  }
  
  /**
   * Export a dataset and all its items
   */
  public async exportDataset(datasetId: string): Promise<ArrayBuffer> {
    try {
      // Load dataset
      const dataset = await this.loadDataset(datasetId);
      
      // Load all items
      const items = await Promise.all(
        dataset.items.map(id => this.loadDataItem(id))
      );
      
      // Create export package
      const exportData = {
        dataset: dataset,
        items: items.map(item => {
          // Handle both ArrayBuffer and Buffer types
          const contentBuffer = Buffer.isBuffer(item.content)
            ? item.content
            : Buffer.from(item.content);
          
          return {
            metadata: item.metadata,
            contentBase64: contentBuffer.toString('base64')
          };
        })
      };
      
      // Convert to JSON and then to ArrayBuffer
      const jsonString = JSON.stringify(exportData, null, 2);
      const encodedBuffer = new TextEncoder().encode(jsonString);
      // Convert ArrayBufferLike to proper ArrayBuffer
      const arrayBuffer = new ArrayBuffer(encodedBuffer.byteLength);
      new Uint8Array(arrayBuffer).set(new Uint8Array(encodedBuffer));
      return arrayBuffer;
    } catch (error) {
      console.error('Failed to export dataset:', error);
      throw new Error(`Failed to export dataset: ${error}`);
    }
  }
  
  /**
   * Import a dataset from an export package
   */
  public async importDataset(exportData: ArrayBuffer): Promise<string> {
    try {
      // Parse the export data
      const jsonString = new TextDecoder().decode(exportData);
      const importData = JSON.parse(jsonString);
      
      const { dataset, items } = importData;
      
      // Store all items
      for (const item of items) {
        const content = Buffer.from(item.contentBase64, 'base64');
        await this.storeDataItem({
          metadata: item.metadata,
          content
        }, new Uint8Array(0)); // No signature needed as the metadata already includes it
      }
      
      // Store the dataset
      await this.storeDataset(dataset);
      
      return dataset.metadata.id;
    } catch (error) {
      console.error('Failed to import dataset:', error);
      throw new Error(`Failed to import dataset: ${error}`);
    }
  }

  /**
   * Hash data using SHA-256
   */
  private async hashData(data: ArrayBuffer | Buffer): Promise<ArrayBuffer> {
    // Convert Buffer to ArrayBuffer if needed
    const arrayBuffer = Buffer.isBuffer(data) 
      ? data.buffer.slice(0, data.byteLength) 
      : data;
    
    // Use the crypto.subtle API for hashing
    return await crypto.subtle.digest('SHA-256', arrayBuffer);
  }
}
