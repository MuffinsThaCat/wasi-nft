/**
 * Provenance Tracker Service
 * 
 * Records ownership history and transfer events on the blockchain
 * while maintaining our filesystem-first approach to digital assets.
 * 
 * This service ensures that even after assets leave our marketplace,
 * there is an immutable record of ownership and transfers that can
 * be independently verified.
 */

import { BlockchainIntegration } from '../blockchain/integration';
import { TransferService, TransferSession, DeletionProof } from './transferService';
import { AssetManager, AssetMetadata } from '../core/assetManager';
import * as crypto from 'crypto-js';

// Ownership record structure
export interface OwnershipRecord {
  assetId: string;
  owner: string;
  timestamp: number;
  transactionHash: string;
  previousOwner?: string;
  transferType: 'creation' | 'marketplace' | 'direct';
  deletionProof?: string; // Hash of the deletion proof
  version: number;
}

// Provenance chain for an asset
export interface ProvenanceChain {
  assetId: string;
  records: OwnershipRecord[];
  createdAt: number;
  lastUpdated: number;
  contentFingerprint: string; // Hash of the content to verify it hasn't changed
  blockchainVerified: boolean;
}

/**
 * Service to track and verify asset provenance with blockchain anchoring
 */
export class ProvenanceTracker {
  private provenanceChains: Map<string, ProvenanceChain> = new Map();
  
  constructor(
    private blockchain: BlockchainIntegration,
    private transferService: TransferService,
    private assetManager: AssetManager
  ) {
    // Initialize transfer event monitoring
    this.initializeEventMonitoring();
  }

  /**
   * Initialize monitoring of transfer events
   */
  private initializeEventMonitoring(): void {
    // In a real implementation, this would subscribe to events
    // For now, we'll just log that we're monitoring
    console.log('Initialized provenance event monitoring');
  }
  
  /**
   * Register a new asset's provenance at creation time
   * @param assetId Asset ID
   * @param creator Creator address
   * @returns Promise with provenance chain
   */
  async registerAssetProvenance(
    assetId: string,
    creator: string
  ): Promise<ProvenanceChain> {
    console.log(`Registering provenance for asset ${assetId}`);
    
    // Get asset content for fingerprinting
    const assetContent = await this.assetManager.getAssetContent(assetId);
    if (!assetContent) {
      throw new Error('Asset content not found');
    }
    
    // Generate content fingerprint
    const contentFingerprint = await this.generateContentFingerprint(assetContent);
    
    // Create initial ownership record
    const timestamp = Date.now();
    let transactionHash = '';
    
    try {
      // Register on blockchain (lightweight registration, not a full NFT mint)
      const receipt = await this.blockchain.registerAsset(
        assetId,
        contentFingerprint,
        '', // No separate metadata hash yet
        '' // No URI yet as it's filesystem-based
      );
      
      transactionHash = receipt.transactionHash;
      console.log(`Asset registered on blockchain with transaction: ${transactionHash}`);
    } catch (error) {
      console.error('Failed to register on blockchain, proceeding with local record only:', error);
    }
    
    // Create initial provenance chain
    const initialRecord: OwnershipRecord = {
      assetId,
      owner: creator,
      timestamp,
      transactionHash,
      transferType: 'creation',
      version: 1
    };
    
    const provenanceChain: ProvenanceChain = {
      assetId,
      records: [initialRecord],
      createdAt: timestamp,
      lastUpdated: timestamp,
      contentFingerprint,
      blockchainVerified: !!transactionHash
    };
    
    // Store in local cache
    this.provenanceChains.set(assetId, provenanceChain);
    
    return provenanceChain;
  }
  
  /**
   * Record a transfer event in the provenance chain and on the blockchain
   * @param transferSession The completed transfer session
   * @param deletionProof Proof that the asset was deleted from the previous owner
   * @returns Promise with updated provenance chain
   */
  async recordTransfer(
    transferSession: TransferSession,
    deletionProof: DeletionProof
  ): Promise<ProvenanceChain> {
    const { assetId, sellerAddress, buyerAddress } = transferSession;
    
    console.log(`Recording transfer of asset ${assetId} from ${sellerAddress} to ${buyerAddress}`);
    
    // Get existing provenance chain or create new one
    let provenanceChain = this.provenanceChains.get(assetId);
    
    if (!provenanceChain) {
      console.warn(`No existing provenance chain for asset ${assetId}, creating one`);
      provenanceChain = {
        assetId,
        records: [],
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        contentFingerprint: '',
        blockchainVerified: false
      };
    }
    
    // Encode deletion proof
    const deletionProofHash = this.hashDeletionProof(deletionProof);
    
    // Record transfer on blockchain
    let transactionHash = '';
    try {
      // Create a simplified proof for blockchain to minimize gas costs
      const transferProof = JSON.stringify({
        assetId,
        from: sellerAddress,
        to: buyerAddress,
        timestamp: Date.now(),
        deletionProofHash
      });
      
      // Record on blockchain
      transactionHash = await this.blockchain.recordSecureTransfer(
        assetId,
        buyerAddress,
        transferProof
      );
      
      console.log(`Transfer recorded on blockchain with transaction: ${transactionHash}`);
    } catch (error) {
      console.error('Failed to record transfer on blockchain, proceeding with local record only:', error);
    }
    
    // Create new ownership record
    const newRecord: OwnershipRecord = {
      assetId,
      owner: buyerAddress,
      previousOwner: sellerAddress,
      timestamp: Date.now(),
      transactionHash,
      transferType: 'marketplace', // Assuming it's a marketplace transfer
      deletionProof: deletionProofHash,
      version: provenanceChain.records.length + 1
    };
    
    // Update provenance chain
    provenanceChain.records.push(newRecord);
    provenanceChain.lastUpdated = Date.now();
    provenanceChain.blockchainVerified = provenanceChain.blockchainVerified || !!transactionHash;
    
    // Update local cache
    this.provenanceChains.set(assetId, provenanceChain);
    
    return provenanceChain;
  }
  
  /**
   * Verify the provenance of an asset
   * @param assetId Asset ID to verify
   * @param assetContent Optional asset content to verify fingerprint
   * @returns Promise with verification result
   */
  async verifyProvenance(
    assetId: string,
    assetContent?: ArrayBuffer | Blob
  ): Promise<{
    verified: boolean;
    blockchainVerified: boolean;
    currentOwner: string;
    ownershipHistory: OwnershipRecord[];
    fingerprintMatch?: boolean;
    errors: string[];
  }> {
    console.log(`Verifying provenance for asset ${assetId}`);
    
    const errors: string[] = [];
    
    // Get provenance chain from local cache
    const provenanceChain = this.provenanceChains.get(assetId);
    
    if (!provenanceChain) {
      errors.push('No provenance records found for this asset');
      return {
        verified: false,
        blockchainVerified: false,
        currentOwner: '',
        ownershipHistory: [],
        errors
      };
    }
    
    // Verify content fingerprint if content is provided
    let fingerprintMatch: boolean | undefined;
    
    if (assetContent) {
      const currentFingerprint = await this.generateContentFingerprint(assetContent);
      fingerprintMatch = currentFingerprint === provenanceChain.contentFingerprint;
      
      if (!fingerprintMatch) {
        errors.push('Content fingerprint does not match the registered fingerprint');
      }
    }
    
    // Get the current owner from the latest record
    const latestRecord = provenanceChain.records[provenanceChain.records.length - 1];
    const currentOwner = latestRecord.owner;
    
    // Verify blockchain records if blockchain verification was enabled
    let blockchainVerified = false;
    
    if (provenanceChain.blockchainVerified) {
      try {
        // Check if the asset exists on-chain
        const exists = await this.blockchain.assetExists(assetId);
        
        if (!exists) {
          errors.push('Asset not found on blockchain');
        } else {
          // Get the owner from blockchain
          const onChainOwner = await this.blockchain.ownerOf(assetId);
          
          if (onChainOwner.toLowerCase() !== currentOwner.toLowerCase()) {
            errors.push(`Blockchain owner (${onChainOwner}) does not match local record (${currentOwner})`);
          } else {
            blockchainVerified = true;
          }
        }
      } catch (error) {
        console.error('Error verifying on blockchain:', error);
        errors.push('Failed to verify on blockchain: ' + (error as Error).message);
      }
    }
    
    return {
      verified: errors.length === 0,
      blockchainVerified,
      currentOwner,
      ownershipHistory: provenanceChain.records,
      fingerprintMatch,
      errors
    };
  }
  
  /**
   * Generate a certificate of authenticity for an asset
   * @param assetId Asset ID
   * @returns Promise with certificate data or null if not found
   */
  async generateCertificate(assetId: string): Promise<{
    certificate: {
      assetId: string;
      title: string;
      description: string;
      creationDate: string;
      creator: string;
      currentOwner: string;
      transferHistory: {
        date: string;
        from: string;
        to: string;
        type: string;
        verificationLink?: string;
      }[];
      verificationMethods: {
        blockchain: {
          network: string;
          contract: string;
          tokenId?: string;
        };
        offChain: {
          contentFingerprint: string;
          lastVerified: string;
        };
      };
    };
    verified: boolean;
  } | null> {
    // Get asset provenance
    const provenanceChain = this.provenanceChains.get(assetId);
    if (!provenanceChain) {
      return null;
    }
    
    try {
      // Get asset metadata
      const metadata = await this.assetManager.getAsset(assetId);
      if (!metadata) {
        return null;
      }
      
      // Get blockchain config
      const blockchainConfig = this.blockchain.getConfig();
      const currentNetwork = blockchainConfig.defaultNetwork;
      const networkInfo = blockchainConfig.networks[currentNetwork];
      
      // Format transfer history
      const transferHistory = provenanceChain.records.map((record, index) => {
        if (index === 0) {
          return {
            date: new Date(record.timestamp).toISOString(),
            from: 'Creation',
            to: record.owner,
            type: 'Creation',
            verificationLink: record.transactionHash ? 
              `${networkInfo.explorerUrl}/tx/${record.transactionHash}` : 
              undefined
          };
        } else {
          return {
            date: new Date(record.timestamp).toISOString(),
            from: record.previousOwner || 'Unknown',
            to: record.owner,
            type: record.transferType,
            verificationLink: record.transactionHash ? 
              `${networkInfo.explorerUrl}/tx/${record.transactionHash}` : 
              undefined
          };
        }
      });
      
      // Create certificate
      const certificate = {
        assetId,
        title: metadata.title || 'Untitled Asset',
        description: metadata.description || '',
        creationDate: new Date(provenanceChain.createdAt).toISOString(),
        creator: provenanceChain.records[0]?.owner || 'Unknown',
        currentOwner: provenanceChain.records[provenanceChain.records.length - 1]?.owner || 'Unknown',
        transferHistory,
        verificationMethods: {
          blockchain: {
            network: networkInfo.name,
            contract: 'Metadata Registry', // This would be the actual contract address in production
          },
          offChain: {
            contentFingerprint: provenanceChain.contentFingerprint,
            lastVerified: new Date(provenanceChain.lastUpdated).toISOString()
          }
        }
      };
      
      // Check if fully verified
      const verificationResult = await this.verifyProvenance(assetId);
      
      return {
        certificate,
        verified: verificationResult.verified
      };
    } catch (error) {
      console.error('Error generating certificate:', error);
      return null;
    }
  }
  
  /**
   * Generate a content fingerprint from asset content
   * @param content Asset content
   * @returns Promise with fingerprint
   */
  private async generateContentFingerprint(content: ArrayBuffer | Blob): Promise<string> {
    // If it's a Blob, convert to ArrayBuffer
    const buffer = content instanceof Blob ? 
      await content.arrayBuffer() : 
      content;
    
    // Convert ArrayBuffer to string format suitable for hashing
    const bytes = new Uint8Array(buffer);
    let binaryString = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binaryString += String.fromCharCode(bytes[i]);
    }
    
    // Generate SHA-256 hash
    return crypto.SHA256(binaryString).toString();
  }
  
  /**
   * Create a hash of the deletion proof
   * @param deletionProof Deletion proof to hash
   * @returns Hash string
   */
  private hashDeletionProof(deletionProof: DeletionProof): string {
    return crypto.SHA256(JSON.stringify(deletionProof)).toString();
  }
  
  /**
   * Export provenance data for an asset
   * @param assetId Asset ID
   * @returns Provenance data or null if not found
   */
  public exportProvenanceData(assetId: string): ProvenanceChain | null {
    return this.provenanceChains.get(assetId) || null;
  }
  
  /**
   * Import provenance data for an asset
   * @param provenanceChain Provenance chain to import
   * @returns Success status
   */
  public importProvenanceData(provenanceChain: ProvenanceChain): boolean {
    try {
      this.provenanceChains.set(provenanceChain.assetId, provenanceChain);
      return true;
    } catch (error) {
      console.error('Failed to import provenance data:', error);
      return false;
    }
  }
}
