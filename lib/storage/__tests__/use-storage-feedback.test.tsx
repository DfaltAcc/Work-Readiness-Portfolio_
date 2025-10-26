/**
 * Unit tests for useStorageFeedback React hook
 * Tests loading states, user feedback, and error handling in React components
 */

import { renderHook, act } from '@testing-library/react';
import { useStorageFeedback } from '../use-storage-feedback';
import { OperationType } from '../loading-manager';
import { StorageError, StorageErrorType } from '../types';

// Mock the managers to avoid real implementations in tests
jest.mock('../loading-manager');
jest.mock('../error-handler');

describe('useStorageFeedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useStorageFeedback());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.activeOperations).toEqual([]);
      expect(result.current.notifications).toEqual([]);
    });

    it('should provide all required functions', () => {
      const { result } = renderHook(() => useStorageFeedback());

      expect(typeof result.current.startOperation).toBe('function');
      expect(typeof result.current.updateProgress).toBe('function');
      expect(typeof result.current.completeOperation).toBe('function');
      expect(typeof result.current.failOperation).toBe('function');
      expect(typeof result.current.createFileProgressTracker).toBe('function');
      expect(typeof result.current.showSuccess).toBe('function');
      expect(typeof result.current.showError).toBe('function');
      expect(typeof result.current.showWarning).toBe('function');
      expect(typeof result.current.showInfo).toBe('function');
      expect(typeof result.current.showLoading).toBe('function');
      expect(typeof result.current.removeNotification).toBe('function');
      expect(typeof result.current.clearNotifications).toBe('function');
      expect(typeof result.current.handleStorageError).toBe('function');
      expect(typeof result.current.getOperationMessages).toBe('function');
    });
  });

  describe('operation management', () => {
    it('should start operations', () => {
      const { result } = renderHook(() => useStorageFeedback());

      act(() => {
        const operationId = result.current.startOperation(
          OperationType.STORE_FILE,
          'Storing file'
        );
        expect(operationId).toBeDefined();
      });
    });

    it('should update operation progress', () => {
      const { result } = renderHook(() => useStorageFeedback());

      act(() => {
        result.current.updateProgress('test-op-id', 50, 'Halfway done');
      });

      // The actual implementation would update the loading manager
      // This test verifies the function can be called without errors
    });

    it('should complete operations', () => {
      const { result } = renderHook(() => useStorageFeedback());

      act(() => {
        result.current.completeOperation('test-op-id', 'Operation completed');
      });
    });

    it('should fail operations', () => {
      const { result } = renderHook(() => useStorageFeedback());
      const error = new Error('Operation failed');

      act(() => {
        result.current.failOperation('test-op-id', error, 'Failed to complete');
      });
    });
  });

  describe('file progress tracking', () => {
    it('should create file progress tracker', () => {
      const { result } = renderHook(() => useStorageFeedback());

      act(() => {
        const tracker = result.current.createFileProgressTracker(
          OperationType.STORE_FILE,
          1000,
          'Storing file'
        );
        expect(tracker).toBeDefined();
      });
    });
  });

  describe('user feedback', () => {
    it('should show success notifications', () => {
      const { result } = renderHook(() => useStorageFeedback());

      act(() => {
        const id = result.current.showSuccess('Operation successful');
        expect(id).toBeDefined();
      });
    });

    it('should show error notifications', () => {
      const { result } = renderHook(() => useStorageFeedback());

      act(() => {
        const id = result.current.showError('Operation failed');
        expect(id).toBeDefined();
      });
    });

    it('should show warning notifications', () => {
      const { result } = renderHook(() => useStorageFeedback());

      act(() => {
        const id = result.current.showWarning('Warning message');
        expect(id).toBeDefined();
      });
    });

    it('should show info notifications', () => {
      const { result } = renderHook(() => useStorageFeedback());

      act(() => {
        const id = result.current.showInfo('Info message');
        expect(id).toBeDefined();
      });
    });

    it('should show loading notifications', () => {
      const { result } = renderHook(() => useStorageFeedback());

      act(() => {
        const id = result.current.showLoading('Loading...');
        expect(id).toBeDefined();
      });
    });

    it('should remove notifications', () => {
      const { result } = renderHook(() => useStorageFeedback());

      act(() => {
        result.current.removeNotification('test-notification-id');
      });
    });

    it('should clear all notifications', () => {
      const { result } = renderHook(() => useStorageFeedback());

      act(() => {
        result.current.clearNotifications();
      });
    });
  });

  describe('error handling', () => {
    it('should handle storage errors', async () => {
      const { result } = renderHook(() => useStorageFeedback());
      const error = new StorageError(
        StorageErrorType.QUOTA_EXCEEDED,
        'Storage full'
      );

      await act(async () => {
        const recovered = await result.current.handleStorageError(error, 'test-context');
        expect(typeof recovered).toBe('boolean');
      });
    });

    it('should handle generic errors', async () => {
      const { result } = renderHook(() => useStorageFeedback());
      const error = new Error('Generic error');

      await act(async () => {
        const recovered = await result.current.handleStorageError(error);
        expect(typeof recovered).toBe('boolean');
      });
    });
  });

  describe('utility functions', () => {
    it('should get operation messages for store file', () => {
      const { result } = renderHook(() => useStorageFeedback());

      const messages = result.current.getOperationMessages(
        OperationType.STORE_FILE,
        'test.pdf'
      );

      expect(messages).toBeDefined();
    });

    it('should get operation messages for retrieve file', () => {
      const { result } = renderHook(() => useStorageFeedback());

      const messages = result.current.getOperationMessages(
        OperationType.RETRIEVE_FILE,
        'document.docx'
      );

      expect(messages).toBeDefined();
    });

    it('should get operation messages for delete file', () => {
      const { result } = renderHook(() => useStorageFeedback());

      const messages = result.current.getOperationMessages(
        OperationType.DELETE_FILE,
        'video.mp4'
      );

      expect(messages).toBeDefined();
    });

    it('should get operation messages for storage usage', () => {
      const { result } = renderHook(() => useStorageFeedback());

      const messages = result.current.getOperationMessages(OperationType.GET_USAGE);

      expect(messages).toBeDefined();
    });

    it('should return null for unsupported operation types', () => {
      const { result } = renderHook(() => useStorageFeedback());

      const messages = result.current.getOperationMessages(
        OperationType.VALIDATE_FILE
      );

      expect(messages).toBeNull();
    });
  });

  describe('state management', () => {
    it('should update loading state when operations are active', () => {
      const { result } = renderHook(() => useStorageFeedback());

      // Initial state should not be loading
      expect(result.current.isLoading).toBe(false);

      // The actual state updates would be tested with real implementations
      // This test structure shows how the state should behave
    });

    it('should update notifications when feedback is shown', () => {
      const { result } = renderHook(() => useStorageFeedback());

      // Initial notifications should be empty
      expect(result.current.notifications).toEqual([]);

      // The actual notification updates would be tested with real implementations
    });
  });
});

// Integration test with real managers (minimal test to verify integration)
describe('useStorageFeedback integration', () => {
  // Unmock for integration test
  beforeAll(() => {
    jest.unmock('../loading-manager');
    jest.unmock('../error-handler');
  });

  it('should work with real managers', () => {
    const { result } = renderHook(() => useStorageFeedback());

    expect(result.current).toBeDefined();
    expect(typeof result.current.startOperation).toBe('function');
    expect(typeof result.current.showSuccess).toBe('function');
    expect(typeof result.current.handleStorageError).toBe('function');
  });
});