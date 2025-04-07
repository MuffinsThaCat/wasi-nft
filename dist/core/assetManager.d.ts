import { FileSystemInterface } from './filesystem';
import { SignatureData } from '../crypto/signatures';
import { BlockchainIntegration } from '../blockchain/integration';
import { BlockchainReference, TransferOptions } from '../types/blockchain';
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
    aiGeneration?: {
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
        generationDate: number;
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
export interface CreateAssetParams {
    title: string;
    description: string;
    content: File;
    editions: number;
    creatorName: string;
}
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
        generationDate?: number;
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
export declare class AssetManager {
    fileSystem: FileSystemInterface;
    private userId;
    private keyPair;
    private assetsDirectory;
    private metadataDirectory;
    private assetCache;
    private blockchain;
    private wallet;
    constructor(params: {
        fileSystem: FileSystemInterface;
        blockchain?: BlockchainIntegration;
        userId?: string;
        assetsDirectoryName?: string;
        metadataDirectoryName?: string;
    });
    /**
     * Initialize the asset manager
     */
    initialize(): Promise<void>;
    /**
     * Initialize blockchain integration
     */
    private initializeBlockchain;
    /**
     * Initialize cryptographic keys for the user
     */
    private initializeKeyPair;
    /**
     * Get the user ID
     */
    getUserId(): string;
    /**
     * Create a new digital asset
     */
    createAsset(params: CreateAssetParams): Promise<AssetMetadata>;
    /**
     * Get the content of an asset
     */
    getAssetContent(assetId: string): Promise<ArrayBuffer>;
    /**
     * Get all assets created by the user
     */
    getAssets(): Promise<AssetMetadata[]>;
    /**
     * Get a single asset by ID
     */
    getAsset(assetId: string): Promise<AssetMetadata>;
    /**
     * Verify the authenticity of an asset
     */
    verifyAsset(assetId: string): Promise<boolean>;
    /**
     * Export an asset for sharing
     */
    exportAsset(assetId: string): Promise<Blob>;
    /**
     * Import an asset from a bundle
     */
    importAsset(bundle: Blob): Promise<AssetMetadata>;
    /**
     * Connect to a blockchain wallet
     */
    connectWallet(): Promise<{
        address: string;
        network: string;
        balance: string;
    }>;
    /**
     * Disconnect the current wallet
     */
    disconnectWallet(): void;
    /**
     * Check if a wallet is connected
     */
    isWalletConnected(): boolean;
    /**
     * Get current wallet information
     */
    getWalletInfo(): {
        address?: string;
        network?: string;
        isConnected: boolean;
    };
    /**
     * Update the metadata of an asset
     */
    updateAssetMetadata(assetId: string, metadata: AssetMetadata): Promise<void>;
    /**
     * Register an asset on the blockchain
     */
    registerOnBlockchain(assetId: string, options?: {
        network?: string;
        uri?: string;
    }): Promise<AssetMetadata>;
    /**
     * Register multiple assets on the blockchain in a batch
     */
    batchRegisterOnBlockchain(assetIds: string[], options?: {
        network?: string;
        baseUri?: string;
    }): Promise<AssetMetadata[]>;
    /**
     * Transfer an asset off-chain to another wallet by public key
     */
    transferAssetOffChain(assetId: string, recipientPublicKey: string): Promise<Blob>;
    /**
     * Transfer an asset on-chain to another wallet by address
     */
    transferAssetOnChain(assetId: string, recipientAddress: string, options?: TransferOptions): Promise<AssetMetadata>;
    /**
     * Transfer multiple assets on-chain in a batch
     */
    batchTransferAssetsOnChain(assetIds: string[], recipientAddress: string, options?: TransferOptions): Promise<AssetMetadata[]>;
    /**
     * Process a payment transaction
     */
    processPayment(recipientAddress: string, amount: string, options?: TransferOptions): Promise<{
        transactionHash: string;
        url: string;
    }>;
    /**
     * Create a new AI-generated art asset
     * Specialized method for handling AI-generated artwork with complete metadata
     */
    createAiArtAsset(params: CreateAiArtAssetParams): Promise<AssetMetadata>;
    /**
     * Create multiple AI-generated art assets in a batch
     */
    batchCreateAiArtAssets(batchParams: CreateAiArtAssetParams[]): Promise<AssetMetadata[]>;
}
