import React, { useState, useEffect } from 'react';
import { AssetManager } from './core/assetManager';
import { BlockchainIntegration } from './blockchain/integration';
import { BrowserFileSystem, DirectoryHandle } from './core/filesystem';
import AiArtCreator from './components/AiArtCreator';
import SecureTransfer from './components/SecureTransfer';
import MarketplaceListing from './components/MarketplaceListing';
import { TransferService } from './services/transferService';
import { SecureImageFormatService } from './services/secureImageFormat';
import './styles/aiArtCreator.css';
import './styles/apiKeyConfig.css';
import './styles/secureTransfer.css';
import './styles/marketplaceListing.css';
import './styles/modalOverlay.css';

const App: React.FC = () => {
  const [assetManager, setAssetManager] = useState<AssetManager | null>(null);
  const [blockchain, setBlockchain] = useState<BlockchainIntegration | null>(null);
  const [transferService, setTransferService] = useState<TransferService | null>(null);
  const [secureImageService, setSecureImageService] = useState<SecureImageFormatService | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rootDirectoryHandle, setRootDirectoryHandle] = useState<DirectoryHandle | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | undefined>(undefined);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'transfer' | 'marketplace'>('create');
  const [keyPair, setKeyPair] = useState<any>(null);

  // Initialize the filesystem and asset manager
  const initializeSystem = async () => {
    try {
      // Check browser compatibility
      if (!('showDirectoryPicker' in window)) {
        throw new Error('Your browser does not support the File System Access API. Please use Chrome, Edge, or another Chromium-based browser.');
      }

      // Prompt user to select a directory
      const fileSystemDirHandle = await window.showDirectoryPicker();
      
      // Create proper DirectoryHandle object
      const directoryHandle: DirectoryHandle = {
        name: fileSystemDirHandle.name,
        path: fileSystemDirHandle.name, // Base path is just the name initially
        handle: fileSystemDirHandle
      };
      
      setRootDirectoryHandle(directoryHandle);

      // Initialize FileSystem
      const fileSystem = new BrowserFileSystem();
      await fileSystem.selectDirectory();
      
      // Initialize BlockchainIntegration
      const blockchainInstance = new BlockchainIntegration({
        networks: {
          'avalanche': {
            name: 'Avalanche',
            chainId: 43114,
            rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
            explorerUrl: 'https://snowtrace.io'
          },
          'ethereum': {
            name: 'Ethereum',
            chainId: 1,
            rpcUrl: 'https://mainnet.infura.io/v3/your-infura-key',
            explorerUrl: 'https://etherscan.io'
          }
        },
        defaultNetwork: 'avalanche'
      });
      
      // Initialize AssetManager with extended functionality
      const assetManagerInstance = new AssetManager({ 
        fileSystem: fileSystem,
        blockchain: blockchainInstance,
        metadataDirectoryName: 'metadata'
      });
      
      // Add mock methods needed for marketplace integration
      (assetManagerInstance as any).getAssetContent = async (assetId: string) => {
        // Mock implementation that returns a small buffer
        return new Uint8Array([0, 1, 2, 3, 4, 5]).buffer;
      };
      
      (assetManagerInstance as any).getAllAssets = async () => {
        return assetManagerInstance.getAssets();
      };
      
      // Initialize SecureImageFormatService
      const secureImageServiceInstance = new SecureImageFormatService();
      
      // Initialize TransferService
      const transferServiceInstance = new TransferService(
        assetManagerInstance,
        blockchainInstance,
        secureImageServiceInstance
      );
      
      // Extend BlockchainIntegration with mock methods for marketplace integration
      (blockchainInstance as any).getCurrentAddress = async () => {
        return '0x1234567890abcdef1234567890abcdef12345678';
      };
      
      // Method already added to BlockchainIntegration class
      
      (blockchainInstance as any).listOnMarketplace = async (tokenId: string, marketplace: string, price: string) => {
        return 'listing_' + Math.random().toString(36).substring(2, 15);
      };
      
      (blockchainInstance as any).cancelMarketplaceListing = async (tokenId: string, marketplace: string) => {
        return true;
      };
      
      (blockchainInstance as any).subscribeToTransferEvents = async (callback: any) => {
        console.log('Subscribed to transfer events');
        return () => console.log('Unsubscribed from transfer events');
      };
      
      (blockchainInstance as any).recordSecureTransfer = async (tokenId: string, transferId: string) => {
        return 'tx_' + Math.random().toString(36).substring(2, 15);
      };
      
      (blockchainInstance as any).confirmSale = async (tokenId: string, buyerAddress: string, price: string) => {
        return 'tx_' + Math.random().toString(36).substring(2, 15);
      };
      
      // Generate example key pair
      const exampleKeyPair = {
        publicKey: 'simulated-public-key-' + Math.random().toString(36).substring(2, 10),
        privateKey: 'simulated-private-key-' + Math.random().toString(36).substring(2, 10)
      };
      
      // Set all the state
      setAssetManager(assetManagerInstance);
      setBlockchain(blockchainInstance);
      setTransferService(transferServiceInstance);
      setSecureImageService(secureImageServiceInstance);
      setKeyPair(exampleKeyPair);
      setIsInitialized(true);
      
    } catch (error) {
      console.error('Initialization error:', error);
      setError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>WASI NFT Studio</h1>
        <p>Create and securely transfer digital assets with true ownership</p>
        
        {isInitialized && (
          <div className="app-tabs">
            <button 
              className={`tab-button ${activeTab === 'create' ? 'active' : ''}`}
              onClick={() => setActiveTab('create')}
            >
              Create Art
            </button>
            <button 
              className={`tab-button ${activeTab === 'transfer' ? 'active' : ''}`}
              onClick={() => setActiveTab('transfer')}
            >
              Secure Transfer
            </button>
            <button 
              className={`tab-button ${activeTab === 'marketplace' ? 'active' : ''}`}
              onClick={() => setActiveTab('marketplace')}
            >
              Marketplace
            </button>
          </div>
        )}
      </header>

      {!isInitialized ? (
        <div className="initialize-container">
          <button onClick={initializeSystem} className="initialize-button">
            Initialize Filesystem
          </button>
          {error && <div className="error-message">{error}</div>}
        </div>
      ) : (
        <>
          {activeTab === 'create' && assetManager && (
            <div className="tab-content">
              <AiArtCreator 
                assetManager={assetManager}
                onAssetSelected={setSelectedAssetId} 
                onTransferClick={() => setActiveTab('transfer')}
              />
            </div>
          )}
          
          {activeTab === 'transfer' && assetManager && blockchain && transferService && (
            <div className="tab-content">
              <SecureTransfer 
                selectedAssetId={selectedAssetId}
                assetManager={assetManager}
                blockchain={blockchain}
                keyPair={keyPair}
                onClose={() => {}}
              />
            </div>
          )}
          
          {activeTab === 'marketplace' && assetManager && blockchain && transferService && (
            <div className="tab-content">
              <MarketplaceListing 
                assetManager={assetManager}
                blockchain={blockchain}
                transferService={transferService}
              />
            </div>
          )}
          
          {showTransferModal && selectedAssetId && assetManager && blockchain && (
            <div className="modal-overlay">
              <div className="modal-content">
                <button className="close-button" onClick={() => setShowTransferModal(false)}>
                  &times;
                </button>
                <SecureTransfer 
                  selectedAssetId={selectedAssetId}
                  assetManager={assetManager}
                  blockchain={blockchain}
                  keyPair={keyPair}
                  onClose={() => setShowTransferModal(false)}
                />
              </div>
            </div>
          )}
        </>
      )}
      
      <footer>
        <p>
          Filesystem-Anchored Tokens (FATs) - Bridging traditional files and blockchain NFTs
        </p>
      </footer>
    </div>
  );
};

export default App;
