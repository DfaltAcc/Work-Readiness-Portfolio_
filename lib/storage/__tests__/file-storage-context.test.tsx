/**
 * Integration tests for FileStorageContext
 * Tests context state management and storage operations
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { 
  FileStorageProvider, 
  useFileStorage, 
  useFileStorageState 
} from '../file-storage-context';
import { FileStorageService } from '../file-storage-service';
import { FileProcessor } from '../file-processor';
import { StorageMethod, StorageError, StorageErrorType } from '../types';

// Mock the storage services
jest.mock('../file-storage-service');
jest.mock('../file-processor');

const MockedFileStorageService = FileStorageService as jest.MockedClass<typeof FileStorageService>;
const MockedFileProcessor = FileProcessor as jest.MockedClass<typeof FileProcessor>;

// Test component that uses the context
function TestComponent() {
  const storage = useFileStorage();
  const state = useFileStorageState();

  return (
    <div>
      <div data-testid="loading">{state.isInitialized ? 'initialized' : 'not-initialized'}</div>
      <div data-testid="method">{state.storageMethod}</div>
      <div data-testid="files-count">{state.files.length}</div>
      <div data-testid="error">{storage.error || 'no-error'}</div>
      <div data-testid="storage-usage">
        {state.storageUsage ? `${state.storageUsage.percentage}%` : 'no-usage'}
      </div>
      <div data-testid="storage-warning">
        {state.storageWarning ? state.storageWarning.type : 'no-warning'}
      </div>
      <button 
        data-testid="store-file" 
        onClick={async () => {
          try {
            const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
            await storage.storeFile(file, 'document');
          } catch (error) {
            // Error is handled by the context and displayed in the UI
          }
        }}
      >
        Store File
      </button>
      <button 
        data-testid="clear-files" 
        onClick={() => storage.clearAllFiles()}
      >
        Clear Files
      </button>
    </div>
  );
}

describe('FileStorageContext', () => {
  let mockFileStorageService: jest.Mocked<FileStorageService>;
  let mockFileProcessor: jest.Mocked<FileProcessor>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock instances
    mockFileStorageService = {
      initializeStorage: jest.fn(),
      validateFile: jest.fn(),
      generateFileId: jest.fn(),
      storeFile: jest.fn(),
      retrieveFile: jest.fn(),
      deleteFile: jest.fn(),
      listFiles: jest.fn(),
      getStorageUsage: jest.fn(),
      clearAllFiles: jest.fn(),
      close: jest.fn(),
      isAvailable: jest.fn(),
      getStorageMethod: jest.fn(),
      getConfig: jest.fn()
    } as any;

    mockFileProcessor = {
      processFile: jest.fn()
    } as any;

    // Mock constructor returns
    MockedFileStorageService.mockImplementation(() => mockFileStorageService);
    MockedFileProcessor.mockImplementation(() => mockFileProcessor);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize storage on mount', async () => {
      mockFileStorageService.initializeStorage.mockResolvedValue({
        method: StorageMethod.INDEXEDDB,
        available: true
      });

      mockFileStorageService.listFiles.mockResolvedValue([]);
      mockFileStorageService.getStorageUsage.mockResolvedValue({
        used: 1024,
        available: 50 * 1024 * 1024,
        percentage: 0.002
      });

      render(
        <FileStorageProvider>
          <TestComponent />
        </FileStorageProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('initialized');
      });

      expect(screen.getByTestId('method')).toHaveTextContent(StorageMethod.INDEXEDDB);
      expect(mockFileStorageService.initializeStorage).toHaveBeenCalledTimes(1);
      expect(mockFileStorageService.listFiles).toHaveBeenCalledTimes(1);
      expect(mockFileStorageService.getStorageUsage).toHaveBeenCalledTimes(1);
    });

    it('should handle initialization failure', async () => {
      const error = new StorageError(
        StorageErrorType.STORAGE_UNAVAILABLE,
        'Storage initialization failed'
      );
      
      mockFileStorageService.initializeStorage.mockRejectedValue(error);

      render(
        <FileStorageProvider>
          <TestComponent />
        </FileStorageProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Storage initialization failed');
      });

      expect(screen.getByTestId('loading')).toHaveTextContent('not-initialized');
    });

    it('should handle storage fallback notification', async () => {
      mockFileStorageService.initializeStorage.mockResolvedValue({
        method: StorageMethod.INDEXEDDB,
        available: true
      });

      mockFileStorageService.listFiles.mockResolvedValue([]);
      mockFileStorageService.getStorageUsage.mockResolvedValue({
        used: 1024,
        available: 50 * 1024 * 1024,
        percentage: 0.002
      });

      render(
        <FileStorageProvider>
          <TestComponent />
        </FileStorageProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('initialized');
      });

      // Simulate storage fallback event
      act(() => {
        window.dispatchEvent(new CustomEvent('storage-fallback-notification', {
          detail: {
            method: StorageMethod.LOCALSTORAGE,
            message: 'Fallback to localStorage'
          }
        }));
      });

      await waitFor(() => {
        expect(screen.getByTestId('method')).toHaveTextContent(StorageMethod.LOCALSTORAGE);
      });
    });
  });

  describe('File Operations', () => {
    beforeEach(async () => {
      mockFileStorageService.initializeStorage.mockResolvedValue({
        method: StorageMethod.INDEXEDDB,
        available: true
      });

      mockFileStorageService.listFiles.mockResolvedValue([]);
      mockFileStorageService.getStorageUsage.mockResolvedValue({
        used: 1024,
        available: 50 * 1024 * 1024,
        percentage: 0.002
      });
    });

    it('should store a file successfully', async () => {
      const fileId = 'test-file-id';
      const processedData = {
        processedFile: new ArrayBuffer(100),
        metadata: {
          originalSize: 200,
          compressed: true,
          storedAt: new Date(),
          checksum: 'test-checksum'
        },
        compressed: true,
        originalSize: 200,
        finalSize: 100
      };

      mockFileStorageService.generateFileId.mockReturnValue(fileId);
      mockFileProcessor.processFile.mockResolvedValue(processedData);
      mockFileStorageService.storeFile.mockResolvedValue();
      
      // Mock updated storage usage after file storage
      mockFileStorageService.getStorageUsage.mockResolvedValue({
        used: 1124,
        available: 50 * 1024 * 1024 - 100,
        percentage: 0.0022
      });

      render(
        <FileStorageProvider>
          <TestComponent />
        </FileStorageProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('initialized');
      });

      const storeButton = screen.getByTestId('store-file');
      
      await act(async () => {
        storeButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('files-count')).toHaveTextContent('1');
      });

      expect(mockFileStorageService.validateFile).toHaveBeenCalled();
      expect(mockFileStorageService.generateFileId).toHaveBeenCalled();
      expect(mockFileProcessor.processFile).toHaveBeenCalled();
      expect(mockFileStorageService.storeFile).toHaveBeenCalledWith(
        fileId,
        expect.any(File),
        'document',
        processedData.processedFile
      );
    });

    it('should handle file storage errors', async () => {
      mockFileStorageService.validateFile.mockImplementation(() => {
        throw new StorageError(
          StorageErrorType.QUOTA_EXCEEDED,
          'Storage quota exceeded'
        );
      });

      render(
        <FileStorageProvider>
          <TestComponent />
        </FileStorageProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('initialized');
      });

      const storeButton = screen.getByTestId('store-file');
      
      await act(async () => {
        storeButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Storage quota exceeded');
      });
    });

    it('should clear all files successfully', async () => {
      // Setup initial state with files
      mockFileStorageService.listFiles.mockResolvedValue([
        {
          id: 'file1',
          name: 'test1.txt',
          size: 100,
          type: 'text/plain',
          category: 'document',
          storedAt: new Date(),
          compressed: false
        }
      ]);

      mockFileStorageService.clearAllFiles.mockResolvedValue();
      mockFileStorageService.getStorageUsage.mockResolvedValue({
        used: 0,
        available: 50 * 1024 * 1024,
        percentage: 0
      });

      render(
        <FileStorageProvider>
          <TestComponent />
        </FileStorageProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('files-count')).toHaveTextContent('1');
      });

      const clearButton = screen.getByTestId('clear-files');
      
      await act(async () => {
        clearButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('files-count')).toHaveTextContent('0');
      });

      expect(mockFileStorageService.clearAllFiles).toHaveBeenCalled();
    });
  });

  describe('Storage Usage Tracking', () => {
    beforeEach(async () => {
      mockFileStorageService.initializeStorage.mockResolvedValue({
        method: StorageMethod.INDEXEDDB,
        available: true
      });

      mockFileStorageService.listFiles.mockResolvedValue([]);
    });

    it('should display storage usage information', async () => {
      mockFileStorageService.getStorageUsage.mockResolvedValue({
        used: 40 * 1024 * 1024, // 40MB
        available: 10 * 1024 * 1024, // 10MB
        percentage: 80 // 80% usage
      });

      render(
        <FileStorageProvider>
          <TestComponent />
        </FileStorageProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('storage-usage')).toHaveTextContent('80%');
      });
    });

    it('should show storage warning when threshold is exceeded', async () => {
      mockFileStorageService.getStorageUsage.mockResolvedValue({
        used: 42 * 1024 * 1024, // 42MB
        available: 8 * 1024 * 1024, // 8MB
        percentage: 84 // 84% usage (above 80% warning threshold)
      });

      render(
        <FileStorageProvider>
          <TestComponent />
        </FileStorageProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('storage-warning')).toHaveTextContent('warning');
      });
    });

    it('should show storage error when critical threshold is exceeded', async () => {
      mockFileStorageService.getStorageUsage.mockResolvedValue({
        used: 48 * 1024 * 1024, // 48MB
        available: 2 * 1024 * 1024, // 2MB
        percentage: 96 // 96% usage (above 95% error threshold)
      });

      render(
        <FileStorageProvider>
          <TestComponent />
        </FileStorageProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('storage-warning')).toHaveTextContent('error');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle storage service errors gracefully', async () => {
      mockFileStorageService.initializeStorage.mockResolvedValue({
        method: StorageMethod.INDEXEDDB,
        available: true
      });

      mockFileStorageService.listFiles.mockRejectedValue(
        new Error('Failed to load files')
      );

      mockFileStorageService.getStorageUsage.mockResolvedValue({
        used: 1024,
        available: 50 * 1024 * 1024,
        percentage: 0.002
      });

      // Should not crash the component
      render(
        <FileStorageProvider>
          <TestComponent />
        </FileStorageProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('initialized');
      });

      // Files count should remain 0 due to load failure
      expect(screen.getByTestId('files-count')).toHaveTextContent('0');
    });

    it('should handle storage usage errors gracefully', async () => {
      mockFileStorageService.initializeStorage.mockResolvedValue({
        method: StorageMethod.INDEXEDDB,
        available: true
      });

      mockFileStorageService.listFiles.mockResolvedValue([]);
      mockFileStorageService.getStorageUsage.mockRejectedValue(
        new Error('Failed to get storage usage')
      );

      render(
        <FileStorageProvider>
          <TestComponent />
        </FileStorageProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('initialized');
      });

      // Should show no usage info when it fails to load
      expect(screen.getByTestId('storage-usage')).toHaveTextContent('no-usage');
    });
  });

  describe('Context Hooks', () => {
    it('should throw error when useFileStorage is used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      function TestComponentOutsideProvider() {
        useFileStorage();
        return <div>Test</div>;
      }

      expect(() => {
        render(<TestComponentOutsideProvider />);
      }).toThrow('useFileStorage must be used within a FileStorageProvider');

      consoleSpy.mockRestore();
    });

    it('should throw error when useFileStorageState is used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      function TestComponentOutsideProvider() {
        useFileStorageState();
        return <div>Test</div>;
      }

      expect(() => {
        render(<TestComponentOutsideProvider />);
      }).toThrow('useFileStorageState must be used within a FileStorageProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup storage service on unmount', async () => {
      mockFileStorageService.initializeStorage.mockResolvedValue({
        method: StorageMethod.INDEXEDDB,
        available: true
      });

      mockFileStorageService.listFiles.mockResolvedValue([]);
      mockFileStorageService.getStorageUsage.mockResolvedValue({
        used: 1024,
        available: 50 * 1024 * 1024,
        percentage: 0.002
      });

      const { unmount } = render(
        <FileStorageProvider>
          <TestComponent />
        </FileStorageProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('initialized');
      });

      unmount();

      expect(mockFileStorageService.close).toHaveBeenCalled();
    });
  });
});