import React, { useState, useEffect } from 'react';
import { AssetManager } from '../core/assetManager';
import { BlockchainIntegration } from '../blockchain/integration';
import { TransferService, TransferSession, TransferStatus } from '../services/transferService';
import { SecureImageFormatService } from '../services/secureImageFormat';
import { KeyPair } from '../crypto/signatures';

interface SecureTransferProps {
  assetManager: AssetManager;
  blockchain: BlockchainIntegration;
  keyPair: KeyPair;
  selectedAssetId?: string;
  onClose: () => void;
}

const SecureTransfer: React.FC<SecureTransferProps> = ({
  assetManager,
  blockchain,
  keyPair,
  selectedAssetId,
  onClose
}) => {
  const [secureImageService] = useState(() => new SecureImageFormatService());
  const [transferService] = useState(() => new TransferService(assetManager, blockchain, secureImageService));
  const [buyerAddress, setBuyerAddress] = useState('');
  const [activeTransfers, setActiveTransfers] = useState<TransferSession[]>([]);
  const [currentTransfer, setCurrentTransfer] = useState<TransferSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Load active transfers
  useEffect(() => {
    const transfers = transferService.getActiveTransfers();
    setActiveTransfers(transfers);
  }, [transferService]);
  
  // Initiate transfer
  const initiateTransfer = async () => {
    if (!selectedAssetId) {
      setError('No asset selected for transfer');
      return;
    }
    
    if (!buyerAddress) {
      setError('Please enter the buyer\'s wallet address');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const session = await transferService.initiateTransfer(
        selectedAssetId,
        buyerAddress
      );
      
      setCurrentTransfer(session);
      const transfers = transferService.getActiveTransfers();
      setActiveTransfers(transfers);
      
      setSuccessMessage('Transfer initiated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setError(`Failed to initiate transfer: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Create secure package
  const createSecurePackage = async (transferId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const securePackage = await transferService.createSecureTransferPackage(
        transferId,
        keyPair
      );
      
      const transfer = transferService.getTransfer(transferId);
      setCurrentTransfer(transfer || null);
      
      setSuccessMessage('Secure package created with proof of deletion');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      return securePackage;
    } catch (error) {
      setError(`Failed to create secure package: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Complete transfer on blockchain
  const completeTransfer = async (transferId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const txHash = await transferService.completeTransferOnBlockchain(transferId);
      
      const transfer = transferService.getTransfer(transferId);
      setCurrentTransfer(transfer || null);
      
      const transfers = transferService.getActiveTransfers();
      setActiveTransfers(transfers);
      
      setSuccessMessage(`Transfer completed on blockchain. Transaction: ${txHash.substring(0, 10)}...`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      setError(`Failed to complete transfer: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Convert transfer status to user-friendly message
  const getStatusMessage = (status: TransferStatus): string => {
    switch (status) {
      case TransferStatus.INITIATED:
        return 'Transfer initiated';
      case TransferStatus.PENDING_CONFIRMATION:
        return 'Awaiting confirmation';
      case TransferStatus.EXTRACTING:
        return 'Extracting asset data';
      case TransferStatus.DELETING:
        return 'Creating deletion proof';
      case TransferStatus.CREATING_TRANSFER_PACKAGE:
        return 'Creating secure package';
      case TransferStatus.TRANSFERRING:
        return 'Transferring to recipient';
      case TransferStatus.BLOCKCHAIN_VERIFICATION:
        return 'Verifying on blockchain';
      case TransferStatus.COMPLETED:
        return 'Transfer completed';
      case TransferStatus.FAILED:
        return 'Transfer failed';
      default:
        return 'Unknown status';
    }
  };
  
  return (
    <div className="secure-transfer-container">
      <h3>Secure P2P Transfer</h3>
      <p className="transfer-explanation">
        This system enables true digital asset transfers where the asset is completely removed 
        from your filesystem (with cryptographic proof of deletion) and securely transferred 
        to the recipient with blockchain verification.
      </p>
      
      {selectedAssetId ? (
        <p className="selected-asset">Selected Asset: {selectedAssetId}</p>
      ) : (
        <p className="no-asset-warning">Please select an asset to transfer</p>
      )}
      
      <div className="transfer-form">
        <label>
          Recipient Wallet Address:
          <input
            type="text"
            value={buyerAddress}
            onChange={(e) => setBuyerAddress(e.target.value)}
            placeholder="Enter recipient's wallet address"
            disabled={isLoading}
          />
        </label>
        
        <button
          onClick={initiateTransfer}
          disabled={isLoading || !selectedAssetId || !buyerAddress}
          className="primary-button"
        >
          {isLoading ? 'Processing...' : 'Initiate Transfer'}
        </button>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}
      
      {currentTransfer && (
        <div className="current-transfer">
          <h4>Current Transfer</h4>
          <div className="transfer-details">
            <p><strong>ID:</strong> {currentTransfer.id}</p>
            <p><strong>Asset:</strong> {currentTransfer.assetId}</p>
            <p><strong>To:</strong> {currentTransfer.buyerAddress}</p>
            <p><strong>Status:</strong> {getStatusMessage(currentTransfer.status)}</p>
            <p><strong>Initiated:</strong> {new Date(currentTransfer.initiatedAt).toLocaleString()}</p>
            
            {currentTransfer.completedAt && (
              <p><strong>Completed:</strong> {new Date(currentTransfer.completedAt).toLocaleString()}</p>
            )}
            
            {currentTransfer.blockchainTxHash && (
              <p>
                <strong>Transaction:</strong> 
                <a 
                  href={`https://etherscan.io/tx/${currentTransfer.blockchainTxHash}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  {currentTransfer.blockchainTxHash.substring(0, 10)}...
                </a>
              </p>
            )}
            
            {currentTransfer.status === TransferStatus.INITIATED && (
              <button
                onClick={() => createSecurePackage(currentTransfer.id)}
                disabled={isLoading}
                className="secondary-button"
              >
                Create Secure Package
              </button>
            )}
            
            {currentTransfer.status === TransferStatus.PENDING_CONFIRMATION && (
              <button
                onClick={() => completeTransfer(currentTransfer.id)}
                disabled={isLoading}
                className="secondary-button"
              >
                Complete Transfer on Blockchain
              </button>
            )}
            
            {currentTransfer.deletionProof && (
              <div className="deletion-proof">
                <h5>Proof of Deletion</h5>
                <p>Timestamp: {new Date(currentTransfer.deletionProof.timestamp).toLocaleString()}</p>
                <p>File Hashes: {currentTransfer.deletionProof.fileHashes.length}</p>
                <p className="small-text">
                  This cryptographically proves the asset was completely removed from your filesystem.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {activeTransfers.length > 0 && (
        <div className="transfer-history">
          <h4>Transfer History</h4>
          <div className="transfer-list">
            {activeTransfers.map(transfer => (
              <div
                key={transfer.id}
                className={`transfer-item ${transfer.id === currentTransfer?.id ? 'active' : ''}`}
                onClick={() => setCurrentTransfer(transfer)}
              >
                <p><strong>ID:</strong> {transfer.id.substring(0, 12)}...</p>
                <p><strong>Status:</strong> {getStatusMessage(transfer.status)}</p>
                <p><strong>Date:</strong> {new Date(transfer.initiatedAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <button onClick={onClose} className="close-button">
        Close
      </button>
    </div>
  );
};

export default SecureTransfer;
