/**
 * Ownership Verifier Component
 * 
 * A public-facing component that allows anyone to verify the authenticity
 * and ownership of digital assets that have been shared on social media.
 * 
 * This component:
 * 1. Allows users to upload or drag & drop images for verification
 * 2. Extracts embedded ownership data using the SocialMediaExportService
 * 3. Verifies the authenticity against blockchain records
 * 4. Displays verification results with owner information
 */

import React, { useState, useRef, useCallback } from 'react';
import { SocialMediaExportService, OwnershipWatermark } from '../services/socialMediaExportService';
import { ProvenanceTracker } from '../services/provenanceTracker';
import { AssetManager } from '../core/assetManager';
import { BlockchainIntegration } from '../blockchain/integration';
import '../styles/ownershipVerifier.css';

interface VerificationResult {
  verified: boolean;
  ownershipData: OwnershipWatermark | null;
  currentOwner: string;
  matchesBlockchain: boolean;
  timestamp: string;
  assetId: string;
  errors: string[];
}

interface OwnershipVerifierProps {
  assetManager: AssetManager;
  provenanceTracker: ProvenanceTracker;
  blockchain: BlockchainIntegration;
}

const OwnershipVerifier: React.FC<OwnershipVerifierProps> = ({
  assetManager,
  provenanceTracker,
  blockchain
}) => {
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize the service
  const socialMediaService = new SocialMediaExportService(
    assetManager,
    provenanceTracker,
    blockchain
  );

  const handleFileUpload = useCallback(async (file: File) => {
    // Reset states
    setVerificationResult(null);
    setErrorMessage(null);
    setIsVerifying(true);

    try {
      // Display the uploaded image
      const imageUrl = URL.createObjectURL(file);
      setUploadedImage(imageUrl);

      // Verify the image
      const result = await socialMediaService.verifyImageOwnership(file);
      setVerificationResult(result);
    } catch (error) {
      console.error('Error verifying image:', error);
      setErrorMessage(`Verification failed: ${(error as Error).message}`);
    } finally {
      setIsVerifying(false);
    }
  }, [socialMediaService]);

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Handle button click
  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="ownership-verifier-container">
      <h2>Verify Digital Asset Ownership</h2>
      <p className="verifier-description">
        Upload an image to verify its authenticity and ownership history.
        Our system will check for embedded ownership data and verify it against
        blockchain records.
      </p>

      <div 
        className={`upload-area ${isVerifying ? 'verifying' : ''}`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleButtonClick}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
        />
        
        {isVerifying ? (
          <div className="verifying-indicator">
            <div className="spinner"></div>
            <p>Verifying image ownership...</p>
          </div>
        ) : uploadedImage ? (
          <div className="image-preview-container">
            <img src={uploadedImage} alt="Uploaded" className="image-preview" />
            <button className="verify-another-btn" onClick={handleButtonClick}>
              Verify Another Image
            </button>
          </div>
        ) : (
          <div className="upload-prompt">
            <div className="upload-icon">
              <i className="fa fa-cloud-upload"></i>
            </div>
            <p>Drag & drop an image here or click to browse</p>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="error-message">
          {errorMessage}
        </div>
      )}

      {verificationResult && (
        <div className={`verification-results ${verificationResult.verified ? 'verified' : 'unverified'}`}>
          <h3>Verification Results</h3>
          
          <div className="verification-status">
            <div className={`status-indicator ${verificationResult.verified ? 'verified' : 'unverified'}`}>
              {verificationResult.verified ? 'Verified' : 'Unverified'}
            </div>
          </div>
          
          {verificationResult.ownershipData ? (
            <div className="ownership-details">
              <div className="detail-row">
                <span className="detail-label">Asset ID:</span>
                <span className="detail-value">{verificationResult.assetId}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Current Owner:</span>
                <span className="detail-value">{verificationResult.currentOwner}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Timestamp:</span>
                <span className="detail-value">{verificationResult.timestamp}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Blockchain Match:</span>
                <span className={`detail-value ${verificationResult.matchesBlockchain ? 'match' : 'mismatch'}`}>
                  {verificationResult.matchesBlockchain ? 'Verified' : 'Not Verified'}
                </span>
              </div>
              
              {verificationResult.ownershipData.blockchainRef && (
                <div className="detail-row">
                  <span className="detail-label">Blockchain Reference:</span>
                  <a 
                    href={`https://etherscan.io/tx/${verificationResult.ownershipData.blockchainRef}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="blockchain-link"
                  >
                    View on Blockchain
                  </a>
                </div>
              )}
            </div>
          ) : (
            <p className="no-data-found">No ownership data found in this image.</p>
          )}
          
          {verificationResult.errors.length > 0 && (
            <div className="verification-errors">
              <h4>Verification Issues:</h4>
              <ul>
                {verificationResult.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      <div className="info-section">
        <h3>About Digital Asset Verification</h3>
        <p>
          Our verification system uses advanced steganography techniques to embed
          ownership information directly into images when they're prepared for social
          media sharing. This allows anyone to verify who truly owns an image, even
          after it has been copied or downloaded.
        </p>
        <p>
          The verification process checks both the embedded data and the blockchain
          records to provide a comprehensive ownership verification.
        </p>
      </div>
    </div>
  );
};

export default OwnershipVerifier;
