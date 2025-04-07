import React, { useState, useEffect, useCallback } from 'react';
import { AssetManager } from '../core/assetManager';
import { AiArtService, AiArtResult } from '../ai/aiArtService';
import { generateRandomString } from '../utils/helpers';
import { apiKeyManager, ApiProvider } from '../services/apiKeyManager';
import ApiKeyConfig from './ApiKeyConfig';

interface AiArtCreatorProps {
  assetManager: AssetManager;
  onAssetSelected?: (assetId: string) => void;
  onTransferClick?: () => void;
}

// Define types for state to avoid TypeScript errors
type ModelProvider = 'openai' | 'stability' | 'replicate';

interface ApiKeyState {
  openai: string;
  stability: string;
  replicate: string;
  [key: string]: string; // Index signature for dynamic access
}

const AiArtCreator: React.FC<AiArtCreatorProps> = ({ assetManager, onAssetSelected }) => {
  // AI art service
  const [aiService, setAiService] = useState<AiArtService | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  // Using a local ModelProvider type for backwards compatibility
  type ModelProvider = 'openai' | 'stability' | 'replicate';
  const [modelProvider, setModelProvider] = useState<ModelProvider>('openai');
  const [apiKey, setApiKey] = useState('');
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [seed, setSeed] = useState<number | undefined>(undefined);
  const [numVariations, setNumVariations] = useState(1);
  const [creatorName, setCreatorName] = useState('AI Artist');
  
  // Results state
  const [isGenerating, setIsGenerating] = useState(false);
  // Define proper type for generated assets
  interface GeneratedAsset {
    id: string;
    imageUrl: string;
    assetMetadata: {
      id: string;
      title: string;
      description: string;
      blockchain?: any;
      aiGeneration?: {
        prompt: string;
        negativePrompt?: string;
        seed?: number;
        model?: string;
        modelProvider?: string;
        width?: number;
        height?: number;
      };
    };
    generatedImage: {
      url: string;
      width: number;
      height: number;
      prompt?: string;
      seed?: number;
      modelProvider?: string;
    };
  }
  
  const [generatedAssets, setGeneratedAssets] = useState<GeneratedAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationResult, setRegistrationResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [keysConfigured, setKeysConfigured] = useState(false);
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  
  // API key management
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({
    openai: '',
    stabilityai: '',
    replicate: ''
  });
  
  // Register blockchain networks
  const [network, setNetwork] = useState('avalanche');
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  
  // Initialize AI art service
  useEffect(() => {
    const service = new AiArtService(assetManager, {
      defaultModelProvider: 'openai'
    });
    setAiService(service);
    
    // Check if wallet is connected
    setIsWalletConnected(assetManager.isWalletConnected());
  }, [assetManager]);
  
  // Handle API key changes
  useEffect(() => {
    if (aiService) {
      aiService.updateConfig({
        openaiApiKey: apiKeys.openai,
        stabilityApiKey: apiKeys.stability,
        replicateApiKey: apiKeys.replicate,
        defaultModelProvider: modelProvider
      });
    }
  }, [aiService, apiKeys, modelProvider]);
  
  // Handle API key input
  const handleApiKeyChange = (provider: ModelProvider, value: string) => {
    setApiKeys(prev => ({
      ...prev,
      [provider]: value
    }));
  };
  
  // Handle model provider change
  const handleModelProviderChange = (provider: ModelProvider) => {
    setModelProvider(provider);
  };
  
  // Generate a random seed
  const generateRandomSeed = () => {
    setSeed(Math.floor(Math.random() * 1000000000));
  };
  
  // Connect wallet
  const connectWallet = async () => {
    try {
      setError(null);
      await assetManager.connectWallet();
      setIsWalletConnected(true);
      setRegistrationResult('Wallet connected successfully');
      
      // Clear registration result message after 3 seconds
      setTimeout(() => setRegistrationResult(null), 3000);
    } catch (error) {
      setError(`Failed to connect wallet: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Handle API key configuration
  const handleKeysConfigured = (configured: boolean) => {
    setKeysConfigured(configured);
    if (configured) {
      setShowKeyConfig(false); // Hide config when keys are set up
    }
  };
  
  // Check API keys on component mount
  useEffect(() => {
    // Check if we have any API keys available (default or user-provided)
    const hasOpenAiKey = apiKeyManager.hasApiKey('openai');
    const hasStabilityAiKey = apiKeyManager.hasApiKey('stabilityai');
    const hasReplicateKey = apiKeyManager.hasApiKey('replicate');
    
    setKeysConfigured(hasOpenAiKey || hasStabilityAiKey || hasReplicateKey);
  }, []);
  
  // Function to handle form submission and generate art
  const generateArt = async (e: React.FormEvent) => {
    if (!aiService) return;
    
    try {
      setError(null);
      setIsGenerating(true);
      setError(null);

      // Convert model provider to API provider format
      let apiProvider: ApiProvider = 
        modelProvider === 'stability' ? 'stabilityai' : 
        modelProvider === 'openai' ? 'openai' : 'replicate';
        
      let apiKey = apiKeyManager.getApiKey(apiProvider) || '';
      
      if (!apiKey) {
        throw new Error(`API key for ${apiProvider} is not configured. Please add your API key in settings.`);
      }
      
      if (!aiService) {
        throw new Error('AI service is not initialized');
      }
      
      const results = await aiService.generateVariationsAndCreateAssets({
        prompt,
        negativePrompt,
        title,
        description,
        creatorName,
        modelProvider,
        apiKey,
        width,
        height,
        seed,
        numberOfVariations: numVariations,
        editions: 1
      });
      
      // Update generated assets state
      setGeneratedAssets(results.map(result => ({
        id: result.assetMetadata.id,
        imageUrl: result.generatedImage.url,
        assetMetadata: result.assetMetadata,
        generatedImage: result.generatedImage
      })));
      
      // Select the first asset by default
      if (results.length > 0) {
        setSelectedAsset(results[0].assetMetadata.id);
      }
      
      setRegistrationResult('AI artwork generated successfully!');
      setTimeout(() => setRegistrationResult(null), 3000);
    } catch (error) {
      console.error('Error generating AI art:', error);
      setError(`Failed to generate AI art: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Handle generation without form event - for the workflow button
  const handleGenerate = async () => {
    if (!prompt) return;
    
    try {
      setIsGenerating(true);
      setError(null);

      // Convert model provider to API provider format
      let apiProvider: ApiProvider = 
        modelProvider === 'stability' ? 'stabilityai' : 
        modelProvider === 'openai' ? 'openai' : 'replicate';
        
      let apiKey = apiKeyManager.getApiKey(apiProvider) || '';
      
      if (!apiKey) {
        throw new Error(`API key for ${apiProvider} is not configured. Please add your API key in settings.`);
      }
      
      if (!aiService) {
        throw new Error('AI service is not initialized');
      }
      
      const results = await aiService.generateVariationsAndCreateAssets({
        prompt,
        negativePrompt,
        title,
        description,
        creatorName,
        modelProvider,
        apiKey,
        width,
        height,
        seed,
        numberOfVariations: numVariations,
        editions: 1
      });
      
      // Update generated assets state
      setGeneratedAssets(results.map(result => ({
        id: result.assetMetadata.id,
        imageUrl: result.generatedImage.url,
        assetMetadata: result.assetMetadata,
        generatedImage: result.generatedImage
      })));
      
      // Select the first asset by default
      if (results.length > 0) {
        setSelectedAsset(results[0].assetMetadata.id);
      }
      
      return results;
    } catch (error) {
      console.error('Error generating AI art:', error);
      setError(`Failed to generate AI art: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  };
  
  // Register selected asset on blockchain
  const registerOnBlockchain = async () => {
    if (!aiService) return;
    
    try {
      setIsRegistering(true);
      setError(null);
      
      if (!isWalletConnected) {
        await connectWallet();
      }
      
      if (!selectedAsset) {
        throw new Error('No asset selected for registration');
      }
      
      const assetId = selectedAsset;
      // Use the correct method name registerAiAssetsOnBlockchain with an array
      const result = await aiService.registerAiAssetsOnBlockchain([assetId], network);
      
      setRegistrationResult(`Registered asset on ${network}`);
      
      // Refresh assets to update blockchain status
      const refreshedAssets = await Promise.all(
        generatedAssets.map(async (asset: GeneratedAsset) => {
          const refreshed = await assetManager.getAsset(asset.id);
          return {
            ...asset,
            id: refreshed.id
          };
        })
      );
      
      setGeneratedAssets(refreshedAssets);
      
      // Clear registration result message after 3 seconds
      setTimeout(() => setRegistrationResult(null), 3000);
    } catch (error) {
      setError(`Failed to register asset: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsRegistering(false);
    }
  };
  
  // Toggle asset selection
  const toggleAssetSelection = (assetId: string) => {
    if (selectedAsset === assetId) {
      setSelectedAsset(null);
      if (onAssetSelected) {
        onAssetSelected(undefined as any);
      }
    } else {
      setSelectedAsset(assetId);
      if (onAssetSelected) {
        onAssetSelected(assetId);
      }
    }
  };
  
  // Clear error message
  const clearError = () => {
    setError(null);
  };
  
  return (
    <div className="ai-art-creator">
      <h2>AI Art Creator</h2>
      
      {!keysConfigured && (
        <div className="keys-notice">
          <p>API keys need to be configured for AI art generation.</p>
          <button onClick={() => setShowKeyConfig(true)}>Configure API Keys</button>
        </div>
      )}
      
      {showKeyConfig && (
        <div className="key-config-modal">
          <div className="key-config-content">
            <button className="close-button" onClick={() => setShowKeyConfig(false)}>×</button>
            <ApiKeyConfig onKeysConfigured={handleKeysConfigured} />
          </div>
        </div>
      )}
      
      {/* API Key Configuration */}
      <div className="api-key-config">
        <h3>AI Model Configuration</h3>
        
        <div className="model-selector">
          <label>
            <input
              type="radio"
              name="model-provider"
              value="openai"
              checked={modelProvider === 'openai'}
              onChange={() => handleModelProviderChange('openai')}
            />
            OpenAI DALL-E
          </label>
          <label>
            <input
              type="radio"
              name="model-provider"
              value="stability"
              checked={modelProvider === 'stability'}
              onChange={() => handleModelProviderChange('stability')}
            />
            Stability AI
          </label>
          <label>
            <input
              type="radio"
              name="model-provider"
              value="replicate"
              checked={modelProvider === 'replicate'}
              onChange={() => handleModelProviderChange('replicate')}
            />
            Replicate
          </label>
        </div>
        
        <div className="api-key-input">
          <label>
            {modelProvider === 'openai' ? 'OpenAI' : modelProvider === 'stability' ? 'Stability AI' : 'Replicate'} API Key:
            <input
              type="password"
              value={apiKeys[modelProvider]}
              onChange={(e) => handleApiKeyChange(modelProvider, e.target.value)}
              placeholder={`Enter ${modelProvider} API key`}
            />
          </label>
        </div>
        
        {keysConfigured && <button 
          className="configure-keys-button" 
          onClick={(e) => {
            e.preventDefault();
            setShowKeyConfig(true);
          }}
        >
          Configure API Keys
        </button>}
      </div>
      
      {/* Art Generation Form */}
      <div className="generation-form">
        <h3>Create AI Artwork</h3>
        
        <div className="form-group">
          <label>
            Title:
            <input
              type="text"
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              placeholder="Enter artwork title"
            />
          </label>
        </div>
        
        <div className="form-group">
          <label>
            Description:
            <textarea
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              placeholder="Enter artwork description"
              rows={3}
            />
          </label>
        </div>
        
        <div className="form-group">
          <label>
            Prompt:
            <textarea
              value={prompt}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
              placeholder="Enter detailed prompt for AI image generation"
              rows={5}
              required
            />
          </label>
        </div>
        
        <div className="form-group">
          <label>
            Negative Prompt:
            <textarea
              value={negativePrompt}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNegativePrompt(e.target.value)}
              placeholder="Enter things to avoid in the generation (optional)"
              rows={3}
            />
          </label>
        </div>
        
        <div className="form-group form-row">
          <label>
            Width:
            <input
              type="number"
              value={width}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWidth(parseInt(e.target.value))}
              min={256}
              max={2048}
              step={64}
            />
          </label>
          
          <label>
            Height:
            <input
              type="number"
              value={height}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHeight(parseInt(e.target.value))}
              min={256}
              max={2048}
              step={64}
            />
          </label>
        </div>
        
        <div className="form-group form-row">
          <label>
            Seed:
            <input
              type="number"
              value={seed || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSeed(e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="Random"
            />
          </label>
          
          <button
            type="button"
            onClick={generateRandomSeed}
            className="secondary-button"
          >
            Random Seed
          </button>
        </div>
        
        <div className="form-group">
          <label>
            Number of Variations:
            <input
              type="number"
              value={numVariations}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNumVariations(parseInt(e.target.value))}
              min={1}
              max={10}
            />
          </label>
        </div>
        
        <div className="form-group">
          <label>
            Creator Name:
            <input
              type="text"
              value={creatorName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreatorName(e.target.value)}
              placeholder="Enter creator name"
            />
          </label>
        </div>
        
        <div className="button-container">
          <form onSubmit={generateArt}>
            <button
              type="submit"
              disabled={isGenerating || !prompt}
              className="primary-button"
            >
              {isGenerating ? 'Generating...' : 'Generate AI Artwork'}
            </button>
          </form>
          
          <button
            onClick={async (e) => {
              e.preventDefault();
              if (!prompt) return;
              
              try {
                setIsGenerating(true);
                setError(null);
                
                // Step 1: Generate artwork
                // Create a separate function call instead of trying to reuse generateArt with the wrong event type
                await handleGenerate();
                if (!generatedAssets || generatedAssets.length === 0) throw new Error('Generation failed');
                
                // Step 2: Register on blockchain (if wallet connected)
                if (isWalletConnected && generatedAssets.length > 0) {
                  setSelectedAsset(generatedAssets[0].assetMetadata.id);
                  await registerOnBlockchain();
                }
                
                setRegistrationResult('Successfully generated, minted and stored asset!');
                setTimeout(() => setRegistrationResult(null), 5000);
              } catch (error) {
                setError(`Error in workflow: ${error instanceof Error ? error.message : String(error)}`);
              } finally {
                setIsGenerating(false);
              }
            }}
            disabled={isGenerating || !prompt || !keysConfigured}
            className="primary-button complete-workflow-button"
          >
            {isGenerating ? 'Processing...' : 'Generate, Mint & Store'}
          </button>
        </div>
      </div>
      
      {/* Blockchain Registration */}
      <div className="blockchain-registration">
        <h3>Register on Blockchain</h3>
        
        <div className="form-group form-row">
          <label>
            Network:
            <select
              value={network}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNetwork(e.target.value)}
            >
              <option value="avalanche">Avalanche</option>
              <option value="avalanche-testnet">Avalanche Testnet</option>
              <option value="ethereum">Ethereum</option>
              <option value="polygon">Polygon</option>
            </select>
          </label>
          
          {!isWalletConnected && selectedAsset && (
            <button
              type="button"
              onClick={connectWallet}
              className="secondary-button"
            >
              Connect Wallet
            </button>
          )}
        </div>
        
        <button
          type="button"
          onClick={registerOnBlockchain}
          disabled={isRegistering || !selectedAsset || (!isWalletConnected && !apiKeys[modelProvider])}
          className="primary-button"
        >
          {isRegistering
            ? 'Registering...'
            : `Register Asset on ${network}`}
        </button>
      </div>
      
      {/* Messages */}
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={clearError}>×</button>
        </div>
      )}
      
      {registrationResult && (
        <div className="success-message">
          <p>{registrationResult}</p>
        </div>
      )}
      
      {/* Generated Assets Gallery */}
      <div className="generated-assets">
        <h3>Generated AI Artwork{generatedAssets.length > 0 ? ` (${generatedAssets.length})` : ''}</h3>
        
        {generatedAssets.length === 0 ? (
          <p className="empty-state">No AI artwork generated yet. Fill out the form above to create some!</p>
        ) : (
          <div className="asset-gallery">
            {generatedAssets.map((asset) => (
              <div
                key={asset.id}
                className={`asset-card ${selectedAsset === asset.assetMetadata.id ? 'selected' : ''}`}
                onClick={() => toggleAssetSelection(asset.assetMetadata.id)}
              >
                <div className="asset-image">
                  <img 
                    src={asset.generatedImage.url} 
                    alt={asset.assetMetadata.title} 
                    onError={(e) => {
                      console.error('Image failed to load:', asset.generatedImage.url);
                      e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22100%22%3E%3Crect%20fill%3D%22%23ddd%22%20width%3D%22100%22%20height%3D%22100%22%2F%3E%3Ctext%20fill%3D%22%23666%22%20font-size%3D%2210%22%20text-anchor%3D%22middle%22%20x%3D%2250%22%20y%3D%2255%22%3EImage%20Access%20Error%3C%2Ftext%3E%3C%2Fsvg%3E';
                      // Try to verify permissions
                      if (asset.assetMetadata.id) {
                        console.log('Attempting to verify permissions for asset:', asset.assetMetadata.id);
                      }
                    }}
                  />
                  <div className="select-indicator">
                    <input
                      type="checkbox"
                      checked={selectedAsset === asset.assetMetadata.id}
                      onChange={() => {}}
                    />
                  </div>
                </div>
                
                <div className="asset-info">
                  <h4>{asset.assetMetadata.title}</h4>
                  <p className="prompt">{(asset.assetMetadata.aiGeneration?.prompt || '').substring(0, 50)}{(asset.assetMetadata.aiGeneration?.prompt || '').length > 50 ? '...' : ''}</p>
                  
                  <div className="asset-details">
                    <p>Seed: {asset.assetMetadata.aiGeneration?.seed || 'Unknown'}</p>
                    <p>Size: {asset.generatedImage.width}×{asset.generatedImage.height}</p>
                    <p>Model: {asset.assetMetadata.aiGeneration?.modelProvider || asset.assetMetadata.aiGeneration?.model || 'Unknown'}</p>
                  </div>
                  
                  {asset.assetMetadata.blockchain && (
                    <div className="blockchain-info">
                      <span className="registered-badge">Registered on {asset.assetMetadata.blockchain.network}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AiArtCreator;
