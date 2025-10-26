/**
 * IndexedDB wrapper for file storage operations
 * Handles database initialization, schema management, and CRUD operations
 */

import {
  StoredFile,
  StorageMetadata,
  StorageError,
  StorageErrorType,
  StoredFileInfo
} from './types';

export class IndexedDBWrapper {
  private db: IDBDatabase | null = null;
  private dbName: string;
  private dbVersion: number;
  private isInitialized = false;

  constructor(dbName: string = 'PortfolioFileStorage', dbVersion: number = 1) {
    this.dbName = dbName;
    this.dbVersion = dbVersion;
  }

  /**
   * Initialize the IndexedDB database with proper schema
   */
  async initialize(): Promise<void> {
    if (this.isInitialized && this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new StorageError(
          StorageErrorType.INDEXEDDB_UNAVAILABLE,
          'IndexedDB is not supported in this browser'
        ));
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new StorageError(
          StorageErrorType.INDEXEDDB_UNAVAILABLE,
          'Failed to open IndexedDB database',
          request.error || undefined
        ));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;

        // Handle database errors after opening
        this.db.onerror = (event) => {
          console.error('IndexedDB error:', event);
        };

        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.setupSchema(db);
      };
    });
  }

  /**
   * Set up the database schema
   */
  private setupSchema(db: IDBDatabase): void {
    // Create files object store if it doesn't exist
    if (!db.objectStoreNames.contains('files')) {
      const filesStore = db.createObjectStore('files', { keyPath: 'id' });
      
      // Create indexes for efficient querying
      filesStore.createIndex('category', 'category', { unique: false });
      filesStore.createIndex('storedAt', 'metadata.storedAt', { unique: false });
      filesStore.createIndex('name', 'name', { unique: false });
      filesStore.createIndex('type', 'type', { unique: false });
    }

    // Create metadata object store if it doesn't exist
    if (!db.objectStoreNames.contains('metadata')) {
      db.createObjectStore('metadata', { keyPath: 'key' });
    }
  }

  /**
   * Ensure database is initialized before operations
   */
  private ensureInitialized(): void {
    if (!this.isInitialized || !this.db) {
      throw new StorageError(
        StorageErrorType.INDEXEDDB_UNAVAILABLE,
        'IndexedDB is not initialized. Call initialize() first.'
      );
    }
  }

  /**
   * Store a file in IndexedDB
   */
  async storeFile(file: StoredFile): Promise<void> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');
      
      const request = store.put(file);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new StorageError(
          StorageErrorType.QUOTA_EXCEEDED,
          'Failed to store file in IndexedDB',
          request.error || undefined
        ));
      };

      transaction.onerror = () => {
        reject(new StorageError(
          StorageErrorType.INDEXEDDB_UNAVAILABLE,
          'Transaction failed while storing file',
          transaction.error || undefined
        ));
      };
    });
  }

  /**
   * Retrieve a file from IndexedDB
   */
  async retrieveFile(fileId: string): Promise<StoredFile | null> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      
      const request = store.get(fileId);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result || null);
      };

      request.onerror = () => {
        reject(new StorageError(
          StorageErrorType.FILE_NOT_FOUND,
          `Failed to retrieve file with ID: ${fileId}`,
          request.error || undefined
        ));
      };

      transaction.onerror = () => {
        reject(new StorageError(
          StorageErrorType.INDEXEDDB_UNAVAILABLE,
          'Transaction failed while retrieving file',
          transaction.error || undefined
        ));
      };
    });
  }

  /**
   * Delete a file from IndexedDB
   */
  async deleteFile(fileId: string): Promise<void> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');
      
      const request = store.delete(fileId);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new StorageError(
          StorageErrorType.FILE_NOT_FOUND,
          `Failed to delete file with ID: ${fileId}`,
          request.error || undefined
        ));
      };

      transaction.onerror = () => {
        reject(new StorageError(
          StorageErrorType.INDEXEDDB_UNAVAILABLE,
          'Transaction failed while deleting file',
          transaction.error || undefined
        ));
      };
    });
  }

  /**
   * List all files, optionally filtered by category
   */
  async listFiles(category?: 'video' | 'document'): Promise<StoredFileInfo[]> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      
      let request: IDBRequest;
      
      if (category) {
        // Use category index for filtered results
        const index = store.index('category');
        request = index.getAll(category);
      } else {
        // Get all files
        request = store.getAll();
      }

      request.onsuccess = () => {
        const files: StoredFile[] = request.result || [];
        
        // Convert to StoredFileInfo format
        const fileInfos: StoredFileInfo[] = files.map(file => ({
          id: file.id,
          name: file.name,
          size: file.size,
          type: file.type,
          category: file.category,
          storedAt: file.metadata.storedAt,
          compressed: file.metadata.compressed
        }));

        resolve(fileInfos);
      };

      request.onerror = () => {
        reject(new StorageError(
          StorageErrorType.INDEXEDDB_UNAVAILABLE,
          'Failed to list files from IndexedDB',
          request.error || undefined
        ));
      };

      transaction.onerror = () => {
        reject(new StorageError(
          StorageErrorType.INDEXEDDB_UNAVAILABLE,
          'Transaction failed while listing files',
          transaction.error || undefined
        ));
      };
    });
  }

  /**
   * Get total storage usage
   */
  async getStorageUsage(): Promise<{ used: number; fileCount: number }> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      
      const request = store.getAll();

      request.onsuccess = () => {
        const files: StoredFile[] = request.result || [];
        
        const used = files.reduce((total, file) => total + file.size, 0);
        const fileCount = files.length;

        resolve({ used, fileCount });
      };

      request.onerror = () => {
        reject(new StorageError(
          StorageErrorType.INDEXEDDB_UNAVAILABLE,
          'Failed to calculate storage usage',
          request.error || undefined
        ));
      };

      transaction.onerror = () => {
        reject(new StorageError(
          StorageErrorType.INDEXEDDB_UNAVAILABLE,
          'Transaction failed while calculating storage usage',
          transaction.error || undefined
        ));
      };
    });
  }

  /**
   * Clear all files from storage
   */
  async clearAllFiles(): Promise<void> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');
      
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new StorageError(
          StorageErrorType.INDEXEDDB_UNAVAILABLE,
          'Failed to clear all files from IndexedDB',
          request.error || undefined
        ));
      };

      transaction.onerror = () => {
        reject(new StorageError(
          StorageErrorType.INDEXEDDB_UNAVAILABLE,
          'Transaction failed while clearing files',
          transaction.error || undefined
        ));
      };
    });
  }

  /**
   * Store metadata in the metadata object store
   */
  async storeMetadata(key: string, value: any): Promise<void> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['metadata'], 'readwrite');
      const store = transaction.objectStore('metadata');
      
      const metadata: StorageMetadata = { key, value };
      const request = store.put(metadata);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new StorageError(
          StorageErrorType.INDEXEDDB_UNAVAILABLE,
          `Failed to store metadata for key: ${key}`,
          request.error || undefined
        ));
      };

      transaction.onerror = () => {
        reject(new StorageError(
          StorageErrorType.INDEXEDDB_UNAVAILABLE,
          'Transaction failed while storing metadata',
          transaction.error || undefined
        ));
      };
    });
  }

  /**
   * Retrieve metadata from the metadata object store
   */
  async retrieveMetadata(key: string): Promise<any | null> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');
      
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : null);
      };

      request.onerror = () => {
        reject(new StorageError(
          StorageErrorType.INDEXEDDB_UNAVAILABLE,
          `Failed to retrieve metadata for key: ${key}`,
          request.error || undefined
        ));
      };

      transaction.onerror = () => {
        reject(new StorageError(
          StorageErrorType.INDEXEDDB_UNAVAILABLE,
          'Transaction failed while retrieving metadata',
          transaction.error || undefined
        ));
      };
    });
  }

  /**
   * Check if the database is initialized and ready
   */
  isReady(): boolean {
    return this.isInitialized && this.db !== null;
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.isInitialized = false;
  }

  /**
   * Get database information
   */
  getDatabaseInfo(): { name: string; version: number; isReady: boolean } {
    return {
      name: this.dbName,
      version: this.dbVersion,
      isReady: this.isReady()
    };
  }
}