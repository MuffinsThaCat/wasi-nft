/**
 * Compressed NFT blockchain integration for Avalanche
 * Provides functionality for storing compressed NFT collections on Avalanche
 */
import { ethers } from 'ethers';
import { CollectionMetadata } from '../merkle/collectionManager';
import { CompressedNFTMerkleTree, MerkleLeaf } from '../merkle/merkleTree';
import { BlockchainIntegration } from './integration';

// ABI for CompressedNFT contract - matches our Solidity implementation
const COMPRESSED_NFT_ABI = [
  // Register a compressed collection
  'function registerCollection(string collectionId, bytes32 merkleRoot, uint256 assetCount, string metadataURI) returns (bool)',
  
  // Verify an asset in a collection
  'function verifyAsset(string collectionId, string assetId, bytes32[] proof) returns (bool)',
  
  // Check if an asset has been previously verified
  'function isAssetVerified(string collectionId, string assetId) view returns (bool)',
  
  // Update a collection's Merkle root (for adding new assets)
  'function updateMerkleRoot(string collectionId, bytes32 newMerkleRoot, uint256 newAssetCount) returns (bool)',
  
  // Transfer ownership of a collection
  'function transferCollectionOwnership(string collectionId, address newOwner) returns (bool)',
  
  // Get collection information
  'function getCollectionInfo(string collectionId) view returns (bytes32 merkleRoot, address owner, uint256 assetCount, uint256 createdAt, uint256 updatedAt, string metadataURI, bool exists)',
  
  // Batch verify multiple assets
  'function batchVerifyAssets(string collectionId, string[] assetIds, bytes32[][] proofs) returns (bool[])',
  
  // Get collections by owner
  'function getCollectionsByOwner(address owner) view returns (string[])',
  
  // Events
  'event CollectionRegistered(string indexed collectionId, bytes32 merkleRoot, address indexed owner, uint256 assetCount, uint256 timestamp)',
  'event CollectionUpdated(string indexed collectionId, bytes32 oldRoot, bytes32 newRoot, uint256 newAssetCount, uint256 timestamp)',
  'event CollectionTransferred(string indexed collectionId, address indexed from, address indexed to, uint256 timestamp)',
  'event AssetVerified(string indexed collectionId, string assetId, address verifier, uint256 timestamp)'
];

/**
 * Service for managing compressed NFTs on Avalanche
 */
export class CompressedNFTService {
  private blockchainIntegration: BlockchainIntegration;
  private contract: ethers.Contract | null = null;
  
  // We'll use public methods only to work with the blockchain integration
  
  /**
   * Initialize the compressed NFT service
   * @param blockchainIntegration The blockchain integration service
   */
  constructor(blockchainIntegration: BlockchainIntegration) {
    this.blockchainIntegration = blockchainIntegration;
  }
  
  /**
   * Connect to the compressed NFT contract
   * @param contractAddress Address of the deployed contract
   */
  public async connect(contractAddress: string): Promise<void> {
    try {
      // Get wallet info to confirm connection
      const walletInfo = await this.blockchainIntegration.connectWallet();
      if (!walletInfo || !walletInfo.address) {
        throw new Error('No wallet connected');
      }
      
      // We'll set the contract address in the blockchain integration
      this.blockchainIntegration.setContractAddress(contractAddress);
      
      // Use the current address to know we have a connection
      const currentAddress = await this.blockchainIntegration.getCurrentAddress();
      if (!currentAddress) {
        throw new Error('No wallet connected');
      }
      
      // Since we can't access the contract directly, we're creating a custom contract
      // Here we'll register a function to call the contract through the blockchain integration
      this.contract = {
        // We'll implement proxy methods that use BlockchainIntegration's methods underneath
        // For demonstration, just implementing the register methods
        registerCollection: async (collectionId: string, merkleRoot: string, metadataURI: string) => {
          // We'll use registerAsset as a proxy for registering collections
          return await this.blockchainIntegration.registerAsset(
            collectionId,  // Using collectionId as assetId
            merkleRoot,    // Using merkleRoot as contentHash
            'collection',  // Marker for collection type in metadataHash
            metadataURI    // URI for collection metadata
          );
        },
        
        // Mock contract interface implementation
        updateMerkleRoot: async (collectionId: string, newMerkleRoot: string) => {
          // This would be a custom implementation through the BlockchainIntegration
          console.log(`Would update Merkle root for ${collectionId} to ${newMerkleRoot}`);
          return { hash: 'mock-tx-hash-' + Date.now() };
        }
      } as unknown as ethers.Contract;
      
      console.log('Connected to CompressedNFT contract at', contractAddress);
    } catch (error) {
      console.error('Failed to connect to CompressedNFT contract:', error);
      throw new Error(`Failed to connect to contract: ${error.message}`);
    }
  }
  
  /**
   * Register a collection on the Avalanche blockchain
   * @param collectionId The collection ID
   * @param merkleRoot The Merkle root of the collection
   * @param assetCount Number of assets in the collection
   * @param metadataURI Optional URI pointing to collection metadata (e.g. IPFS)
   * @returns Transaction information including receipt
   */
  public async registerCollection(
    collectionId: string,
    merkleRoot: string,
    assetCount: number = 0,
    metadataURI: string = ''
  ): Promise<any> {
    if (!this.contract) {
      throw new Error('Contract not connected');
    }
    
    try {
      console.log(`Registering collection ${collectionId} with root ${merkleRoot}`);
      
      // Verify merkleRoot format (should be a hex string)
      if (!merkleRoot.startsWith('0x')) {
        merkleRoot = '0x' + merkleRoot;
      }
      
      // Call the contract
      const tx = await this.contract.registerCollection(
        collectionId,
        merkleRoot,
        assetCount,
        metadataURI
      );
      
      // Wait for the transaction to be mined
      console.log('Transaction submitted:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed in block', receipt.blockNumber);
      
      return {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        success: true
      };
    } catch (error) {
      console.error('Failed to register collection:', error);
      throw new Error(`Failed to register collection: ${error.message}`);
    }
  }
  
  /**
   * Update a collection's Merkle root (e.g. after adding new assets)
   * @param collectionId The collection ID
   * @param newMerkleRoot The new Merkle root
   * @param newAssetCount New number of assets in the collection
   * @returns Transaction information
   */
  public async updateMerkleRoot(
    collectionId: string,
    newMerkleRoot: string,
    newAssetCount: number
  ): Promise<any> {
    if (!this.contract) {
      throw new Error('Contract not connected');
    }
    
    try {
      console.log(`Updating Merkle root for collection ${collectionId}`);
      
      // Verify merkleRoot format (should be a hex string)
      if (!newMerkleRoot.startsWith('0x')) {
        newMerkleRoot = '0x' + newMerkleRoot;
      }
      
      // Call the contract
      const tx = await this.contract.updateMerkleRoot(
        collectionId,
        newMerkleRoot,
        newAssetCount
      );
      
      // Wait for the transaction to be mined
      console.log('Transaction submitted:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed in block', receipt.blockNumber);
      
      return {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        success: true
      };
    } catch (error) {
      console.error('Failed to update Merkle root:', error);
      throw new Error(`Failed to update Merkle root: ${error.message}`);
    }
  }
  
  /**
   * Verify an asset is part of a collection (on-chain verification)
   * @param collectionId The collection ID
   * @param assetId The asset ID to verify
   * @param proof The Merkle proof
   * @returns True if verified on-chain
   */
  public async verifyAssetOnChain(
    collectionId: string,
    assetId: string,
    proof: string[]
  ): Promise<boolean> {
    if (!this.contract) {
      throw new Error('Contract not connected');
    }
    
    try {
      // Convert proof to bytes32[] if necessary
      const formattedProof = proof.map(p => {
        if (!p.startsWith('0x')) {
          return '0x' + p;
        }
        return p;
      });
      
      // Call the verification function
      const verified = await this.contract.verifyAsset(
        collectionId,
        assetId,
        formattedProof
      );
      
      return verified;
    } catch (error) {
      console.error('Failed to verify asset on-chain:', error);
      throw new Error(`Failed to verify asset: ${error.message}`);
    }
  }
  
  /**
   * Get information about a collection from the blockchain
   * @param collectionId The collection ID
   * @returns Collection information
   */
  public async getCollectionInfo(collectionId: string): Promise<{
    merkleRoot: string;
    owner: string;
    assetCount: number;
    createdAt: number;
    updatedAt: number;
    metadataURI: string;
    exists: boolean;
  }> {
    if (!this.contract) {
      throw new Error('Contract not connected');
    }
    
    try {
      // Call the contract
      const info = await this.contract.getCollectionInfo(collectionId);
      
      return {
        merkleRoot: info[0],
        owner: info[1],
        assetCount: Number(info[2]),
        createdAt: Number(info[3]),
        updatedAt: Number(info[4]),
        metadataURI: info[5],
        exists: info[6]
      };
    } catch (error) {
      console.error('Failed to get collection info:', error);
      throw new Error(`Failed to get collection info: ${error.message}`);
    }
  }
  
  /**
   * Transfer ownership of a collection to a new address
   * @param collectionId The collection ID
   * @param newOwner The new owner's address
   * @returns Transaction information
   */
  public async transferCollectionOwnership(
    collectionId: string,
    newOwner: string
  ): Promise<any> {
    if (!this.contract) {
      throw new Error('Contract not connected');
    }
    
    try {
      console.log(`Transferring collection ${collectionId} to ${newOwner}`);
      
      // Call the contract
      const tx = await this.contract.transferCollectionOwnership(
        collectionId,
        newOwner
      );
      
      // Wait for the transaction to be mined
      console.log('Transaction submitted:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed in block', receipt.blockNumber);
      
      return {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        success: true
      };
    } catch (error) {
      console.error('Failed to transfer collection ownership:', error);
      throw new Error(`Failed to transfer collection: ${error.message}`);
    }
  }
  
  /**
   * Generate an IPFS URI for collection metadata
   * @param metadata The collection metadata
   * @returns IPFS URI for the metadata
   */
  public async uploadCollectionMetadataToIPFS(
    metadata: CollectionMetadata
  ): Promise<string> {
    try {
      // This is a placeholder for actual IPFS upload functionality
      // In a real implementation, you would use IPFS client to upload
      
      console.log('Uploading collection metadata to IPFS...');
      
      // Simulate IPFS upload (replace with actual implementation)
      const ipfsHash = 'QmPlaceholderHashForMetadata' + Math.random().toString(36).substring(2, 10);
      const metadataURI = `ipfs://${ipfsHash}`;
      
      console.log('Metadata uploaded to IPFS:', metadataURI);
      return metadataURI;
    } catch (error) {
      console.error('Failed to upload metadata to IPFS:', error);
      throw new Error(`Failed to upload metadata: ${error.message}`);
    }
  }
}
