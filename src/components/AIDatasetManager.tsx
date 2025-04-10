import React, { useState, useEffect, useRef } from 'react';
import { AIDataManager } from '../services/aiDataManager';
import { AIDatasetMetadata, AIDataItemMetadata } from '../types/aiData';
import { CompressedCollectionManager } from '../merkle/collectionManager';
import { CompressedNFTService } from '../blockchain/compressedNFT';
import { BlockchainIntegration } from '../blockchain/integration';

interface AIDatasetManagerProps {
  fileSystem: any; // Your file system service
  blockchainIntegration: BlockchainIntegration;
}

const AIDatasetManager: React.FC<AIDatasetManagerProps> = ({ 
  fileSystem, 
  blockchainIntegration 
}) => {
  // State
  const [datasets, setDatasets] = useState<AIDatasetMetadata[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Services
  const aiDataManagerRef = useRef<AIDataManager | null>(null);
  const compressedCollectionManagerRef = useRef<CompressedCollectionManager | null>(null);
  const blockchainServiceRef = useRef<CompressedNFTService | null>(null);
  
  // Form states
  const [newDataItemFile, setNewDataItemFile] = useState<File | null>(null);
  const [newDataItemMetadata, setNewDataItemMetadata] = useState<Partial<AIDataItemMetadata>>({
    title: '',
    description: '',
    dataType: 'mixed',
    license: 'CC BY 4.0',
    tags: [],
    aiApplications: [],
  });
  
  const [newDatasetName, setNewDatasetName] = useState<string>('');
  const [newDatasetDescription, setNewDatasetDescription] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  // Initialize managers
  useEffect(() => {
    const initializeManagers = async () => {
      try {
        // Create AI Data Manager
        const dataManager = new AIDataManager(fileSystem);
        aiDataManagerRef.current = dataManager;
        
        // Create Compressed Collection Manager
        const collectionManager = new CompressedCollectionManager(fileSystem);
        compressedCollectionManagerRef.current = collectionManager;
        
        // Create Blockchain Service
        const blockchainService = new CompressedNFTService(blockchainIntegration);
        blockchainServiceRef.current = blockchainService;
        
        // Connect managers
        dataManager.setCompressedCollectionManager(collectionManager);
        dataManager.setBlockchainService(blockchainService);
        
        // Load datasets
        await loadDatasets();
      } catch (error) {
        console.error('Failed to initialize managers:', error);
        setError('Failed to initialize AI data services');
      }
    };
    
    initializeManagers();
  }, [fileSystem, blockchainIntegration]);
  
  // Load datasets
  const loadDatasets = async () => {
    if (!aiDataManagerRef.current) return;
    
    try {
      setLoading(true);
      const datasets = await aiDataManagerRef.current.getAllDatasets();
      setDatasets(datasets);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load datasets:', error);
      setError('Failed to load datasets');
      setLoading(false);
    }
  };
  
  // Handle file selection for new data item
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setNewDataItemFile(e.target.files[0]);
      
      // Update content type based on file
      setNewDataItemMetadata({
        ...newDataItemMetadata,
        contentType: e.target.files[0].type
      });
    }
  };
  
  // Handle metadata field changes
  const handleMetadataChange = (field: string, value: any) => {
    setNewDataItemMetadata({
      ...newDataItemMetadata,
      [field]: value
    });
  };
  
  // Create new data item
  const createDataItem = async () => {
    if (!aiDataManagerRef.current || !newDataItemFile) {
      setError('Missing data manager or file');
      return;
    }
    
    try {
      setLoading(true);
      
      // Read file content
      const buffer = await newDataItemFile.arrayBuffer();
      
      // Generate a private key (in a real app, this would be managed more securely)
      const privateKey = window.crypto.getRandomValues(new Uint8Array(32));
      
      // Create the data item
      const dataItem = await aiDataManagerRef.current.createDataItem(
        buffer,
        {
          ...newDataItemMetadata,
          dataType: determineDataType(newDataItemFile.type),
          creator: {
            name: 'Current User', // In a real app, this would be the logged-in user
            id: 'user-1'
          }
        },
        privateKey
      );
      
      setSuccess(`Data item ${dataItem.metadata.id} created successfully`);
      setNewDataItemFile(null);
      setNewDataItemMetadata({
        title: '',
        description: '',
        dataType: 'mixed',
        license: 'CC BY 4.0',
        tags: [],
        aiApplications: [],
      });
      
      setLoading(false);
      
      // Refresh dataset list
      await loadDatasets();
    } catch (error) {
      console.error('Failed to create data item:', error);
      setError(`Failed to create data item: ${error}`);
      setLoading(false);
    }
  };
  
  // Determine data type from MIME type
  const determineDataType = (mimeType: string): 'image' | 'text' | 'audio' | 'video' | 'structured' | 'mixed' => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('text/')) return 'text';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.includes('json') || mimeType.includes('csv')) return 'structured';
    return 'mixed';
  };
  
  // Create new dataset
  const createDataset = async () => {
    if (!aiDataManagerRef.current) {
      setError('Data manager not initialized');
      return;
    }
    
    if (!newDatasetName) {
      setError('Dataset name is required');
      return;
    }
    
    if (selectedItems.length === 0) {
      setError('Please select at least one data item');
      return;
    }
    
    try {
      setLoading(true);
      
      const dataset = await aiDataManagerRef.current.createDataset(
        {
          name: newDatasetName,
          description: newDatasetDescription,
          creator: {
            name: 'Current User', // In a real app, this would be the logged-in user
            id: 'user-1'
          }
        },
        selectedItems
      );
      
      setSuccess(`Dataset ${dataset.metadata.name} created with ${dataset.metadata.itemCount} items`);
      setNewDatasetName('');
      setNewDatasetDescription('');
      setSelectedItems([]);
      
      // Also create a compressed NFT collection for the dataset
      const collection = await aiDataManagerRef.current.createDatasetCollection(dataset.metadata.id);
      if (collection) {
        setSuccess((prev) => `${prev}. NFT collection created with root ${collection.merkleRoot.substring(0, 10)}...`);
      }
      
      setLoading(false);
      
      // Refresh datasets
      await loadDatasets();
    } catch (error) {
      console.error('Failed to create dataset:', error);
      setError(`Failed to create dataset: ${error}`);
      setLoading(false);
    }
  };
  
  // Register dataset on blockchain
  const registerOnBlockchain = async (datasetId: string) => {
    if (!aiDataManagerRef.current) {
      setError('Data manager not initialized');
      return;
    }
    
    try {
      setLoading(true);
      
      // Find dataset to get its collection ID
      const dataset = datasets.find(d => d.id === datasetId);
      if (!dataset) {
        throw new Error('Dataset not found');
      }
      
      // Use dataset ID as collection ID for simplicity
      // In a real app, you'd track the mapping between datasets and collections
      const result = await aiDataManagerRef.current.registerDatasetOnBlockchain(
        datasetId,
        datasetId
      );
      
      setSuccess(`Dataset registered on blockchain. Transaction: ${result.txHash}`);
      setLoading(false);
      
      // Refresh datasets
      await loadDatasets();
    } catch (error) {
      console.error('Failed to register on blockchain:', error);
      setError(`Failed to register on blockchain: ${error}`);
      setLoading(false);
    }
  };
  
  return (
    <div className="ai-dataset-manager">
      <h2>AI Training Data NFT Manager</h2>
      
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      
      {success && (
        <div className="success-message">
          {success}
          <button onClick={() => setSuccess(null)}>Dismiss</button>
        </div>
      )}
      
      <div className="manager-sections">
        <div className="section data-item-section">
          <h3>Create AI Data Item</h3>
          
          <div className="form-group">
            <label>Data File:</label>
            <input 
              type="file" 
              onChange={handleFileChange}
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label>Title:</label>
            <input 
              type="text"
              value={newDataItemMetadata.title}
              onChange={(e) => handleMetadataChange('title', e.target.value)}
              disabled={loading}
              placeholder="Data Item Title"
            />
          </div>
          
          <div className="form-group">
            <label>Description:</label>
            <textarea
              value={newDataItemMetadata.description}
              onChange={(e) => handleMetadataChange('description', e.target.value)}
              disabled={loading}
              placeholder="Describe the data, its source, and intended use"
            />
          </div>
          
          <div className="form-group">
            <label>License:</label>
            <select
              value={newDataItemMetadata.license}
              onChange={(e) => handleMetadataChange('license', e.target.value)}
              disabled={loading}
            >
              <option value="CC BY 4.0">Creative Commons Attribution 4.0</option>
              <option value="CC BY-SA 4.0">CC Attribution-ShareAlike 4.0</option>
              <option value="CC BY-NC 4.0">CC Attribution-NonCommercial 4.0</option>
              <option value="CC0 1.0">CC0 (Public Domain)</option>
              <option value="MIT">MIT License</option>
              <option value="Apache 2.0">Apache License 2.0</option>
              <option value="All Rights Reserved">All Rights Reserved</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>AI Applications:</label>
            <input
              type="text"
              value={newDataItemMetadata.aiApplications?.join(', ') || ''}
              onChange={(e) => handleMetadataChange('aiApplications', e.target.value.split(',').map(s => s.trim()))}
              disabled={loading}
              placeholder="image-generation, nlp, sentiment-analysis (comma separated)"
            />
          </div>
          
          <div className="form-group">
            <label>Tags:</label>
            <input
              type="text"
              value={newDataItemMetadata.tags?.join(', ') || ''}
              onChange={(e) => handleMetadataChange('tags', e.target.value.split(',').map(s => s.trim()))}
              disabled={loading}
              placeholder="Enter tags (comma separated)"
            />
          </div>
          
          <button 
            onClick={createDataItem}
            disabled={loading || !newDataItemFile || !newDataItemMetadata.title}
          >
            {loading ? 'Creating...' : 'Create Data Item'}
          </button>
        </div>
        
        <div className="section dataset-section">
          <h3>Create AI Dataset NFT</h3>
          
          <div className="form-group">
            <label>Dataset Name:</label>
            <input 
              type="text"
              value={newDatasetName}
              onChange={(e) => setNewDatasetName(e.target.value)}
              disabled={loading}
              placeholder="Dataset Name"
            />
          </div>
          
          <div className="form-group">
            <label>Description:</label>
            <textarea
              value={newDatasetDescription}
              onChange={(e) => setNewDatasetDescription(e.target.value)}
              disabled={loading}
              placeholder="Describe the dataset, its purpose, and contents"
            />
          </div>
          
          <div className="form-group">
            <label>Select Data Items:</label>
            <div className="item-selector">
              {/* This would be a component to select from available items */}
              <p>Item selection component would go here</p>
            </div>
          </div>
          
          <button 
            onClick={createDataset}
            disabled={loading || !newDatasetName || selectedItems.length === 0}
          >
            {loading ? 'Creating...' : 'Create Dataset NFT'}
          </button>
        </div>
      </div>
      
      <div className="section datasets-list">
        <h3>Your AI Datasets</h3>
        
        {datasets.length === 0 ? (
          <p>No datasets found. Create your first dataset above.</p>
        ) : (
          <ul>
            {datasets.map(dataset => (
              <li key={dataset.id} className="dataset-item">
                <div className="dataset-details">
                  <h4>{dataset.name}</h4>
                  <p>{dataset.description}</p>
                  <div className="dataset-info">
                    <span>Items: {dataset.itemCount}</span>
                    <span>Size: {formatSize(dataset.totalSize)}</span>
                    <span>Created: {new Date(dataset.createdAt).toLocaleDateString()}</span>
                  </div>
                  
                  {dataset.merkleRoot && (
                    <div className="nft-info">
                      <span className="nft-badge">NFT Ready</span>
                      <span>Merkle Root: {dataset.merkleRoot.substring(0, 10)}...</span>
                    </div>
                  )}
                  
                  {dataset.blockchainReference ? (
                    <div className="blockchain-info">
                      <span className="blockchain-badge">On-Chain</span>
                      <a 
                        href={`https://snowtrace.io/tx/${dataset.blockchainReference.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View Transaction
                      </a>
                    </div>
                  ) : dataset.merkleRoot ? (
                    <button 
                      onClick={() => registerOnBlockchain(dataset.id)}
                      disabled={loading}
                    >
                      Register on Blockchain
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// Helper to format byte size to human-readable format
const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

export default AIDatasetManager;
