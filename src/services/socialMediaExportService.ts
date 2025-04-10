/**
 * Social Media Export Service
 * 
 * Prepares digital assets for sharing on social media platforms while
 * embedding invisible ownership proof that can verify authenticity even
 * after the asset has been copied.
 * 
 * This service works alongside the ProvenanceTracker to provide:
 * 1. Steganographic embedding of ownership data in images
 * 2. Perceptual hashing to identify similar/copied images
 * 3. Export functions for sharing-ready versions of assets
 */

import { AssetManager } from '../core/assetManager';
import { ProvenanceTracker } from './provenanceTracker';
import { BlockchainIntegration } from '../blockchain/integration';
import * as crypto from 'crypto-js';

// Embedded ownership data structure
export interface OwnershipWatermark {
  assetId: string;
  owner: string;
  timestamp: number;
  blockchainRef: string; // Transaction hash or contract address
  signatureHash: string; // Hash of owner's signature
  exportVersion: number; // To track different exported versions
}

// Options for social media export
export interface SocialMediaExportOptions {
  addVisibleAttribution?: boolean; // Whether to add a small visible attribution
  watermarkStrength?: number; // 0-100, affects how robust vs. visible the watermark is
  metadataFormat?: 'minimal' | 'standard' | 'complete';
  includeVerificationUrl?: boolean;
  exportQuality?: number; // 0-100 for JPEG quality
}

/**
 * Service for preparing assets for social media sharing with embedded ownership proof
 */
export class SocialMediaExportService {
  private defaultOptions: SocialMediaExportOptions = {
    addVisibleAttribution: false,
    watermarkStrength: 70, // Good balance between robustness and invisibility
    metadataFormat: 'standard',
    includeVerificationUrl: true,
    exportQuality: 95
  };

  constructor(
    private assetManager: AssetManager,
    private provenanceTracker: ProvenanceTracker,
    private blockchain: BlockchainIntegration
  ) {}

  /**
   * Prepare an image for social media sharing with embedded ownership proof
   * @param assetId ID of the asset to prepare
   * @param options Export options
   * @returns Promise with Blob of the prepared image
   */
  async prepareImageForSharing(
    assetId: string,
    options: SocialMediaExportOptions = {}
  ): Promise<{
    imageBlob: Blob;
    verificationUrl: string;
    ownershipData: OwnershipWatermark;
  }> {
    // Merge with default options
    const exportOptions = { ...this.defaultOptions, ...options };

    console.log(`Preparing asset ${assetId} for social media sharing`);

    // Get the asset content and metadata
    const assetContent = await this.assetManager.getAssetContent(assetId);
    if (!assetContent) {
      throw new Error('Asset content not found');
    }

    const assetMetadata = await this.assetManager.getAsset(assetId);
    if (!assetMetadata) {
      throw new Error('Asset metadata not found');
    }

    // Get provenance data to verify ownership
    const provenanceData = await this.provenanceTracker.exportProvenanceData(assetId);
    if (!provenanceData) {
      throw new Error('No provenance data found for this asset');
    }

    // Get the current owner from the latest record
    const latestRecord = provenanceData.records[provenanceData.records.length - 1];
    const currentOwner = latestRecord.owner;
    const blockchainRef = latestRecord.transactionHash || '';

    // Create ownership watermark data
    const ownershipData: OwnershipWatermark = {
      assetId,
      owner: currentOwner,
      timestamp: Date.now(),
      blockchainRef,
      signatureHash: this.generateSignatureHash(assetId, currentOwner),
      exportVersion: 1
    };

    // Process the image and embed the watermark
    const imageBlob = await this.embedOwnershipData(
      assetContent,
      ownershipData,
      exportOptions
    );

    // Generate verification URL for this specific export
    const verificationUrl = this.generateVerificationUrl(assetId, ownershipData.exportVersion);

    return {
      imageBlob,
      verificationUrl,
      ownershipData
    };
  }

  /**
   * Extract embedded ownership data from an image
   * @param imageBlob Image to analyze
   * @returns Promise with extracted ownership data or null if not found
   */
  async extractOwnershipData(imageBlob: Blob): Promise<OwnershipWatermark | null> {
    console.log('Extracting ownership data from image');

    try {
      // Convert blob to image data for processing
      const imageData = await this.blobToImageData(imageBlob);
      
      // Extract the hidden data from the image using steganography
      // In a real implementation, this would use a robust steganography algorithm
      // For now we'll simulate the extraction
      const extractedData = await this.extractSteganographicData(imageData);
      
      if (!extractedData) {
        console.log('No embedded ownership data found');
        return null;
      }
      
      // Parse the extracted data to ownership watermark structure
      return JSON.parse(extractedData) as OwnershipWatermark;
    } catch (error) {
      console.error('Error extracting ownership data:', error);
      return null;
    }
  }

  /**
   * Verify an image's ownership against blockchain records
   * @param imageBlob Image to verify
   * @returns Promise with verification result
   */
  async verifyImageOwnership(imageBlob: Blob): Promise<{
    verified: boolean;
    ownershipData: OwnershipWatermark | null;
    currentOwner: string;
    matchesBlockchain: boolean;
    timestamp: string;
    assetId: string;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    // Extract ownership data from the image
    const ownershipData = await this.extractOwnershipData(imageBlob);
    
    if (!ownershipData) {
      errors.push('No ownership data found embedded in the image');
      
      return {
        verified: false,
        ownershipData: null,
        currentOwner: '',
        matchesBlockchain: false,
        timestamp: '',
        assetId: '',
        errors
      };
    }
    
    // Calculate perceptual hash of the image
    const perceptualHash = await this.calculatePerceptualHash(imageBlob);
    
    // Get provenance data from the tracker
    const provenanceData = await this.provenanceTracker.exportProvenanceData(ownershipData.assetId);
    
    if (!provenanceData) {
      errors.push(`No provenance records found for asset ID: ${ownershipData.assetId}`);
      
      return {
        verified: false,
        ownershipData,
        currentOwner: ownershipData.owner,
        matchesBlockchain: false,
        timestamp: new Date(ownershipData.timestamp).toISOString(),
        assetId: ownershipData.assetId,
        errors
      };
    }
    
    // Get the current owner from the provenance chain
    const latestRecord = provenanceData.records[provenanceData.records.length - 1];
    const currentOwner = latestRecord.owner;
    
    // Check if claimed owner matches blockchain record
    let matchesBlockchain = currentOwner.toLowerCase() === ownershipData.owner.toLowerCase();
    
    if (!matchesBlockchain) {
      errors.push(`Owner in the image (${ownershipData.owner}) does not match current owner according to the blockchain (${currentOwner})`);
    }
    
    // Verify signature hash
    const signatureVerified = this.verifySignatureHash(
      ownershipData.assetId,
      ownershipData.owner,
      ownershipData.signatureHash
    );
    
    if (!signatureVerified) {
      errors.push('Ownership signature verification failed');
    }
    
    // If blockchain reference is provided, verify it on chain
    if (ownershipData.blockchainRef) {
      try {
        // This would verify the transaction or token data on the blockchain
        // For now we'll simulate this check
        const onChainVerified = await this.blockchain.verifyTransaction(ownershipData.blockchainRef);
        
        if (!onChainVerified) {
          errors.push('Blockchain transaction reference could not be verified');
          matchesBlockchain = false;
        }
      } catch (error) {
        console.error('Error verifying blockchain reference:', error);
        errors.push(`Blockchain verification error: ${(error as Error).message}`);
        matchesBlockchain = false;
      }
    }
    
    return {
      verified: errors.length === 0,
      ownershipData,
      currentOwner,
      matchesBlockchain,
      timestamp: new Date(ownershipData.timestamp).toISOString(),
      assetId: ownershipData.assetId,
      errors
    };
  }

  /**
   * Generate a verification URL for this asset
   * @param assetId Asset ID
   * @param exportVersion Export version
   * @returns Verification URL string
   */
  private generateVerificationUrl(assetId: string, exportVersion: number): string {
    // In a real implementation, this would generate a URL to your verification portal
    // with the appropriate parameters to verify this specific export
    return `https://verify.wasinft.com/verify?id=${assetId}&v=${exportVersion}`;
  }

  /**
   * Generate a signature hash for the ownership data
   * @param assetId Asset ID
   * @param owner Owner address
   * @returns Signature hash
   */
  private generateSignatureHash(assetId: string, owner: string): string {
    // In a real implementation, this would be a cryptographic signature 
    // For now we'll use a simple hash
    const dataToSign = `${assetId}:${owner}:${Date.now()}`;
    return crypto.SHA256(dataToSign).toString();
  }

  /**
   * Verify a signature hash
   * @param assetId Asset ID
   * @param owner Owner address
   * @param signatureHash Hash to verify
   * @returns Boolean indicating if signature is valid
   */
  private verifySignatureHash(assetId: string, owner: string, signatureHash: string): boolean {
    // In a real implementation, this would verify a cryptographic signature
    // For now we'll simulate verification
    return signatureHash.length > 0;
  }

  /**
   * Embed ownership data into an image using steganography
   * @param content Original image content
   * @param ownershipData Ownership data to embed
   * @param options Export options
   * @returns Blob with the processed image
   */
  private async embedOwnershipData(
    content: ArrayBuffer | Blob,
    ownershipData: OwnershipWatermark,
    options: SocialMediaExportOptions
  ): Promise<Blob> {
    // Convert to image data for processing
    const imageData = await this.blobToImageData(content instanceof Blob ? content : new Blob([content]));
    
    // Prepare data to embed
    const dataToEmbed = JSON.stringify(ownershipData);
    
    // Apply steganography to embed the data
    // In a real implementation, this would use a robust steganography algorithm
    // For now we'll simulate embedding by returning the original image
    const processedImageData = await this.embedSteganographicData(
      imageData,
      dataToEmbed,
      options.watermarkStrength || 70
    );
    
    // Apply visible attribution if requested
    let finalImageData = processedImageData;
    if (options.addVisibleAttribution) {
      finalImageData = await this.addVisibleAttribution(
        processedImageData,
        ownershipData
      );
    }
    
    // Convert back to blob with specified quality
    return this.imageDataToBlob(finalImageData, 'image/jpeg', options.exportQuality || 95);
  }

  /**
   * Calculate perceptual hash for image similarity detection
   * @param imageBlob Image to hash
   * @returns Promise with perceptual hash string
   */
  private async calculatePerceptualHash(imageBlob: Blob): Promise<string> {
    // In a real implementation, this would calculate a perceptual hash (pHash or similar)
    // that can identify similar images even after transformation
    // For now we'll return a placeholder
    const imageData = await this.blobToImageData(imageBlob);
    return 'phash-' + Math.random().toString(36).substring(2, 10);
  }

  /**
   * Helper to convert Blob to ImageData for processing
   */
  private async blobToImageData(blob: Blob): Promise<ImageData> {
    // In a real implementation, this would:
    // 1. Create an image element and load the blob
    // 2. Draw it to a canvas
    // 3. Get the pixel data from the canvas
    // We'll simulate this for now
    return new ImageData(1, 1); // placeholder
  }

  /**
   * Helper to convert ImageData back to Blob
   */
  private async imageDataToBlob(
    imageData: ImageData,
    mimeType: string,
    quality: number
  ): Promise<Blob> {
    // In a real implementation, this would:
    // 1. Draw the ImageData to a canvas
    // 2. Use canvas.toBlob() to convert to the desired format
    // We'll simulate this for now
    return new Blob([], { type: mimeType });
  }

  /**
   * Embed data using steganography
   */
  private async embedSteganographicData(
    imageData: ImageData,
    data: string,
    strength: number
  ): Promise<ImageData> {
    // In a real implementation, this would embed the data into the least significant bits
    // of the image pixels, or use a more advanced steganography technique
    console.log(`Embedding data with strength ${strength}`);
    return imageData; // placeholder
  }

  /**
   * Extract steganographically embedded data
   */
  private async extractSteganographicData(imageData: ImageData): Promise<string | null> {
    // In a real implementation, this would extract the data embedded using the
    // complementary technique to embedSteganographicData
    return null; // placeholder
  }

  /**
   * Add a visible attribution watermark to the image
   */
  private async addVisibleAttribution(
    imageData: ImageData,
    ownershipData: OwnershipWatermark
  ): Promise<ImageData> {
    // In a real implementation, this would add a small visible text or logo
    // attribution to the image, typically in a corner
    console.log('Adding visible attribution');
    return imageData; // placeholder
  }
}
