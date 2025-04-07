/**
 * Types for digital assets managed by the application
 */
import { BlockchainReference } from './blockchain';
export interface AssetMetadata {
    id: string;
    title: string;
    description: string;
    createdAt: number;
    updatedAt: number;
    creator: {
        name: string;
        id?: string;
    };
    editions: number;
    editionNumber?: number;
    signatures: {
        creator: string;
        timestamp: string;
    };
    blockchain?: BlockchainReference;
    aiGeneration?: {
        prompt: string;
        negativePrompt?: string;
        seed?: number;
        model?: string;
        modelProvider?: string;
        width?: number;
        height?: number;
    };
}
export interface Asset {
    metadata: AssetMetadata;
    content: ArrayBuffer;
}
export interface AssetPreview {
    id: string;
    title: string;
    description: string;
    preview?: string;
    createdAt: number;
    isOnBlockchain: boolean;
}
export interface AiGenerationParams {
    prompt: string;
    negativePrompt?: string;
    width?: number;
    height?: number;
    seed?: number;
    extraParameters?: Record<string, any>;
    numberOfImages?: number;
}
export interface AiGenerationResult {
    url: string;
    width: number;
    height: number;
    prompt?: string;
    seed?: number;
    modelProvider?: string;
    model?: string;
    generationParams?: Record<string, any>;
    generatedAt?: number;
}
