import { BlockchainConfig, WalletInfo, TransferOptions, TransactionReceipt } from '../types/blockchain';
/**
 * BlockchainIntegration class provides methods for interacting with blockchain networks
 * for asset metadata registration and ownership transfers.
 */
export declare class BlockchainIntegration {
    private eventListeners;
    private provider;
    private signer;
    private config;
    private currentNetwork;
    private contracts;
    constructor(customConfig?: Partial<BlockchainConfig>);
    /**
     * Initialize the Ethereum provider if available in the browser
     */
    private initializeProvider;
    /**
     * Get the current configuration
     */
    getConfig(): BlockchainConfig;
    /**
     * Update the blockchain configuration
     */
    updateConfig(newConfig: Partial<BlockchainConfig>): void;
    /**
     * Set contract address for the current network
     */
    setContractAddress(address: string): void;
    /**
     * Connect to a wallet
     */
    connectWallet(): Promise<WalletInfo>;
    /**
     * Disconnect the current wallet
     */
    disconnectWallet(): void;
    /**
     * Disconnect wallet from the integration
     */
    disconnect(): void;
    /**
     * Gets the current connected wallet address
     * @returns The current wallet address
     */
    getCurrentAddress(): Promise<string>;
    /**
     * Mints a new NFT with the given metadata
     * @param assetId The id of the asset
     * @param metadata The metadata of the NFT
     * @param ipfsUri The IPFS URI of the asset
     * @returns The transaction receipt
     */
    mintNFT(assetId: string, metadata: any, ipfsUri: string): Promise<string>;
    /**
     * Lists an NFT on a marketplace
     * @param assetId The id of the asset
     * @param marketplaceId The id of the marketplace
     * @param price The price of the NFT
     * @returns The transaction receipt
     */
    listOnMarketplace(assetId: string, marketplaceId: string, price: string): Promise<string>;
    /**
     * Cancels a marketplace listing
     * @param listingId The id of the listing
     * @returns The transaction receipt
     */
    cancelMarketplaceListing(listingId: string): Promise<string>;
    /**
     * Subscribes to transfer events for a specific NFT
     * @param assetId The id of the asset
     * @param callback The callback to call when a transfer event is detected
     */
    subscribeToTransferEvents(assetId: string, callback: (event: any) => void): void;
    /**
     * Records a secure transfer on the blockchain
     * @param assetId The id of the asset
     * @param newOwner The address of the new owner
     * @param transferProof The proof of the transfer
     * @returns The transaction receipt
     */
    recordSecureTransfer(assetId: string, newOwner: string, transferProof: string): Promise<string>;
    /**
     * Confirms a sale on the blockchain
     * @param assetId The id of the asset
     * @param buyerAddress The address of the buyer
     * @param salePrice The price of the sale
     * @returns The transaction receipt
     */
    confirmSale(assetId: string, buyerAddress: string, salePrice: string): Promise<string>;
    /**
     * Get the contract instance for the current network
     */
    private getContract;
    /**
     * Register an asset on the blockchain
     */
    registerAsset(assetId: string, contentHash: string, metadataHash: string, uri: string): Promise<TransactionReceipt>;
    /**
     * Register multiple assets in a batch
     */
    batchRegisterAssets(assetIds: string[], contentHashes: string[], metadataHashes: string[], uris: string[]): Promise<TransactionReceipt>;
    /**
     * Transfer ownership of an asset
     */
    transferAsset(assetId: string, to: string, options?: TransferOptions): Promise<TransactionReceipt>;
    /**
     * Transfer multiple assets in a batch
     */
    batchTransferAssets(assetIds: string[], to: string, options?: TransferOptions): Promise<TransactionReceipt>;
    /**
     * Check if an asset exists on the blockchain
     */
    assetExists(assetId: string): Promise<boolean>;
    /**
     * Get the owner of an asset
     */
    ownerOf(assetId: string): Promise<string>;
    /**
     * Get asset metadata from the blockchain
     */
    getAssetMetadata(assetId: string): Promise<{
        contentHash: string;
        metadataHash: string;
        uri: string;
        creator: string;
        timestamp: number;
        exists: boolean;
    }>;
    /**
     * Send a payment transaction
     */
    sendPayment(to: string, amount: string, options?: TransferOptions): Promise<TransactionReceipt>;
    /**
     * Get transaction URL for the explorer
     */
    getTransactionUrl(txHash: string): string;
    /**
     * Get address URL for the explorer
     */
    getAddressUrl(address: string): string;
}
declare global {
    interface Window {
        ethereum: any;
    }
}
