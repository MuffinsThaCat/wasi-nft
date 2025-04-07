import React, { useState, useEffect } from 'react';
import { ApiProvider, apiKeyManager } from '../services/apiKeyManager';
import { defaultApiKeys } from '../config/apiKeys';

interface ApiKeyConfigProps {
  onKeysConfigured: (keysReady: boolean) => void;
}

const ApiKeyConfig: React.FC<ApiKeyConfigProps> = ({ onKeysConfigured }) => {
  const [openAiKey, setOpenAiKey] = useState<string>('');
  const [stabilityAiKey, setStabilityAiKey] = useState<string>('');
  const [replicateKey, setReplicateKey] = useState<string>('');
  const [useDefaultOpenAi, setUseDefaultOpenAi] = useState<boolean>(true);
  const [useDefaultStabilityAi, setUseDefaultStabilityAi] = useState<boolean>(true);
  const [useDefaultReplicate, setUseDefaultReplicate] = useState<boolean>(true);
  const [keysConfigured, setKeysConfigured] = useState<boolean>(false);

  // Check if default keys are available
  const hasDefaultOpenAi = Boolean(defaultApiKeys.openai);
  const hasDefaultStabilityAi = Boolean(defaultApiKeys.stabilityai);
  const hasDefaultReplicate = Boolean(defaultApiKeys.replicate);

  // Initialize with any existing user keys from session storage
  useEffect(() => {
    const userOpenAiKey = apiKeyManager.getApiKey('openai', false);
    const userStabilityAiKey = apiKeyManager.getApiKey('stabilityai', false);
    const userReplicateKey = apiKeyManager.getApiKey('replicate', false);
    
    // If user has saved keys, use them instead of defaults
    if (userOpenAiKey) {
      setOpenAiKey(userOpenAiKey);
      setUseDefaultOpenAi(false);
    }
    
    if (userStabilityAiKey) {
      setStabilityAiKey(userStabilityAiKey);
      setUseDefaultStabilityAi(false);
    }
    
    if (userReplicateKey) {
      setReplicateKey(userReplicateKey);
      setUseDefaultReplicate(false);
    }
    
    // Check if we have any keys available (either default or user)
    validateAndUpdateKeyStatus();
  }, []);
  
  // Update key status when inputs change
  useEffect(() => {
    validateAndUpdateKeyStatus();
  }, [openAiKey, stabilityAiKey, replicateKey, useDefaultOpenAi, useDefaultStabilityAi, useDefaultReplicate]);

  const validateAndUpdateKeyStatus = () => {
    // Consider keys configured if at least one provider has a valid key
    const hasOpenAiKey = useDefaultOpenAi ? hasDefaultOpenAi : Boolean(openAiKey);
    const hasStabilityAiKey = useDefaultStabilityAi ? hasDefaultStabilityAi : Boolean(stabilityAiKey);
    const hasReplicateKey = useDefaultReplicate ? hasDefaultReplicate : Boolean(replicateKey);
    
    const configured = hasOpenAiKey || hasStabilityAiKey || hasReplicateKey;
    setKeysConfigured(configured);
    onKeysConfigured(configured);
  };

  const saveKeys = () => {
    // Save user-provided keys or clear them if using defaults
    if (!useDefaultOpenAi && openAiKey) {
      apiKeyManager.setApiKey('openai', openAiKey);
    } else {
      apiKeyManager.clearApiKey('openai');
    }
    
    if (!useDefaultStabilityAi && stabilityAiKey) {
      apiKeyManager.setApiKey('stabilityai', stabilityAiKey);
    } else {
      apiKeyManager.clearApiKey('stabilityai');
    }
    
    if (!useDefaultReplicate && replicateKey) {
      apiKeyManager.setApiKey('replicate', replicateKey);
    } else {
      apiKeyManager.clearApiKey('replicate');
    }
    
    alert('API keys saved successfully!');
  };

  return (
    <div className="api-key-config">
      <h3>API Key Configuration</h3>
      <p>Configure API keys for AI art generation services</p>
      
      <div className="key-section">
        <h4>OpenAI (DALL-E)</h4>
        {hasDefaultOpenAi && (
          <div className="use-default">
            <label>
              <input
                type="checkbox"
                checked={useDefaultOpenAi}
                onChange={(e) => setUseDefaultOpenAi(e.target.checked)}
              />
              Use provided API key
            </label>
          </div>
        )}
        
        {!useDefaultOpenAi && (
          <div className="key-input">
            <input
              type="password"
              placeholder="Enter your OpenAI API key"
              value={openAiKey}
              onChange={(e) => setOpenAiKey(e.target.value)}
            />
          </div>
        )}
        
        <div className="key-status">
          {useDefaultOpenAi && hasDefaultOpenAi ? (
            <span className="status-ok">✓ Using provided key</span>
          ) : openAiKey ? (
            <span className="status-ok">✓ Using your key</span>
          ) : (
            <span className="status-missing">✗ No key configured</span>
          )}
        </div>
      </div>
      
      <div className="key-section">
        <h4>Stability AI</h4>
        {hasDefaultStabilityAi && (
          <div className="use-default">
            <label>
              <input
                type="checkbox"
                checked={useDefaultStabilityAi}
                onChange={(e) => setUseDefaultStabilityAi(e.target.checked)}
              />
              Use provided API key
            </label>
          </div>
        )}
        
        {!useDefaultStabilityAi && (
          <div className="key-input">
            <input
              type="password"
              placeholder="Enter your Stability AI key"
              value={stabilityAiKey}
              onChange={(e) => setStabilityAiKey(e.target.value)}
            />
          </div>
        )}
        
        <div className="key-status">
          {useDefaultStabilityAi && hasDefaultStabilityAi ? (
            <span className="status-ok">✓ Using provided key</span>
          ) : stabilityAiKey ? (
            <span className="status-ok">✓ Using your key</span>
          ) : (
            <span className="status-missing">✗ No key configured</span>
          )}
        </div>
      </div>
      
      <div className="key-section">
        <h4>Replicate</h4>
        {hasDefaultReplicate && (
          <div className="use-default">
            <label>
              <input
                type="checkbox"
                checked={useDefaultReplicate}
                onChange={(e) => setUseDefaultReplicate(e.target.checked)}
              />
              Use provided API key
            </label>
          </div>
        )}
        
        {!useDefaultReplicate && (
          <div className="key-input">
            <input
              type="password"
              placeholder="Enter your Replicate API key"
              value={replicateKey}
              onChange={(e) => setReplicateKey(e.target.value)}
            />
          </div>
        )}
        
        <div className="key-status">
          {useDefaultReplicate && hasDefaultReplicate ? (
            <span className="status-ok">✓ Using provided key</span>
          ) : replicateKey ? (
            <span className="status-ok">✓ Using your key</span>
          ) : (
            <span className="status-missing">✗ No key configured</span>
          )}
        </div>
      </div>
      
      <div className="actions">
        <button 
          onClick={saveKeys}
          disabled={!keysConfigured}
        >
          Save Configuration
        </button>
      </div>
      
      <div className="config-status">
        {keysConfigured ? (
          <p className="ready">Ready to generate AI art!</p>
        ) : (
          <p className="not-ready">Please configure at least one API key to use AI art generation</p>
        )}
      </div>
    </div>
  );
};

export default ApiKeyConfig;
