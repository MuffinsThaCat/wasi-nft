/**
 * Type definitions for AI training data and datasets
 */

/**
 * Metadata for a single AI training data item
 */
export interface AIDataItemMetadata {
  id: string;
  title: string;
  description: string;
  dataType: 'image' | 'text' | 'audio' | 'video' | 'structured' | 'mixed';
  contentType: string; // MIME type
  size: number; // Size in bytes
  createdAt: number;
  updatedAt: number; // Added for compatibility with AssetMetadata
  creator: {
    name: string;
    id?: string;
  };
  license: string;
  tags: string[];
  usageRestrictions?: string[];
  aiApplications?: string[]; // Intended AI applications (e.g., "image generation", "sentiment analysis")
  verificationMethod: 'signature' | 'hash' | 'both';
  contentHash: string;
  // Added for compatibility with AssetMetadata
  editions: number;
  signatures: {
    creator: string;
    timestamp: string;
  };
  quality?: {
    rating?: number; // 0-100
    validatedBy?: string[];
    annotations?: Record<string, any>;
  };
  sourceInfo?: {
    origin: string;
    collectionMethod: string;
    processedBy?: string[];
  };
  // Optional blockchain reference for NFT registration
  blockchain?: {
    chain: string;
    contractAddress?: string;
    tokenId?: string;
    transactionHash?: string;
  };
}

/**
 * Metadata for an AI dataset collection
 */
export interface AIDatasetMetadata {
  id: string;
  name: string;
  description: string;
  dataType: 'image' | 'text' | 'audio' | 'video' | 'structured' | 'mixed';
  itemCount: number;
  totalSize: number; // Size in bytes
  createdAt: number;
  updatedAt: number;
  creator: {
    name: string;
    id?: string;
  };
  license: string;
  tags: string[];
  usageRestrictions?: string[];
  aiApplications?: string[]; // Intended AI applications
  dataSchema?: Record<string, any>; // Schema definition for structured data
  qualitySummary?: {
    averageRating?: number;
    validationMethods?: string[];
    coverage?: number; // Percentage of items with quality validation
  };
  sourceInfo?: {
    origin: string;
    collectionMethod: string;
    timeframe?: {
      start: number;
      end: number;
    }
  };
  sampleStrategy?: string;
  splitInfo?: {
    hasTrain?: boolean;
    hasValidation?: boolean;
    hasTest?: boolean;
    splitRatios?: number[];
  };
  metrics?: Record<string, any>; // Performance metrics when used with models
  modelPerformance?: {
    modelId: string;
    score: number;
    metric: string;
  }[];
  merkleRoot?: string; // For compressed NFT collections
  
  // Blockchain reference for on-chain registration
  blockchainReference?: {
    chain: string;
    contractAddress?: string;
    transactionHash?: string;
    blockNumber?: number;
  };
}

/**
 * AI Data Item containing metadata and content
 */
export interface AIDataItem {
  metadata: AIDataItemMetadata;
  content: ArrayBuffer | Buffer;
}

/**
 * AI Dataset containing metadata and references to items
 */
export interface AIDataset {
  metadata: AIDatasetMetadata;
  items?: string[]; // Array of item IDs
}

/**
 * Usage data for an AI dataset
 */
export interface DatasetUsage {
  datasetId: string;
  usedBy: {
    modelId: string;
    modelName: string;
    modelCreator: string;
    usageDate: number;
    purpose: string;
    attribution?: boolean;
  }[];
}

/**
 * Model trained on specific dataset
 */
export interface AIModelTraining {
  modelId: string;
  modelName: string;
  datasets: {
    datasetId: string;
    datasetName: string;
    weight?: number; // Importance of this dataset in training
    attribution: boolean;
  }[];
  trainingStarted: number;
  trainingCompleted?: number;
  trainingMetrics?: Record<string, any>;
}
