/**
 * Filesystem interface for digital assets management
 * Adapts the WASI-fs-access functionality for our application
 */
export interface DirectoryHandle {
    name: string;
    path: string;
    handle: FileSystemDirectoryHandle;
}
export interface FileSystemInterface {
    rootDirectory: DirectoryHandle | null;
    selectDirectory(): Promise<DirectoryHandle | null>;
    createDirectory(path: string): Promise<FileSystemDirectoryHandle>;
    writeFile(path: string, content: Blob | ArrayBuffer): Promise<void>;
    readFile(path: string): Promise<ArrayBuffer>;
    listFiles(path: string): Promise<string[]>;
    fileExists(path: string): Promise<boolean>;
}
export declare class BrowserFileSystem implements FileSystemInterface {
    rootDirectory: DirectoryHandle | null;
    /**
     * Prompt user to select a directory for storing digital assets
     */
    selectDirectory(): Promise<DirectoryHandle | null>;
    /**
     * Ensure we have a root directory selected
     */
    private ensureRootDirectory;
    /**
     * Create a directory at the specified path
     */
    createDirectory(path: string): Promise<FileSystemDirectoryHandle>;
    /**
     * Write file content to the specified path
     */
    writeFile(path: string, content: Blob | ArrayBuffer): Promise<void>;
    /**
     * Read file content from the specified path
     */
    readFile(path: string): Promise<ArrayBuffer>;
    /**
     * List all files in the specified directory
     */
    listFiles(path: string): Promise<string[]>;
    /**
     * Check if a file exists at the specified path
     */
    fileExists(path: string): Promise<boolean>;
}
/**
 * Initialize the filesystem interface
 */
export declare function initializeFileSystem(): Promise<FileSystemInterface>;
