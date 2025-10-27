/**
 * FileStorageService - Core service for managing file storage
 * Handles IndexedDB and localStorage with automatic fallback
 */

import {
  StorageConfig,
  StorageMethod,
  StorageCapability,
  StorageError,
  StorageErrorType,
  StoredFile,
  LocalStorageFile,
  StorageUsage,
  FileProcessingResult,
  StoredFileInfo
} from './types';
import { IndexedDBStorage } from './indexeddb-storage';
import { LocalStorageStorage } from './localstorage-storage';
import { MemoryStorage } from './memory-storage';

export class FileStorageService {
  private config: StorageConfig;
  private currentMethod: StorageMethod = StorageMethod.NONE;
  private indexedDBStorage: IndexedDBStorage | null = null;
  private localStorageStorage: LocalStorageStorage | null = null;
  private memoryStorage: MemoryStorage | null = null;
  private initialized = false;
  private fallbackNotified = false;

  constructor(config?: Partial<StorageConfig>) {
    this.config = {
      dbName: 'PortfolioFileStorage',
      dbVersion: 1,
      maxFileSize: {
        video: 150 * 1024 * 1024, // 150MB
        document: 10 * 1024 * 1024 // 10MB
      },
      compression: {
        enabled: true,
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1080
      },
      quotaWarningThreshold: 80,
      quotaErrorThreshold: 95,
      ...config
    };
  }

  /**
   * Initialize the storage system with capability detection
   */
  async initializeStorage(): Promise<StorageCapability> {
    if (this.initialized) {
      return {
        method: this.currentMethod,
        available: this.currentMethod !== StorageMethod.NONE
      };
    }

    try {
      // First try IndexedDB
      const indexedDBCapability = await this.detectIndexedDBSupport();
      if (indexedDBCapability.available) {
        try {
          this.indexedDBStorage = new IndexedDBStorage(this.config.dbName, this.config.dbVersion);
          await this.indexedDBStorage.initialize();
          this.currentMethod = StorageMethod.INDEXEDDB;
          this.initialized = true;
          return indexedDBCapability;
        } catch (error) {
          console.warn('IndexedDB initialization failed, falling back to localStorage:', error);
          // Continue to localStorage fallback
        }
      }

      // Fallback to localStorage
      const localStorageCapability = this.detectLocalStorageSupport();
      if (localStorageCapability.available) {
        try {
          this.localStorageStorage = new LocalStorageStorage();
          await this.localStorageStorage.initialize();
          this.currentMethod = StorageMethod.LOCALSTORAGE;
          this.initialized = true;
          
          // Notify user about fallback if not already notified
          this.notifyFallbackUsage();
          
          return localStorageCapability;
        } catch (error) {
          console.error('localStorage initialization failed:', error);
        }
      }

      // Final fallback to memory storage (session-only)
      console.warn('All persistent storage methods failed, using memory storage (session-only)');
      try {
        this.memoryStorage = new MemoryStorage();
        await this.memoryStorage.initialize();
        this.currentMethod = StorageMethod.NONE; // Keep as NONE to indicate non-persistent
        this.initialized = true;
        
        return {
          method: StorageMethod.NONE,
          available: true, // Available but not persistent
          error: 'Using memory storage - files will not persist across sessions'
        };
      } catch (error) {
        console.error('Even memory storage failed:', error);
        this.currentMethod = StorageMethod.NONE;
        throw new StorageError(
          StorageErrorType.STORAGE_UNAVAILABLE,
          'No storage mechanism available, including memory fallback'
        );
      }

    } catch (error) {
      this.currentMethod = StorageMethod.NONE;
      throw error instanceof StorageError ? error : new StorageError(
        StorageErrorType.STORAGE_UNAVAILABLE,
        'Failed to initialize storage',
        error as Error
      );
    }
  }

  /**
   * Detect IndexedDB support and estimate quota
   */
  private async detectIndexedDBSupport(): Promise<StorageCapability> {
    if (!window.indexedDB) {
      return {
        method: StorageMethod.INDEXEDDB,
        available: false,
        error: 'IndexedDB not supported'
      };
    }

    try {
      // Test IndexedDB by opening a temporary database
      const testDB = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('__test__', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = () => {
          // Create a test object store
          request.result.createObjectStore('test');
        };
      });

      testDB.close();
      indexedDB.deleteDatabase('__test__');

      // Estimate storage quota if available
      let estimatedQuota: number | undefined;
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
          const estimate = await navigator.storage.estimate();
          estimatedQuota = estimate.quota;
        } catch {
          // Quota estimation failed, continue without it
        }
      }

      return {
        method: StorageMethod.INDEXEDDB,
        available: true,
        estimatedQuota
      };

    } catch (error) {
      return {
        method: StorageMethod.INDEXEDDB,
        available: false,
        error: `IndexedDB test failed: ${error}`
      };
    }
  }

  /**
   * Detect localStorage support and estimate available space
   */
  private detectLocalStorageSupport(): StorageCapability {
    if (!window.localStorage) {
      return {
        method: StorageMethod.LOCALSTORAGE,
        available: false,
        error: 'localStorage not supported'
      };
    }

    try {
      // Test localStorage by writing and reading a test value
      const testKey = '__storage_test__';
      const testValue = 'test';
      localStorage.setItem(testKey, testValue);
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);

      if (retrieved !== testValue) {
        throw new Error('localStorage read/write test failed');
      }

      // Estimate available space (rough approximation)
      let estimatedQuota: number | undefined;
      try {
        // Try to estimate localStorage quota (typically 5-10MB)
        const testData = 'x'.repeat(1024); // 1KB
        let size = 0;
        const testKeyPrefix = '__quota_test__';
        
        try {
          for (let i = 0; i < 10240; i++) { // Test up to ~10MB
            localStorage.setItem(`${testKeyPrefix}${i}`, testData);
            size += 1024;
          }
        } catch {
          // Quota exceeded, clean up test data
          for (let i = 0; i < 10240; i++) {
            localStorage.removeItem(`${testKeyPrefix}${i}`);
          }
        }
        
        estimatedQuota = size > 0 ? size : 5 * 1024 * 1024; // Default to 5MB
      } catch {
        estimatedQuota = 5 * 1024 * 1024; // Default to 5MB
      }

      return {
        method: StorageMethod.LOCALSTORAGE,
        available: true,
        estimatedQuota
      };

    } catch (error) {
      return {
        method: StorageMethod.LOCALSTORAGE,
        available: false,
        error: `localStorage test failed: ${error}`
      };
    }
  }



  /**
   * Get current storage method
   */
  getStorageMethod(): StorageMethod {
    return this.currentMethod;
  }

  /**
   * Check if storage is initialized and available
   */
  isAvailable(): boolean {
    return this.initialized && this.currentMethod !== StorageMethod.NONE;
  }

  /**
   * Get storage configuration
   */
  getConfig(): StorageConfig {
    return { ...this.config };
  }

  /**
   * Validate file before storage
   */
  validateFile(file: File, category: 'video' | 'document'): void {
    const maxSize = this.config.maxFileSize[category];
    
    if (file.size > maxSize) {
      throw new StorageError(
        StorageErrorType.FILE_TOO_LARGE,
        `File size (${file.size} bytes) exceeds maximum allowed size (${maxSize} bytes) for ${category} files`
      );
    }

    // Basic file type validation
    if (category === 'video' && !file.type.startsWith('video/')) {
      throw new StorageError(
        StorageErrorType.INVALID_FILE_TYPE,
        `Invalid file type for video: ${file.type}`
      );
    }

    if (category === 'document' && !this.isValidDocumentType(file.type)) {
      throw new StorageError(
        StorageErrorType.INVALID_FILE_TYPE,
        `Invalid file type for document: ${file.type}`
      );
    }
  }

  /**
   * Check if file type is valid for documents
   */
  private isValidDocumentType(mimeType: string): boolean {
    const validTypes = [
      // Document types
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'application/rtf',
      // Image types (for supporting evidence)
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/tiff'
    ];
    
    return validTypes.includes(mimeType);
  }

  /**
   * Generate unique file ID
   */
  generateFileId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate checksum for file integrity
   */
  async calculateChecksum(data: ArrayBuffer): Promise<string> {
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

  /**
   * Store a file using the current storage method
   */
  async storeFile(
    fileId: string,
    file: File,
    category: 'video' | 'document',
    processedData?: ArrayBuffer
  ): Promise<void> {
    this.ensureInitialized();

    try {
      if (this.currentMethod === StorageMethod.INDEXEDDB && this.indexedDBStorage) {
        await this.indexedDBStorage.storeFile(fileId, file, category, processedData);
      } else if (this.currentMethod === StorageMethod.LOCALSTORAGE && this.localStorageStorage) {
        await this.localStorageStorage.storeFile(fileId, file, category, processedData);
      } else if (this.memoryStorage) {
        await this.memoryStorage.storeFile(fileId, file, category, processedData);
      } else {
        throw new StorageError(
          StorageErrorType.STORAGE_UNAVAILABLE,
          'No storage method available'
        );
      }
    } catch (error) {
      // If IndexedDB fails, try to fallback to localStorage
      if (this.currentMethod === StorageMethod.INDEXEDDB && error instanceof StorageError) {
        await this.attemptFallbackToLocalStorage();
        
        if (this.currentMethod === StorageMethod.LOCALSTORAGE && this.localStorageStorage) {
          await this.localStorageStorage.storeFile(fileId, file, category, processedData);
          return;
        }
      }
      
      throw error;
    }
  }

  /**
   * Retrieve a file using the current storage method
   */
  async retrieveFile(fileId: string): Promise<File | null> {
    this.ensureInitialized();

    try {
      if (this.currentMethod === StorageMethod.INDEXEDDB && this.indexedDBStorage) {
        return await this.indexedDBStorage.retrieveFile(fileId);
      } else if (this.currentMethod === StorageMethod.LOCALSTORAGE && this.localStorageStorage) {
        return await this.localStorageStorage.retrieveFile(fileId);
      } else if (this.memoryStorage) {
        return await this.memoryStorage.retrieveFile(fileId);
      } else {
        throw new StorageError(
          StorageErrorType.STORAGE_UNAVAILABLE,
          'No storage method available'
        );
      }
    } catch (error) {
      // If IndexedDB fails, try to fallback to localStorage
      if (this.currentMethod === StorageMethod.INDEXEDDB && error instanceof StorageError) {
        await this.attemptFallbackToLocalStorage();
        
        if (this.currentMethod === StorageMethod.LOCALSTORAGE && this.localStorageStorage) {
          return await this.localStorageStorage.retrieveFile(fileId);
        }
      }
      
      throw error;
    }
  }

  /**
   * Delete a file using the current storage method
   */
  async deleteFile(fileId: string): Promise<void> {
    this.ensureInitialized();

    try {
      if (this.currentMethod === StorageMethod.INDEXEDDB && this.indexedDBStorage) {
        await this.indexedDBStorage.deleteFile(fileId);
      } else if (this.currentMethod === StorageMethod.LOCALSTORAGE && this.localStorageStorage) {
        await this.localStorageStorage.deleteFile(fileId);
      } else if (this.memoryStorage) {
        await this.memoryStorage.deleteFile(fileId);
      } else {
        throw new StorageError(
          StorageErrorType.STORAGE_UNAVAILABLE,
          'No storage method available'
        );
      }
    } catch (error) {
      // If IndexedDB fails, try to fallback to localStorage
      if (this.currentMethod === StorageMethod.INDEXEDDB && error instanceof StorageError) {
        await this.attemptFallbackToLocalStorage();
        
        if (this.currentMethod === StorageMethod.LOCALSTORAGE && this.localStorageStorage) {
          await this.localStorageStorage.deleteFile(fileId);
          return;
        }
      }
      
      throw error;
    }
  }

  /**
   * List files using the current storage method
   */
  async listFiles(category?: 'video' | 'document'): Promise<StoredFileInfo[]> {
    this.ensureInitialized();

    try {
      if (this.currentMethod === StorageMethod.INDEXEDDB && this.indexedDBStorage) {
        return await this.indexedDBStorage.listFiles(category);
      } else if (this.currentMethod === StorageMethod.LOCALSTORAGE && this.localStorageStorage) {
        return await this.localStorageStorage.listFiles(category);
      } else if (this.memoryStorage) {
        return await this.memoryStorage.listFiles(category);
      } else {
        throw new StorageError(
          StorageErrorType.STORAGE_UNAVAILABLE,
          'No storage method available'
        );
      }
    } catch (error) {
      // If IndexedDB fails, try to fallback to localStorage
      if (this.currentMethod === StorageMethod.INDEXEDDB && error instanceof StorageError) {
        await this.attemptFallbackToLocalStorage();
        
        if (this.currentMethod === StorageMethod.LOCALSTORAGE && this.localStorageStorage) {
          return await this.localStorageStorage.listFiles(category);
        }
      }
      
      throw error;
    }
  }

  /**
   * Get storage usage using the current storage method
   */
  async getStorageUsage(): Promise<StorageUsage> {
    this.ensureInitialized();

    try {
      if (this.currentMethod === StorageMethod.INDEXEDDB && this.indexedDBStorage) {
        return await this.indexedDBStorage.getStorageUsage();
      } else if (this.currentMethod === StorageMethod.LOCALSTORAGE && this.localStorageStorage) {
        return await this.localStorageStorage.getStorageUsage();
      } else if (this.memoryStorage) {
        return await this.memoryStorage.getStorageUsage();
      } else {
        throw new StorageError(
          StorageErrorType.STORAGE_UNAVAILABLE,
          'No storage method available'
        );
      }
    } catch (error) {
      // If IndexedDB fails, try to fallback to localStorage
      if (this.currentMethod === StorageMethod.INDEXEDDB && error instanceof StorageError) {
        await this.attemptFallbackToLocalStorage();
        
        if (this.currentMethod === StorageMethod.LOCALSTORAGE && this.localStorageStorage) {
          return await this.localStorageStorage.getStorageUsage();
        }
      }
      
      throw error;
    }
  }

  /**
   * Clear all files using the current storage method
   */
  async clearAllFiles(): Promise<void> {
    this.ensureInitialized();

    try {
      if (this.currentMethod === StorageMethod.INDEXEDDB && this.indexedDBStorage) {
        await this.indexedDBStorage.clearAllFiles();
      } else if (this.currentMethod === StorageMethod.LOCALSTORAGE && this.localStorageStorage) {
        await this.localStorageStorage.clearAllFiles();
      } else if (this.memoryStorage) {
        await this.memoryStorage.clearAllFiles();
      } else {
        throw new StorageError(
          StorageErrorType.STORAGE_UNAVAILABLE,
          'No storage method available'
        );
      }
    } catch (error) {
      // If IndexedDB fails, try to fallback to localStorage
      if (this.currentMethod === StorageMethod.INDEXEDDB && error instanceof StorageError) {
        await this.attemptFallbackToLocalStorage();
        
        if (this.currentMethod === StorageMethod.LOCALSTORAGE && this.localStorageStorage) {
          await this.localStorageStorage.clearAllFiles();
          return;
        }
      }
      
      throw error;
    }
  }

  /**
   * Store metadata using the current storage method
   */
  async storeMetadata(key: string, value: any): Promise<void> {
    this.ensureInitialized();

    try {
      if (this.currentMethod === StorageMethod.INDEXEDDB && this.indexedDBStorage) {
        await this.indexedDBStorage.storeMetadata(key, value);
      } else if (this.currentMethod === StorageMethod.LOCALSTORAGE && this.localStorageStorage) {
        await this.localStorageStorage.storeMetadata(key, value);
      } else {
        throw new StorageError(
          StorageErrorType.STORAGE_UNAVAILABLE,
          'No storage method available'
        );
      }
    } catch (error) {
      // If IndexedDB fails, try to fallback to localStorage
      if (this.currentMethod === StorageMethod.INDEXEDDB && error instanceof StorageError) {
        await this.attemptFallbackToLocalStorage();
        
        if (this.currentMethod === StorageMethod.LOCALSTORAGE && this.localStorageStorage) {
          await this.localStorageStorage.storeMetadata(key, value);
          return;
        }
      }
      
      throw error;
    }
  }

  /**
   * Retrieve metadata using the current storage method
   */
  async retrieveMetadata(key: string): Promise<any | null> {
    this.ensureInitialized();

    try {
      if (this.currentMethod === StorageMethod.INDEXEDDB && this.indexedDBStorage) {
        return await this.indexedDBStorage.retrieveMetadata(key);
      } else if (this.currentMethod === StorageMethod.LOCALSTORAGE && this.localStorageStorage) {
        return await this.localStorageStorage.retrieveMetadata(key);
      } else {
        throw new StorageError(
          StorageErrorType.STORAGE_UNAVAILABLE,
          'No storage method available'
        );
      }
    } catch (error) {
      // If IndexedDB fails, try to fallback to localStorage
      if (this.currentMethod === StorageMethod.INDEXEDDB && error instanceof StorageError) {
        await this.attemptFallbackToLocalStorage();
        
        if (this.currentMethod === StorageMethod.LOCALSTORAGE && this.localStorageStorage) {
          return await this.localStorageStorage.retrieveMetadata(key);
        }
      }
      
      throw error;
    }
  }

  /**
   * Attempt to fallback from IndexedDB to localStorage
   */
  private async attemptFallbackToLocalStorage(): Promise<void> {
    if (this.currentMethod !== StorageMethod.INDEXEDDB) {
      return; // Already using localStorage or no storage
    }

    try {
      const localStorageCapability = this.detectLocalStorageSupport();
      if (localStorageCapability.available) {
        // Close IndexedDB connection
        if (this.indexedDBStorage) {
          this.indexedDBStorage.close();
          this.indexedDBStorage = null;
        }

        // Initialize localStorage
        this.localStorageStorage = new LocalStorageStorage();
        await this.localStorageStorage.initialize();
        this.currentMethod = StorageMethod.LOCALSTORAGE;
        
        // Notify user about fallback
        this.notifyFallbackUsage();
        
        console.warn('Switched from IndexedDB to localStorage due to error');
      } else {
        throw new StorageError(
          StorageErrorType.STORAGE_UNAVAILABLE,
          'localStorage fallback is not available'
        );
      }
    } catch (error) {
      this.currentMethod = StorageMethod.NONE;
      throw new StorageError(
        StorageErrorType.STORAGE_UNAVAILABLE,
        'Failed to fallback to localStorage',
        error as Error
      );
    }
  }

  /**
   * Notify user about fallback usage
   */
  private notifyFallbackUsage(): void {
    if (!this.fallbackNotified && this.currentMethod === StorageMethod.LOCALSTORAGE) {
      console.info('Using localStorage for file storage. Storage capacity is limited compared to IndexedDB.');
      
      // Dispatch custom event for UI components to handle
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('storage-fallback-notification', {
          detail: {
            method: StorageMethod.LOCALSTORAGE,
            message: 'Using localStorage for file storage with limited capacity.',
            capacity: this.localStorageStorage?.getStorageCapacity() || 5 * 1024 * 1024
          }
        }));
      }
      
      this.fallbackNotified = true;
    }
  }

  /**
   * Ensure storage is initialized before operations
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new StorageError(
        StorageErrorType.STORAGE_UNAVAILABLE,
        'Storage is not initialized. Call initializeStorage() first.'
      );
    }
  }

  /**
   * Close storage connections
   */
  close(): void {
    if (this.indexedDBStorage) {
      this.indexedDBStorage.close();
      this.indexedDBStorage = null;
    }
    
    if (this.localStorageStorage) {
      this.localStorageStorage.close();
      this.localStorageStorage = null;
    }
    
    this.initialized = false;
    this.currentMethod = StorageMethod.NONE;
    this.fallbackNotified = false;
  }
}