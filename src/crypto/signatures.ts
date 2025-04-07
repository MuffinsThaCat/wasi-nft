/**
 * Cryptographic utilities for digital asset signing and verification
 */
import { sha256 } from '@noble/hashes/sha256';
import * as ed25519 from '@noble/ed25519';
import { Buffer } from 'buffer';

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
export async function generateKeyPair(): Promise<KeyPair> {
  const privateKey = ed25519.utils.randomPrivateKey();
  const publicKey = await ed25519.getPublicKey(privateKey);
  
  return {
    publicKey,
    privateKey
  };
}

/**
 * Hash the content using SHA-256
 * @param content - The content to hash
 */
export function hashContent(content: ArrayBuffer): Uint8Array {
  return sha256(new Uint8Array(content));
}

/**
 * Sign asset data with the private key
 * @param data - The data to sign (typically a hash of the asset content)
 * @param privateKey - The signer's private key
 */
export async function signData(data: Uint8Array, privateKey: Uint8Array): Promise<Uint8Array> {
  return await ed25519.sign(data, privateKey);
}

/**
 * Verify a signature with the public key
 * @param data - The original data that was signed
 * @param signature - The signature to verify
 * @param publicKey - The signer's public key
 */
export async function verifySignature(
  data: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array
): Promise<boolean> {
  try {
    return await ed25519.verify(signature, data, publicKey);
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Export public key to Base64 string format
 */
export function exportPublicKey(publicKey: Uint8Array): string {
  return Buffer.from(publicKey).toString('base64');
}

/**
 * Import public key from Base64 string format
 */
export function importPublicKey(publicKeyStr: string): Uint8Array {
  return new Uint8Array(Buffer.from(publicKeyStr, 'base64'));
}

/**
 * Securely store a key pair in browser's localStorage
 * Note: In a production environment, consider more secure storage methods
 */
export function storeKeyPair(userId: string, keyPair: KeyPair): void {
  const storage = {
    publicKey: Buffer.from(keyPair.publicKey).toString('base64'),
    privateKey: Buffer.from(keyPair.privateKey).toString('base64')
  };
  
  localStorage.setItem(`user_keys_${userId}`, JSON.stringify(storage));
}

/**
 * Retrieve a key pair from browser's localStorage
 */
export function retrieveKeyPair(userId: string): KeyPair | null {
  const storedKeys = localStorage.getItem(`user_keys_${userId}`);
  
  if (!storedKeys) {
    return null;
  }
  
  try {
    const parsed = JSON.parse(storedKeys);
    return {
      publicKey: new Uint8Array(Buffer.from(parsed.publicKey, 'base64')),
      privateKey: new Uint8Array(Buffer.from(parsed.privateKey, 'base64'))
    };
  } catch (error) {
    console.error('Failed to parse stored key pair:', error);
    return null;
  }
}
