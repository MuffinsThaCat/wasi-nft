/**
 * API Key Manager for secure handling of third-party API keys
 * Uses sessionStorage for temporary secure storage during app usage
 * Falls back to default API keys when user keys are not available
 */
export type ApiProvider = 'openai' | 'stabilityai' | 'replicate';
export interface ApiKeyManagerInterface {
    setApiKey(provider: ApiProvider, key: string): void;
    getApiKey(provider: ApiProvider): string | null;
    clearApiKey(provider: ApiProvider): void;
    clearAllApiKeys(): void;
    hasApiKey(provider: ApiProvider): boolean;
}
export declare class ApiKeyManager implements ApiKeyManagerInterface {
    private readonly keyPrefix;
    /**
     * Store API key in session storage
     * @param provider API provider name
     * @param key API key to store
     */
    setApiKey(provider: ApiProvider, key: string): void;
    /**
     * Retrieve API key from session storage or fall back to default key
     * @param provider API provider name
     * @param useDefault Whether to use the default key as fallback
     * @returns The API key or null if not found and no default available
     */
    getApiKey(provider: ApiProvider, useDefault?: boolean): string | null;
    /**
     * Remove API key from session storage
     * @param provider API provider name
     */
    clearApiKey(provider: ApiProvider): void;
    /**
     * Remove all API keys from session storage
     */
    clearAllApiKeys(): void;
    /**
     * Check if API key exists for a provider
     * @param provider API provider name
     * @param checkUserKeyOnly Whether to only check for user-provided keys
     * @returns boolean indicating if the key exists
     */
    hasApiKey(provider: ApiProvider, checkUserKeyOnly?: boolean): boolean;
}
export declare const apiKeyManager: ApiKeyManager;
export declare function useApiKeys(): {
    setApiKey: (provider: ApiProvider, key: string) => void;
    getApiKey: (provider: ApiProvider, useDefault?: boolean) => string | null;
    clearApiKey: (provider: ApiProvider) => void;
    clearAllApiKeys: () => void;
    hasApiKey: (provider: ApiProvider, checkUserKeyOnly?: boolean) => boolean;
};
