/**
 * Marketplace Service
 * Manages NFT marketplace listings with secure auto-deletion after sale
 * Integrates with popular marketplaces while maintaining content security
 */
import { AssetManager } from '../core/assetManager';
import { BlockchainIntegration } from '../blockchain/integration';
import { IPFSPinningService } from './ipfsService';
import { TransferService } from './transferService';
export declare enum MarketplaceProvider {
    OPENSEA = "opensea",
    RARIBLE = "rarible",
    FOUNDATION = "foundation",
    OUR_MARKETPLACE = "wasi-marketplace"
}
export declare enum ListingStatus {
    DRAFT = "draft",
    ACTIVE = "active",
    SOLD = "sold",
    CANCELLED = "cancelled",
    EXPIRED = "expired"
}
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
export declare class MarketplaceService {
    private assetManager;
    private ipfsService;
    private blockchain;
    private transferService;
    private listings;
    private isMonitoring;
    constructor(assetManager: AssetManager, ipfsService: IPFSPinningService, blockchain: BlockchainIntegration, transferService: TransferService);
    /**
     * List an asset on a marketplace with auto-deletion after sale
     * @param assetId The asset ID to list
     * @param marketplace The marketplace to list on
     * @param price The listing price
     * @param currency The currency for the price
     * @returns Listing information
     */
    listOnMarketplace(assetId: string, marketplace: MarketplaceProvider, price: string, currency?: string): Promise<MarketplaceListing>;
    /**
     * Cancel a marketplace listing
     * @param listingId The listing ID to cancel
     * @returns Success status
     */
    cancelListing(listingId: string): Promise<boolean>;
    /**
     * Get all listings for a user
     * @param userAddress Optional user address to filter by
     * @returns List of marketplace listings
     */
    getListings(userAddress?: string): MarketplaceListing[];
    /**
     * Get listing by ID
     * @param listingId The listing ID
     * @returns Marketplace listing or undefined
     */
    getListing(listingId: string): MarketplaceListing | undefined;
    /**
     * Get listing by token ID
     * @param tokenId The NFT token ID
     * @returns Marketplace listing or undefined
     */
    getListingByTokenId(tokenId: string): MarketplaceListing | undefined;
    /**
     * Start monitoring for sales events
     */
    private ensureSalesMonitoring;
    /**
     * Handle a sale of an NFT
     * @param listing The listing that was sold
     * @param buyerAddress The buyer's address
     */
    private handleSale;
    /**
     * Get marketplace URL for a listing
     * @param listing The marketplace listing
     * @returns URL to view the listing
     */
    getMarketplaceUrl(listing: MarketplaceListing): string;
}
