/**
 * Secure Image Format Service
 * Handles encryption, watermarking, and verification of image assets
 * to enable secure peer-to-peer transfers with protection against unauthorized copying
 */
export interface AssetEncryptionKeys {
    encryptionKey: CryptoKey;
    publicKey: CryptoKey;
    privateKey: CryptoKey;
}
export interface SecureImageFormat {
    encryptedData: ArrayBuffer;
    iv: Uint8Array;
    watermark: {
        ownershipId: string;
        timestamp: number;
        blockchainReference?: string;
    };
    metadataHash: string;
    signature: ArrayBuffer;
}
/**
 * Service for handling secure image encryption, decryption, and verification
 */
export declare class SecureImageFormatService {
    /**
     * Encrypt an image for secure storage
     */
    encryptImage(imageData: ArrayBuffer, metadata: any, ownershipId: string, keys: AssetEncryptionKeys): Promise<SecureImageFormat>;
    /**
     * Decrypt a secure image for viewing
     */
    decryptImage(secureImage: SecureImageFormat, keys: AssetEncryptionKeys): Promise<ArrayBuffer>;
    /**
     * Verify image integrity and ownership
     */
    verifyImage(secureImage: SecureImageFormat, publicKey: CryptoKey): Promise<boolean>;
    /**
     * Generate new encryption keys for asset
     */
    generateAssetKeys(): Promise<AssetEncryptionKeys>;
    /**
     * Export keys in a format that can be stored
     */
    exportKeys(keys: AssetEncryptionKeys): Promise<{
        encryptionKey: JsonWebKey;
        publicKey: JsonWebKey;
        privateKey: JsonWebKey;
    }>;
    /**
     * Import keys from stored format
     */
    importKeys(exportedKeys: {
        encryptionKey: JsonWebKey;
        publicKey: JsonWebKey;
        privateKey: JsonWebKey;
    }): Promise<AssetEncryptionKeys>;
}
