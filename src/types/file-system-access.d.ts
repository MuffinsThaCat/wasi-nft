// Type definitions for the File System Access API

interface FileSystemHandle {
  readonly kind: 'file' | 'directory';
  readonly name: string;
}

interface FileSystemFileHandle extends FileSystemHandle {
  readonly kind: 'file';
  getFile(): Promise<File>;
  createWritable(options?: FileSystemCreateWritableOptions): Promise<FileSystemWritableFileStream>;
}

interface FileSystemCreateWritableOptions {
  keepExistingData?: boolean;
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
  readonly kind: 'directory';
  getDirectoryHandle(name: string, options?: FileSystemGetDirectoryOptions): Promise<FileSystemDirectoryHandle>;
  getFileHandle(name: string, options?: FileSystemGetFileOptions): Promise<FileSystemFileHandle>;
  removeEntry(name: string, options?: FileSystemRemoveOptions): Promise<void>;
  resolve(possibleDescendant: FileSystemHandle): Promise<string[] | null>;
  entries(): AsyncIterable<[string, FileSystemHandle]>;
}

interface FileSystemGetDirectoryOptions {
  create?: boolean;
}

interface FileSystemGetFileOptions {
  create?: boolean;
}

interface FileSystemRemoveOptions {
  recursive?: boolean;
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: FileSystemWriteChunkType): Promise<void>;
  seek(position: number): Promise<void>;
  truncate(size: number): Promise<void>;
}

type FileSystemWriteChunkType = 
  | BufferSource
  | Blob
  | string
  | { type: 'write'; position?: number; data: BufferSource | Blob | string }
  | { type: 'seek'; position: number }
  | { type: 'truncate'; size: number };

interface Window {
  showDirectoryPicker(options?: { id?: string; mode?: 'read' | 'readwrite'; startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos' }): Promise<FileSystemDirectoryHandle>;
  showOpenFilePicker(options?: { multiple?: boolean; excludeAcceptAllOption?: boolean; types?: { description?: string; accept: Record<string, string[]> }[] }): Promise<FileSystemFileHandle[]>;
  showSaveFilePicker(options?: { excludeAcceptAllOption?: boolean; suggestedName?: string; types?: { description?: string; accept: Record<string, string[]> }[] }): Promise<FileSystemFileHandle>;
}
