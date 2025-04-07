import './styles.css';
import { AssetManager } from './core/assetManager';
import './quickAssetCreator.js';
import './fixCryptoKeys.js';
declare global {
    interface Window {
        assetManagerInstance: AssetManager | null;
        storeAssetManager: (instance: AssetManager) => void;
    }
}
