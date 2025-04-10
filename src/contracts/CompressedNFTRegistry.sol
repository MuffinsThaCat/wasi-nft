// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title CompressedNFTRegistry
 * @dev Contract for managing compressed NFT collections using Merkle trees
 * This allows for efficient storage and verification of large NFT collections
 * by only storing the Merkle root on-chain.
 */
contract CompressedNFTRegistry is Ownable, ReentrancyGuard {
    // Maximum collection name length to prevent gas limit issues
    uint256 private constant MAX_COLLECTION_ID_LENGTH = 128;
    
    // Maximum metadata URI length
    uint256 private constant MAX_URI_LENGTH = 256;
    
    /**
     * @dev Collection data structure
     */
    struct Collection {
        bytes32 merkleRoot;        // Root of the Merkle tree
        address owner;             // Owner of the collection
        uint256 assetCount;        // Number of assets in the collection
        uint256 createdAt;         // Creation timestamp
        uint256 updatedAt;         // Last update timestamp
        string metadataURI;        // URI pointing to collection metadata
        bool exists;               // Whether the collection exists
    }
    
    // Mapping from collection ID to Collection data
    mapping(string => Collection) private _collections;
    
    // Mapping from address to array of owned collection IDs
    mapping(address => string[]) private _ownedCollections;
    
    // Mapping to store verified assets (optional for gas optimization)
    // collection ID => asset ID => verified
    mapping(string => mapping(string => bool)) private _verifiedAssets;

    // Events
    event CollectionRegistered(
        string indexed collectionId,
        bytes32 merkleRoot,
        address indexed owner,
        uint256 assetCount,
        uint256 timestamp
    );
    
    event CollectionUpdated(
        string indexed collectionId,
        bytes32 oldRoot,
        bytes32 newRoot,
        uint256 newAssetCount,
        uint256 timestamp
    );
    
    event CollectionTransferred(
        string indexed collectionId,
        address indexed from,
        address indexed to,
        uint256 timestamp
    );
    
    event AssetVerified(
        string indexed collectionId,
        string assetId,
        address verifier,
        uint256 timestamp
    );
    
    /**
     * @dev Register a new compressed NFT collection
     * @param collectionId Unique identifier for the collection
     * @param merkleRoot Merkle root of the collection
     * @param assetCount Number of assets in the collection
     * @param metadataURI URI pointing to the collection metadata
     * @return success Whether registration was successful
     */
    function registerCollection(
        string calldata collectionId,
        bytes32 merkleRoot,
        uint256 assetCount,
        string calldata metadataURI
    ) external nonReentrant returns (bool) {
        // Validate parameters
        require(bytes(collectionId).length > 0, "Collection ID cannot be empty");
        require(bytes(collectionId).length <= MAX_COLLECTION_ID_LENGTH, "Collection ID too long");
        require(merkleRoot != bytes32(0), "Merkle root cannot be zero");
        require(bytes(metadataURI).length <= MAX_URI_LENGTH, "Metadata URI too long");
        require(!_collections[collectionId].exists, "Collection already registered");
        
        // Create collection
        Collection memory collection = Collection({
            merkleRoot: merkleRoot,
            owner: msg.sender,
            assetCount: assetCount,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            metadataURI: metadataURI,
            exists: true
        });
        
        // Store collection
        _collections[collectionId] = collection;
        _ownedCollections[msg.sender].push(collectionId);
        
        // Emit event
        emit CollectionRegistered(
            collectionId,
            merkleRoot,
            msg.sender,
            assetCount,
            block.timestamp
        );
        
        return true;
    }
    
    /**
     * @dev Update a collection's Merkle root (e.g. after adding new assets)
     * @param collectionId The collection ID
     * @param newMerkleRoot The new Merkle root
     * @param newAssetCount New number of assets in the collection
     * @return success Whether update was successful
     */
    function updateMerkleRoot(
        string calldata collectionId,
        bytes32 newMerkleRoot,
        uint256 newAssetCount
    ) external nonReentrant returns (bool) {
        // Validate parameters
        require(bytes(collectionId).length > 0, "Collection ID cannot be empty");
        require(newMerkleRoot != bytes32(0), "Merkle root cannot be zero");
        
        // Check collection exists and caller is owner
        Collection storage collection = _collections[collectionId];
        require(collection.exists, "Collection does not exist");
        require(collection.owner == msg.sender, "Not collection owner");
        
        // Store old root for event
        bytes32 oldRoot = collection.merkleRoot;
        
        // Update collection
        collection.merkleRoot = newMerkleRoot;
        collection.assetCount = newAssetCount;
        collection.updatedAt = block.timestamp;
        
        // Emit event
        emit CollectionUpdated(
            collectionId,
            oldRoot,
            newMerkleRoot,
            newAssetCount,
            block.timestamp
        );
        
        return true;
    }
    
    /**
     * @dev Transfer ownership of a collection to a new address
     * @param collectionId The collection ID
     * @param to The new owner's address
     * @return success Whether transfer was successful
     */
    function transferCollectionOwnership(
        string calldata collectionId,
        address to
    ) external nonReentrant returns (bool) {
        // Validate parameters
        require(to != address(0), "Cannot transfer to zero address");
        
        // Check collection exists and caller is owner
        Collection storage collection = _collections[collectionId];
        require(collection.exists, "Collection does not exist");
        require(collection.owner == msg.sender, "Not collection owner");
        
        // Store old owner for event
        address from = collection.owner;
        
        // Update collection owner
        collection.owner = to;
        collection.updatedAt = block.timestamp;
        
        // Update ownership mappings
        _removeFromOwnedCollections(from, collectionId);
        _ownedCollections[to].push(collectionId);
        
        // Emit event
        emit CollectionTransferred(
            collectionId,
            from,
            to,
            block.timestamp
        );
        
        return true;
    }
    
    /**
     * @dev Verify an asset is part of a collection using its Merkle proof
     * @param collectionId The collection ID
     * @param assetId The asset ID to verify
     * @param proof The Merkle proof
     * @return verified Whether the asset is part of the collection
     */
    function verifyAsset(
        string calldata collectionId,
        string calldata assetId,
        bytes32[] calldata proof
    ) external returns (bool) {
        // Validate parameters
        require(bytes(collectionId).length > 0, "Collection ID cannot be empty");
        require(bytes(assetId).length > 0, "Asset ID cannot be empty");
        
        // Check collection exists
        Collection storage collection = _collections[collectionId];
        require(collection.exists, "Collection does not exist");
        
        // Calculate leaf from assetId (in a real implementation, you might
        // include more data in the leaf calculation)
        bytes32 leaf = keccak256(abi.encodePacked(assetId));
        
        // Verify the proof
        bool verified = MerkleProof.verify(proof, collection.merkleRoot, leaf);
        
        // If verified, store for gas optimization in future checks
        if (verified) {
            _verifiedAssets[collectionId][assetId] = true;
            
            emit AssetVerified(
                collectionId,
                assetId,
                msg.sender,
                block.timestamp
            );
        }
        
        return verified;
    }
    
    /**
     * @dev Check if an asset has been previously verified in a collection
     * @param collectionId The collection ID
     * @param assetId The asset ID to check
     * @return verified Whether the asset has been verified
     */
    function isAssetVerified(
        string calldata collectionId,
        string calldata assetId
    ) external view returns (bool) {
        return _verifiedAssets[collectionId][assetId];
    }
    
    /**
     * @dev Get information about a collection
     * @param collectionId The collection ID
     * @return merkleRoot The collection's Merkle root
     * @return owner The collection's owner
     * @return assetCount Number of assets in the collection
     * @return createdAt When the collection was created
     * @return updatedAt When the collection was last updated
     * @return metadataURI URI pointing to collection metadata
     * @return exists Whether the collection exists
     */
    function getCollectionInfo(
        string calldata collectionId
    ) external view returns (
        bytes32 merkleRoot,
        address owner,
        uint256 assetCount,
        uint256 createdAt,
        uint256 updatedAt,
        string memory metadataURI,
        bool exists
    ) {
        Collection memory collection = _collections[collectionId];
        return (
            collection.merkleRoot,
            collection.owner,
            collection.assetCount,
            collection.createdAt,
            collection.updatedAt,
            collection.metadataURI,
            collection.exists
        );
    }
    
    /**
     * @dev Get collections owned by an address
     * @param owner The owner's address
     * @return collectionIds Array of collection IDs owned by the address
     */
    function getCollectionsByOwner(
        address owner
    ) external view returns (string[] memory) {
        return _ownedCollections[owner];
    }
    
    /**
     * @dev Remove a collection ID from an address's owned collections
     * @param owner The owner's address
     * @param collectionId The collection ID to remove
     */
    function _removeFromOwnedCollections(
        address owner, 
        string memory collectionId
    ) private {
        string[] storage ownedCollections = _ownedCollections[owner];
        uint256 length = ownedCollections.length;
        
        for (uint256 i = 0; i < length; i++) {
            if (keccak256(bytes(ownedCollections[i])) == keccak256(bytes(collectionId))) {
                // Replace the found element with the last element
                ownedCollections[i] = ownedCollections[length - 1];
                // Remove the last element
                ownedCollections.pop();
                break;
            }
        }
    }
    
    /**
     * @dev Batch verify multiple assets in a collection
     * @param collectionId The collection ID
     * @param assetIds Array of asset IDs to verify
     * @param proofs Array of Merkle proofs, one for each asset
     * @return results Array of verification results
     */
    function batchVerifyAssets(
        string calldata collectionId,
        string[] calldata assetIds,
        bytes32[][] calldata proofs
    ) external returns (bool[] memory) {
        // Validate parameters
        require(bytes(collectionId).length > 0, "Collection ID cannot be empty");
        require(assetIds.length > 0, "No assets provided");
        require(assetIds.length == proofs.length, "Assets and proofs length mismatch");
        require(assetIds.length <= 100, "Batch size too large"); // Prevent DOS attacks
        
        // Check collection exists
        Collection storage collection = _collections[collectionId];
        require(collection.exists, "Collection does not exist");
        
        // Prepare results array
        bool[] memory results = new bool[](assetIds.length);
        
        // Verify each asset
        for (uint256 i = 0; i < assetIds.length; i++) {
            // Calculate leaf
            bytes32 leaf = keccak256(abi.encodePacked(assetIds[i]));
            
            // Verify proof
            bool verified = MerkleProof.verify(proofs[i], collection.merkleRoot, leaf);
            results[i] = verified;
            
            // If verified, store for gas optimization
            if (verified) {
                _verifiedAssets[collectionId][assetIds[i]] = true;
                
                emit AssetVerified(
                    collectionId,
                    assetIds[i],
                    msg.sender,
                    block.timestamp
                );
            }
        }
        
        return results;
    }
}
