// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title AssetMetadataRegistry
 * @dev Contract for registering and managing digital asset metadata on-chain
 * This contract stores minimal metadata about assets, allowing for efficient
 * registration and transfer of ownership while keeping gas costs low.
 */
contract AssetMetadataRegistry is Ownable, ReentrancyGuard {
    struct AssetMetadata {
        string contentHash;       // Hash of the asset content
        string metadataHash;      // Hash of the full metadata object
        string uri;               // URI pointing to the asset or verification service
        address creator;          // Original creator of the asset
        address owner;            // Current owner of the asset
        uint256 timestamp;        // When the asset was registered
        bool exists;              // Whether the asset exists
    }
    
    // Mapping from asset ID to metadata
    mapping(string => AssetMetadata) private _assets;
    
    // Mapping from address to array of owned asset IDs
    mapping(address => string[]) private _ownedAssets;
    
    // Events
    event AssetRegistered(
        string assetId,
        string contentHash,
        string metadataHash,
        string uri,
        address indexed creator,
        uint256 timestamp
    );
    
    event AssetTransferred(
        string assetId,
        address indexed from,
        address indexed to,
        uint256 timestamp
    );
    
    event BatchAssetsRegistered(
        string[] assetIds,
        address indexed creator,
        uint256 timestamp
    );
    
    event BatchAssetsTransferred(
        string[] assetIds,
        address indexed from,
        address indexed to,
        uint256 timestamp
    );
    
    /**
     * @dev Register a new asset
     * @param assetId Unique identifier for the asset
     * @param contentHash Hash of the asset content
     * @param metadataHash Hash of the full metadata object
     * @param uri URI pointing to the asset or verification service
     * @return success Whether registration was successful
     */
    function registerAsset(
        string calldata assetId,
        string calldata contentHash,
        string calldata metadataHash,
        string calldata uri
    ) external nonReentrant returns (bool) {
        require(bytes(assetId).length > 0, "Asset ID cannot be empty");
        require(!_assets[assetId].exists, "Asset already registered");
        
        AssetMetadata memory metadata = AssetMetadata({
            contentHash: contentHash,
            metadataHash: metadataHash,
            uri: uri,
            creator: msg.sender,
            owner: msg.sender,
            timestamp: block.timestamp,
            exists: true
        });
        
        _assets[assetId] = metadata;
        _ownedAssets[msg.sender].push(assetId);
        
        emit AssetRegistered(
            assetId,
            contentHash,
            metadataHash,
            uri,
            msg.sender,
            block.timestamp
        );
        
        return true;
    }
    
    /**
     * @dev Register multiple assets in a batch
     * @param assetIds Array of asset IDs
     * @param contentHashes Array of content hashes
     * @param metadataHashes Array of metadata hashes
     * @param uris Array of URIs
     * @return success Whether batch registration was successful
     */
    function batchRegister(
        string[] calldata assetIds,
        string[] calldata contentHashes,
        string[] calldata metadataHashes,
        string[] calldata uris
    ) external nonReentrant returns (bool) {
        uint256 length = assetIds.length;
        require(length > 0, "Empty arrays provided");
        require(length == contentHashes.length, "Array length mismatch: contentHashes");
        require(length == metadataHashes.length, "Array length mismatch: metadataHashes");
        require(length == uris.length, "Array length mismatch: uris");
        
        for (uint256 i = 0; i < length; i++) {
            require(bytes(assetIds[i]).length > 0, "Asset ID cannot be empty");
            require(!_assets[assetIds[i]].exists, "Asset already registered");
            
            AssetMetadata memory metadata = AssetMetadata({
                contentHash: contentHashes[i],
                metadataHash: metadataHashes[i],
                uri: uris[i],
                creator: msg.sender,
                owner: msg.sender,
                timestamp: block.timestamp,
                exists: true
            });
            
            _assets[assetIds[i]] = metadata;
            _ownedAssets[msg.sender].push(assetIds[i]);
            
            emit AssetRegistered(
                assetIds[i],
                contentHashes[i],
                metadataHashes[i],
                uris[i],
                msg.sender,
                block.timestamp
            );
        }
        
        emit BatchAssetsRegistered(assetIds, msg.sender, block.timestamp);
        
        return true;
    }
    
    /**
     * @dev Transfer ownership of an asset
     * @param assetId ID of the asset to transfer
     * @param to Address to transfer the asset to
     * @return success Whether transfer was successful
     */
    function transferAsset(
        string calldata assetId,
        address to
    ) external nonReentrant returns (bool) {
        require(to != address(0), "Cannot transfer to zero address");
        require(_assets[assetId].exists, "Asset does not exist");
        require(_assets[assetId].owner == msg.sender, "Not the owner");
        
        // Update owner
        _assets[assetId].owner = to;
        
        // Remove from sender's owned assets
        _removeFromOwnedAssets(msg.sender, assetId);
        
        // Add to recipient's owned assets
        _ownedAssets[to].push(assetId);
        
        emit AssetTransferred(assetId, msg.sender, to, block.timestamp);
        
        return true;
    }
    
    /**
     * @dev Transfer multiple assets in a batch
     * @param assetIds Array of asset IDs to transfer
     * @param to Address to transfer the assets to
     * @return success Whether batch transfer was successful
     */
    function batchTransfer(
        string[] calldata assetIds,
        address to
    ) external nonReentrant returns (bool) {
        require(to != address(0), "Cannot transfer to zero address");
        uint256 length = assetIds.length;
        require(length > 0, "Empty array provided");
        
        for (uint256 i = 0; i < length; i++) {
            require(_assets[assetIds[i]].exists, "Asset does not exist");
            require(_assets[assetIds[i]].owner == msg.sender, "Not the owner");
            
            // Update owner
            _assets[assetIds[i]].owner = to;
            
            // Remove from sender's owned assets
            _removeFromOwnedAssets(msg.sender, assetIds[i]);
            
            // Add to recipient's owned assets
            _ownedAssets[to].push(assetIds[i]);
            
            emit AssetTransferred(assetIds[i], msg.sender, to, block.timestamp);
        }
        
        emit BatchAssetsTransferred(assetIds, msg.sender, to, block.timestamp);
        
        return true;
    }
    
    /**
     * @dev Check if an asset exists
     * @param assetId Asset ID to check
     * @return exists Whether the asset exists
     */
    function assetExists(string calldata assetId) external view returns (bool) {
        return _assets[assetId].exists;
    }
    
    /**
     * @dev Get the owner of an asset
     * @param assetId Asset ID to get owner for
     * @return owner Address of the asset owner
     */
    function ownerOf(string calldata assetId) external view returns (address) {
        require(_assets[assetId].exists, "Asset does not exist");
        return _assets[assetId].owner;
    }
    
    /**
     * @dev Get asset metadata
     * @param assetId Asset ID to get metadata for
     * @return contentHash Hash of the asset content
     * @return metadataHash Hash of the full metadata object
     * @return uri URI pointing to the asset or verification service
     * @return creator Original creator of the asset
     * @return owner Current owner of the asset
     * @return timestamp When the asset was registered
     * @return exists Whether the asset exists
     */
    function getAssetMetadata(string calldata assetId) external view returns (
        string memory contentHash,
        string memory metadataHash,
        string memory uri,
        address creator,
        address owner,
        uint256 timestamp,
        bool exists
    ) {
        AssetMetadata memory metadata = _assets[assetId];
        return (
            metadata.contentHash,
            metadata.metadataHash,
            metadata.uri,
            metadata.creator,
            metadata.owner,
            metadata.timestamp,
            metadata.exists
        );
    }
    
    /**
     * @dev Get all assets owned by an address
     * @param owner Address to get assets for
     * @return assetIds Array of asset IDs owned by the address
     */
    function getAssetsByOwner(address owner) external view returns (string[] memory) {
        return _ownedAssets[owner];
    }
    
    /**
     * @dev Verify if an asset exists and matches a content hash
     * @param assetId Asset ID to verify
     * @param contentHash Content hash to verify against
     * @return verified Whether the asset is verified
     */
    function verifyAsset(string calldata assetId, string calldata contentHash) external view returns (bool) {
        if (!_assets[assetId].exists) {
            return false;
        }
        
        return keccak256(bytes(_assets[assetId].contentHash)) == keccak256(bytes(contentHash));
    }
    
    /**
     * @dev Remove an asset from an address's owned assets
     * @param owner Address to remove asset from
     * @param assetId Asset ID to remove
     */
    function _removeFromOwnedAssets(address owner, string memory assetId) private {
        string[] storage ownedAssets = _ownedAssets[owner];
        uint256 length = ownedAssets.length;
        
        for (uint256 i = 0; i < length; i++) {
            if (keccak256(bytes(ownedAssets[i])) == keccak256(bytes(assetId))) {
                // Move the last element to the position of the element to delete
                if (i < length - 1) {
                    ownedAssets[i] = ownedAssets[length - 1];
                }
                
                // Remove the last element
                ownedAssets.pop();
                
                break;
            }
        }
    }
}
