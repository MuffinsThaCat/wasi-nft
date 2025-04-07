/**
 * Transfer Service
 * Manages secure peer-to-peer transfers of digital assets with proof of deletion
 * Ensures true ownership transfer where assets are removed from seller's filesystem
 * and securely transferred to the buyer
 */
import { AssetManager } from '../core/assetManager';
import { BlockchainIntegration } from '../blockchain/integration';
import { SecureImageFormatService, SecureImageFormat } from './secureImageFormat';
type AssetMetadata = any;
import { KeyPair } from '../crypto/signatures';
export declare enum TransferStatus {
    INITIATED = "initiated",
    PENDING_CONFIRMATION = "pending_confirmation",
    EXTRACTING = "extracting",
    DELETING = "deleting",
    CREATING_TRANSFER_PACKAGE = "creating_transfer_package",
    TRANSFERRING = "transferring",
    BLOCKCHAIN_VERIFICATION = "blockchain_verification",
    COMPLETED = "completed",
    FAILED = "failed"
}
export interface TransferSession {
    id: string;
    assetId: string;
    sellerAddress: string;
    buyerAddress: string;
    status: TransferStatus;
    initiatedAt: number;
    completedAt?: number;
    blockchainTxHash?: string;
    deletionProof?: DeletionProof;
    securePackage?: SecureTransferPackage;
}
export interface DeletionProof {
    assetId: string;
    timestamp: number;
    fileHashes: string[];
    signatureFromOwner: string;
    blockchainVerification?: string;
}
export interface SecureTransferPackage {
    assetId: string;
    encryptedAsset: SecureImageFormat;
    metadata: {
        original: AssetMetadata;
        transfer: {
            fromAddress: string;
            toAddress: string;
            timestamp: number;
            transactionHash?: string;
        };
    };
    deletionProof: DeletionProof;
    signature: string;
}
/**
 * Service for handling secure peer-to-peer transfers
 */
export declare class TransferService {
    private assetManager;
    private blockchain;
    private secureImageService;
    private transfers;
    private activeTransfers;
    private fileSystem;
    constructor(assetManager: AssetManager, blockchain: BlockchainIntegration, secureImageService: SecureImageFormatService);
    /**
     * Initiate a transfer of an asset to a buyer
     */
    initiateTransfer(assetId: string, buyerAddress: string): Promise<TransferSession>;
    /**
     * Create a secure package for transfer with proof of deletion
     */
    createSecureTransferPackage(transferId: string, keyPair: KeyPair): Promise<SecureTransferPackage>;
    /**
     * Create proof of deletion for an asset
     */
    private createDeletionProof;
    /**
     * Verify and register transfer on blockchain
     */
    completeTransferOnBlockchain(transferId: string): Promise<string>;
    /**
     * Receive and verify a secure transfer package
     */
    receiveTransferPackage(securePackage: SecureTransferPackage, keyPair: KeyPair): Promise<string>;
    /**
     * Calculate hash of data
     */
    private calculateHash;
    /**
     * Sign a message with private key
     * Note: We're only accepting string input to satisfy TypeScript's strict type checking
     */
    private signMessage;
    /**
     * Verify a signature
     */
    private verifySignature;
    /**
     * Get all active transfers
     */
    getActiveTransfers(): TransferSession[];
    /**
     * Get transfer by ID
     */
    getTransfer(transferId: string): TransferSession | undefined;
}
export {};
