/**
 * IndexedDB Storage Operations
 * Implements file storage and retrieval methods for IndexedDB
 */

import { IndexedDBWrapper } from './indexeddb-wrapper';
import {
  StoredFile,
  StoredFileMetadata,
  StoredFileInfo,
  StorageError,
  StorageErrorType,
  StorageUsage
} from './types';

export class IndexedDBStorage {
  private wrapper: IndexedDBWrapper;
  private initialized = false;

  constructor(dbName?: string, dbVersion?: number) {
    this.wrapper = new IndexedDBWrapper(dbName, dbVersion);
  }

  /**
   * Initialize the IndexedDB storage
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await this.wrapper.initialize();
      this.initialized = true;
    } catch (error) {
      throw error instanceof StorageError ? error : new StorageError(
        StorageErrorType.INDEXEDDB_UNAVAILABLE,
        'Failed to initialize IndexedDB storage',
        error as Error
      );
    }
  }

  /**
   * Store a file with metadata handling
   */
  async storeFile(
    fileId: string,
    file: File,
    category: 'video' | 'document',
    processedData?: ArrayBuffer
  ): Promise<StoredFile> {
    this.ensureInitialized();

    try {
      // Use processed data if provided, otherwise convert file to ArrayBuffer
      const data = processedData || await this.fileToArrayBuffer(file);

      // Calculate checksum for integrity validation
      const checksum = await this.calculateChecksum(data);

      // Create metadata
      const metadata: StoredFileMetadata = {
        originalSize: file.size,
        compressed: processedData ? data.byteLength < file.size : false,
        storedAt: new Date(),
        checksum
      };

      // Create stored file object
      const storedFile: StoredFile = {
        id: fileId,
        name: file.name,
        size: data.byteLength,
        type: file.type,
        category,
        data,
        metadata
      };

      // Store in IndexedDB
      await this.wrapper.storeFile(storedFile);

      return storedFile;
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }

      // Handle quota exceeded errors
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        throw new StorageError(
          StorageErrorType.QUOTA_EXCEEDED,
          'Storage quota exceeded. Please delete some files to free up space.',
          error
        );
      }

      throw new StorageError(
        StorageErrorType.INDEXEDDB_UNAVAILABLE,
        'Failed to store file in IndexedDB',
        error as Error
      );
    }
  }

  /**
   * Retrieve a file and reconstruct File object
   */
  async retrieveFile(fileId: string): Promise<File | null> {
    this.ensureInitialized();

    try {
      const storedFile = await this.wrapper.retrieveFile(fileId);

      if (!storedFile) {
        return null;
      }

      // Validate file integrity
      const calculatedChecksum = await this.calculateChecksum(storedFile.data);
      if (calculatedChecksum !== storedFile.metadata.checksum) {
        throw new StorageError(
          StorageErrorType.FILE_CORRUPTED,
          `File integrity check failed for file: ${fileId}`
        );
      }

      // Reconstruct File object from stored data
      const file = new File([storedFile.data], storedFile.name, {
        type: storedFile.type,
        lastModified: storedFile.metadata.storedAt.getTime()
      });

      return file;
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }

      throw new StorageError(
        StorageErrorType.FILE_NOT_FOUND,
        `Failed to retrieve file: ${fileId}`,
        error as Error
      );
    }
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(fileId: string): Promise<void> {
    this.ensureInitialized();

    try {
      await this.wrapper.deleteFile(fileId);
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }

      throw new StorageError(
        StorageErrorType.FILE_NOT_FOUND,
        `Failed to delete file: ${fileId}`,
        error as Error
      );
    }
  }

  /**
   * List files with optional category filter
   */
  async listFiles(category?: 'video' | 'document'): Promise<StoredFileInfo[]> {
    this.ensureInitialized();

    try {
      return await this.wrapper.listFiles(category);
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }

      throw new StorageError(
        StorageErrorType.INDEXEDDB_UNAVAILABLE,
        'Failed to list files from IndexedDB',
        error as Error
      );
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageUsage(): Promise<StorageUsage> {
    this.ensureInitialized();

    try {
      const { used, fileCount } = await this.wrapper.getStorageUsage();

      // Estimate available storage (this is approximate)
      let available = 0;
      let percentage = 0;

      if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
          const estimate = await navigator.storage.estimate();
          if (estimate.quota && estimate.usage !== undefined) {
            available = estimate.quota - estimate.usage;
            percentage = (estimate.usage / estimate.quota) * 100;
          }
        } catch {
          // Fallback to basic calculation
          available = Math.max(0, 50 * 1024 * 1024 - used); // Assume 50MB quota
          percentage = (used / (50 * 1024 * 1024)) * 100;
        }
      } else {
        // Fallback for browsers without storage estimation
        available = Math.max(0, 50 * 1024 * 1024 - used); // Assume 50MB quota
        percentage = (used / (50 * 1024 * 1024)) * 100;
      }

      return {
        used,
        available,
        percentage: Math.min(100, Math.max(0, percentage))
      };
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }

      throw new StorageError(
        StorageErrorType.INDEXEDDB_UNAVAILABLE,
        'Failed to calculate storage usage',
        error as Error
      );
    }
  }

  /**
   * Clear all files from storage
   */
  async clearAllFiles(): Promise<void> {
    this.ensureInitialized();

    try {
      await this.wrapper.clearAllFiles();
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }

      throw new StorageError(
        StorageErrorType.INDEXEDDB_UNAVAILABLE,
        'Failed to clear all files',
        error as Error
      );
    }
  }

  /**
   * Get file metadata without retrieving the full file
   */
  async getFileMetadata(fileId: string): Promise<StoredFileInfo | null> {
    this.ensureInitialized();

    try {
      const storedFile = await this.wrapper.retrieveFile(fileId);

      if (!storedFile) {
        return null;
      }

      return {
        id: storedFile.id,
        name: storedFile.name,
        size: storedFile.size,
        type: storedFile.type,
        category: storedFile.category,
        storedAt: storedFile.metadata.storedAt,
        compressed: storedFile.metadata.compressed
      };
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }

      throw new StorageError(
        StorageErrorType.FILE_NOT_FOUND,
        `Failed to get metadata for file: ${fileId}`,
        error as Error
      );
    }
  }

  /**
   * Check if a file exists in storage
   */
  async fileExists(fileId: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      const storedFile = await this.wrapper.retrieveFile(fileId);
      return storedFile !== null;
    } catch (error) {
      // If there's an error retrieving, assume file doesn't exist
      return false;
    }
  }

  /**
   * Store application metadata
   */
  async storeMetadata(key: string, value: any): Promise<void> {
    this.ensureInitialized();

    try {
      await this.wrapper.storeMetadata(key, value);
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }

      throw new StorageError(
        StorageErrorType.INDEXEDDB_UNAVAILABLE,
        `Failed to store metadata: ${key}`,
        error as Error
      );
    }
  }

  /**
   * Retrieve application metadata
   */
  async retrieveMetadata(key: string): Promise<any | null> {
    this.ensureInitialized();

    try {
      return await this.wrapper.retrieveMetadata(key);
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }

      throw new StorageError(
        StorageErrorType.INDEXEDDB_UNAVAILABLE,
        `Failed to retrieve metadata: ${key}`,
        error as Error
      );
    }
  }

  /**
   * Get database information
   */
  getDatabaseInfo(): { name: string; version: number; isReady: boolean } {
    return this.wrapper.getDatabaseInfo();
  }

  /**
   * Check if storage is ready for operations
   */
  isReady(): boolean {
    return this.initialized && this.wrapper.isReady();
  }

  /**
   * Close the storage connection
   */
  close(): void {
    this.wrapper.close();
    this.initialized = false;
  }

  /**
   * Ensure storage is initialized before operations
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new StorageError(
        StorageErrorType.INDEXEDDB_UNAVAILABLE,
        'IndexedDB storage is not initialized. Call initialize() first.'
      );
    }
  }

  /**
   * Convert File to ArrayBuffer
   */
  private async fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert file to ArrayBuffer'));
        }
      };

      reader.onerror = () => {
        reject(new Error('FileReader error: ' + reader.error?.message));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Calculate checksum for file integrity validation
   */
  private async calculateChecksum(data: ArrayBuffer): Promise<string> {
    if (!window.crypto || !window.crypto.subtle) {
      // Fallback to simple hash for older browsers
      return this.simpleHash(data);
    }

    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      return this.simpleHash(data);
    }
  }

  /**
   * Simple hash fallback for browsers without crypto.subtle
   */
  private simpleHash(data: ArrayBuffer): string {
    const view = new Uint8Array(data);
    let hash = 0;

    for (let i = 0; i < view.length; i++) {
      const char = view[i];
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(16);
  }
}