/**
 * Utility helper functions
 */
/**
 * Generate a random alphanumeric string of specified length
 */
export declare function generateRandomString(length: number): string;
/**
 * Format a timestamp as a readable date string
 */
export declare function formatTimestamp(timestamp: number): string;
/**
 * Truncate a string to a maximum length, adding ellipsis if truncated
 */
export declare function truncateString(str: string, maxLength: number): string;
/**
 * Safely parse JSON without throwing exceptions
 */
export declare function safeJsonParse(jsonString: string, fallback?: any): any;
/**
 * Convert a Uint8Array to a hexadecimal string
 */
export declare function uint8ArrayToHex(arr: Uint8Array): string;
/**
 * Convert a hexadecimal string to a Uint8Array
 */
export declare function hexToUint8Array(hex: string): Uint8Array;
/**
 * Delay execution for a specified number of milliseconds
 */
export declare function delay(ms: number): Promise<void>;
/**
 * Debounce a function call
 */
export declare function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void;
/**
 * Get file extension from filename
 */
export declare function getFileExtension(filename: string): string;
/**
 * Get mime type from file extension
 */
export declare function getMimeTypeFromExtension(extension: string): string;
