/**
 * Type declarations for external libraries without official type definitions
 */

declare module 'merkletreejs' {
  export class MerkleTree {
    constructor(
      leaves: Buffer[],
      hashFunction: (data: Buffer) => Buffer,
      options?: { sortPairs?: boolean }
    );
    
    getRoot(): Buffer;
    getHexRoot(): string;
    getProof(leaf: Buffer): Buffer[];
    getHexProof(leaf: Buffer): string[];
    verify(proof: Buffer[], leaf: Buffer, root: Buffer): boolean;
    toString(): string;
    getLeaves(): Buffer[];
    getLeaf(index: number): Buffer;
    getLeafIndex(leaf: Buffer): number;
    getLeafCount(): number;
    addLeaf(leaf: Buffer): void;
    addLeaves(leaves: Buffer[]): void;
    resetTree(): void;
  }
}

declare module 'keccak256' {
  function keccak256(data: Buffer | string | number[] | Uint8Array): Buffer;
  export = keccak256;
}
