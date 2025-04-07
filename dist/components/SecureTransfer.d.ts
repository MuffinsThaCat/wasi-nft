import React from 'react';
import { AssetManager } from '../core/assetManager';
import { BlockchainIntegration } from '../blockchain/integration';
import { KeyPair } from '../crypto/signatures';
interface SecureTransferProps {
    assetManager: AssetManager;
    blockchain: BlockchainIntegration;
    keyPair: KeyPair;
    selectedAssetId?: string;
    onClose: () => void;
}
declare const SecureTransfer: React.FC<SecureTransferProps>;
export default SecureTransfer;
