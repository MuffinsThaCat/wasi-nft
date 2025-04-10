/**
 * User interface for the digital assets application
 */
import { AssetManager, AssetMetadata, CreateAssetParams } from '../core/assetManager';

// Elements cache
let elements: { [id: string]: HTMLElement } = {};

/**
 * Initialize the user interface
 */
export function initializeUI(assetManager: AssetManager): void {
  // Cache DOM elements
  cacheElements();
  
  // Set up event listeners
  setupEventListeners(assetManager);
  
  console.log('UI initialized');
}

/**
 * Cache frequently used DOM elements
 */
function cacheElements(): void {
  const ids = [
    'select-dir-btn',
    'current-dir',
    'create-asset-section',
    'assets-gallery',
    'assets-container',
    'asset-details',
    'asset-detail-container',
    'verify-asset-btn',
    'export-asset-btn',
    'blockchain-asset-btn',
    'back-to-gallery-btn',
    'create-asset-btn',
    'asset-title',
    'asset-description',
    'asset-file',
    'asset-editions',
    'loading-overlay',
    'loading-message'
  ];
  
  // Create a cache of elements
  ids.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      elements[id] = element;
    } else {
      console.warn(`Element with id '${id}' not found`);
    }
  });
}

/**
 * Set up event listeners for user interactions
 */
function setupEventListeners(assetManager: AssetManager): void {
  // Directory selection
  elements['select-dir-btn'].addEventListener('click', () => {
    selectDirectory(assetManager);
  });
  
  // Create asset button
  elements['create-asset-btn'].addEventListener('click', () => {
    createAsset(assetManager);
  });
  
  // Back to gallery button
  elements['back-to-gallery-btn'].addEventListener('click', () => {
    showSection('assets-gallery');
    hideSection('asset-details');
  });
  
  // Verify asset button
  elements['verify-asset-btn'].addEventListener('click', async () => {
    const assetId = elements['verify-asset-btn'].getAttribute('data-asset-id');
    if (assetId) {
      await verifyAsset(assetManager, assetId);
    }
  });
  
  // Export asset button
  elements['export-asset-btn'].addEventListener('click', async () => {
    const assetId = elements['export-asset-btn'].getAttribute('data-asset-id');
    if (assetId) {
      await exportAsset(assetManager, assetId);
    }
  });
  
  // Blockchain asset button
  elements['blockchain-asset-btn'].addEventListener('click', async () => {
    const assetId = elements['blockchain-asset-btn'].getAttribute('data-asset-id');
    if (assetId) {
      await registerOnBlockchain(assetManager, assetId);
    }
  });
}

/**
 * Check if File System Access API is available in the browser
 */
function isFileSystemAccessSupported(): boolean {
  return 'showDirectoryPicker' in window;
}

/**
 * Ask user to select a directory for storing assets
 */
async function selectDirectory(assetManager: AssetManager): Promise<void> {
  try {
    showLoading('Selecting directory...');
    
    // First check browser compatibility
    if (!isFileSystemAccessSupported()) {
      alert('Your browser does not support the File System Access API. Please use Chrome, Edge, or another Chromium-based browser.');
      hideLoading();
      return;
    }
    
    console.log('Prompting for directory selection...');
    const directory = await assetManager.fileSystem.selectDirectory();
    console.log('Directory selection result:', directory);
    
    if (directory) {
      elements['current-dir'].textContent = `Selected directory: ${directory.name}`;
      elements['current-dir'].classList.remove('hidden');
      
      // Enable create section
      showSection('create-asset-section');
      
      // Load existing assets
      await loadAssets(assetManager);
    } else {
      console.log('No directory was selected or the selection was cancelled');
    }
  } catch (error) {
    console.error('Error selecting directory:', error);
    alert(`Failed to select directory: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    hideLoading();
  }
}

/**
 * Create a new digital asset
 */
async function createAsset(assetManager: AssetManager): Promise<void> {
  const titleInput = elements['asset-title'] as HTMLInputElement;
  const descriptionInput = elements['asset-description'] as HTMLTextAreaElement;
  const fileInput = elements['asset-file'] as HTMLInputElement;
  const editionsInput = elements['asset-editions'] as HTMLInputElement;
  
  // Validate inputs
  if (!titleInput.value.trim()) {
    alert('Please enter a title for your asset');
    return;
  }
  
  if (!fileInput.files || fileInput.files.length === 0) {
    alert('Please select a file for your asset');
    return;
  }
  
  try {
    showLoading('Creating digital asset...');
    
    const params: CreateAssetParams = {
      title: titleInput.value.trim(),
      description: descriptionInput.value.trim(),
      content: fileInput.files[0],
      editions: parseInt(editionsInput.value) || 1,
      creatorName: 'Asset Creator' // Could be a user input
    };
    
    const asset = await assetManager.createAsset(params);
    
    // Reset form
    titleInput.value = '';
    descriptionInput.value = '';
    fileInput.value = '';
    editionsInput.value = '1';
    
    // Reload assets
    await loadAssets(assetManager);
    
    // Show success message
    alert('Digital asset created successfully!');
  } catch (error) {
    console.error('Error creating asset:', error);
    alert(`Failed to create asset: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    hideLoading();
  }
}

/**
 * Load and display all assets
 */
async function loadAssets(assetManager: AssetManager): Promise<void> {
  try {
    showLoading('Loading assets...');
    
    const assets = await assetManager.getAssets();
    
    if (assets.length > 0) {
      showSection('assets-gallery');
      renderAssetGallery(assetManager, assets);
    }
  } catch (error) {
    console.error('Error loading assets:', error);
    alert(`Failed to load assets: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    hideLoading();
  }
}

/**
 * Render the asset gallery
 */
function renderAssetGallery(assetManager: AssetManager, assets: AssetMetadata[]): void {
  const container = elements['assets-container'];
  
  // Clear container
  container.innerHTML = '';
  
  if (assets.length === 0) {
    container.innerHTML = '<p class="no-assets">No digital assets yet. Create your first one!</p>';
    return;
  }
  
  assets.forEach(asset => {
    const card = document.createElement('div');
    card.className = 'asset-card';
    card.setAttribute('data-asset-id', asset.id);
    
    // Determine card content based on media type
    let previewHtml = '';
    
    if (asset.mediaType.startsWith('image/')) {
      // Create an actual image element for preview
      previewHtml = `<div class="asset-preview image-preview" style="background-color: #f0f0f0; height: 180px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
        <img src="#" alt="${asset.title}" class="preview-image" data-asset-id="${asset.id}" style="max-width: 100%; max-height: 100%; object-fit: contain;">
      </div>`;
      
      // After rendering, we'll load the actual image content
      setTimeout(() => loadAssetPreview(assetManager, asset.id), 10);
    } else if (asset.mediaType.startsWith('video/')) {
      previewHtml = `<div class="asset-preview video-preview" style="background-color: #f0f0f0; height: 180px; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 48px;">🎬</span>
      </div>`;
    } else if (asset.mediaType.startsWith('audio/')) {
      previewHtml = `<div class="asset-preview audio-preview" style="background-color: #f0f0f0; height: 180px; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 48px;">🎵</span>
      </div>`;
    } else {
      previewHtml = `<div class="asset-preview generic-preview" style="background-color: #f0f0f0; height: 180px; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 48px;">📄</span>
      </div>`;
    }
    
    card.innerHTML = `
      ${previewHtml}
      <div class="asset-info">
        <h3 class="asset-title">${asset.title}</h3>
        <p class="asset-meta">Edition ${asset.editions.current} of ${asset.editions.total}</p>
        <p class="asset-meta">Created ${new Date(asset.createdAt).toLocaleDateString()}</p>
      </div>
    `;
    
    // Add click event
    card.addEventListener('click', () => {
      showAssetDetails(assetManager, asset.id);
    });
    
    container.appendChild(card);
  });
}

/**
 * Load image preview for an asset
 */
async function loadAssetPreview(assetManager: AssetManager, assetId: string): Promise<void> {
  try {
    // Get the asset data
    const asset = await assetManager.getAsset(assetId);
    if (!asset || !asset.mediaType.startsWith('image/')) {
      return;
    }
    
    // Get the file data
    const fileData = await assetManager.getAssetContent(assetId);
    if (!fileData) {
      console.error('Could not load asset file data for preview');
      return;
    }
    
    // Create a blob URL for the image
    const blob = new Blob([fileData], { type: asset.mediaType });
    const imageUrl = URL.createObjectURL(blob);
    
    // Find all preview image elements for this asset and set the source
    const previewImages = document.querySelectorAll(`.preview-image[data-asset-id="${assetId}"]`);
    previewImages.forEach((img: Element) => {
      if (img instanceof HTMLImageElement) {
        img.src = imageUrl;
        
        // Add load error handling
        img.onerror = () => {
          console.error('Failed to load image preview for asset:', assetId);
          img.src = ''; // Clear the source
          img.alt = 'Image preview unavailable';
          img.style.display = 'none';
          img.parentElement?.querySelector('span')?.remove(); // Remove any existing placeholder
          const placeholder = document.createElement('span');
          placeholder.style.fontSize = '48px';
          placeholder.textContent = '🖼️';
          img.parentElement?.appendChild(placeholder);
        };
      }
    });
  } catch (error) {
    console.error('Error loading asset preview:', error);
  }
}

/**
 * Show detailed view of an asset
 */
async function showAssetDetails(assetManager: AssetManager, assetId: string): Promise<void> {
  try {
    showLoading('Loading asset details...');
    
    const asset = await assetManager.getAsset(assetId);
    const container = elements['asset-detail-container'];
    
    let blockchainStatus = 'Not on blockchain';
    if (asset.blockchain) {
      blockchainStatus = `Registered on ${asset.blockchain.network}<br>
        Transaction: ${asset.blockchain.transactionHash.substring(0, 10)}...<br>
        Contract: ${asset.blockchain.contractAddress}`;
    }
    
    // Format created date
    const createdDate = new Date(asset.createdAt).toLocaleString();
    
    container.innerHTML = `
      <div class="asset-detail-info">
        <h3>${asset.title}</h3>
        <p class="asset-description">${asset.description || 'No description'}</p>
        
        <div class="asset-metadata">
          <p><strong>Creator:</strong> ${asset.creator.name}</p>
          <p><strong>Created:</strong> ${createdDate}</p>
          <p><strong>Edition:</strong> ${asset.editions.current} of ${asset.editions.total}</p>
          <p><strong>Media Type:</strong> ${asset.mediaType}</p>
          <p><strong>Blockchain Status:</strong> <span id="blockchain-status">${blockchainStatus}</span></p>
        </div>
        
        <div class="asset-technical">
          <p><strong>Asset ID:</strong> ${asset.id}</p>
          <p><strong>Content Hash:</strong> ${asset.contentHash}</p>
          <p><strong>File:</strong> ${asset.filename}</p>
        </div>
      </div>
      
      <div class="asset-detail-preview">
        <div class="asset-large-preview" style="background-color: #f0f0f0; height: 300px; display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 72px;">${
            asset.mediaType.startsWith('image/') ? '🖼️' : 
            asset.mediaType.startsWith('video/') ? '🎬' : 
            asset.mediaType.startsWith('audio/') ? '🎵' : '📄'
          }</span>
        </div>
      </div>
    `;
    
    // Set up action buttons
    elements['verify-asset-btn'].setAttribute('data-asset-id', assetId);
    elements['export-asset-btn'].setAttribute('data-asset-id', assetId);
    elements['blockchain-asset-btn'].setAttribute('data-asset-id', assetId);
    
    // Update blockchain button state
    if (asset.blockchain) {
      elements['blockchain-asset-btn'].textContent = 'Already on Blockchain';
      elements['blockchain-asset-btn'].setAttribute('disabled', 'disabled');
    } else {
      elements['blockchain-asset-btn'].textContent = 'Move to Blockchain';
      elements['blockchain-asset-btn'].removeAttribute('disabled');
    }
    
    // Show details section
    hideSection('assets-gallery');
    showSection('asset-details');
  } catch (error) {
    console.error('Error showing asset details:', error);
    alert(`Failed to load asset details: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    hideLoading();
  }
}

/**
 * Verify an asset's authenticity
 */
async function verifyAsset(assetManager: AssetManager, assetId: string): Promise<void> {
  try {
    showLoading('Verifying asset authenticity...');
    
    const isVerified = await assetManager.verifyAsset(assetId);
    
    if (isVerified) {
      alert('Asset verified successfully! The content and signatures are authentic.');
    } else {
      alert('Asset verification failed! The content may have been modified or the signatures are invalid.');
    }
  } catch (error) {
    console.error('Error verifying asset:', error);
    alert(`Failed to verify asset: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    hideLoading();
  }
}

/**
 * Export an asset for sharing
 */
async function exportAsset(assetManager: AssetManager, assetId: string): Promise<void> {
  try {
    showLoading('Exporting asset...');
    
    const asset = await assetManager.getAsset(assetId);
    const bundle = await assetManager.exportAsset(assetId);
    
    // Create download link
    const url = URL.createObjectURL(bundle);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${asset.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${assetId}.fsda`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('Asset exported successfully! You can share this file with others.');
  } catch (error) {
    console.error('Error exporting asset:', error);
    alert(`Failed to export asset: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    hideLoading();
  }
}

/**
 * Register asset on blockchain (placeholder)
 */
async function registerOnBlockchain(assetManager: AssetManager, assetId: string): Promise<void> {
  try {
    showLoading('Registering asset on blockchain...');
    
    // This is a placeholder for future blockchain integration
    setTimeout(async () => {
      try {
        // Simulate blockchain registration
        const asset = await assetManager.registerOnBlockchain(assetId);
        
        // Update blockchain status in UI
        const blockchainStatus = document.getElementById('blockchain-status');
        if (blockchainStatus && asset.blockchain) {
          blockchainStatus.innerHTML = `Registered on ${asset.blockchain.network}<br>
            Transaction: ${asset.blockchain.transactionHash.substring(0, 10)}...<br>
            Contract: ${asset.blockchain.contractAddress}`;
        }
        
        // Update button state
        elements['blockchain-asset-btn'].textContent = 'Already on Blockchain';
        elements['blockchain-asset-btn'].setAttribute('disabled', 'disabled');
        
        alert('Asset registered on blockchain successfully!');
      } catch (innerError) {
        console.error('Error in blockchain registration:', innerError);
        alert(`Blockchain registration error: ${innerError instanceof Error ? innerError.message : String(innerError)}`);
      } finally {
        hideLoading();
      }
    }, 2000);
  } catch (error) {
    console.error('Error registering on blockchain:', error);
    alert(`Failed to register on blockchain: ${error instanceof Error ? error.message : String(error)}`);
    hideLoading();
  }
}

/**
 * Show a specific section
 */
function showSection(sectionId: string): void {
  if (elements[sectionId]) {
    elements[sectionId].classList.remove('hidden');
  }
}

/**
 * Hide a specific section
 */
function hideSection(sectionId: string): void {
  if (elements[sectionId]) {
    elements[sectionId].classList.add('hidden');
  }
}

/**
 * Show loading indicator
 */
function showLoading(message: string = 'Processing...'): void {
  const loadingOverlay = elements['loading-overlay'];
  const loadingMessage = elements['loading-message'];
  
  if (loadingMessage) {
    loadingMessage.textContent = message;
  }
  
  if (loadingOverlay) {
    loadingOverlay.classList.remove('hidden');
  }
}

/**
 * Hide loading indicator
 */
function hideLoading(): void {
  const loadingOverlay = elements['loading-overlay'];
  
  if (loadingOverlay) {
    loadingOverlay.classList.add('hidden');
  }
}
