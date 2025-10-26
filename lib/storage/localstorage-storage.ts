/**
 * localStorage Storage Operations
 * Implements file storage and retrieval methods for localStorage with base64 encoding
 */

import {
  LocalStorageFile,
  LocalStorageUsage,
  StoredFileInfo,
  StoredFileMetadata,
  StorageError,
  StorageErrorType,
  StorageUsage
} from './types';

export class LocalStorageStorage {
  private readonly keyPrefix = 'portfolio_file_';
  private readonly usageKey = 'portfolio_storage_usage';
  private readonly metadataKey = 'portfolio_metadata_';
  private initialized = false;

  // Storage limits for localStorage (typically 5-10MB)
  private readonly maxStorageSize = 5 * 1024 * 1024; // 5MB default
  private readonly quotaWarningThreshold = 0.8; // 80%
  private readonly quotaErrorThreshold = 0.95; // 95%

  /**
   * Initialize the localStorage storage
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Test localStorage availability
      this.testLocalStorageAccess();
      
      // Initialize usage tracking if not exists
      await this.initializeUsageTracking();
      
      this.initialized = true;
    } catch (error) {
      throw error instanceof StorageError ? error : new StorageError(
        StorageErrorType.STORAGE_UNAVAILABLE,
        'Failed to initialize localStorage storage',
        error as Error
      );
    }
  }

  /**
   * Store a file with base64 encoding
   */
  async storeFile(
    fileId: string,
    file: File,
    category: 'video' | 'document',
    processedData?: ArrayBuffer
  ): Promise<LocalStorageFile> {
    this.ensureInitialized();

    try {
      // Use processed data if provided, otherwise convert file to ArrayBuffer
      const data = processedData || await this.fileToArrayBuffer(file);
      
      // Convert ArrayBuffer to base64
      const base64Data = this.arrayBufferToBase64(data);
      
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
      const storedFile: LocalStorageFile = {
        id: fileId,
        name: file.name,
        size: data.byteLength,
        type: file.type,
        category,
        data: base64Data,
        metadata
      };

      // Check storage quota before storing
      await this.checkStorageQuota(base64Data.length);

      // Store in localStorage
      const key = this.keyPrefix + fileId;
      localStorage.setItem(key, JSON.stringify(storedFile));
      
      // Update usage tracking
      await this.updateUsageTracking(base64Data.length, 1);
      
      return storedFile;
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      // Handle quota exceeded errors
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        throw new StorageError(
          StorageErrorType.QUOTA_EXCEEDED,
          'localStorage quota exceeded. Please delete some files to free up space.',
          error
        );
      }
      
      throw new StorageError(
        StorageErrorType.STORAGE_UNAVAILABLE,
        'Failed to store file in localStorage',
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
      const key = this.keyPrefix + fileId;
      const storedData = localStorage.getItem(key);
      
      if (!storedData) {
        return null;
      }

      const storedFile: LocalStorageFile = JSON.parse(storedData);
      
      // Convert base64 back to ArrayBuffer
      const arrayBuffer = this.base64ToArrayBuffer(storedFile.data);
      
      // Validate file integrity
      const calculatedChecksum = await this.calculateChecksum(arrayBuffer);
      if (calculatedChecksum !== storedFile.metadata.checksum) {
        throw new StorageError(
          StorageErrorType.FILE_CORRUPTED,
          `File integrity check failed for file: ${fileId}`
        );
      }

      // Reconstruct File object from stored data
      const file = new File([arrayBuffer], storedFile.name, {
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
      const key = this.keyPrefix + fileId;
      const storedData = localStorage.getItem(key);
      
      if (!storedData) {
        throw new StorageError(
          StorageErrorType.FILE_NOT_FOUND,
          `File not found: ${fileId}`
        );
      }

      const storedFile: LocalStorageFile = JSON.parse(storedData);
      const fileSize = storedFile.data.length;
      
      // Remove from localStorage
      localStorage.removeItem(key);
      
      // Update usage tracking
      await this.updateUsageTracking(-fileSize, -1);
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
      const files: StoredFileInfo[] = [];
      
      // Iterate through localStorage keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        
        if (key && key.startsWith(this.keyPrefix)) {
          try {
            const storedData = localStorage.getItem(key);
            if (storedData) {
              const storedFile: LocalStorageFile = JSON.parse(storedData);
              
              // Filter by category if specified
              if (!category || storedFile.category === category) {
                files.push({
                  id: storedFile.id,
                  name: storedFile.name,
                  size: storedFile.size,
                  type: storedFile.type,
                  category: storedFile.category,
                  storedAt: new Date(storedFile.metadata.storedAt),
                  compressed: storedFile.metadata.compressed
                });
              }
            }
          } catch (error) {
            // Skip corrupted entries
            console.warn(`Skipping corrupted file entry: ${key}`, error);
          }
        }
      }
      
      // Sort by storage date (newest first)
      return files.sort((a, b) => b.storedAt.getTime() - a.storedAt.getTime());
    } catch (error) {
      throw new StorageError(
        StorageErrorType.STORAGE_UNAVAILABLE,
        'Failed to list files from localStorage',
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
      const usage = await this.getCurrentUsage();
      const used = usage.totalSize;
      const available = Math.max(0, this.maxStorageSize - used);
      const percentage = (used / this.maxStorageSize) * 100;

      return {
        used,
        available,
        percentage: Math.min(100, Math.max(0, percentage))
      };
    } catch (error) {
      throw new StorageError(
        StorageErrorType.STORAGE_UNAVAILABLE,
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
      const keysToRemove: string[] = [];
      
      // Collect all file keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.keyPrefix)) {
          keysToRemove.push(key);
        }
      }
      
      // Remove all file entries
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Reset usage tracking
      await this.resetUsageTracking();
    } catch (error) {
      throw new StorageError(
        StorageErrorType.STORAGE_UNAVAILABLE,
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
      const key = this.keyPrefix + fileId;
      const storedData = localStorage.getItem(key);
      
      if (!storedData) {
        return null;
      }

      const storedFile: LocalStorageFile = JSON.parse(storedData);
      
      return {
        id: storedFile.id,
        name: storedFile.name,
        size: storedFile.size,
        type: storedFile.type,
        category: storedFile.category,
        storedAt: new Date(storedFile.metadata.storedAt),
        compressed: storedFile.metadata.compressed
      };
    } catch (error) {
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
      const key = this.keyPrefix + fileId;
      return localStorage.getItem(key) !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Store application metadata
   */
  async storeMetadata(key: string, value: any): Promise<void> {
    this.ensureInitialized();

    try {
      const metadataKey = this.metadataKey + key;
      localStorage.setItem(metadataKey, JSON.stringify(value));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        throw new StorageError(
          StorageErrorType.QUOTA_EXCEEDED,
          'localStorage quota exceeded while storing metadata',
          error
        );
      }
      
      throw new StorageError(
        StorageErrorType.STORAGE_UNAVAILABLE,
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
      const metadataKey = this.metadataKey + key;
      const data = localStorage.getItem(metadataKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      throw new StorageError(
        StorageErrorType.STORAGE_UNAVAILABLE,
        `Failed to retrieve metadata: ${key}`,
        error as Error
      );
    }
  }

  /**
   * Check if storage is ready for operations
   */
  isReady(): boolean {
    return this.initialized;
  }

  /**
   * Close the storage (no-op for localStorage)
   */
  close(): void {
    this.initialized = false;
  }

  /**
   * Get estimated storage capacity
   */
  getStorageCapacity(): number {
    return this.maxStorageSize;
  }

  /**
   * Test localStorage access
   */
  private testLocalStorageAccess(): void {
    if (!window.localStorage) {
      throw new StorageError(
        StorageErrorType.STORAGE_UNAVAILABLE,
        'localStorage is not available'
      );
    }

    try {
      const testKey = '__test_access__';
      const testValue = 'test';
      localStorage.setItem(testKey, testValue);
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);

      if (retrieved !== testValue) {
        throw new Error('localStorage read/write test failed');
      }
    } catch (error) {
      throw new StorageError(
        StorageErrorType.STORAGE_UNAVAILABLE,
        'localStorage access test failed',
        error as Error
      );
    }
  }

  /**
   * Initialize usage tracking
   */
  private async initializeUsageTracking(): Promise<void> {
    const existingUsage = localStorage.getItem(this.usageKey);
    
    if (!existingUsage) {
      const initialUsage: LocalStorageUsage = {
        totalSize: 0,
        fileCount: 0,
        lastUpdated: new Date()
      };
      
      localStorage.setItem(this.usageKey, JSON.stringify(initialUsage));
    }
  }

  /**
   * Update usage tracking
   */
  private async updateUsageTracking(sizeChange: number, countChange: number): Promise<void> {
    try {
      const currentUsage = await this.getCurrentUsage();
      
      const updatedUsage: LocalStorageUsage = {
        totalSize: Math.max(0, currentUsage.totalSize + sizeChange),
        fileCount: Math.max(0, currentUsage.fileCount + countChange),
        lastUpdated: new Date()
      };
      
      localStorage.setItem(this.usageKey, JSON.stringify(updatedUsage));
    } catch (error) {
      // If usage tracking fails, continue without it
      console.warn('Failed to update usage tracking:', error);
    }
  }

  /**
   * Reset usage tracking
   */
  private async resetUsageTracking(): Promise<void> {
    const resetUsage: LocalStorageUsage = {
      totalSize: 0,
      fileCount: 0,
      lastUpdated: new Date()
    };
    
    localStorage.setItem(this.usageKey, JSON.stringify(resetUsage));
  }

  /**
   * Get current usage statistics
   */
  private async getCurrentUsage(): Promise<LocalStorageUsage> {
    try {
      const usageData = localStorage.getItem(this.usageKey);
      
      if (usageData) {
        const usage: LocalStorageUsage = JSON.parse(usageData);
        return {
          ...usage,
          lastUpdated: new Date(usage.lastUpdated)
        };
      }
    } catch (error) {
      console.warn('Failed to parse usage data, recalculating:', error);
    }
    
    // Fallback: calculate usage from actual stored files
    return await this.recalculateUsage();
  }

  /**
   * Recalculate usage from stored files
   */
  private async recalculateUsage(): Promise<LocalStorageUsage> {
    let totalSize = 0;
    let fileCount = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      if (key && key.startsWith(this.keyPrefix)) {
        try {
          const storedData = localStorage.getItem(key);
          if (storedData) {
            totalSize += storedData.length;
            fileCount++;
          }
        } catch (error) {
          // Skip corrupted entries
          console.warn(`Skipping corrupted entry during usage calculation: ${key}`);
        }
      }
    }
    
    const usage: LocalStorageUsage = {
      totalSize,
      fileCount,
      lastUpdated: new Date()
    };
    
    // Update stored usage
    try {
      localStorage.setItem(this.usageKey, JSON.stringify(usage));
    } catch (error) {
      // Continue without updating if storage is full
      console.warn('Could not update usage tracking:', error);
    }
    
    return usage;
  }

  /**
   * Check storage quota before storing new data
   */
  private async checkStorageQuota(newDataSize: number): Promise<void> {
    const currentUsage = await this.getCurrentUsage();
    const projectedSize = currentUsage.totalSize + newDataSize;
    const projectedPercentage = projectedSize / this.maxStorageSize;
    
    if (projectedPercentage > this.quotaErrorThreshold) {
      throw new StorageError(
        StorageErrorType.QUOTA_EXCEEDED,
        `Storage quota would be exceeded. Current: ${currentUsage.totalSize} bytes, New: ${newDataSize} bytes, Limit: ${this.maxStorageSize} bytes`
      );
    }
    
    if (projectedPercentage > this.quotaWarningThreshold) {
      console.warn(`Storage quota warning: ${Math.round(projectedPercentage * 100)}% used`);
    }
  }

  /**
   * Ensure storage is initialized before operations
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new StorageError(
        StorageErrorType.STORAGE_UNAVAILABLE,
        'localStorage storage is not initialized. Call initialize() first.'
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
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    
    return btoa(binary);
  }

  /**
   * Convert base64 string to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    return bytes.buffer;
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