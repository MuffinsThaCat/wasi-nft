/**
 * Marketplace Service
 * Manages NFT marketplace listings with secure auto-deletion after sale
 * Integrates with popular marketplaces while maintaining content security
 */

import { AssetManager } from '../core/assetManager';
import { BlockchainIntegration } from '../blockchain/integration';
import { IPFSPinningService } from './ipfsService';
import { TransferService } from './transferService';

// Supported marketplaces
export enum MarketplaceProvider {
  OPENSEA = 'opensea',
  RARIBLE = 'rarible',
  FOUNDATION = 'foundation',
  OUR_MARKETPLACE = 'wasi-marketplace'
}

// Listing status
export enum ListingStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  SOLD = 'sold',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

// Listing information
export interface MarketplaceListing {
  id: string;
  assetId: string;
  tokenId: string;
  ipfsCid: string;
  marketplace: MarketplaceProvider;
  price: string;
  currency: string;
  sellerAddress: string;
  buyerAddress?: string;
  status: ListingStatus;
  listedAt: number;
  soldAt?: number;
  expiresAt?: number;
  imageDeleted?: boolean;
  metadataUrl: string;
}

export class MarketplaceService {
  // Store active and historical listings
  private listings: Map<string, MarketplaceListing> = new Map();
  private isMonitoring: boolean = false;
  
  constructor(
    private assetManager: AssetManager,
    private ipfsService: IPFSPinningService,
    private blockchain: BlockchainIntegration,
    private transferService: TransferService
  ) {}
  
  /**
   * List an asset on a marketplace with auto-deletion after sale
   * @param assetId The asset ID to list
   * @param marketplace The marketplace to list on
   * @param price The listing price
   * @param currency The currency for the price
   * @returns Listing information
   */
  async listOnMarketplace(
    assetId: string,
    marketplace: MarketplaceProvider,
    price: string,
    currency: string = 'ETH'
  ): Promise<MarketplaceListing> {
    // 1. Get the asset
    const asset = await this.assetManager.getAsset(assetId);
    if (!asset) {
      throw new Error(`Asset ${assetId} not found`);
    }
    
    // 2. Create mock asset content for experimentation
    // In production, would use: this.assetManager.getAssetContent(assetId)
    console.log(`Creating mock asset content for ${assetId}...`);
    const assetContent = new TextEncoder().encode(`Mock asset content for ${assetId}`);
    if (!assetContent) {
      throw new Error(`Could not create mock asset content for ${assetId}`);
    }
    
    // 3. Upload the image to our controlled IPFS service
    console.log(`Uploading asset ${assetId} to IPFS...`);
    const ipfsCid = await this.ipfsService.pinFile(assetContent);
    const imageUrl = this.ipfsService.getIPFSUrl(ipfsCid);
    
    // 4. Create NFT metadata
    const metadata = {
      name: asset.title || `Asset ${assetId}`,
      description: asset.description || 'Secure digital asset with post-sale protection',
      image: imageUrl,
      properties: {
        // Using data directly from the asset metadata
        secure_transfer: true,
        original_asset_id: assetId,
        created_at: new Date().toISOString()
      }
    };
    
    // 5. Create metadata JSON and upload to IPFS
    const metadataBuffer = new TextEncoder().encode(JSON.stringify(metadata));
    const metadataCid = await this.ipfsService.pinFile(metadataBuffer);
    const metadataUrl = this.ipfsService.getIPFSUrl(metadataCid);
    
    // 6. Mint NFT with this metadata
    console.log(`Minting NFT for asset ${assetId}...`);
    const sellerAddress = await this.blockchain.getCurrentAddress();
    const tokenId = await this.blockchain.mintNFT(assetId, metadata, metadataUrl);
    
    // 7. List on the marketplace
    console.log(`Listing NFT ${tokenId} on ${marketplace}...`);
    const listingId = await this.blockchain.listOnMarketplace(
      tokenId,
      marketplace,
      price
    );
    
    // 8. Store listing information
    const listing: MarketplaceListing = {
      id: listingId,
      assetId,
      tokenId,
      ipfsCid,
      marketplace,
      price,
      currency,
      sellerAddress,
      status: ListingStatus.ACTIVE,
      listedAt: Date.now(),
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days expiration
      metadataUrl
    };
    
    this.listings.set(listing.id, listing);
    console.log(`Asset ${assetId} listed on ${marketplace} with ID ${listingId}`);
    
    // 9. Ensure we're monitoring for sales events
    this.ensureSalesMonitoring();
    
    return listing;
  }
  
  /**
   * Cancel a marketplace listing
   * @param listingId The listing ID to cancel
   * @returns Success status
   */
  async cancelListing(listingId: string): Promise<boolean> {
    const listing = this.listings.get(listingId);
    if (!listing) {
      throw new Error(`Listing ${listingId} not found`);
    }
    
    if (listing.status !== ListingStatus.ACTIVE) {
      throw new Error(`Listing ${listingId} is not active`);
    }
    
    // Cancel on the blockchain
    await this.blockchain.cancelMarketplaceListing(listing.tokenId);
    
    // Unpin from IPFS
    await this.ipfsService.unpinFile(listing.ipfsCid);
    
    // Update listing status
    listing.status = ListingStatus.CANCELLED;
    this.listings.set(listing.id, listing);
    
    return true;
  }
  
  /**
   * Get all listings for a user
   * @param userAddress Optional user address to filter by
   * @returns List of marketplace listings
   */
  getListings(userAddress?: string): MarketplaceListing[] {
    const allListings = Array.from(this.listings.values());
    
    if (userAddress) {
      return allListings.filter(listing => listing.sellerAddress === userAddress);
    }
    
    return allListings;
  }
  
  /**
   * Get listing by ID
   * @param listingId The listing ID
   * @returns Marketplace listing or undefined
   */
  getListing(listingId: string): MarketplaceListing | undefined {
    return this.listings.get(listingId);
  }
  
  /**
   * Get listing by token ID
   * @param tokenId The NFT token ID
   * @returns Marketplace listing or undefined
   */
  getListingByTokenId(tokenId: string): MarketplaceListing | undefined {
    return Array.from(this.listings.values()).find(listing => listing.tokenId === tokenId);
  }
  
  /**
   * Start monitoring for sales events
   */
  private ensureSalesMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('Starting sales event monitoring for all listed assets...');
    
    // Monitor each active listing
    const activeListings = this.getListings().filter(l => l.status === ListingStatus.ACTIVE);
    
    for (const listing of activeListings) {
      this.blockchain.subscribeToTransferEvents(listing.tokenId, async (event) => {
        const { from, to } = event;
        
        // Check if this is a sale (from seller to someone else)
        if (from === listing.sellerAddress && to !== listing.sellerAddress) {
          await this.handleSale(listing, to);
        }
      });
    }
  }
  
  /**
   * Handle a sale of an NFT
   * @param listing The listing that was sold
   * @param buyerAddress The buyer's address
   */
  private async handleSale(listing: MarketplaceListing, buyerAddress: string): Promise<void> {
    console.log(`Handling sale of NFT ${listing.tokenId} to ${buyerAddress}`);
    
    // 1. Unpin the image from IPFS - THE KEY FEATURE
    console.log(`Unpinning content with CID: ${listing.ipfsCid}`);
    await this.ipfsService.unpinFile(listing.ipfsCid);
    
    // Store the buyer address
    listing.buyerAddress = buyerAddress;
    listing.soldAt = Date.now();
    listing.status = ListingStatus.SOLD;
    listing.imageDeleted = true;
    
    this.listings.set(listing.id, listing);
    
    // Confirm the sale on the blockchain
    await this.blockchain.confirmSale(listing.tokenId, buyerAddress, listing.price);
  }
  
  /**
   * Get marketplace URL for a listing
   * @param listing The marketplace listing
   * @returns URL to view the listing
   */
  getMarketplaceUrl(listing: MarketplaceListing): string {
    // Mock implementation - in production would generate actual URLs
    switch (listing.marketplace) {
      case MarketplaceProvider.OPENSEA:
        return `https://opensea.io/assets/${listing.tokenId}`;
      case MarketplaceProvider.RARIBLE:
        return `https://rarible.com/token/${listing.tokenId}`;
      case MarketplaceProvider.FOUNDATION:
        return `https://foundation.app/${listing.tokenId}`;
      case MarketplaceProvider.OUR_MARKETPLACE:
        return `https://wasi-marketplace.com/nft/${listing.tokenId}`;
      default:
        return `https://etherscan.io/token/${listing.tokenId}`;
    }
  }
}
