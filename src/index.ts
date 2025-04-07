import './styles.css';
import { initializeFileSystem } from './core/filesystem';
import { initializeUI } from './ui/interface';
import { AssetManager } from './core/assetManager';

// Import our helper components
import './fixCryptoKeys.js'; // Crypto fix for asset signing

// Declare global window properties
declare global {
  interface Window {
    assetManagerInstance: AssetManager | null;
  }
}

/**
 * Main application entry point
 */
async function main() {
  try {
    // Initialize file system access
    const fileSystem = await initializeFileSystem();
    
    // Create asset manager
    const assetManager = new AssetManager({
      fileSystem,
      assetsDirectoryName: 'assets',
      metadataDirectoryName: 'metadata'
    });
    
    // Important: Initialize the asset manager before using it
    console.log('Initializing asset manager...');
    await assetManager.initialize();
    console.log('Asset manager fully initialized with cryptographic keys');
    
    // Make asset manager globally available only after proper initialization
    window.assetManagerInstance = assetManager;
    console.log('Asset manager initialized and stored globally');
    
    // No Quick Asset Creator - removed as requested
    
    // Initialize UI with asset manager
    initializeUI(assetManager);
    
    console.log('Filesystem Digital Assets application initialized successfully');
  } catch (error) {
    console.error('Failed to initialize application:', error);
    document.getElementById('app')!.innerHTML = `
      <div class="error-message">
        <h2>Application Error</h2>
        <p>Failed to initialize the application. Please make sure your browser supports 
        the File System Access API and WebAssembly.</p>
        <p>Error details: ${error instanceof Error ? error.message : String(error)}</p>
      </div>
    `;
  }
}

// Start the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', main);
