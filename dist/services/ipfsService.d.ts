/**
 * IPFS Pinning Service
 * Manages temporary uploads to IPFS for marketplace listings
 * Allows controlled unpinning after NFT sales
 */
export declare class IPFSPinningService {
    private pinnedContent;
    private apiKey;
    private apiSecret;
    private endpoint;
    constructor(config: {
        apiKey: string;
        apiSecret: string;
        endpoint: string;
    });
    /**
     * Pin a file to IPFS
     * @param fileBuffer The file buffer to upload
     * @returns CID of the pinned content
     */
    pinFile(fileBuffer: ArrayBuffer | Uint8Array): Promise<string>;
    /**
     * Unpin a file from IPFS
     * @param cid The content identifier to unpin
     * @returns Success status
     */
    unpinFile(cid: string): Promise<boolean>;
    /**
     * Get IPFS gateway URL for a CID
     * @param cid The content identifier
     * @returns Full URL to access the content
     */
    getIPFSUrl(cid: string): string;
    /**
     * Check if content is still pinned
     * @param cid The content identifier to check
     * @returns Whether the content is pinned
     */
    isPinned(cid: string): Promise<boolean>;
    /**
     * Get all pinned content
     * @returns List of all pinned CIDs
     */
    getPinnedContent(): Promise<string[]>;
}
