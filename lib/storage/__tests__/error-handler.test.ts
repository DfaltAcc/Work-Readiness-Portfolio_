/**
 * Unit tests for error handling utilities
 * Tests error classification, user message generation, and recovery mechanisms
 */

import { 
  ErrorHandler, 
  RetryManager, 
  RecoveryExecutor,
  RecoveryAction,
  UserErrorMessage 
} from '../error-handler';
import { StorageError, StorageErrorType } from '../types';

describe('ErrorHandler', () => {
  describe('getUserErrorMessage', () => {
    it('should return appropriate message for storage errors', () => {
      const error = new StorageError(
        StorageErrorType.QUOTA_EXCEEDED,
        'Storage quota exceeded'
      );

      const message = ErrorHandler.getUserErrorMessage(error);

      expect(message.title).toBe('Storage Full');
      expect(message.message).toContain('storage is full');
      expect(message.recoverable).toBe(true);
      expect(message.severity).toBe('error');
    });

    it('should handle generic errors', () => {
      const error = new Error('Generic error message');

      const message = ErrorHandler.getUserErrorMessage(error);

      expect(message.title).toBe('Unexpected Error');
      expect(message.message).toBe('Generic error message');
      expect(message.recoverable).toBe(true);
      expect(message.severity).toBe('error');
    });

    it('should provide fallback for unknown storage error types', () => {
      const error = new StorageError(
        'UNKNOWN_TYPE' as StorageErrorType,
        'Unknown error'
      );

      const message = ErrorHandler.getUserErrorMessage(error);

      expect(message.title).toBe('Storage Error');
      expect(message.message).toBe('Unknown error');
      expect(message.recoverable).toBe(true);
    });
  });

  describe('getRecoveryStrategies', () => {
    it('should return appropriate strategies for quota exceeded', () => {
      const error = new StorageError(
        StorageErrorType.QUOTA_EXCEEDED,
        'Storage full'
      );

      const strategies = ErrorHandler.getRecoveryStrategies(error);

      expect(strategies).toHaveLength(2);
      expect(strategies[0].action).toBe(RecoveryAction.DELETE_FILES);
      expect(strategies[1].action).toBe(RecoveryAction.CLEAR_STORAGE);
      expect(strategies[0].automatic).toBe(false);
    });

    it('should return automatic fallback for IndexedDB unavailable', () => {
      const error = new StorageError(
        StorageErrorType.INDEXEDDB_UNAVAILABLE,
        'IndexedDB not supported'
      );

      const strategies = ErrorHandler.getRecoveryStrategies(error);

      expect(strategies).toHaveLength(1);
      expect(strategies[0].action).toBe(RecoveryAction.FALLBACK);
      expect(strategies[0].automatic).toBe(true);
    });

    it('should return no recovery for non-recoverable errors', () => {
      const error = new StorageError(
        StorageErrorType.INVALID_FILE_TYPE,
        'Invalid file type'
      );

      const strategies = ErrorHandler.getRecoveryStrategies(error);

      expect(strategies).toHaveLength(1);
      expect(strategies[0].action).toBe(RecoveryAction.NONE);
    });
  });

  describe('isRecoverable', () => {
    it('should identify recoverable errors', () => {
      const recoverableError = new StorageError(
        StorageErrorType.QUOTA_EXCEEDED,
        'Storage full'
      );

      expect(ErrorHandler.isRecoverable(recoverableError)).toBe(true);
    });

    it('should identify non-recoverable errors', () => {
      const nonRecoverableError = new StorageError(
        StorageErrorType.INVALID_FILE_TYPE,
        'Invalid file'
      );

      expect(ErrorHandler.isRecoverable(nonRecoverableError)).toBe(false);
    });
  });

  describe('formatErrorForLogging', () => {
    it('should format storage errors with context', () => {
      const error = new StorageError(
        StorageErrorType.FILE_NOT_FOUND,
        'File not found',
        new Error('Original error')
      );

      const formatted = ErrorHandler.formatErrorForLogging(error, 'test-context');

      expect(formatted).toContain('StorageError(FILE_NOT_FOUND)');
      expect(formatted).toContain('File not found');
      expect(formatted).toContain('[test-context]');
      expect(formatted).toContain('Original: Original error');
    });

    it('should format generic errors', () => {
      const error = new Error('Generic error');

      const formatted = ErrorHandler.formatErrorForLogging(error);

      expect(formatted).toContain('Error: Generic error');
      expect(formatted).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO timestamp
    });
  });
});

describe('RetryManager', () => {
  let retryManager: RetryManager;

  beforeEach(() => {
    retryManager = new RetryManager(2, 100, 1000); // 2 retries, 100ms base delay
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await retryManager.executeWithRetry(operation, 'test-op');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new StorageError(StorageErrorType.FILE_NOT_FOUND, 'Not found'))
        .mockResolvedValue('success');

      const result = await retryManager.executeWithRetry(operation, 'test-op');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-retryable errors', async () => {
      const operation = jest.fn()
        .mockRejectedValue(new StorageError(StorageErrorType.INVALID_FILE_TYPE, 'Invalid'));

      await expect(
        retryManager.executeWithRetry(operation, 'test-op')
      ).rejects.toThrow('Invalid');

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should fail after max retries', async () => {
      const operation = jest.fn()
        .mockRejectedValue(new StorageError(StorageErrorType.FILE_NOT_FOUND, 'Not found'));

      await expect(
        retryManager.executeWithRetry(operation, 'test-op')
      ).rejects.toThrow('Not found');

      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('retry count management', () => {
    it('should track retry counts', async () => {
      const operation = jest.fn()
        .mockRejectedValue(new Error('Test error'));

      try {
        await retryManager.executeWithRetry(operation, 'test-op');
      } catch {
        // Expected to fail
      }

      expect(retryManager.getRetryCount('test-op')).toBe(0); // Reset after failure
    });

    it('should reset retry count on success', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Test error'))
        .mockResolvedValue('success');

      await retryManager.executeWithRetry(operation, 'test-op');

      expect(retryManager.getRetryCount('test-op')).toBe(0);
    });
  });
});

describe('RecoveryExecutor', () => {
  describe('executeAutomaticRecovery', () => {
    it('should execute fallback recovery', async () => {
      const error = new StorageError(
        StorageErrorType.INDEXEDDB_UNAVAILABLE,
        'IndexedDB not available'
      );

      const result = await RecoveryExecutor.executeAutomaticRecovery(error, {});

      expect(result).toBe(true);
    });

    it('should execute file deletion recovery', async () => {
      const mockFileStorageService = {
        deleteFile: jest.fn().mockResolvedValue(undefined)
      };

      const error = new StorageError(
        StorageErrorType.FILE_CORRUPTED,
        'File corrupted'
      );

      const result = await RecoveryExecutor.executeAutomaticRecovery(error, {
        fileStorageService: mockFileStorageService,
        fileId: 'test-file-id'
      });

      expect(result).toBe(true);
      expect(mockFileStorageService.deleteFile).toHaveBeenCalledWith('test-file-id');
    });

    it('should return false when no recovery is possible', async () => {
      const error = new StorageError(
        StorageErrorType.INVALID_FILE_TYPE,
        'Invalid file type'
      );

      const result = await RecoveryExecutor.executeAutomaticRecovery(error, {});

      expect(result).toBe(false);
    });

    it('should handle recovery failures gracefully', async () => {
      const mockFileStorageService = {
        deleteFile: jest.fn().mockRejectedValue(new Error('Delete failed'))
      };

      const error = new StorageError(
        StorageErrorType.FILE_CORRUPTED,
        'File corrupted'
      );

      const result = await RecoveryExecutor.executeAutomaticRecovery(error, {
        fileStorageService: mockFileStorageService,
        fileId: 'test-file-id'
      });

      expect(result).toBe(false);
    });
  });
});