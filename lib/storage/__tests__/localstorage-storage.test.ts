/**
 * Unit tests for localStorage storage operations
 * Tests base64 encoding/decoding, quota management, and fallback functionality
 */

import { LocalStorageStorage } from '../localstorage-storage';
import { StorageError, StorageErrorType } from '../types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      // Simulate quota exceeded for large values
      if (value.length > 1024 * 1024) { // 1MB limit for testing
        const error = new DOMException('Quota exceeded', 'QuotaExceededError');
        throw error;
      }
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => Object.keys(store)[index] || null)
  };
})();

// Mock window.localStorage
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Mock crypto.subtle for checksum calculation
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: jest.fn().mockResolvedValue(new ArrayBuffer(32))
    }
  },
  writable: true
});

describe('LocalStorageStorage', () => {
  let storage: LocalStorageStorage;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    storage = new LocalStorageStorage();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await storage.initialize();
      
      expect(storage.isReady()).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'portfolio_storage_usage',
        expect.stringContaining('"totalSize":0')
      );
    });

    it('should handle localStorage unavailable', async () => {
      // Mock localStorage as unavailable
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true
      });

      await expect(storage.initialize()).rejects.toThrow(StorageError);
      
      // Restore localStorage
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        writable: true
      });
    });

    it('should not reinitialize if already initialized', async () => {
      await storage.initialize();
      await storage.initialize();
      
      // Should only set usage tracking once
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
    });
  });

  describe('base64 encoding/decoding', () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it('should store and retrieve a text file with base64 encoding', async () => {
      const testContent = 'Hello, World! This is test content.';
      const testFile = new File([testContent], 'test.txt', { type: 'text/plain' });
      const fileId = 'test-file-1';

      // Store the file
      const storedFile = await storage.storeFile(fileId, testFile, 'document');
      
      expect(storedFile.id).toBe(fileId);
      expect(storedFile.name).toBe('test.txt');
      expect(storedFile.category).toBe('document');
      expect(storedFile.data).toMatch(/^[A-Za-z0-9+/]+=*$/); // Base64 pattern

      // Retrieve the file
      const retrievedFile = await storage.retrieveFile(fileId);
      
      expect(retrievedFile).toBeInstanceOf(File);
      expect(retrievedFile?.name).toBe('test.txt');
      expect(retrievedFile?.type).toBe('text/plain');
      
      // Verify content is preserved
      const retrievedContent = await retrievedFile?.text();
      expect(retrievedContent).toBe(testContent);
    });

    it('should handle binary data correctly', async () => {
      // Create binary data (image-like)
      const binaryData = new Uint8Array([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46
      ]);
      const testFile = new File([binaryData], 'test.jpg', { type: 'image/jpeg' });
      const fileId = 'binary-file-1';

      // Store the file
      await storage.storeFile(fileId, testFile, 'document');

      // Retrieve the file
      const retrievedFile = await storage.retrieveFile(fileId);
      
      expect(retrievedFile).toBeInstanceOf(File);
      expect(retrievedFile?.name).toBe('test.jpg');
      expect(retrievedFile?.type).toBe('image/jpeg');
      
      // Verify binary data is preserved
      const retrievedBuffer = await retrievedFile?.arrayBuffer();
      const retrievedData = new Uint8Array(retrievedBuffer!);
      expect(retrievedData).toEqual(binaryData);
    });

    it('should handle empty files', async () => {
      const testFile = new File([], 'empty.txt', { type: 'text/plain' });
      const fileId = 'empty-file';

      await storage.storeFile(fileId, testFile, 'document');
      const retrievedFile = await storage.retrieveFile(fileId);
      
      expect(retrievedFile).toBeInstanceOf(File);
      expect(retrievedFile?.size).toBe(0);
    });
  });

  describe('quota management', () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it('should track storage usage correctly', async () => {
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      // Get initial usage
      const initialUsage = await storage.getStorageUsage();
      expect(initialUsage.used).toBe(0);
      
      // Store a file
      await storage.storeFile('test-1', testFile, 'document');
      
      // Check updated usage
      const updatedUsage = await storage.getStorageUsage();
      expect(updatedUsage.used).toBeGreaterThan(0);
      expect(updatedUsage.percentage).toBeGreaterThan(0);
      expect(updatedUsage.available).toBeLessThan(initialUsage.available);
    });

    it('should handle quota exceeded errors', async () => {
      // Create a large file that will exceed the mock quota
      const largeContent = 'x'.repeat(2 * 1024 * 1024); // 2MB
      const largeFile = new File([largeContent], 'large.txt', { type: 'text/plain' });
      
      await expect(storage.storeFile('large-file', largeFile, 'document'))
        .rejects.toThrow(StorageError);
    });

    it('should update usage when deleting files', async () => {
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      // Store a file
      await storage.storeFile('test-1', testFile, 'document');
      const usageAfterStore = await storage.getStorageUsage();
      
      // Delete the file
      await storage.deleteFile('test-1');
      const usageAfterDelete = await storage.getStorageUsage();
      
      expect(usageAfterDelete.used).toBeLessThan(usageAfterStore.used);
    });

    it('should recalculate usage when tracking data is corrupted', async () => {
      // Store a file first
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      await storage.storeFile('test-1', testFile, 'document');
      
      // Corrupt the usage tracking data
      localStorageMock.setItem('portfolio_storage_usage', 'invalid json');
      
      // Should still calculate usage correctly
      const usage = await storage.getStorageUsage();
      expect(usage.used).toBeGreaterThan(0);
    });
  });

  describe('file operations', () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it('should return null for non-existent file', async () => {
      const result = await storage.retrieveFile('non-existent');
      expect(result).toBeNull();
    });

    it('should handle file corruption detection', async () => {
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      await storage.storeFile('test-1', testFile, 'document');
      
      // Manually corrupt the stored file data
      const corruptedData = JSON.stringify({
        id: 'test-1',
        name: 'test.txt',
        size: 12,
        type: 'text/plain',
        category: 'document',
        data: 'dGVzdCBjb250ZW50', // base64 for "test content"
        metadata: {
          originalSize: 12,
          compressed: false,
          storedAt: new Date(),
          checksum: 'wrong-checksum' // Intentionally wrong
        }
      });
      
      localStorageMock.setItem('portfolio_file_test-1', corruptedData);
      
      await expect(storage.retrieveFile('test-1')).rejects.toThrow(StorageError);
    });

    it('should delete files successfully', async () => {
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      await storage.storeFile('test-1', testFile, 'document');
      
      // Verify file exists
      expect(await storage.fileExists('test-1')).toBe(true);
      
      // Delete file
      await storage.deleteFile('test-1');
      
      // Verify file is gone
      expect(await storage.fileExists('test-1')).toBe(false);
    });

    it('should handle deletion of non-existent file', async () => {
      await expect(storage.deleteFile('non-existent'))
        .rejects.toThrow(StorageError);
    });

    it('should list files correctly', async () => {
      const file1 = new File(['content 1'], 'file1.txt', { type: 'text/plain' });
      const file2 = new File(['content 2'], 'file2.mp4', { type: 'video/mp4' });
      
      await storage.storeFile('file-1', file1, 'document');
      await storage.storeFile('file-2', file2, 'video');
      
      // List all files
      const allFiles = await storage.listFiles();
      expect(allFiles).toHaveLength(2);
      
      // List by category
      const documents = await storage.listFiles('document');
      expect(documents).toHaveLength(1);
      expect(documents[0].name).toBe('file1.txt');
      
      const videos = await storage.listFiles('video');
      expect(videos).toHaveLength(1);
      expect(videos[0].name).toBe('file2.mp4');
    });

    it('should handle corrupted file entries during listing', async () => {
      // Store a valid file
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      await storage.storeFile('valid-file', testFile, 'document');
      
      // Add a corrupted entry
      localStorageMock.setItem('portfolio_file_corrupted', 'invalid json');
      
      // Should still list valid files and skip corrupted ones
      const files = await storage.listFiles();
      expect(files).toHaveLength(1);
      expect(files[0].name).toBe('test.txt');
    });

    it('should clear all files', async () => {
      const file1 = new File(['content 1'], 'file1.txt', { type: 'text/plain' });
      const file2 = new File(['content 2'], 'file2.txt', { type: 'text/plain' });
      
      await storage.storeFile('file-1', file1, 'document');
      await storage.storeFile('file-2', file2, 'document');
      
      // Verify files exist
      expect(await storage.listFiles()).toHaveLength(2);
      
      // Clear all files
      await storage.clearAllFiles();
      
      // Verify files are gone
      expect(await storage.listFiles()).toHaveLength(0);
      
      // Verify usage is reset
      const usage = await storage.getStorageUsage();
      expect(usage.used).toBe(0);
    });
  });

  describe('metadata operations', () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it('should store and retrieve metadata', async () => {
      const testData = { setting: 'value', number: 42 };
      
      await storage.storeMetadata('test-key', testData);
      const retrieved = await storage.retrieveMetadata('test-key');
      
      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent metadata', async () => {
      const result = await storage.retrieveMetadata('non-existent');
      expect(result).toBeNull();
    });

    it('should handle metadata quota exceeded', async () => {
      const largeData = { data: 'x'.repeat(2 * 1024 * 1024) }; // 2MB
      
      await expect(storage.storeMetadata('large-key', largeData))
        .rejects.toThrow(StorageError);
    });

    it('should get file metadata without full file', async () => {
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      await storage.storeFile('test-1', testFile, 'document');
      
      const metadata = await storage.getFileMetadata('test-1');
      
      expect(metadata).toEqual({
        id: 'test-1',
        name: 'test.txt',
        size: expect.any(Number),
        type: 'text/plain',
        category: 'document',
        storedAt: expect.any(Date),
        compressed: false
      });
    });

    it('should return null for non-existent file metadata', async () => {
      const metadata = await storage.getFileMetadata('non-existent');
      expect(metadata).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should throw error when not initialized', async () => {
      const uninitializedStorage = new LocalStorageStorage();
      
      await expect(uninitializedStorage.storeFile('id', new File([], 'test'), 'document'))
        .rejects.toThrow(StorageError);
    });

    it('should handle localStorage access errors gracefully', async () => {
      await storage.initialize();
      
      // Mock localStorage.getItem to throw an error
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Access denied');
      });
      
      await expect(storage.retrieveFile('test-id'))
        .rejects.toThrow(StorageError);
    });

    it('should handle JSON parsing errors', async () => {
      await storage.initialize();
      
      // Set invalid JSON data
      localStorageMock.setItem('portfolio_file_test', 'invalid json');
      
      await expect(storage.retrieveFile('test'))
        .rejects.toThrow(StorageError);
    });
  });

  describe('utility methods', () => {
    it('should check if ready', async () => {
      expect(storage.isReady()).toBe(false);
      
      await storage.initialize();
      expect(storage.isReady()).toBe(true);
    });

    it('should close storage', async () => {
      await storage.initialize();
      expect(storage.isReady()).toBe(true);
      
      storage.close();
      expect(storage.isReady()).toBe(false);
    });

    it('should return storage capacity', async () => {
      const capacity = storage.getStorageCapacity();
      expect(capacity).toBe(5 * 1024 * 1024); // 5MB default
    });

    it('should check file existence', async () => {
      const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      
      expect(await storage.fileExists('test-1')).toBe(false);
      
      await storage.storeFile('test-1', testFile, 'document');
      expect(await storage.fileExists('test-1')).toBe(true);
    });
  });

  describe('checksum validation', () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it('should use simple hash fallback when crypto.subtle unavailable', async () => {
      // Remove crypto.subtle
      Object.defineProperty(global, 'crypto', {
        value: undefined,
        writable: true
      });

      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      // Should still work with fallback hash
      await storage.storeFile('test-1', testFile, 'document');
      const retrieved = await storage.retrieveFile('test-1');
      
      expect(retrieved).toBeInstanceOf(File);
      expect(retrieved?.name).toBe('test.txt');
      
      // Restore crypto
      Object.defineProperty(global, 'crypto', {
        value: {
          subtle: {
            digest: jest.fn().mockResolvedValue(new ArrayBuffer(32))
          }
        },
        writable: true
      });
    });

    it('should handle crypto.subtle errors gracefully', async () => {
      // Mock crypto.subtle to throw an error
      Object.defineProperty(global, 'crypto', {
        value: {
          subtle: {
            digest: jest.fn().mockRejectedValue(new Error('Crypto error'))
          }
        },
        writable: true
      });

      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      // Should fallback to simple hash
      await storage.storeFile('test-1', testFile, 'document');
      const retrieved = await storage.retrieveFile('test-1');
      
      expect(retrieved).toBeInstanceOf(File);
    });
  });
});