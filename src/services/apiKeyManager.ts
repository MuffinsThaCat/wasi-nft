/**
 * API Key Manager for secure handling of third-party API keys
 * Uses sessionStorage for temporary secure storage during app usage
 * Falls back to default API keys when user keys are not available
 */

import { defaultApiKeys } from '../config/apiKeys';

export type ApiProvider = 'openai' | 'stabilityai' | 'replicate';

// Interface for managing API keys
export interface ApiKeyManagerInterface {
  setApiKey(provider: ApiProvider, key: string): void;
  getApiKey(provider: ApiProvider): string | null;
  clearApiKey(provider: ApiProvider): void;
  clearAllApiKeys(): void;
  hasApiKey(provider: ApiProvider): boolean;
}

// Implementation of API Key Manager using SessionStorage
export class ApiKeyManager implements ApiKeyManagerInterface {
  private readonly keyPrefix = 'api_key_';
  
  /**
   * Store API key in session storage
   * @param provider API provider name
   * @param key API key to store
   */
  setApiKey(provider: ApiProvider, key: string): void {
    if (!key || key.trim() === '') {
      return;
    }
    
    try {
      // Store the key in session storage
      sessionStorage.setItem(`${this.keyPrefix}${provider}`, key);
    } catch (error) {
      console.error(`Failed to store API key for ${provider}:`, error);
      throw new Error(`Failed to store API key: ${error}`);
    }
  }
  
  /**
   * Retrieve API key from session storage or fall back to default key
   * @param provider API provider name
   * @param useDefault Whether to use the default key as fallback
   * @returns The API key or null if not found and no default available
   */
  getApiKey(provider: ApiProvider, useDefault: boolean = true): string | null {
    try {
      // First try to get user-provided key from session storage
      const userKey = sessionStorage.getItem(`${this.keyPrefix}${provider}`);
      
      // Return user key if available
      if (userKey) {
        return userKey;
      }
      
      // Fall back to default key if allowed and available
      if (useDefault && defaultApiKeys[provider]) {
        return defaultApiKeys[provider];
      }
      
      return null;
    } catch (error) {
      console.error(`Failed to retrieve API key for ${provider}:`, error);
      return null;
    }
  }
  
  /**
   * Remove API key from session storage
   * @param provider API provider name
   */
  clearApiKey(provider: ApiProvider): void {
    try {
      sessionStorage.removeItem(`${this.keyPrefix}${provider}`);
    } catch (error) {
      console.error(`Failed to clear API key for ${provider}:`, error);
    }
  }
  
  /**
   * Remove all API keys from session storage
   */
  clearAllApiKeys(): void {
    try {
      Object.values(['openai', 'stabilityai', 'replicate']).forEach(provider => {
        this.clearApiKey(provider as ApiProvider);
      });
    } catch (error) {
      console.error('Failed to clear all API keys:', error);
    }
  }
  
  /**
   * Check if API key exists for a provider
   * @param provider API provider name
   * @param checkUserKeyOnly Whether to only check for user-provided keys
   * @returns boolean indicating if the key exists
   */
  hasApiKey(provider: ApiProvider, checkUserKeyOnly: boolean = false): boolean {
    if (checkUserKeyOnly) {
      // Only check session storage, not default keys
      const userKey = sessionStorage.getItem(`${this.keyPrefix}${provider}`);
      return userKey !== null;
    }
    
    // Check both user key and default key
    return this.getApiKey(provider) !== null;
  }
}

// Create a singleton instance
export const apiKeyManager = new ApiKeyManager();

// Export a hook for React components
export function useApiKeys() {
  return {
    setApiKey: apiKeyManager.setApiKey.bind(apiKeyManager),
    getApiKey: apiKeyManager.getApiKey.bind(apiKeyManager),
    clearApiKey: apiKeyManager.clearApiKey.bind(apiKeyManager),
    clearAllApiKeys: apiKeyManager.clearAllApiKeys.bind(apiKeyManager),
    hasApiKey: apiKeyManager.hasApiKey.bind(apiKeyManager),
  };
}
