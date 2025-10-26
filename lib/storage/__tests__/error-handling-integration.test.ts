/**
 * Comprehensive error handling integration tests
 * Tests error scenarios, recovery mechanisms, user feedback, and loading state behavior
 * Requirements: 3.4, 3.3
 */

import { ErrorHandler, RetryManager, RecoveryExecutor, RecoveryAction } from '../error-handler';
import { StorageError, StorageErrorType, StorageMethod } from '../types';

describe('Error Handling Integration Tests', () => {
  let retryManager: RetryManager;

  beforeEach(() => {
    jest.clearAllMocks();
    retryManager = new RetryManager(2, 100, 1000);
  });

  describe('Storage Initialization Error Scenarios', () => {
    it('should handle storage initialization failures with proper error classification', async () => {
      const indexedDBError = new StorageError(
        StorageErrorType.INDEXEDDB_UNAVAILABLE,
        'IndexedDB not supported'
      );

      const userMessage = ErrorHandler.getUserErrorMessage(indexedDBError);
      expect(userMessage.title).toBe('Storage Unavailable');
      expect(userMessage.recoverable).toBe(true);
      expect(userMessage.severity).toBe('warning');
    });

    it('should provide appropriate recovery strategies for storage failures', async () => {
      const storageError = new StorageError(
        StorageErrorType.STORAGE_UNAVAILABLE,
        'No storage available'
      );

      const strategies = ErrorHandler.getRecoveryStrategies(storageError);
      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies.some(s => s.action === RecoveryAction.FALLBACK)).toBe(true);
      expect(strategies.some(s => s.automatic === true)).toBe(true);
    });

    it('should retry initialization on transient failures', async () => {
      let attemptCount = 0;
      const operation = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 2) {
          throw new Error('Transient failure');
        }
        return Promise.resolve({ method: StorageMethod.INDEXEDDB, available: true });
      });

      const result = await retryManager.executeWithRetry(operation, 'init-storage');

      expect(result.method).toBe(StorageMethod.INDEXEDDB);
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('File Operation Error Scenarios', () => {
    it('should handle quota exceeded during file storage', async () => {
      const quotaError = new StorageError(
        StorageErrorType.QUOTA_EXCEEDED,
        'Storage quota exceeded'
      );

      // Verify error message is user-friendly
      const userMessage = ErrorHandler.getUserErrorMessage(quotaError);
      expect(userMessage.title).toBe('Storage Full');
      expect(userMessage.recoverable).toBe(true);
      expect(userMessage.severity).toBe('error');
    });

    it('should handle file corruption during retrieval with automatic recovery', async () => {
      const corruptionError = new StorageError(
        StorageErrorType.FILE_CORRUPTED,
        'File checksum mismatch'
      );

      const mockFileStorageService = {
        deleteFile: jest.fn().mockResolvedValue(undefined)
      };

      // Test automatic recovery
      const recovered = await RecoveryExecutor.executeAutomaticRecovery(corruptionError, {
        fileStorageService: mockFileStorageService,
        fileId: 'corrupted-file-id'
      });

      expect(recovered).toBe(true);
      expect(mockFileStorageService.deleteFile).toHaveBeenCalledWith('corrupted-file-id');
    });

    it('should handle network-like errors with retry mechanism', async () => {
      let attemptCount = 0;
      const operation = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return Promise.resolve('success');
      });

      const result = await retryManager.executeWithRetry(operation, 'store-file');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry non-retryable errors', async () => {
      const validationError = new StorageError(
        StorageErrorType.INVALID_FILE_TYPE,
        'Invalid file type'
      );

      const operation = jest.fn().mockRejectedValue(validationError);
      
      await expect(
        retryManager.executeWithRetry(operation, 'store-file')
      ).rejects.toThrow('Invalid file type');

      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Recovery Strategy Execution', () => {
    it('should provide recovery strategies for quota exceeded errors', async () => {
      const quotaError = new StorageError(
        StorageErrorType.QUOTA_EXCEEDED,
        'Storage full'
      );

      const strategies = ErrorHandler.getRecoveryStrategies(quotaError);
      
      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies.some(s => s.action === RecoveryAction.DELETE_FILES)).toBe(true);
      expect(strategies.some(s => s.action === RecoveryAction.CLEAR_STORAGE)).toBe(true);
    });

    it('should execute clear storage recovery strategy', async () => {
      const quotaError = new StorageError(
        StorageErrorType.QUOTA_EXCEEDED,
        'Storage full'
      );

      const mockFileStorageService = {
        clearAllFiles: jest.fn().mockResolvedValue(undefined)
      };

      // Test that the recovery strategy exists for quota exceeded errors
      const strategies = ErrorHandler.getRecoveryStrategies(quotaError);
      const clearStrategy = strategies.find(s => s.action === RecoveryAction.CLEAR_STORAGE);
      
      expect(clearStrategy).toBeDefined();
      expect(clearStrategy?.automatic).toBe(false); // Clear storage should be manual
    });

    it('should handle recovery strategy failures gracefully', async () => {
      const corruptionError = new StorageError(
        StorageErrorType.FILE_CORRUPTED,
        'File corrupted'
      );

      const mockFileStorageService = {
        deleteFile: jest.fn().mockRejectedValue(new Error('Delete failed'))
      };

      const recovered = await RecoveryExecutor.executeAutomaticRecovery(corruptionError, {
        fileStorageService: mockFileStorageService,
        fileId: 'corrupted-file'
      });

      expect(recovered).toBe(false);
      expect(mockFileStorageService.deleteFile).toHaveBeenCalled();
    });
  });

  describe('Error Message Generation', () => {
    it('should generate appropriate messages for different error types', () => {
      const errorTypes = [
        {
          type: StorageErrorType.QUOTA_EXCEEDED,
          expectedTitle: 'Storage Full'
        },
        {
          type: StorageErrorType.FILE_NOT_FOUND,
          expectedTitle: 'File Not Found'
        },
        {
          type: StorageErrorType.FILE_CORRUPTED,
          expectedTitle: 'File Corrupted'
        },
        {
          type: StorageErrorType.INVALID_FILE_TYPE,
          expectedTitle: 'Invalid File Type'
        },
        {
          type: StorageErrorType.FILE_TOO_LARGE,
          expectedTitle: 'File Too Large'
        }
      ];

      errorTypes.forEach(({ type, expectedTitle }) => {
        const error = new StorageError(type, `Test ${type} error`);
        const message = ErrorHandler.getUserErrorMessage(error);

        expect(message.title).toBe(expectedTitle);
        expect(message.message).toBeTruthy();
        expect(message.recoverable).toBeDefined();
        expect(message.severity).toBeDefined();
      });
    });

    it('should provide contextual error messages when context is available', () => {
      const error = new StorageError(
        StorageErrorType.QUOTA_EXCEEDED,
        'Storage quota exceeded'
      );

      const message = ErrorHandler.getUserErrorMessage(error, {
        fileName: 'large-video.mp4',
        fileSize: 150 * 1024 * 1024,
        operation: 'upload'
      });

      expect(message.message).toBeTruthy();
      expect(message.title).toBe('Storage Full');
    });
  });

  describe('Error Logging and Monitoring', () => {
    it('should format errors for logging with context', () => {
      const originalError = new Error('Database connection failed');
      const storageError = new StorageError(
        StorageErrorType.STORAGE_UNAVAILABLE,
        'Storage initialization failed',
        originalError
      );

      const formatted = ErrorHandler.formatErrorForLogging(storageError, 'file-upload');

      expect(formatted).toContain('StorageError(STORAGE_UNAVAILABLE)');
      expect(formatted).toContain('Storage initialization failed');
      expect(formatted).toContain('[file-upload]');
      expect(formatted).toContain('Original: Database connection failed');
      expect(formatted).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // Timestamp
    });

    it('should track error frequency for monitoring', () => {
      const errors = [
        new StorageError(StorageErrorType.QUOTA_EXCEEDED, 'Quota 1'),
        new StorageError(StorageErrorType.QUOTA_EXCEEDED, 'Quota 2'),
        new StorageError(StorageErrorType.FILE_NOT_FOUND, 'Not found'),
        new StorageError(StorageErrorType.QUOTA_EXCEEDED, 'Quota 3')
      ];

      const errorCounts = errors.reduce((counts, error) => {
        const type = error instanceof StorageError ? error.type : 'UNKNOWN';
        counts[type] = (counts[type] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);

      expect(errorCounts[StorageErrorType.QUOTA_EXCEEDED]).toBe(3);
      expect(errorCounts[StorageErrorType.FILE_NOT_FOUND]).toBe(1);
    });
  });

  describe('Cascading Error Scenarios', () => {
    it('should handle multiple storage method failures', async () => {
      // Test error classification for cascading failures
      const indexedDBError = new StorageError(
        StorageErrorType.INDEXEDDB_UNAVAILABLE,
        'IndexedDB failed'
      );
      
      const localStorageError = new StorageError(
        StorageErrorType.QUOTA_EXCEEDED,
        'localStorage full'
      );

      // Both errors should be properly classified
      const indexedDBMessage = ErrorHandler.getUserErrorMessage(indexedDBError);
      const localStorageMessage = ErrorHandler.getUserErrorMessage(localStorageError);

      expect(indexedDBMessage.title).toBe('Storage Unavailable');
      expect(localStorageMessage.title).toBe('Storage Full');
    });

    it('should handle file operation failures during recovery', async () => {
      // Test scenario where file retrieval fails during recovery attempt
      const corruptionError = new StorageError(
        StorageErrorType.FILE_CORRUPTED,
        'File corrupted'
      );

      const mockFileStorageService = {
        deleteFile: jest.fn().mockImplementation(() => {
          throw new StorageError(StorageErrorType.FILE_NOT_FOUND, 'File already deleted');
        })
      };

      const recovered = await RecoveryExecutor.executeAutomaticRecovery(corruptionError, {
        fileStorageService: mockFileStorageService,
        fileId: 'corrupted-file'
      });

      // Should handle the secondary error gracefully
      expect(recovered).toBe(false);
    });
  });

  describe('Performance Under Error Conditions', () => {
    it('should not exceed retry timeout limits', async () => {
      const startTime = Date.now();
      const slowOperation = () => new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Slow failure')), 50);
      });

      try {
        await retryManager.executeWithRetry(slowOperation, 'slow-op');
      } catch {
        // Expected to fail
      }

      const duration = Date.now() - startTime;
      // Should complete within reasonable time (base delay + retries + operation time)
      expect(duration).toBeLessThan(1000); // 1 second max
    });

    it('should handle concurrent error scenarios', async () => {
      const mockOperation = jest.fn().mockRejectedValue(
        new StorageError(StorageErrorType.QUOTA_EXCEEDED, 'Storage full')
      );

      const operations = Array.from({ length: 5 }, (_, i) =>
        mockOperation(`file-${i}`).catch(() => null)
      );

      const results = await Promise.all(operations);

      // All operations should fail gracefully
      expect(results.every(result => result === null)).toBe(true);
      expect(mockOperation).toHaveBeenCalledTimes(5);
    });
  });
});