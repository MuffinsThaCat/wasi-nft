import React, { useState, useEffect } from 'react';
import { CompressedCollection, CollectionMetadata } from '../merkle/collectionManager';
import { CompressedNFTService } from '../blockchain/compressedNFT';
import { BlockchainIntegration } from '../blockchain/integration';
import { Buffer } from 'buffer';

interface CompressedCollectionManagerProps {
  blockchainIntegration: BlockchainIntegration;
  assetManager: any; // Your asset manager type
}

const CompressedCollectionManager: React.FC<CompressedCollectionManagerProps> = ({ 
  blockchainIntegration, 
  assetManager 
}) => {
  const [collections, setCollections] = useState<CompressedCollection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [compressedNFTService, setCompressedNFTService] = useState<CompressedNFTService | null>(null);
  
  // Form state
  const [newCollectionName, setNewCollectionName] = useState<string>('');
  const [newCollectionDescription, setNewCollectionDescription] = useState<string>('');
  
  // Initialize the compressed NFT service
  useEffect(() => {
    const service = new CompressedNFTService(blockchainIntegration);
    setCompressedNFTService(service);
    
    // Load collections from storage
    loadCollections();
  }, [blockchainIntegration]);
  
  // Load collections from storage
  const loadCollections = async () => {
    try {
      setLoading(true);
      // This would be a call to your collection manager
      // For demo purposes, creating some sample collections
      const sampleCollections: CompressedCollection[] = [
        {
          metadata: {
            id: '1',
            name: 'Sample Collection 1',
            description: 'A sample compressed NFT collection',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            creator: { name: 'User', id: '1' },
            size: 10,
            merkleRoot: '0x1234567890abcdef'
          },
          tree: null as any // Would be a real MerkleTree instance
        },
        {
          metadata: {
            id: '2',
            name: 'Artwork Series',
            description: 'Collection of digital artworks',
            createdAt: Date.now() - 86400000, // 1 day ago
            updatedAt: Date.now(),
            creator: { name: 'User', id: '1' },
            size: 25,
            merkleRoot: '0xabcdef1234567890'
          },
          tree: null as any
        }
      ];
      
      setCollections(sampleCollections);
      setLoading(false);
    } catch (err) {
      setError('Failed to load collections: ' + (err as Error).message);
      setLoading(false);
    }
  };
  
  // Create a new collection
  const createCollection = async () => {
    if (!newCollectionName) {
      setError('Collection name is required');
      return;
    }
    
    try {
      setLoading(true);
      
      // This would create a real collection
      // For demo purposes, creating a sample one
      const newCollection: CompressedCollection = {
        metadata: {
          id: Math.random().toString(36).substring(2, 9),
          name: newCollectionName,
          description: newCollectionDescription,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          creator: { name: 'User', id: '1' },
          size: 0,
          merkleRoot: '0x' + Array.from({ length: 64 }, () => 
            Math.floor(Math.random() * 16).toString(16)
          ).join('')
        },
        tree: null as any // Would be a real MerkleTree instance
      };
      
      // Add to state
      setCollections(prev => [...prev, newCollection]);
      
      // Reset form
      setNewCollectionName('');
      setNewCollectionDescription('');
      setLoading(false);
      
      // Success message
      alert('Collection created successfully!');
    } catch (err) {
      setError('Failed to create collection: ' + (err as Error).message);
      setLoading(false);
    }
  };
  
  // Deploy collection to blockchain
  const deployToBlockchain = async (collectionId: string) => {
    if (!compressedNFTService) {
      setError('Blockchain service not initialized');
      return;
    }
    
    try {
      setLoading(true);
      
      // Find the collection
      const collection = collections.find(c => c.metadata.id === collectionId);
      if (!collection) {
        throw new Error('Collection not found');
      }
      
      // Connect to the contract
      // This would use a real contract address
      await compressedNFTService.connect('0x1234567890abcdef1234567890abcdef12345678');
      
      // Register the collection
      const result = await compressedNFTService.registerCollection(
        collection.metadata.id,
        collection.metadata.merkleRoot,
        collection.metadata.size, // Pass asset count as number
        JSON.stringify(collection.metadata)
      );
      
      console.log('Registration result:', result);
      
      // Update the collection with blockchain reference
      collection.metadata.blockchainReference = {
        chain: 'avalanche',
        txHash: result.txHash,
        blockHeight: result.blockNumber
      };
      
      setCollections([...collections]);
      setLoading(false);
      
      // Success message
      alert(`Collection deployed to blockchain! Transaction: ${result.txHash}`);
    } catch (err) {
      setError('Failed to deploy collection: ' + (err as Error).message);
      setLoading(false);
    }
  };
  
  return (
    <div className="compressed-collection-manager">
      <h2>Compressed NFT Collections</h2>
      
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      
      <div className="collection-form">
        <h3>Create New Collection</h3>
        <div className="form-group">
          <label>Name:</label>
          <input 
            type="text" 
            value={newCollectionName} 
            onChange={e => setNewCollectionName(e.target.value)}
            placeholder="Collection Name" 
          />
        </div>
        
        <div className="form-group">
          <label>Description:</label>
          <textarea 
            value={newCollectionDescription} 
            onChange={e => setNewCollectionDescription(e.target.value)}
            placeholder="Collection Description" 
          />
        </div>
        
        <button 
          onClick={createCollection} 
          disabled={loading || !newCollectionName}
        >
          {loading ? 'Creating...' : 'Create Collection'}
        </button>
      </div>
      
      <div className="collections-list">
        <h3>Your Collections</h3>
        {collections.length === 0 ? (
          <p>No collections found. Create your first collection above.</p>
        ) : (
          <ul>
            {collections.map(collection => (
              <li key={collection.metadata.id} className="collection-item">
                <div className="collection-details">
                  <h4>{collection.metadata.name}</h4>
                  <p>{collection.metadata.description}</p>
                  <div className="collection-info">
                    <span>Assets: {collection.metadata.size}</span>
                    <span>Created: {new Date(collection.metadata.createdAt).toLocaleDateString()}</span>
                  </div>
                  
                  {collection.metadata.blockchainReference ? (
                    <div className="blockchain-info">
                      <span className="blockchain-badge">On-Chain</span>
                      <a 
                        href={`https://snowtrace.io/tx/${collection.metadata.blockchainReference.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View Transaction
                      </a>
                    </div>
                  ) : (
                    <button 
                      onClick={() => deployToBlockchain(collection.metadata.id)}
                      disabled={loading}
                    >
                      Deploy to Blockchain
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CompressedCollectionManager;
