import React from 'react';
import { AssetManager } from '../core/assetManager';
import { BlockchainIntegration } from '../blockchain/integration';
import { TransferService } from '../services/transferService';
import '../styles/marketplaceListing.css';
interface MarketplaceListingProps {
    assetManager: AssetManager;
    blockchain: BlockchainIntegration;
    transferService: TransferService;
}
declare const MarketplaceListing: React.FC<MarketplaceListingProps>;
export default MarketplaceListing;
