/**
 * Secure Image Format Service
 * Handles encryption, watermarking, and verification of image assets
 * to enable secure peer-to-peer transfers with protection against unauthorized copying
 */

// Types for encryption keys
export interface AssetEncryptionKeys {
  encryptionKey: CryptoKey;
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

// Secure image format that contains encrypted data and verification
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
export class SecureImageFormatService {
  
  /**
   * Encrypt an image for secure storage
   */
  async encryptImage(
    imageData: ArrayBuffer,
    metadata: any,
    ownershipId: string,
    keys: AssetEncryptionKeys
  ): Promise<SecureImageFormat> {
    // Generate random initialization vector
    const iv = new Uint8Array(12);
    window.crypto.getRandomValues(iv);
    
    // Encrypt the image data
    const encryptedData = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      keys.encryptionKey,
      imageData
    );
    
    // Create metadata hash
    const metadataString = JSON.stringify(metadata);
    const metadataBuffer = new TextEncoder().encode(metadataString);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', metadataBuffer);
    const metadataHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Create digital watermark
    const watermark = {
      ownershipId,
      timestamp: Date.now(),
      blockchainReference: metadata.blockchain?.transactionHash
    };
    
    // Create signature for verification
    const dataToSign = new Uint8Array([
      ...new Uint8Array(encryptedData),
      ...iv,
      ...new TextEncoder().encode(JSON.stringify(watermark)),
      ...new TextEncoder().encode(metadataHash)
    ]);
    
    const signature = await window.crypto.subtle.sign(
      {
        name: 'RSASSA-PKCS1-v1_5'
      },
      keys.privateKey,
      dataToSign
    );
    
    return {
      encryptedData,
      iv,
      watermark,
      metadataHash,
      signature
    };
  }
  
  /**
   * Decrypt a secure image for viewing
   */
  async decryptImage(
    secureImage: SecureImageFormat,
    keys: AssetEncryptionKeys
  ): Promise<ArrayBuffer> {
    try {
      // Verify signature before decryption
      const isValid = await this.verifyImage(secureImage, keys.publicKey);
      
      if (!isValid) {
        throw new Error('Image signature verification failed');
      }
      
      // Decrypt the image data
      const decryptedData = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: secureImage.iv
        },
        keys.encryptionKey,
        secureImage.encryptedData
      );
      
      return decryptedData;
    } catch (error) {
      console.error('Error decrypting secure image:', error);
      throw new Error('Failed to decrypt image: may not have proper ownership keys');
    }
  }
  
  /**
   * Verify image integrity and ownership
   */
  async verifyImage(
    secureImage: SecureImageFormat,
    publicKey: CryptoKey
  ): Promise<boolean> {
    try {
      // Recreate data that was signed
      const dataToVerify = new Uint8Array([
        ...new Uint8Array(secureImage.encryptedData),
        ...secureImage.iv,
        ...new TextEncoder().encode(JSON.stringify(secureImage.watermark)),
        ...new TextEncoder().encode(secureImage.metadataHash)
      ]);
      
      // Verify signature
      const isValid = await window.crypto.subtle.verify(
        {
          name: 'RSASSA-PKCS1-v1_5'
        },
        publicKey,
        secureImage.signature,
        dataToVerify
      );
      
      return isValid;
    } catch (error) {
      console.error('Error verifying secure image:', error);
      return false;
    }
  }
  
  /**
   * Generate new encryption keys for asset
   */
  async generateAssetKeys(): Promise<AssetEncryptionKeys> {
    // Generate encryption key for AES-GCM
    const encryptionKey = await window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    );
    
    // Generate key pair for RSA signing
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
        hash: 'SHA-256'
      },
      true,
      ['sign', 'verify']
    );
    
    return {
      encryptionKey,
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey
    };
  }
  
  /**
   * Export keys in a format that can be stored
   */
  async exportKeys(keys: AssetEncryptionKeys): Promise<{
    encryptionKey: JsonWebKey;
    publicKey: JsonWebKey;
    privateKey: JsonWebKey;
  }> {
    const encryptionKey = await window.crypto.subtle.exportKey('jwk', keys.encryptionKey);
    const publicKey = await window.crypto.subtle.exportKey('jwk', keys.publicKey);
    const privateKey = await window.crypto.subtle.exportKey('jwk', keys.privateKey);
    
    return {
      encryptionKey,
      publicKey,
      privateKey
    };
  }
  
  /**
   * Import keys from stored format
   */
  async importKeys(exportedKeys: {
    encryptionKey: JsonWebKey;
    publicKey: JsonWebKey;
    privateKey: JsonWebKey;
  }): Promise<AssetEncryptionKeys> {
    const encryptionKey = await window.crypto.subtle.importKey(
      'jwk',
      exportedKeys.encryptionKey,
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    );
    
    const publicKey = await window.crypto.subtle.importKey(
      'jwk',
      exportedKeys.publicKey,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256'
      },
      true,
      ['verify']
    );
    
    const privateKey = await window.crypto.subtle.importKey(
      'jwk',
      exportedKeys.privateKey,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256'
      },
      true,
      ['sign']
    );
    
    return {
      encryptionKey,
      publicKey,
      privateKey
    };
  }
}
