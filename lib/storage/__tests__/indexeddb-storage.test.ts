/**
 * Unit tests for IndexedDB storage operations
 * Tests file storage, retrieval, and metadata handling
 */

import { IndexedDBStorage } from '../indexeddb-storage';
import { IndexedDBWrapper } from '../indexeddb-wrapper';
import { StorageError, StorageErrorType } from '../types';

// Mock the IndexedDBWrapper
jest.mock('../indexeddb-wrapper');

const MockedIndexedDBWrapper = IndexedDBWrapper as jest.MockedClass<typeof IndexedDBWrapper>;

describe('IndexedDBStorage', () => {
  let storage: IndexedDBStorage;
  let mockWrapper: jest.Mocked<IndexedDBWrapper>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock wrapper instance
    mockWrapper = {
      initialize: jest.fn(),
      storeFile: jest.fn(),
      retrieveFile: jest.fn(),
      deleteFile: jest.fn(),
      listFiles: jest.fn(),
      getStorageUsage: jest.fn(),
      clearAllFiles: jest.fn(),
      storeMetadata: jest.fn(),
      retrieveMetadata: jest.fn(),
      isReady: jest.fn(),
      close: jest.fn(),
      getDatabaseInfo: jest.fn()
    } as any;

    MockedIndexedDBWrapper.mockImplementation(() => mockWrapper);

    storage = new IndexedDBStorage();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      mockWrapper.initialize.mockResolvedValue(undefined);

      await storage.initialize();

      expect(mockWrapper.initialize).toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Init failed');
      mockWrapper.initialize.mockRejectedValue(error);

      await expect(storage.initialize()).rejects.toThrow(StorageError);
    });

    it('should not reinitialize if already initialized', async () => {
      mockWrapper.initialize.mockResolvedValue(undefined);

      await storage.initialize();
      await storage.initialize();

      expect(mockWrapper.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('file operations', () => {
    beforeEach(async () => {
      mockWrapper.initialize.mockResolvedValue(undefined);
      await storage.initialize();
    });

    it('should store a file successfully', async () => {
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const fileId = 'test-file-1';

      // Mock successful storage
      mockWrapper.storeFile.mockResolvedValue(undefined);

      // Mock crypto.subtle for checksum calculation
      Object.defineProperty(global, 'crypto', {
        value: {
          subtle: {
            digest: jest.fn().mockResolvedValue(new ArrayBuffer(32))
          }
        },
        writable: true
      });

      const result = await storage.storeFile(fileId, testFile, 'document');

      expect(result.id).toBe(fileId);
      expect(result.name).toBe('test.txt');
      expect(result.category).toBe('document');
      expect(mockWrapper.storeFile).toHaveBeenCalled();
    });

    it('should handle quota exceeded errors during storage', async () => {
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const quotaError = new DOMException('Quota exceeded', 'QuotaExceededError');

      mockWrapper.storeFile.mockRejectedValue(quotaError);

      await expect(storage.storeFile('test-id', testFile, 'document'))
        .rejects.toThrow(StorageError);
    });

    it('should retrieve a file successfully', async () => {
      const storedFile = {
        id: 'test-file-1',
        name: 'test.txt',
        size: 1024,
        type: 'text/plain',
        category: 'document' as const,
        data: new ArrayBuffer(1024),
        metadata: {
          originalSize: 1024,
          compressed: false,
          storedAt: new Date(),
          checksum: 'abc123'
        }
      };

      mockWrapper.retrieveFile.mockResolvedValue(storedFile);

      // Mock crypto.subtle for checksum validation
      Object.defineProperty(global, 'crypto', {
        value: {
          subtle: {
            digest: jest.fn().mockResolvedValue(new ArrayBuffer(32))
          }
        },
        writable: true
      });

      const result = await storage.retrieveFile('test-file-1');

      expect(result).toBeInstanceOf(File);
      expect(result?.name).toBe('test.txt');
      expect(mockWrapper.retrieveFile).toHaveBeenCalledWith('test-file-1');
    });

    it('should return null for non-existent file', async () => {
      mockWrapper.retrieveFile.mockResolvedValue(null);

      const result = await storage.retrieveFile('non-existent');

      expect(result).toBeNull();
    });

    it('should handle file corruption during retrieval', async () => {
      const storedFile = {
        id: 'test-file-1',
        name: 'test.txt',
        size: 1024,
        type: 'text/plain',
        category: 'document' as const,
        data: new ArrayBuffer(1024),
        metadata: {
          originalSize: 1024,
          compressed: false,
          storedAt: new Date(),
          checksum: 'abc123'
        }
      };

      mockWrapper.retrieveFile.mockResolvedValue(storedFile);

      // Mock crypto.subtle to return different checksum (corruption)
      Object.defineProperty(global, 'crypto', {
        value: {
          subtle: {
            digest: jest.fn().mockResolvedValue(new ArrayBuffer(32))
          }
        },
        writable: true
      });

      await expect(storage.retrieveFile('test-file-1'))
        .rejects.toThrow(StorageError);
    });

    it('should delete a file successfully', async () => {
      mockWrapper.deleteFile.mockResolvedValue(undefined);

      await storage.deleteFile('test-file-1');

      expect(mockWrapper.deleteFile).toHaveBeenCalledWith('test-file-1');
    });

    it('should list files successfully', async () => {
      const mockFiles = [
        {
          id: 'file-1',
          name: 'test1.txt',
          size: 1024,
          type: 'text/plain',
          category: 'document' as const,
          storedAt: new Date(),
          compressed: false
        }
      ];

      mockWrapper.listFiles.mockResolvedValue(mockFiles);

      const result = await storage.listFiles();

      expect(result).toEqual(mockFiles);
      expect(mockWrapper.listFiles).toHaveBeenCalledWith(undefined);
    });

    it('should list files by category', async () => {
      const mockFiles = [
        {
          id: 'file-1',
          name: 'video.mp4',
          size: 2048,
          type: 'video/mp4',
          category: 'video' as const,
          storedAt: new Date(),
          compressed: false
        }
      ];

      mockWrapper.listFiles.mockResolvedValue(mockFiles);

      const result = await storage.listFiles('video');

      expect(result).toEqual(mockFiles);
      expect(mockWrapper.listFiles).toHaveBeenCalledWith('video');
    });
  });

  describe('storage management', () => {
    beforeEach(async () => {
      mockWrapper.initialize.mockResolvedValue(undefined);
      await storage.initialize();
    });

    it('should calculate storage usage', async () => {
      mockWrapper.getStorageUsage.mockResolvedValue({
        used: 1024,
        fileCount: 2
      });

      // Mock navigator.storage.estimate
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

      const result = await storage.getStorageUsage();

      expect(result.used).toBe(1024);
      expect(result.available).toBeGreaterThan(0);
      expect(result.percentage).toBeGreaterThanOrEqual(0);
      expect(result.percentage).toBeLessThanOrEqual(100);
    });

    it('should handle storage usage calculation without navigator.storage', async () => {
      mockWrapper.getStorageUsage.mockResolvedValue({
        used: 1024,
        fileCount: 2
      });

      // Mock navigator without storage API
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true
      });

      const result = await storage.getStorageUsage();

      expect(result.used).toBe(1024);
      expect(result.available).toBeGreaterThan(0);
    });

    it('should clear all files', async () => {
      mockWrapper.clearAllFiles.mockResolvedValue(undefined);

      await storage.clearAllFiles();

      expect(mockWrapper.clearAllFiles).toHaveBeenCalled();
    });
  });

  describe('metadata operations', () => {
    beforeEach(async () => {
      mockWrapper.initialize.mockResolvedValue(undefined);
      await storage.initialize();
    });

    it('should store metadata', async () => {
      mockWrapper.storeMetadata.mockResolvedValue(undefined);

      await storage.storeMetadata('test-key', { value: 'test' });

      expect(mockWrapper.storeMetadata).toHaveBeenCalledWith('test-key', { value: 'test' });
    });

    it('should retrieve metadata', async () => {
      const testData = { value: 'test' };
      mockWrapper.retrieveMetadata.mockResolvedValue(testData);

      const result = await storage.retrieveMetadata('test-key');

      expect(result).toEqual(testData);
      expect(mockWrapper.retrieveMetadata).toHaveBeenCalledWith('test-key');
    });

    it('should get file metadata', async () => {
      const storedFile = {
        id: 'test-file-1',
        name: 'test.txt',
        size: 1024,
        type: 'text/plain',
        category: 'document' as const,
        data: new ArrayBuffer(1024),
        metadata: {
          originalSize: 1024,
          compressed: false,
          storedAt: new Date(),
          checksum: 'abc123'
        }
      };

      mockWrapper.retrieveFile.mockResolvedValue(storedFile);

      const result = await storage.getFileMetadata('test-file-1');

      expect(result).toEqual({
        id: 'test-file-1',
        name: 'test.txt',
        size: 1024,
        type: 'text/plain',
        category: 'document',
        storedAt: storedFile.metadata.storedAt,
        compressed: false
      });
    });

    it('should check if file exists', async () => {
      mockWrapper.retrieveFile.mockResolvedValue({
        id: 'test-file-1',
        name: 'test.txt',
        size: 1024,
        type: 'text/plain',
        category: 'document',
        data: new ArrayBuffer(1024),
        metadata: {
          originalSize: 1024,
          compressed: false,
          storedAt: new Date(),
          checksum: 'abc123'
        }
      });

      const exists = await storage.fileExists('test-file-1');

      expect(exists).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      mockWrapper.retrieveFile.mockResolvedValue(null);

      const exists = await storage.fileExists('non-existent');

      expect(exists).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should throw error when not initialized', async () => {
      const uninitializedStorage = new IndexedDBStorage();

      await expect(uninitializedStorage.storeFile('id', new File([], 'test'), 'document'))
        .rejects.toThrow(StorageError);
    });

    it('should handle wrapper errors gracefully', async () => {
      mockWrapper.initialize.mockResolvedValue(undefined);
      await storage.initialize();

      const error = new Error('Wrapper error');
      mockWrapper.retrieveFile.mockRejectedValue(error);

      await expect(storage.retrieveFile('test-id'))
        .rejects.toThrow(StorageError);
    });
  });

  describe('utility methods', () => {
    it('should return database info', () => {
      const mockInfo = { name: 'TestDB', version: 1, isReady: true };
      mockWrapper.getDatabaseInfo.mockReturnValue(mockInfo);

      const result = storage.getDatabaseInfo();

      expect(result).toEqual(mockInfo);
    });

    it('should check if ready', () => {
      mockWrapper.isReady.mockReturnValue(true);

      const result = storage.isReady();

      expect(result).toBe(true);
    });

    it('should close connection', () => {
      storage.close();

      expect(mockWrapper.close).toHaveBeenCalled();
    });
  });
});