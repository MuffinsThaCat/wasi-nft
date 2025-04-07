/**
 * Key pair used for signing and verification
 */
export interface KeyPair {
    publicKey: Uint8Array;
    privateKey: Uint8Array;
}
/**
 * Signature data for a digital asset
 */
export interface SignatureData {
    signature: Uint8Array;
    publicKey: Uint8Array;
    timestamp: number;
}
/**
 * Create a new cryptographic key pair for signing assets
 */
export declare function generateKeyPair(): Promise<KeyPair>;
/**
 * Hash the content using SHA-256
 * @param content - The content to hash
 */
export declare function hashContent(content: ArrayBuffer): Uint8Array;
/**
 * Sign asset data with the private key
 * @param data - The data to sign (typically a hash of the asset content)
 * @param privateKey - The signer's private key
 */
export declare function signData(data: Uint8Array, privateKey: Uint8Array): Promise<Uint8Array>;
/**
 * Verify a signature with the public key
 * @param data - The original data that was signed
 * @param signature - The signature to verify
 * @param publicKey - The signer's public key
 */
export declare function verifySignature(data: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): Promise<boolean>;
/**
 * Export public key to Base64 string format
 */
export declare function exportPublicKey(publicKey: Uint8Array): string;
/**
 * Import public key from Base64 string format
 */
export declare function importPublicKey(publicKeyStr: string): Uint8Array;
/**
 * Securely store a key pair in browser's localStorage
 * Note: In a production environment, consider more secure storage methods
 */
export declare function storeKeyPair(userId: string, keyPair: KeyPair): void;
/**
 * Retrieve a key pair from browser's localStorage
 */
export declare function retrieveKeyPair(userId: string): KeyPair | null;
