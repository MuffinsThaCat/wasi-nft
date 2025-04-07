import React from 'react';
import { AssetManager } from '../core/assetManager';
interface AiArtCreatorProps {
    assetManager: AssetManager;
    onAssetSelected?: (assetId: string) => void;
    onTransferClick?: () => void;
}
declare const AiArtCreator: React.FC<AiArtCreatorProps>;
export default AiArtCreator;
