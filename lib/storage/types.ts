/**
 * Core type definitions for the file storage system
 * Supports both IndexedDB and localStorage storage mechanisms
 */

// File storage interfaces
export interface StoredFile {
  id: string;              // Primary key/unique identifier
  name: string;           // Original filename
  size: number;           // File size in bytes
  type: string;           // MIME type
  category: 'video' | 'document';
  data: ArrayBuffer;      // File data for IndexedDB
  metadata: StoredFileMetadata;
}

export interface StoredFileMetadata {
  originalSize: number;   // Original file size before compression
  compressed: boolean;    // Whether the file was compressed
  storedAt: Date;        // When the file was stored
  checksum: string;      // For integrity validation
}

// localStorage fallback interface
export interface LocalStorageFile {
  id: string;
  name: string;
  size: number;
  type: string;
  category: 'video' | 'document';
  data: string;          // Base64 encoded file data
  metadata: StoredFileMetadata;
}

// Storage usage tracking
export interface StorageUsage {
  used: number;          // Bytes used
  available: number;     // Bytes available
  percentage: number;    // Usage percentage (0-100)
}

export interface LocalStorageUsage {
  totalSize: number;     // Total size in bytes
  fileCount: number;     // Number of stored files
  lastUpdated: Date;     // Last update timestamp
}

// Storage metadata for general key-value storage
export interface StorageMetadata {
  key: string;           // Primary key
  value: any;           // Metadata value
}

// File storage context interface
export interface FileStorageContextType {
  // File management operations
  storeFile: (file: File, category: 'video' | 'document') => Promise<string>;
  retrieveFile: (fileId: string) => Promise<File | null>;
  deleteFile: (fileId: string) => Promise<void>;
  listFiles: (category?: 'video' | 'document') => Promise<StoredFileInfo[]>;
  
  // Storage management
  getStorageUsage: () => Promise<StorageUsage>;
  clearAllFiles: () => Promise<void>;
  
  // State management
  isLoading: boolean;
  error: string | null;
}

// Simplified file info for listing
export interface StoredFileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  category: 'video' | 'document';
  storedAt: Date;
  compressed: boolean;
}

// Error types for storage operations
export enum StorageErrorType {
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  INDEXEDDB_UNAVAILABLE = 'INDEXEDDB_UNAVAILABLE',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_CORRUPTED = 'FILE_CORRUPTED',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  STORAGE_UNAVAILABLE = 'STORAGE_UNAVAILABLE',
  COMPRESSION_FAILED = 'COMPRESSION_FAILED',
  VALIDATION_FAILED = 'VALIDATION_FAILED'
}

export class StorageError extends Error {
  constructor(
    public type: StorageErrorType,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

// Storage configuration
export interface StorageConfig {
  // Database configuration
  dbName: string;
  dbVersion: number;
  
  // Storage limits
  maxFileSize: {
    video: number;        // Max video file size in bytes
    document: number;     // Max document file size in bytes
  };
  
  // Compression settings
  compression: {
    enabled: boolean;
    quality: number;      // 0-1 for image compression quality
    maxWidth: number;     // Max width for image compression
    maxHeight: number;    // Max height for image compression
  };
  
  // Storage quotas
  quotaWarningThreshold: number;  // Percentage (0-100) to show warning
  quotaErrorThreshold: number;    // Percentage (0-100) to prevent new uploads
}

// Storage method enumeration
export enum StorageMethod {
  INDEXEDDB = 'indexeddb',
  LOCALSTORAGE = 'localstorage',
  NONE = 'none'
}

// Storage capability detection result
export interface StorageCapability {
  method: StorageMethod;
  available: boolean;
  estimatedQuota?: number;  // Estimated available storage in bytes
  error?: string;          // Error message if unavailable
}

// File processing result
export interface FileProcessingResult {
  processedFile: ArrayBuffer | string;  // Processed file data
  metadata: StoredFileMetadata;
  compressed: boolean;
  originalSize: number;
  finalSize: number;
}