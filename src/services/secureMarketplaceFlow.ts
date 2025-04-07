/**
 * Secure Marketplace Flow
 * 
 * This service integrates the secure directory permissions from Lit Protocol
 * with the existing marketplace and transfer functionality to create a complete
 * flow from asset creation through listing to secure transfer between filesystems.
 */

import { AssetManager, AssetMetadata } from '../core/assetManager';
import { IPFSPinningService } from './ipfsService';
import { MarketplaceService, MarketplaceListing, MarketplaceProvider, ListingStatus } from './marketplaceService';
import { TransferService, TransferSession, TransferStatus, SecureTransferPackage } from './transferService';
import { LitProtocolService, PermissionLevel } from './litProtocolService';
import { SecureDirectoryManager, SecureDirectoryMetadata } from './secureDirectoryManager';
import { FileSystemInterface } from '../core/filesystem';
import { ImageWatermarkService } from './imageWatermarkService';

/**
 * Secure Asset Listing information with Lit Protocol integration
 */
export interface SecureAssetListing {
  listing: MarketplaceListing;
  secureDirectory: SecureDirectoryMetadata;
  ipfsCid: string;
  permissions: {
    creator: string;
    viewers: string[];
    hasPublicAccess: boolean;
  };
  watermarked?: boolean;
}

/**
 * Secure transfer information with Lit Protocol integration
 */
export interface SecureTransferInfo {
  transferSession: TransferSession;
  sourceDirectory: SecureDirectoryMetadata;
  targetDirectory: SecureDirectoryMetadata | null;
  permissionTransfer: boolean;
}

/**
 * Service for managing the complete secure flow from asset creation to marketplace listing to transfer
 */
export class SecureMarketplaceFlow {
  private imageWatermarkService: ImageWatermarkService;

  constructor(
    private assetManager: AssetManager,
    private ipfsService: IPFSPinningService,
    private marketplaceService: MarketplaceService,
    private transferService: TransferService,
    private litService: LitProtocolService,
    private secureDirectoryManager: SecureDirectoryManager,
    private fileSystem: FileSystemInterface
  ) {
    // Initialize the image watermark service
    this.imageWatermarkService = new ImageWatermarkService();
  }

  /**
   * Create asset and secure it with Lit Protocol permissions
   * @param title Asset title
   * @param description Asset description
   * @param content Asset content
   * @param secureDirectoryId ID of the secure directory
   * @returns Asset metadata
   */
  async createSecureAsset(
    title: string,
    description: string,
    content: File,
    secureDirectoryId: string
  ): Promise<AssetMetadata> {
    // Verify directory access
    const hasAccess = await this.secureDirectoryManager.verifyDirectoryAccess(
      secureDirectoryId,
      PermissionLevel.WRITE
    );

    if (!hasAccess) {
      throw new Error('No permission to create assets in this directory');
    }

    // Create the asset
    const asset = await this.assetManager.createAsset({
      title,
      description,
      content,
      editions: 1,
      creatorName: 'Secure Creator'
    });

    console.log(`Created secure asset ${asset.id} in directory ${secureDirectoryId}`);
    return asset;
  }

  /**
   * Create a marketplace listing with secure IPFS integration
   * @param asset Asset to list
   * @param secureDirectoryId Directory containing the asset
   * @param price Listing price
   * @param currency Currency for the price
   * @param marketplace Marketplace provider
   * @returns Secure asset listing
   */
  async createSecureListing(
    asset: AssetMetadata,
    secureDirectoryId: string,
    price: string,
    currency: string = 'ETH',
    marketplace: MarketplaceProvider = MarketplaceProvider.OUR_MARKETPLACE
  ): Promise<SecureAssetListing> {
    // 1. Verify directory access
    const hasAccess = await this.secureDirectoryManager.verifyDirectoryAccess(
      secureDirectoryId,
      PermissionLevel.WRITE
    );

    if (!hasAccess) {
      throw new Error('No permission to list assets from this directory');
    }

    // 2. Get directory metadata
    const secureDirectory = this.secureDirectoryManager.getDirectoryById(secureDirectoryId);
    if (!secureDirectory) {
      throw new Error('Secure directory not found');
    }

    // 3. Create a temporary IPFS preview of the asset
    // In a real implementation, this would extract a low-res preview or limited content
    // For demo purposes, we'll upload the whole asset (in production this would be more limited)
    const assetContent = await this.assetManager.getAssetContent(asset.id);
    if (!assetContent) {
      throw new Error('Asset content not found');
    }
    
    // 4. Apply watermark if it's an image and upload to IPFS
    let contentToUpload;
    const contentType = assetContent instanceof Blob ? assetContent.type : '';
    const isImage = contentType.startsWith('image/');
    
    if (isImage) {
      console.log('Applying watermark to marketplace image');
      // Apply watermark to the preview image for the marketplace
      contentToUpload = await this.imageWatermarkService.applyWatermark(
        assetContent,
        {
          listingId: asset.id,
          ownerAddress: secureDirectory.ownerAddress,
          timestamp: Date.now(),
          customText: `${asset.title} - Preview Only`,
          opacity: 0.4,
          position: 'bottomright',
          includeInvisibleData: true
        }
      );
    } else {
      // Not an image, use the content as-is
      contentToUpload = assetContent instanceof Blob ? 
        await assetContent.arrayBuffer() : 
        assetContent;
    }
    
    const ipfsCid = await this.ipfsService.pinFile(contentToUpload);
    
    // 5. Create marketplace listing
    const listing = await this.marketplaceService.listOnMarketplace(
      asset.id,
      marketplace,
      price,
      currency
    );
    
    // 6. Return secure listing information
    return {
      listing,
      secureDirectory,
      ipfsCid,
      permissions: {
        creator: secureDirectory.ownerAddress,
        viewers: [], // In a real implementation, this would track who has viewed the listing
        hasPublicAccess: true
      },
      // Track if the listing has been watermarked
      watermarked: assetContent instanceof Blob && assetContent.type.startsWith('image/')
    };
  }

  /**
   * Initiate secure transfer with Lit Protocol verification
   * @param listingId Listing ID to purchase
   * @param buyerAddress Buyer's address
   * @param targetDirectoryId Buyer's secure directory ID
   * @returns Secure transfer information
   */
  async initiateSecureTransfer(
    listingId: string,
    buyerAddress: string,
    targetDirectoryId: string
  ): Promise<SecureTransferInfo> {
    // 1. Get the listing
    const listing = this.marketplaceService.getListing(listingId);
    if (!listing || listing.status !== ListingStatus.ACTIVE) {
      throw new Error('Listing not found or not active');
    }
    
    // 2. Find the source directory through asset metadata
    // In a real implementation, you'd have a direct reference
    // For demo purposes, we'll assume there's only one secure directory per user
    const userDirectories = this.secureDirectoryManager.getSecureDirectories();
    const sourceDirectory = userDirectories.find(dir => dir.ownerAddress === listing.sellerAddress);
    
    if (!sourceDirectory) {
      throw new Error('Source directory not found');
    }
    
    // 3. Get target directory
    const targetDirectory = this.secureDirectoryManager.getDirectoryById(targetDirectoryId);
    
    // 4. Initiate transfer
    const transferSession = await this.transferService.initiateTransfer(
      listing.assetId,
      buyerAddress
    );
    
    // 5. Create transfer record with secure directory information
    const secureTransfer: SecureTransferInfo = {
      transferSession,
      sourceDirectory,
      targetDirectory,
      permissionTransfer: false // Will be set to true when permissions are transferred
    };
    
    return secureTransfer;
  }

  /**
   * Complete secure transfer with Lit Protocol permission transfer
   * @param transferId Transfer ID to complete
   * @returns Status of the completed transfer
   */
  async completeSecureTransfer(transferId: string): Promise<TransferStatus> {
    // 1. Get transfer session
    const transfer = this.transferService.getTransfer(transferId);
    if (!transfer || transfer.status !== TransferStatus.PENDING_CONFIRMATION) {
      throw new Error('Transfer not found or not in pending status');
    }
    
    // 2. Complete the transfer on blockchain (if applicable)
    const transactionHash = await this.transferService.completeTransferOnBlockchain(transferId);
    
    // 3. Find source and target directories
    // In a real implementation, you'd store this information with the transfer
    const userDirectories = this.secureDirectoryManager.getSecureDirectories();
    const sourceDirectory = userDirectories.find(dir => dir.ownerAddress === transfer.sellerAddress);
    const targetDirectory = userDirectories.find(dir => dir.ownerAddress === transfer.buyerAddress);
    
    if (!sourceDirectory || !targetDirectory) {
      throw new Error('Source or target directory not found');
    }
    
    // 4. Transfer permissions from seller to buyer
    // Revoke seller's access
    await this.litService.updateDirectoryPermission(
      sourceDirectory.id,
      sourceDirectory.ownerAddress,
      PermissionLevel.NONE
    );
    
    // Grant buyer admin access
    await this.litService.createDirectoryPermission(
      targetDirectory.id,
      targetDirectory.path,
      transfer.buyerAddress,
      PermissionLevel.ADMIN
    );
    
    // 5. Clean up IPFS content
    // Find the listing for this asset
    const listings = this.marketplaceService.getListings();
    const listing = listings.find(l => l.assetId === transfer.assetId);
    
    if (listing && listing.ipfsCid) {
      await this.ipfsService.unpinFile(listing.ipfsCid);
      console.log(`Unpinned IPFS content for sold asset: ${listing.ipfsCid}`);
    }
    
    // 6. Update listing status
    if (listing) {
      listing.status = ListingStatus.SOLD;
      // In a real implementation, you'd persist this change
    }
    
    return TransferStatus.COMPLETED;
  }

  /**
   * Get all secure listings with their security status
   * @returns Array of secure listings
   */
  getSecureListings(): SecureAssetListing[] {
    // This is a simplified implementation
    // In a real app, you'd have a database tracking this information
    
    const listings = this.marketplaceService.getListings();
    const secureListings: SecureAssetListing[] = [];
    
    for (const listing of listings) {
      if (listing.status === ListingStatus.ACTIVE) {
        // Find the directory for this listing's seller
        const userDirectories = this.secureDirectoryManager.getSecureDirectories();
        const secureDirectory = userDirectories.find(dir => dir.ownerAddress === listing.sellerAddress);
        
        if (secureDirectory) {
          secureListings.push({
            listing,
            secureDirectory,
            ipfsCid: listing.ipfsCid || '',
            permissions: {
              creator: listing.sellerAddress,
              viewers: [],
              hasPublicAccess: true
            }
          });
        }
      }
    }
    
    return secureListings;
  }
  
  /**
   * Cancel a secure listing and clean up IPFS content
   * @param listingId Listing ID to cancel
   * @returns Success status
   */
  async cancelSecureListing(listingId: string): Promise<boolean> {
    // 1. Get the listing
    const listing = this.marketplaceService.getListing(listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }
    
    // 2. Verify the user has permission to cancel
    const userDirectories = this.secureDirectoryManager.getSecureDirectories();
    const secureDirectory = userDirectories.find(dir => dir.ownerAddress === listing.sellerAddress);
    
    if (!secureDirectory) {
      throw new Error('No permission to cancel this listing');
    }
    
    // 3. Cancel the listing
    const canceled = await this.marketplaceService.cancelListing(listingId);
    
    // 4. Clean up IPFS if the cancellation was successful
    if (canceled && listing.ipfsCid) {
      await this.ipfsService.unpinFile(listing.ipfsCid);
      console.log(`Unpinned IPFS content for canceled listing: ${listing.ipfsCid}`);
    }
    
    return canceled;
  }
}
