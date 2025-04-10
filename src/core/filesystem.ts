/**
 * Filesystem interface for digital assets management
 * Adapts the WASI-fs-access functionality for our application
 */

// Types for our filesystem interface
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

export class BrowserFileSystem implements FileSystemInterface {
  rootDirectory: DirectoryHandle | null = null;

  /**
   * Prompt user to select a directory for storing digital assets
   */
  async selectDirectory(): Promise<DirectoryHandle | null> {
    try {
      console.log('Select directory method called');
      
      // Check if the File System Access API is available
      if (!('showDirectoryPicker' in window)) {
        console.error('File System Access API is not available in this browser');
        alert('Your browser does not support the File System Access API. Please use Chrome, Edge, or another Chromium-based browser.');
        throw new Error('File System Access API is not supported in this browser');
      }

      console.log('File System Access API is available');
      console.log('Window object state:', {
        hasShowDirectoryPicker: 'showDirectoryPicker' in window,
        windowObject: typeof window,
        documentSecure: window.isSecureContext,
      });
      
      console.log('Attempting to show directory picker dialog...');
      alert('You will now be prompted to select a directory for storing your digital assets. Please select a directory with write permissions.');
      
      // Ask user to select a directory - with more basic options to avoid compatibility issues
      // Some browsers might not support all options
      let directoryHandle;
      try {
        console.log('Calling showDirectoryPicker...');
        try {
          // Most basic version of directory picker to maximize compatibility
          directoryHandle = await window.showDirectoryPicker();
          console.log('Directory selected successfully:', directoryHandle);
        } catch (dirPickerError) {
          console.error('Error in showDirectoryPicker:', dirPickerError);
          alert(`Error selecting directory: ${dirPickerError.message}`);
          throw dirPickerError;
        }
        
        // Verify we can access files by requesting permission explicitly
        try {
          // Explicitly request permissions
          const permissionStatus = await (directoryHandle as any).requestPermission?.({ mode: 'readwrite' }) || 'granted';
          console.log('Permission status:', permissionStatus);
          
          if (permissionStatus !== 'granted') {
            alert('Read/write permission was denied for the selected directory. Please grant permission to continue.');
            throw new Error('Permission not granted for file access');
          }
        } catch (permissionError) {
          console.error('Error requesting permission:', permissionError);
          alert('Unable to get permissions for the selected directory: ' + permissionError);
          throw new Error('Failed to get directory permissions: ' + permissionError);
        }
      } catch (pickerError) {
        console.error('Error in showDirectoryPicker:', pickerError);
        alert('Error selecting directory: ' + pickerError);
        throw new Error('Failed to select directory: ' + pickerError);
      }

      console.log('Directory picker succeeded:', directoryHandle);

      // Create directory structure for assets and metadata if needed
      try {
        const assetsDir = await directoryHandle.getDirectoryHandle('assets', { create: true });
        const metadataDir = await directoryHandle.getDirectoryHandle('metadata', { create: true });
        console.log('Created assets and metadata directories:', { assetsDir, metadataDir });
      } catch (dirError) {
        console.error('Error creating subdirectories:', dirError);
        // Continue anyway - we'll handle these on demand
      }

      this.rootDirectory = {
        name: directoryHandle.name,
        path: directoryHandle.name,
        handle: directoryHandle
      };

      console.log('Root directory set:', this.rootDirectory);
      alert('Directory selected successfully: ' + directoryHandle.name);
      return this.rootDirectory;
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error selecting directory: ${error.name} - ${error.message}`);
        console.error('Error stack:', error.stack);
      } else {
        console.error('Unknown error selecting directory:', error);
      }
      return null;
    }
  }

  /**
   * Ensure we have a root directory selected
   */
  private ensureRootDirectory(): void {
    if (!this.rootDirectory) {
      throw new Error('No root directory selected. Please select a directory first.');
    }
  }

  /**
   * Create a directory at the specified path
   */
  async createDirectory(path: string): Promise<FileSystemDirectoryHandle> {
    this.ensureRootDirectory();
    
    const pathParts = path.split('/').filter(part => part.length > 0);
    let currentDir = this.rootDirectory!.handle;
    
    for (const part of pathParts) {
      currentDir = await currentDir.getDirectoryHandle(part, { create: true });
    }
    
    return currentDir;
  }

  /**
   * Write file content to the specified path
   */
  async writeFile(path: string, content: Blob | ArrayBuffer): Promise<void> {
    this.ensureRootDirectory();
    
    const lastSlashIndex = path.lastIndexOf('/');
    const dirPath = lastSlashIndex > 0 ? path.substring(0, lastSlashIndex) : '';
    const fileName = lastSlashIndex > 0 ? path.substring(lastSlashIndex + 1) : path;
    
    // Create directory if it doesn't exist
    const dirHandle = dirPath.length > 0 
      ? await this.createDirectory(dirPath) 
      : this.rootDirectory!.handle;
    
    // Create or overwrite the file
    const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    
    await writable.write(content);
    await writable.close();
  }

  /**
   * Read file content from the specified path
   */
  async readFile(path: string): Promise<ArrayBuffer> {
    this.ensureRootDirectory();
    
    const lastSlashIndex = path.lastIndexOf('/');
    const dirPath = lastSlashIndex > 0 ? path.substring(0, lastSlashIndex) : '';
    const fileName = lastSlashIndex > 0 ? path.substring(lastSlashIndex + 1) : path;
    
    let dirHandle: FileSystemDirectoryHandle;
    
    try {
      if (dirPath.length > 0) {
        // Navigate to the directory
        const pathParts = dirPath.split('/').filter(part => part.length > 0);
        dirHandle = this.rootDirectory!.handle;
        
        for (const part of pathParts) {
          dirHandle = await dirHandle.getDirectoryHandle(part);
        }
      } else {
        dirHandle = this.rootDirectory!.handle;
      }
      
      // Get the file
      const fileHandle = await dirHandle.getFileHandle(fileName);
      const file = await fileHandle.getFile();
      
      return await file.arrayBuffer();
    } catch (error) {
      console.error(`Error reading file at ${path}:`, error);
      throw new Error(`Cannot access image file at ${path}. Browser may have revoked permissions. Please select the directory again.`);
    }
  }

  /**
   * List all files in the specified directory
   */
  async listFiles(path: string): Promise<string[]> {
    this.ensureRootDirectory();
    
    let dirHandle: FileSystemDirectoryHandle;
    
    if (path && path !== '/') {
      // Navigate to the directory
      const pathParts = path.split('/').filter(part => part.length > 0);
      dirHandle = this.rootDirectory!.handle;
      
      for (const part of pathParts) {
        dirHandle = await dirHandle.getDirectoryHandle(part);
      }
    } else {
      dirHandle = this.rootDirectory!.handle;
    }
    
    // List all entries
    const entries: string[] = [];
    for await (const [name, entry] of dirHandle.entries()) {
      if (entry.kind === 'file') {
        entries.push(name);
      }
    }
    
    return entries;
  }

  /**
   * Check if a file exists at the specified path
   */
  async fileExists(path: string): Promise<boolean> {
    try {
      this.ensureRootDirectory();
      
      const lastSlashIndex = path.lastIndexOf('/');
      const dirPath = lastSlashIndex > 0 ? path.substring(0, lastSlashIndex) : '';
      const fileName = lastSlashIndex > 0 ? path.substring(lastSlashIndex + 1) : path;
      
      let dirHandle: FileSystemDirectoryHandle;
      
      if (dirPath.length > 0) {
        // Navigate to the directory
        const pathParts = dirPath.split('/').filter(part => part.length > 0);
        dirHandle = this.rootDirectory!.handle;
        
        for (const part of pathParts) {
          dirHandle = await dirHandle.getDirectoryHandle(part);
        }
      } else {
        dirHandle = this.rootDirectory!.handle;
      }
      
      // Try to get the file
      await dirHandle.getFileHandle(fileName);
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Initialize the filesystem interface
 */
export async function initializeFileSystem(): Promise<FileSystemInterface> {
  return new BrowserFileSystem();
}
