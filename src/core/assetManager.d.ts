import { AssetMetadata } from './assetManager';

// Extend the AssetManager interface with our new methods
declare module './assetManager' {
  interface AssetManager {
    // Get binary content of an asset
    getAssetContent(assetId: string): Promise<ArrayBuffer>;
    
    // Alias for getAssets() for marketplace integration
    getAllAssets(): Promise<AssetMetadata[]>;
  }
}
