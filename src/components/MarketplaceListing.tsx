import React, { useState, useEffect } from 'react';
import { MarketplaceService, MarketplaceProvider, ListingStatus } from '../services/marketplaceService';
import { AssetManager } from '../core/assetManager';
import { BlockchainIntegration } from '../blockchain/integration';
import { IPFSPinningService } from '../services/ipfsService';
import { TransferService } from '../services/transferService';
import '../styles/marketplaceListing.css';

interface MarketplaceListingProps {
  assetManager: AssetManager;
  blockchain: BlockchainIntegration;
  transferService: TransferService;
}

const MarketplaceListing: React.FC<MarketplaceListingProps> = ({ 
  assetManager, 
  blockchain, 
  transferService 
}) => {
  const [selectedAsset, setSelectedAsset] = useState<string>('');
  const [assetOptions, setAssetOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [price, setPrice] = useState<string>('0.1');
  const [marketplace, setMarketplace] = useState<MarketplaceProvider>(MarketplaceProvider.OPENSEA);
  const [isListing, setIsListing] = useState<boolean>(false);
  const [listingStatus, setListingStatus] = useState<string>('');
  const [marketplaceService, setMarketplaceService] = useState<MarketplaceService | null>(null);
  const [activeListings, setActiveListings] = useState<any[]>([]);
  
  // Initialize services
  useEffect(() => {
    const ipfsService = new IPFSPinningService({
      apiKey: 'demo_key',
      apiSecret: 'demo_secret',
      endpoint: 'https://api.pinata.cloud'
    });
    
    const marketplaceServiceInstance = new MarketplaceService(
      assetManager,
      ipfsService,
      blockchain,
      transferService
    );
    
    setMarketplaceService(marketplaceServiceInstance);
    
    // Load assets
    loadAssets();
    
    // Load active listings if available
    if (marketplaceServiceInstance) {
      const listings = marketplaceServiceInstance.getListings();
      setActiveListings(listings);
    }
  }, [assetManager, blockchain, transferService]);

  const loadAssets = async () => {
    try {
      const assets = await assetManager.getAssets();
      const options = assets.map((asset: any) => ({
        id: asset.id,
        name: asset.metadata?.name || `Asset ${asset.id.substring(0, 8)}`
      }));
      
      setAssetOptions(options);
      if (options.length > 0) {
        setSelectedAsset(options[0].id);
      }
    } catch (error) {
      console.error('Failed to load assets:', error);
    }
  };
  
  const handleListOnMarketplace = async () => {
    if (!marketplaceService || !selectedAsset || isListing) return;
    
    setIsListing(true);
    setListingStatus('Preparing asset for marketplace...');
    
    try {
      // List the asset on the marketplace with auto-deletion
      const listing = await marketplaceService.listOnMarketplace(
        selectedAsset,
        marketplace,
        price
      );
      
      setListingStatus(`Successfully listed on ${marketplace}!`);
      
      // Update active listings
      setActiveListings([...activeListings, listing]);
      
      // Show marketplace URL
      const marketplaceUrl = marketplaceService.getMarketplaceUrl(listing);
      setListingStatus(`Listed! View on marketplace: ${marketplaceUrl}`);
      
    } catch (error: unknown) {
      console.error('Failed to list on marketplace:', error);
      setListingStatus(`Failed to list: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsListing(false);
    }
  };
  
  const handleCancelListing = async (listingId: string) => {
    if (!marketplaceService) return;
    
    try {
      await marketplaceService.cancelListing(listingId);
      
      // Update active listings
      const updatedListings = activeListings.map(listing => 
        listing.id === listingId 
          ? { ...listing, status: ListingStatus.CANCELLED } 
          : listing
      );
      
      setActiveListings(updatedListings);
    } catch (error) {
      console.error('Failed to cancel listing:', error);
    }
  };
  
  return (
    <div className="marketplace-listing-container">
      <h2>List on Marketplace with Auto-Deletion</h2>
      <p className="feature-description">
        List your asset on popular NFT marketplaces. The image will be publicly visible 
        until sold, then automatically deleted to ensure true digital scarcity.
      </p>
      
      <div className="listing-form">
        <div className="form-group">
          <label>Select Asset:</label>
          <select 
            value={selectedAsset} 
            onChange={(e) => setSelectedAsset(e.target.value)}
            disabled={isListing}
          >
            {assetOptions.map(asset => (
              <option key={asset.id} value={asset.id}>
                {asset.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label>Marketplace:</label>
          <select 
            value={marketplace} 
            onChange={(e) => setMarketplace(e.target.value as MarketplaceProvider)}
            disabled={isListing}
          >
            <option value={MarketplaceProvider.OPENSEA}>OpenSea</option>
            <option value={MarketplaceProvider.RARIBLE}>Rarible</option>
            <option value={MarketplaceProvider.FOUNDATION}>Foundation</option>
            <option value={MarketplaceProvider.OUR_MARKETPLACE}>Our Marketplace</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>Price (ETH):</label>
          <input 
            type="number" 
            min="0.001" 
            step="0.001" 
            value={price} 
            onChange={(e) => setPrice(e.target.value)}
            disabled={isListing}
          />
        </div>
        
        <div className="auto-deletion-info">
          <div className="info-icon">i</div>
          <p>
            After your NFT sells, our system will automatically delete the image 
            from public view. The buyer will receive the asset via our secure P2P transfer.
          </p>
        </div>
        
        <button 
          className="list-button" 
          onClick={handleListOnMarketplace}
          disabled={isListing || !selectedAsset}
        >
          {isListing ? 'Listing...' : 'List with Auto-Deletion'}
        </button>
        
        {listingStatus && (
          <div className="listing-status">
            {listingStatus}
          </div>
        )}
      </div>
      
      {activeListings.length > 0 && (
        <div className="active-listings">
          <h3>Your Marketplace Listings</h3>
          <div className="listings-table">
            <div className="table-header">
              <span className="col asset-name">Asset</span>
              <span className="col marketplace">Marketplace</span>
              <span className="col price">Price</span>
              <span className="col status">Status</span>
              <span className="col actions">Actions</span>
            </div>
            {activeListings.map(listing => (
              <div key={listing.id} className="listing-row">
                <span className="col asset-name">
                  {assetOptions.find(a => a.id === listing.assetId)?.name || 'Unknown Asset'}
                </span>
                <span className="col marketplace">{listing.marketplace}</span>
                <span className="col price">{listing.price} {listing.currency}</span>
                <span className={`col status status-${listing.status.toLowerCase()}`}>
                  {listing.status}
                  {listing.status === ListingStatus.SOLD && listing.imageDeleted && (
                    <span className="deleted-icon" title="Image deleted after sale">🗑️</span>
                  )}
                </span>
                <span className="col actions">
                  {listing.status === ListingStatus.ACTIVE && (
                    <button 
                      className="cancel-button" 
                      onClick={() => handleCancelListing(listing.id)}
                    >
                      Cancel
                    </button>
                  )}
                  <a 
                    href={marketplaceService?.getMarketplaceUrl(listing)} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="view-link"
                  >
                    View
                  </a>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketplaceListing;
