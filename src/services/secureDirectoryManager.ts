/**
 * Secure Directory Manager
 * 
 * This service manages secure directory access using Lit Protocol's
 * decentralized permissions system. It ensures only authorized users
 * can access specific directories in the filesystem.
 */

import { FileSystemInterface, DirectoryHandle } from '../core/filesystem';
import { LitProtocolService, PermissionLevel, DirectoryPermission } from './litProtocolService';
import { sha256 } from '@noble/hashes/sha256';

/**
 * Directory metadata for security tracking
 */
export interface SecureDirectoryMetadata {
  id: string;
  path: string;
  name: string;
  ownerAddress: string;
  createdAt: number;
  isShared: boolean;
}

/**
 * Secure Directory Manager
 * Manages directory permissions using Lit Protocol for decentralized access control
 */
export class SecureDirectoryManager {
  private litService: LitProtocolService;
  private fileSystem: FileSystemInterface;
  private userAddress: string;
  private secureDirectories: Map<string, SecureDirectoryMetadata> = new Map();

  constructor(litService: LitProtocolService, fileSystem: FileSystemInterface, userAddress: string) {
    this.litService = litService;
    this.fileSystem = fileSystem;
    this.userAddress = userAddress;
  }

  /**
   * Generate a unique directory ID based on path and metadata
   * @param path Directory path
   */
  private async generateDirectoryId(path: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataToHash = encoder.encode(`${path}:${this.userAddress}:${Date.now()}`);
    const hash = sha256(dataToHash);
    return Array.from(hash)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Secure a directory with Lit Protocol permissions
   * @param directoryHandle Directory handle from File System Access API
   * @returns Secure directory metadata
   */
  async secureDirectory(directoryHandle: FileSystemDirectoryHandle): Promise<SecureDirectoryMetadata> {
    try {
      // Generate a unique ID for this directory
      const directoryPath = directoryHandle.name;
      const directoryId = await this.generateDirectoryId(directoryPath);
      
      // Create metadata for the secure directory
      const directoryMetadata: SecureDirectoryMetadata = {
        id: directoryId,
        path: directoryPath,
        name: directoryHandle.name,
        ownerAddress: this.userAddress,
        createdAt: Date.now(),
        isShared: false
      };
      
      // Store metadata
      this.secureDirectories.set(directoryId, directoryMetadata);
      
      // Set the owner's permission to ADMIN level
      await this.litService.createDirectoryPermission(
        directoryId,
        directoryPath,
        this.userAddress,
        PermissionLevel.ADMIN
      );
      
      console.log(`Directory ${directoryPath} secured with ID ${directoryId}`);
      return directoryMetadata;
    } catch (error) {
      console.error('Error securing directory:', error);
      throw new Error('Failed to secure directory with Lit Protocol');
    }
  }
  
  /**
   * Verify if a user has permission to access a directory
   * @param directoryId Directory ID to check
   * @param requiredPermission Permission level required
   * @returns Whether access is allowed
   */
  async verifyDirectoryAccess(
    directoryId: string, 
    requiredPermission: PermissionLevel = PermissionLevel.READ
  ): Promise<boolean> {
    try {
      // Verify the user's authentication and permission level
      return await this.litService.checkDirectoryPermission(
        directoryId,
        this.userAddress,
        requiredPermission
      );
    } catch (error) {
      console.error('Error verifying directory access:', error);
      return false;
    }
  }
  
  /**
   * Share a directory with another user
   * @param directoryId Directory ID to share
   * @param recipientAddress Address of the recipient
   * @param permissionLevel Permission level to grant
   * @param expirationDays Optional expiration in days
   */
  async shareDirectory(
    directoryId: string,
    recipientAddress: string,
    permissionLevel: PermissionLevel = PermissionLevel.READ,
    expirationDays?: number
  ): Promise<boolean> {
    try {
      // Verify the current user has admin permission
      const hasAdminAccess = await this.verifyDirectoryAccess(directoryId, PermissionLevel.ADMIN);
      if (!hasAdminAccess) {
        console.error('Only administrators can share directories');
        return false;
      }
      
      // Calculate expiration time if specified
      let expiration: number | undefined = undefined;
      if (expirationDays !== undefined) {
        expiration = Date.now() + (expirationDays * 24 * 60 * 60 * 1000);
      }
      
      // Get directory metadata
      const directoryMetadata = this.secureDirectories.get(directoryId);
      if (!directoryMetadata) {
        console.error('Directory not found:', directoryId);
        return false;
      }
      
      // Create permission for the recipient
      const success = await this.litService.createDirectoryPermission(
        directoryId,
        directoryMetadata.path,
        recipientAddress,
        permissionLevel,
        expiration
      );
      
      if (success) {
        // Mark directory as shared
        directoryMetadata.isShared = true;
        this.secureDirectories.set(directoryId, directoryMetadata);
        console.log(`Directory shared with ${recipientAddress} (${permissionLevel})`);
      }
      
      return success;
    } catch (error) {
      console.error('Error sharing directory:', error);
      return false;
    }
  }
  
  /**
   * Revoke access to a directory for a user
   * @param directoryId Directory ID
   * @param userAddress User address to revoke
   */
  async revokeAccess(directoryId: string, userAddress: string): Promise<boolean> {
    try {
      // Verify admin access
      const hasAdminAccess = await this.verifyDirectoryAccess(directoryId, PermissionLevel.ADMIN);
      if (!hasAdminAccess) {
        console.error('Only administrators can revoke directory access');
        return false;
      }
      
      return await this.litService.removeDirectoryPermission(directoryId, userAddress);
    } catch (error) {
      console.error('Error revoking directory access:', error);
      return false;
    }
  }
  
  /**
   * Get all secure directories for the current user
   */
  getSecureDirectories(): SecureDirectoryMetadata[] {
    return Array.from(this.secureDirectories.values());
  }
  
  /**
   * Get a specific secure directory by ID
   */
  getDirectoryById(directoryId: string): SecureDirectoryMetadata | undefined {
    return this.secureDirectories.get(directoryId);
  }
  
  /**
   * List all users with permissions for a directory
   */
  async getDirectoryPermissions(directoryId: string): Promise<DirectoryPermission[]> {
    try {
      const hasAccess = await this.verifyDirectoryAccess(directoryId, PermissionLevel.READ);
      if (!hasAccess) {
        console.error('User does not have permission to view directory permissions');
        return [];
      }
      
      return await this.litService.getDirectoryPermissions(directoryId);
    } catch (error) {
      console.error('Error getting directory permissions:', error);
      return [];
    }
  }
}
