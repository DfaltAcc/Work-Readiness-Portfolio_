/**
 * Unit tests for IndexedDB wrapper
 * Tests database initialization, file operations, and error handling
 */

import { IndexedDBWrapper } from '../indexeddb-wrapper';
import { StoredFile, StorageError, StorageErrorType } from '../types';

// Mock IndexedDB for testing
class MockIDBDatabase {
  objectStoreNames = {
    contains: jest.fn()
  };
  createObjectStore = jest.fn();
  transaction = jest.fn();
  close = jest.fn();
  onerror = null;
}

class MockIDBRequest {
  result: any = null;
  error: any = null;
  onsuccess: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
}

class MockIDBTransaction {
  objectStore = jest.fn();
  error: any = null;
  onerror: ((event: any) => void) | null = null;
}

class MockIDBObjectStore {
  createIndex = jest.fn();
  put = jest.fn();
  get = jest.fn();
  delete = jest.fn();
  getAll = jest.fn();
  clear = jest.fn();
  index = jest.fn();
}

// Setup global mocks
const mockIndexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn()
};

const mockRequest = new MockIDBRequest();
const mockDatabase = new MockIDBDatabase();
const mockTransaction = new MockIDBTransaction();
const mockObjectStore = new MockIDBObjectStore();

// Mock global IndexedDB
Object.defineProperty(global, 'indexedDB', {
  value: mockIndexedDB,
  writable: true
});

Object.defineProperty(global, 'window', {
  value: {
    indexedDB: mockIndexedDB
  },
  writable: true
});

describe('IndexedDBWrapper', () => {
  let wrapper: IndexedDBWrapper;

  beforeEach(() => {
    wrapper = new IndexedDBWrapper('TestDB', 1);
    jest.clearAllMocks();
    
    // Setup default mock behavior
    mockIndexedDB.open.mockReturnValue(mockRequest);
    mockDatabase.transaction.mockReturnValue(mockTransaction);
    mockTransaction.objectStore.mockReturnValue(mockObjectStore);
  });

  describe('initialization', () => {
    it('should initialize successfully with IndexedDB support', async () => {
      // Setup successful initialization
      mockDatabase.objectStoreNames.contains.mockReturnValue(false);
      
      const initPromise = wrapper.initialize();
      
      // Simulate successful database opening
      setTimeout(() => {
        mockRequest.result = mockDatabase;
        if (mockRequest.onsuccess) {
          mockRequest.onsuccess({ target: mockRequest });
        }
      }, 0);

      await expect(initPromise).resolves.toBeUndefined();
      expect(wrapper.isReady()).toBe(true);
    });

    it('should handle IndexedDB unavailable error', async () => {
      // Mock IndexedDB not available
      Object.defineProperty(global, 'window', {
        value: {},
        writable: true
      });

      await expect(wrapper.initialize()).rejects.toThrow(StorageError);
      expect(wrapper.isReady()).toBe(false);
    });

    it('should handle database opening errors', async () => {
      const initPromise = wrapper.initialize();
      
      // Simulate database opening error
      setTimeout(() => {
        mockRequest.error = new Error('Database error');
        if (mockRequest.onerror) {
          mockRequest.onerror({ target: mockRequest });
        }
      }, 0);

      await expect(initPromise).rejects.toThrow(StorageError);
    });

    it('should create object stores during upgrade', async () => {
      mockDatabase.objectStoreNames.contains.mockReturnValue(false);
      
      const initPromise = wrapper.initialize();
      
      // Simulate upgrade needed
      setTimeout(() => {
        if (mockRequest.onupgradeneeded) {
          mockRequest.onupgradeneeded({ target: mockRequest });
        }
        mockRequest.result = mockDatabase;
        if (mockRequest.onsuccess) {
          mockRequest.onsuccess({ target: mockRequest });
        }
      }, 0);

      await initPromise;
      
      expect(mockDatabase.createObjectStore).toHaveBeenCalledWith('files', { keyPath: 'id' });
      expect(mockDatabase.createObjectStore).toHaveBeenCalledWith('metadata', { keyPath: 'key' });
    });
  });

  describe('file operations', () => {
    beforeEach(async () => {
      // Initialize wrapper for file operations
      const initPromise = wrapper.initialize();
      setTimeout(() => {
        mockRequest.result = mockDatabase;
        if (mockRequest.onsuccess) {
          mockRequest.onsuccess({ target: mockRequest });
        }
      }, 0);
      await initPromise;
    });

    it('should store a file successfully', async () => {
      const testFile: StoredFile = {
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
      };

      const mockPutRequest = new MockIDBRequest();
      mockObjectStore.put.mockReturnValue(mockPutRequest);

      const storePromise = wrapper.storeFile(testFile);
      
      // Simulate successful storage
      setTimeout(() => {
        if (mockPutRequest.onsuccess) {
          mockPutRequest.onsuccess({ target: mockPutRequest });
        }
      }, 0);

      await expect(storePromise).resolves.toBeUndefined();
      expect(mockObjectStore.put).toHaveBeenCalledWith(testFile);
    });

    it('should retrieve a file successfully', async () => {
      const testFile: StoredFile = {
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
      };

      const mockGetRequest = new MockIDBRequest();
      mockObjectStore.get.mockReturnValue(mockGetRequest);

      const retrievePromise = wrapper.retrieveFile('test-file-1');
      
      // Simulate successful retrieval
      setTimeout(() => {
        mockGetRequest.result = testFile;
        if (mockGetRequest.onsuccess) {
          mockGetRequest.onsuccess({ target: mockGetRequest });
        }
      }, 0);

      const result = await retrievePromise;
      expect(result).toEqual(testFile);
      expect(mockObjectStore.get).toHaveBeenCalledWith('test-file-1');
    });

    it('should return null for non-existent file', async () => {
      const mockGetRequest = new MockIDBRequest();
      mockObjectStore.get.mockReturnValue(mockGetRequest);

      const retrievePromise = wrapper.retrieveFile('non-existent');
      
      // Simulate file not found
      setTimeout(() => {
        mockGetRequest.result = undefined;
        if (mockGetRequest.onsuccess) {
          mockGetRequest.onsuccess({ target: mockGetRequest });
        }
      }, 0);

      const result = await retrievePromise;
      expect(result).toBeNull();
    });

    it('should delete a file successfully', async () => {
      const mockDeleteRequest = new MockIDBRequest();
      mockObjectStore.delete.mockReturnValue(mockDeleteRequest);

      const deletePromise = wrapper.deleteFile('test-file-1');
      
      // Simulate successful deletion
      setTimeout(() => {
        if (mockDeleteRequest.onsuccess) {
          mockDeleteRequest.onsuccess({ target: mockDeleteRequest });
        }
      }, 0);

      await expect(deletePromise).resolves.toBeUndefined();
      expect(mockObjectStore.delete).toHaveBeenCalledWith('test-file-1');
    });

    it('should list all files', async () => {
      const testFiles: StoredFile[] = [
        {
          id: 'file-1',
          name: 'test1.txt',
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
        },
        {
          id: 'file-2',
          name: 'test2.mp4',
          size: 2048,
          type: 'video/mp4',
          category: 'video',
          data: new ArrayBuffer(2048),
          metadata: {
            originalSize: 2048,
            compressed: false,
            storedAt: new Date(),
            checksum: 'def456'
          }
        }
      ];

      const mockGetAllRequest = new MockIDBRequest();
      mockObjectStore.getAll.mockReturnValue(mockGetAllRequest);

      const listPromise = wrapper.listFiles();
      
      // Simulate successful listing
      setTimeout(() => {
        mockGetAllRequest.result = testFiles;
        if (mockGetAllRequest.onsuccess) {
          mockGetAllRequest.onsuccess({ target: mockGetAllRequest });
        }
      }, 0);

      const result = await listPromise;
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('file-1');
      expect(result[1].id).toBe('file-2');
    });

    it('should list files by category', async () => {
      const testFiles: StoredFile[] = [
        {
          id: 'file-1',
          name: 'test1.txt',
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
        }
      ];

      const mockIndex = {
        getAll: jest.fn().mockReturnValue(new MockIDBRequest())
      };
      mockObjectStore.index.mockReturnValue(mockIndex);

      const listPromise = wrapper.listFiles('document');
      
      // Simulate successful category listing
      setTimeout(() => {
        const request = mockIndex.getAll.mock.results[0].value;
        request.result = testFiles;
        if (request.onsuccess) {
          request.onsuccess({ target: request });
        }
      }, 0);

      const result = await listPromise;
      expect(mockObjectStore.index).toHaveBeenCalledWith('category');
      expect(mockIndex.getAll).toHaveBeenCalledWith('document');
      expect(result).toHaveLength(1);
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      // Initialize wrapper for error testing
      const initPromise = wrapper.initialize();
      setTimeout(() => {
        mockRequest.result = mockDatabase;
        if (mockRequest.onsuccess) {
          mockRequest.onsuccess({ target: mockRequest });
        }
      }, 0);
      await initPromise;
    });

    it('should handle storage errors during file operations', async () => {
      const testFile: StoredFile = {
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
      };

      const mockPutRequest = new MockIDBRequest();
      mockObjectStore.put.mockReturnValue(mockPutRequest);

      const storePromise = wrapper.storeFile(testFile);
      
      // Simulate storage error
      setTimeout(() => {
        mockPutRequest.error = new Error('Storage failed');
        if (mockPutRequest.onerror) {
          mockPutRequest.onerror({ target: mockPutRequest });
        }
      }, 0);

      await expect(storePromise).rejects.toThrow(StorageError);
    });

    it('should handle transaction errors', async () => {
      const mockPutRequest = new MockIDBRequest();
      mockObjectStore.put.mockReturnValue(mockPutRequest);

      const testFile: StoredFile = {
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
      };

      const storePromise = wrapper.storeFile(testFile);
      
      // Simulate transaction error
      setTimeout(() => {
        mockTransaction.error = new Error('Transaction failed');
        if (mockTransaction.onerror) {
          mockTransaction.onerror({ target: mockTransaction });
        }
      }, 0);

      await expect(storePromise).rejects.toThrow(StorageError);
    });
  });

  describe('utility methods', () => {
    it('should return correct database info', () => {
      const info = wrapper.getDatabaseInfo();
      expect(info.name).toBe('TestDB');
      expect(info.version).toBe(1);
      expect(info.isReady).toBe(false);
    });

    it('should close database connection', () => {
      wrapper.close();
      expect(wrapper.isReady()).toBe(false);
    });
  });
});