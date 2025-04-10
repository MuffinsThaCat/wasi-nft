/**
 * Merkle Tree implementation for compressed NFTs
 * This enables efficient storage and verification of large NFT collections
 */
import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';
import { AssetMetadata } from '../types/assets';
import { Buffer } from 'buffer';

/**
 * Data structure representing a leaf in the Merkle tree
 */
export interface MerkleLeaf {
  assetId: string;
  owner: string;
  contentHash: string;
  metadataHash: string;
}

/**
 * Data structure for a verified proof result
 */
export interface VerificationResult {
  verified: boolean;
  index?: number;
  proof?: Buffer[];
}

/**
 * Class implementing Merkle tree functionality for compressed NFT collections
 */
export class CompressedNFTMerkleTree {
  private tree: MerkleTree;
  private leaves: Buffer[] = [];
  private leafData: MerkleLeaf[] = [];
  
  /**
   * Create a new Merkle tree for a compressed NFT collection
   * @param leafData Optional initial data for the tree
   */
  constructor(leafData: MerkleLeaf[] = []) {
    if (leafData.length > 0) {
      this.addLeaves(leafData);
    } else {
      // Initialize empty tree
      this.tree = new MerkleTree([], keccak256, { sortPairs: true });
    }
  }
  
  /**
   * Create a hash for a leaf from asset metadata
   * @param leaf The leaf data to hash
   * @returns Buffer containing the hash
   */
  public hashLeaf(leaf: MerkleLeaf): Buffer {
    return keccak256(Buffer.from(JSON.stringify({
      assetId: leaf.assetId,
      owner: leaf.owner,
      contentHash: leaf.contentHash,
      metadataHash: leaf.metadataHash
    })));
  }
  
  /**
   * Add a single leaf to the Merkle tree
   * @param leaf The leaf data to add
   */
  public addLeaf(leaf: MerkleLeaf): void {
    const leafHash = this.hashLeaf(leaf);
    this.leaves.push(leafHash);
    this.leafData.push(leaf);
    this.rebuildTree();
  }
  
  /**
   * Add multiple leaves to the Merkle tree
   * @param leaves Array of leaf data to add
   */
  public addLeaves(leaves: MerkleLeaf[]): void {
    for (const leaf of leaves) {
      const leafHash = this.hashLeaf(leaf);
      this.leaves.push(leafHash);
      this.leafData.push(leaf);
    }
    this.rebuildTree();
  }
  
  /**
   * Rebuild the Merkle tree with current leaves
   * Called internally when leaves are modified
   */
  private rebuildTree(): void {
    this.tree = new MerkleTree(this.leaves, keccak256, { sortPairs: true });
  }
  
  /**
   * Get the Merkle root as a Buffer
   */
  public getRoot(): Buffer {
    return this.tree.getRoot();
  }
  
  /**
   * Get the Merkle root as a hexadecimal string
   */
  public getHexRoot(): string {
    return this.tree.getHexRoot();
  }
  
  /**
   * Get proof for a specific leaf
   * @param leaf The leaf to generate proof for
   * @returns The proof as array of buffers
   */
  public getProof(leaf: MerkleLeaf): Buffer[] {
    const leafHash = this.hashLeaf(leaf);
    return this.tree.getProof(leafHash);
  }
  
  /**
   * Get hexadecimal representation of a proof
   * @param leaf The leaf to generate hex proof for
   * @returns The proof as array of hex strings
   */
  public getHexProof(leaf: MerkleLeaf): string[] {
    const leafHash = this.hashLeaf(leaf);
    return this.tree.getHexProof(leafHash);
  }
  
  /**
   * Verify a leaf is part of the Merkle tree using its proof
   * @param leaf The leaf to verify
   * @param proof The proof for the leaf
   * @returns True if verified, false otherwise
   */
  public verify(leaf: MerkleLeaf, proof: Buffer[]): boolean {
    const leafHash = this.hashLeaf(leaf);
    return this.tree.verify(proof, leafHash, this.getRoot());
  }
  
  /**
   * Find an asset in the Merkle tree by its ID
   * @param assetId The asset ID to find
   * @returns The verification result with proof if found
   */
  public findAsset(assetId: string): VerificationResult {
    const index = this.leafData.findIndex(data => data.assetId === assetId);
    
    if (index === -1) {
      return { verified: false };
    }
    
    const leaf = this.leafData[index];
    const proof = this.getProof(leaf);
    
    return {
      verified: true,
      index,
      proof
    };
  }
  
  /**
   * Get all leaf data in the tree
   */
  public getAllLeaves(): MerkleLeaf[] {
    return [...this.leafData];
  }
  
  /**
   * Get the number of assets in the tree
   */
  public getSize(): number {
    return this.leafData.length;
  }
  
  /**
   * Export the Merkle tree data for storage
   */
  public exportTree(): {
    root: string;
    leaves: MerkleLeaf[];
  } {
    return {
      root: this.getHexRoot(),
      leaves: this.leafData
    };
  }
  
  /**
   * Import Merkle tree data from storage
   * @param data The exported tree data
   */
  public static importTree(data: {
    root: string;
    leaves: MerkleLeaf[];
  }): CompressedNFTMerkleTree {
    const tree = new CompressedNFTMerkleTree(data.leaves);
    return tree;
  }
  
  /**
   * Utility to create a leaf from an asset metadata
   * @param metadata The asset metadata
   * @param contentHash Hash of the asset content
   * @returns A Merkle leaf data structure
   */
  public static createLeafFromAsset(
    metadata: AssetMetadata, 
    contentHash: string,
    owner: string = metadata.creator.id || metadata.creator.name
  ): MerkleLeaf {
    const metadataHash = keccak256(Buffer.from(JSON.stringify(metadata))).toString('hex');
    
    return {
      assetId: metadata.id,
      owner,
      contentHash,
      metadataHash
    };
  }
}
