/**
 * Unit tests for FileStorageService fallback mechanism
 * Tests automatic fallback from IndexedDB to localStorage
 */

import { FileStorageService } from '../file-storage-service';
import { IndexedDBStorage } from '../indexeddb-storage';
import { LocalStorageStorage } from '../localstorage-storage';
import { StorageMethod, StorageError, StorageErrorType } from '../types';

// Mock the storage implementations
jest.mock('../indexeddb-storage');
jest.mock('../localstorage-storage');

const MockedIndexedDBStorage = IndexedDBStorage as jest.MockedClass<typeof IndexedDBStorage>;
const MockedLocalStorageStorage = LocalStorageStorage as jest.MockedClass<typeof LocalStorageStorage>;

// Mock window.indexedDB and localStorage
const mockIndexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn()
};

const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};

Object.defineProperty(window, 'indexedDB', {
  value: mockIndexedDB,
  writable: true
});

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

// Mock navigator.storage for quota estimation
Object.defineProperty(global, 'navigator', {
  value: {
    storage: {
      estimate: jest.fn().mockResolvedValue({
        quota: 50 * 1024 * 1024,
        usage: 1024
      })
    }
  },
  writable: true
});

describe('FileStorageService Fallback Mechanism', () => {
  let service: FileStorageService;
  let mockIndexedDBInstance: jest.Mocked<IndexedDBStorage>;
  let mockLocalStorageInstance: jest.Mocked<LocalStorageStorage>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock instances
    mockIndexedDBInstance = {
      initialize: jest.fn(),
      storeFile: jest.fn(),
      retrieveFile: jest.fn(),
      deleteFile: jest.fn(),
      listFiles: jest.fn(),
      getStorageUsage: jest.fn(),
      clearAllFiles: jest.fn(),
      storeMetadata: jest.fn(),
      retrieveMetadata: jest.fn(),
      getFileMetadata: jest.fn(),
      fileExists: jest.fn(),
      isReady: jest.fn(),
      close: jest.fn(),
      getDatabaseInfo: jest.fn()
    } as any;

    mockLocalStorageInstance = {
      initialize: jest.fn(),
      storeFile: jest.fn(),
      retrieveFile: jest.fn(),
      deleteFile: jest.fn(),
      listFiles: jest.fn(),
      getStorageUsage: jest.fn(),
      clearAllFiles: jest.fn(),
      storeMetadata: jest.fn(),
      retrieveMetadata: jest.fn(),
      getFileMetadata: jest.fn(),
      fileExists: jest.fn(),
      isReady: jest.fn(),
      close: jest.fn(),
      getStorageCapacity: jest.fn().mockReturnValue(5 * 1024 * 1024)
    } as any;

    MockedIndexedDBStorage.mockImplementation(() => mockIndexedDBInstance);
    MockedLocalStorageStorage.mockImplementation(() => mockLocalStorageInstance);

    service = new FileStorageService();
  });

  describe('initialization fallback', () => {
    it('should use IndexedDB when available', async () => {
      // Mock successful IndexedDB detection and initialization
      mockIndexedDB.open.mockImplementation(() => {
        const request = {
          onsuccess: null as any,
          onerror: null as any,
          onupgradeneeded: null as any,
          result: { close: jest.fn() }
        };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });

      mockIndexedDBInstance.initialize.mockResolvedValue(undefined);

      const capability = await service.initializeStorage();

      expect(capability.method).toBe(StorageMethod.INDEXEDDB);
      expect(capability.available).toBe(true);
      expect(service.getStorageMethod()).toBe(StorageMethod.INDEXEDDB);
    });

    it('should fallback to localStorage when IndexedDB is unavailable', async () => {
      // Mock IndexedDB as unavailable
      Object.defineProperty(window, 'indexedDB', {
        value: undefined,
        writable: true
      });

      mockLocalStorageInstance.initialize.mockResolvedValue(undefined);

      const capability = await service.initializeStorage();

      expect(capability.method).toBe(StorageMethod.LOCALSTORAGE);
      expect(capability.available).toBe(true);
      expect(service.getStorageMethod()).toBe(StorageMethod.LOCALSTORAGE);

      // Restore indexedDB
      Object.defineProperty(window, 'indexedDB', {
        value: mockIndexedDB,
        writable: true
      });
    });

    it('should fallback to localStorage when IndexedDB initialization fails', async () => {
      // Mock IndexedDB detection as successful but initialization fails
      mockIndexedDB.open.mockImplementation(() => {
        const request = {
          onsuccess: null as any,
          onerror: null as any,
          onupgradeneeded: null as any,
          result: { close: jest.fn() }
        };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });

      mockIndexedDBInstance.initialize.mockRejectedValue(new Error('IndexedDB init failed'));
      mockLocalStorageInstance.initialize.mkResolvedValue(undefined);

      const capability = await service.initializeStorage();

      expect(capability.method).toBe(StorageMethod.LOCALSTORAGE);
      expect(capability.available).toBe(true);
      expect(service.getStorageMethod()).toBe(StorageMethod.LOCALSTORAGE);
    });

    it('should throw error when no storage is available', async () => {
      // Mock both IndexedDB and localStorage as unavailable
      Object.defineProperty(window, 'indexedDB', {
        value: undefined,
        writable: true
      });

      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true
      });

      await expect(service.initializeStorage()).rejects.toThrow(StorageError);

      // Restore storage objects
      Object.defineProperty(window, 'indexedDB', {
        value: mockIndexedDB,
        writable: true
      });

      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true
      });
    });
  });

  describe('runtime fallback during operations', () => {
    beforeEach(async () => {
      // Initialize with IndexedDB
      mockIndexedDB.open.mockImplementation(() => {
        const request = {
          onsuccess: null as any,
          onerror: null as any,
          onupgradeneeded: null as any,
          result: { close: jest.fn() }
        };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });

      mockIndexedDBInstance.initialize.mockResolvedValue(undefined);
      await service.initializeStorage();
    });

    it('should fallback during storeFile operation', async () => {
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      // Mock IndexedDB storeFile to fail
      mockIndexedDBInstance.storeFile.mockRejectedValue(
        new StorageError(StorageErrorType.INDEXEDDB_UNAVAILABLE, 'IndexedDB failed')
      );

      // Mock localStorage initialization and storeFile to succeed
      mockLocalStorageInstance.initialize.mockResolvedValue(undefined);
      mockLocalStorageInstance.storeFile.mockResolvedValue({
        id: 'test-1',
        name: 'test.txt',
        size: 12,
        type: 'text/plain',
        category: 'document',
        data: 'base64data',
        metadata: {
          originalSize: 12,
          compressed: false,
          storedAt: new Date(),
          checksum: 'abc123'
        }
      });

      await service.storeFile('test-1', testFile, 'document');

      expect(mockLocalStorageInstance.initialize).toHaveBeenCalled();
      expect(mockLocalStorageInstance.storeFile).toHaveBeenCalledWith('test-1', testFile, 'document', undefined);
      expect(service.getStorageMethod()).toBe(StorageMethod.LOCALSTORAGE);
    });

    it('should fallback during retrieveFile operation', async () => {
      // Mock IndexedDB retrieveFile to fail
      mockIndexedDBInstance.retrieveFile.mockRejectedValue(
        new StorageError(StorageErrorType.INDEXEDDB_UNAVAILABLE, 'IndexedDB failed')
      );

      // Mock localStorage initialization and retrieveFile to succeed
      mockLocalStorageInstance.initialize.mockResolvedValue(undefined);
      mockLocalStorageInstance.retrieveFile.mockResolvedValue(
        new File(['test content'], 'test.txt', { type: 'text/plain' })
      );

      const result = await service.retrieveFile('test-1');

      expect(mockLocalStorageInstance.initialize).toHaveBeenCalled();
      expect(mockLocalStorageInstance.retrieveFile).toHaveBeenCalledWith('test-1');
      expect(result).toBeInstanceOf(File);
      expect(service.getStorageMethod()).toBe(StorageMethod.LOCALSTORAGE);
    });

    it('should fallback during deleteFile operation', async () => {
      // Mock IndexedDB deleteFile to fail
      mockIndexedDBInstance.deleteFile.mockRejectedValue(
        new StorageError(StorageErrorType.INDEXEDDB_UNAVAILABLE, 'IndexedDB failed')
      );

      // Mock localStorage initialization and deleteFile to succeed
      mockLocalStorageInstance.initialize.mockResolvedValue(undefined);
      mockLocalStorageInstance.deleteFile.mockResolvedValue(undefined);

      await service.deleteFile('test-1');

      expect(mockLocalStorageInstance.initialize).toHaveBeenCalled();
      expect(mockLocalStorageInstance.deleteFile).toHaveBeenCalledWith('test-1');
      expect(service.getStorageMethod()).toBe(StorageMethod.LOCALSTORAGE);
    });

    it('should fallback during listFiles operation', async () => {
      const mockFiles = [
        {
          id: 'file-1',
          name: 'test.txt',
          size: 1024,
          type: 'text/plain',
          category: 'document' as const,
          storedAt: new Date(),
          compressed: false
        }
      ];

      // Mock IndexedDB listFiles to fail
      mockIndexedDBInstance.listFiles.mockRejectedValue(
        new StorageError(StorageErrorType.INDEXEDDB_UNAVAILABLE, 'IndexedDB failed')
      );

      // Mock localStorage initialization and listFiles to succeed
      mockLocalStorageInstance.initialize.mockResolvedValue(undefined);
      mockLocalStorageInstance.listFiles.mockResolvedValue(mockFiles);

      const result = await service.listFiles();

      expect(mockLocalStorageInstance.initialize).toHaveBeenCalled();
      expect(mockLocalStorageInstance.listFiles).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockFiles);
      expect(service.getStorageMethod()).toBe(StorageMethod.LOCALSTORAGE);
    });

    it('should fallback during getStorageUsage operation', async () => {
      const mockUsage = {
        used: 1024,
        available: 4 * 1024 * 1024,
        percentage: 2.5
      };

      // Mock IndexedDB getStorageUsage to fail
      mockIndexedDBInstance.getStorageUsage.mockRejectedValue(
        new StorageError(StorageErrorType.INDEXEDDB_UNAVAILABLE, 'IndexedDB failed')
      );

      // Mock localStorage initialization and getStorageUsage to succeed
      mockLocalStorageInstance.initialize.mockResolvedValue(undefined);
      mockLocalStorageInstance.getStorageUsage.mockResolvedValue(mockUsage);

      const result = await service.getStorageUsage();

      expect(mockLocalStorageInstance.initialize).toHaveBeenCalled();
      expect(mockLocalStorageInstance.getStorageUsage).toHaveBeenCalled();
      expect(result).toEqual(mockUsage);
      expect(service.getStorageMethod()).toBe(StorageMethod.LOCALSTORAGE);
    });

    it('should not attempt fallback for non-IndexedDB errors', async () => {
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      // Mock IndexedDB storeFile to fail with a different error type
      mockIndexedDBInstance.storeFile.mockRejectedValue(
        new StorageError(StorageErrorType.QUOTA_EXCEEDED, 'Quota exceeded')
      );

      await expect(service.storeFile('test-1', testFile, 'document'))
        .rejects.toThrow(StorageError);

      // Should not have attempted localStorage fallback
      expect(mockLocalStorageInstance.initialize).not.toHaveBeenCalled();
      expect(service.getStorageMethod()).toBe(StorageMethod.INDEXEDDB);
    });

    it('should handle fallback failure gracefully', async () => {
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      // Mock IndexedDB storeFile to fail
      mockIndexedDBInstance.storeFile.mockRejectedValue(
        new StorageError(StorageErrorType.INDEXEDDB_UNAVAILABLE, 'IndexedDB failed')
      );

      // Mock localStorage initialization to fail
      mockLocalStorageInstance.initialize.mockRejectedValue(
        new Error('localStorage init failed')
      );

      await expect(service.storeFile('test-1', testFile, 'document'))
        .rejects.toThrow(StorageError);

      expect(service.getStorageMethod()).toBe(StorageMethod.NONE);
    });
  });

  describe('fallback notification', () => {
    it('should dispatch fallback notification event', async () => {
      const eventSpy = jest.spyOn(window, 'dispatchEvent');

      // Mock IndexedDB as unavailable to trigger fallback
      Object.defineProperty(window, 'indexedDB', {
        value: undefined,
        writable: true
      });

      mockLocalStorageInstance.initialize.mockResolvedValue(undefined);

      await service.initializeStorage();

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'storage-fallback-notification',
          detail: expect.objectContaining({
            method: StorageMethod.LOCALSTORAGE,
            message: expect.stringContaining('localStorage'),
            capacity: 5 * 1024 * 1024
          })
        })
      );

      eventSpy.mockRestore();

      // Restore indexedDB
      Object.defineProperty(window, 'indexedDB', {
        value: mockIndexedDB,
        writable: true
      });
    });

    it('should only notify once per session', async () => {
      const eventSpy = jest.spyOn(window, 'dispatchEvent');

      // Initialize with localStorage fallback
      Object.defineProperty(window, 'indexedDB', {
        value: undefined,
        writable: true
      });

      mockLocalStorageInstance.initialize.mockResolvedValue(undefined);

      await service.initializeStorage();

      // Trigger another operation that would normally cause notification
      const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      mockLocalStorageInstance.storeFile.mockResolvedValue({
        id: 'test-1',
        name: 'test.txt',
        size: 4,
        type: 'text/plain',
        category: 'document',
        data: 'base64',
        metadata: {
          originalSize: 4,
          compressed: false,
          storedAt: new Date(),
          checksum: 'abc'
        }
      });

      await service.storeFile('test-1', testFile, 'document');

      // Should only have been called once during initialization
      expect(eventSpy).toHaveBeenCalledTimes(1);

      eventSpy.mockRestore();

      // Restore indexedDB
      Object.defineProperty(window, 'indexedDB', {
        value: mockIndexedDB,
        writable: true
      });
    });
  });

  describe('storage method detection', () => {
    it('should detect IndexedDB support correctly', async () => {
      // Mock successful IndexedDB test
      mockIndexedDB.open.mockImplementation(() => {
        const request = {
          onsuccess: null as any,
          onerror: null as any,
          onupgradeneeded: null as any,
          result: { close: jest.fn() }
        };
        setTimeout(() => {
          if (request.onupgradeneeded) {
            request.onupgradeneeded();
          }
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });

      mockIndexedDB.deleteDatabase.mockImplementation(() => {
        const request = { onsuccess: null as any, onerror: null as any };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });

      mockIndexedDBInstance.initialize.mockResolvedValue(undefined);

      const capability = await service.initializeStorage();

      expect(capability.method).toBe(StorageMethod.INDEXEDDB);
      expect(capability.available).toBe(true);
      expect(capability.estimatedQuota).toBeDefined();
    });

    it('should detect localStorage support correctly', async () => {
      // Mock IndexedDB as unavailable
      Object.defineProperty(window, 'indexedDB', {
        value: undefined,
        writable: true
      });

      mockLocalStorageInstance.initialize.mockResolvedValue(undefined);

      const capability = await service.initializeStorage();

      expect(capability.method).toBe(StorageMethod.LOCALSTORAGE);
      expect(capability.available).toBe(true);
      expect(capability.estimatedQuota).toBeDefined();

      // Restore indexedDB
      Object.defineProperty(window, 'indexedDB', {
        value: mockIndexedDB,
        writable: true
      });
    });

    it('should handle localStorage test failures', async () => {
      // Mock IndexedDB as unavailable
      Object.defineProperty(window, 'indexedDB', {
        value: undefined,
        writable: true
      });

      // Mock localStorage.setItem to throw
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Access denied');
      });

      await expect(service.initializeStorage()).rejects.toThrow(StorageError);

      // Restore mocks
      mockLocalStorage.setItem.mockReset();
      Object.defineProperty(window, 'indexedDB', {
        value: mockIndexedDB,
        writable: true
      });
    });
  });

  describe('service lifecycle', () => {
    it('should close all storage connections', async () => {
      // Initialize with IndexedDB
      mockIndexedDB.open.mockImplementation(() => {
        const request = {
          onsuccess: null as any,
          onerror: null as any,
          onupgradeneeded: null as any,
          result: { close: jest.fn() }
        };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });

      mockIndexedDBInstance.initialize.mockResolvedValue(undefined);
      await service.initializeStorage();

      service.close();

      expect(mockIndexedDBInstance.close).toHaveBeenCalled();
      expect(service.getStorageMethod()).toBe(StorageMethod.NONE);
      expect(service.isAvailable()).toBe(false);
    });

    it('should handle reinitialization after close', async () => {
      // Initialize, close, then reinitialize
      mockIndexedDB.open.mockImplementation(() => {
        const request = {
          onsuccess: null as any,
          onerror: null as any,
          onupgradeneeded: null as any,
          result: { close: jest.fn() }
        };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });

      mockIndexedDBInstance.initialize.mockResolvedValue(undefined);

      await service.initializeStorage();
      expect(service.isAvailable()).toBe(true);

      service.close();
      expect(service.isAvailable()).toBe(false);

      await service.initializeStorage();
      expect(service.isAvailable()).toBe(true);
    });
  });
});