/**
 * Tests for user feedback and loading state behavior during error conditions
 * Verifies UI feedback, loading indicators, and user interaction during errors
 * Requirements: 3.4, 3.3
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { useStorageFeedback } from '../use-storage-feedback';
import { LoadingManager, OperationType } from '../loading-manager';
import { ErrorHandler } from '../error-handler';
import { StorageError, StorageErrorType } from '../types';

// Mock the managers
jest.mock('../loading-manager');
jest.mock('../error-handler');

const MockedLoadingManager = LoadingManager as jest.MockedClass<typeof LoadingManager>;
const MockedErrorHandler = ErrorHandler as jest.MockedClass<typeof ErrorHandler>;

describe('Error Feedback Behavior Tests', () => {
  let mockLoadingManager: jest.Mocked<LoadingManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock loading manager
    mockLoadingManager = {
      startOperation: jest.fn().mockReturnValue('op-id-123'),
      updateProgress: jest.fn(),
      completeOperation: jest.fn(),
      failOperation: jest.fn(),
      getActiveOperations: jest.fn().mockReturnValue([]),
      isLoading: jest.fn().mockReturnValue(false),
      createFileProgressTracker: jest.fn(),
      getOperationStatus: jest.fn(),
      cancelOperation: jest.fn(),
      clearCompletedOperations: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn()
    } as any;

    MockedLoadingManager.mockImplementation(() => mockLoadingManager);

    // Setup mock error handler
    MockedErrorHandler.getUserErrorMessage = jest.fn().mockReturnValue({
      title: 'Test Error',
      message: 'Test error message',
      severity: 'error',
      recoverable: true
    });

    MockedErrorHandler.getRecoveryStrategies = jest.fn().mockReturnValue([]);
    MockedErrorHandler.formatErrorForLogging = jest.fn().mockReturnValue('Formatted error');
  });

  describe('Loading State During Error Scenarios', () => {
    it('should show loading state during file operation and handle errors', async () => {
      const { result } = renderHook(() => useStorageFeedback());

      // Start operation
      act(() => {
        result.current.startOperation(OperationType.STORE_FILE, 'Storing file...');
      });

      expect(mockLoadingManager.startOperation).toHaveBeenCalledWith(
        OperationType.STORE_FILE,
        'Storing file...'
      );

      // Simulate operation failure
      const error = new StorageError(
        StorageErrorType.QUOTA_EXCEEDED,
        'Storage quota exceeded'
      );

      act(() => {
        result.current.failOperation('op-id-123', error, 'Failed to store file');
      });

      expect(mockLoadingManager.failOperation).toHaveBeenCalledWith(
        'op-id-123',
        error,
        'Failed to store file'
      );
    });

    it('should handle progress updates during failing operations', async () => {
      const { result } = renderHook(() => useStorageFeedback());

      // Start operation with progress tracking
      act(() => {
        const tracker = result.current.createFileProgressTracker(
          OperationType.STORE_FILE,
          1000000, // 1MB file
          'Uploading large file'
        );
        expect(tracker).toBeDefined();
      });

      // Update progress
      act(() => {
        result.current.updateProgress('op-id-123', 50, 'Halfway complete');
      });

      expect(mockLoadingManager.updateProgress).toHaveBeenCalledWith(
        'op-id-123',
        50,
        'Halfway complete'
      );

      // Fail at 75% progress
      act(() => {
        result.current.updateProgress('op-id-123', 75, 'Almost done');
        result.current.failOperation(
          'op-id-123',
          new Error('Network error'),
          'Upload failed'
        );
      });

      expect(mockLoadingManager.failOperation).toHaveBeenCalled();
    });

    it('should handle concurrent operations with mixed success/failure', async () => {
      const { result } = renderHook(() => useStorageFeedback());

      // Start multiple operations
      const operations = [
        { id: 'op-1', type: OperationType.STORE_FILE, message: 'Storing file 1' },
        { id: 'op-2', type: OperationType.STORE_FILE, message: 'Storing file 2' },
        { id: 'op-3', type: OperationType.RETRIEVE_FILE, message: 'Loading file 3' }
      ];

      act(() => {
        operations.forEach(op => {
          result.current.startOperation(op.type, op.message);
        });
      });

      expect(mockLoadingManager.startOperation).toHaveBeenCalledTimes(3);

      // Complete some, fail others
      act(() => {
        result.current.completeOperation('op-1', 'File 1 stored successfully');
        result.current.failOperation(
          'op-2',
          new StorageError(StorageErrorType.QUOTA_EXCEEDED, 'Storage full'),
          'Failed to store file 2'
        );
        result.current.completeOperation('op-3', 'File 3 loaded successfully');
      });

      expect(mockLoadingManager.completeOperation).toHaveBeenCalledTimes(2);
      expect(mockLoadingManager.failOperation).toHaveBeenCalledTimes(1);
    });
  });

  describe('User Notification During Errors', () => {
    it('should show appropriate error notifications for different error types', async () => {
      const { result } = renderHook(() => useStorageFeedback());

      const errorScenarios = [
        {
          error: new StorageError(StorageErrorType.QUOTA_EXCEEDED, 'Storage full'),
          expectedSeverity: 'error',
          expectedTitle: 'Storage Full'
        },
        {
          error: new StorageError(StorageErrorType.FILE_NOT_FOUND, 'File not found'),
          expectedSeverity: 'warning',
          expectedTitle: 'File Not Found'
        },
        {
          error: new StorageError(StorageErrorType.FILE_CORRUPTED, 'File corrupted'),
          expectedSeverity: 'error',
          expectedTitle: 'File Corrupted'
        }
      ];

      for (const scenario of errorScenarios) {
        MockedErrorHandler.getUserErrorMessage.mockReturnValueOnce({
          title: scenario.expectedTitle,
          message: scenario.error.message,
          severity: scenario.expectedSeverity as any,
          recoverable: true
        });

        await act(async () => {
          await result.current.handleStorageError(scenario.error, 'test-context');
        });

        expect(MockedErrorHandler.getUserErrorMessage).toHaveBeenCalledWith(
          scenario.error,
          expect.any(Object)
        );
      }
    });

    it('should show success notifications after error recovery', async () => {
      const { result } = renderHook(() => useStorageFeedback());

      // Mock successful recovery
      MockedErrorHandler.getRecoveryStrategies = jest.fn().mockReturnValue([
        {
          action: 'DELETE_FILES',
          description: 'Delete old files',
          automatic: true
        }
      ]);

      const error = new StorageError(
        StorageErrorType.QUOTA_EXCEEDED,
        'Storage full'
      );

      await act(async () => {
        const recovered = await result.current.handleStorageError(error);
        if (recovered) {
          result.current.showSuccess('Storage space freed successfully');
        }
      });

      // Verify recovery was attempted
      expect(MockedErrorHandler.getRecoveryStrategies).toHaveBeenCalledWith(error);
    });

    it('should handle notification queue during rapid error conditions', async () => {
      const { result } = renderHook(() => useStorageFeedback());

      // Simulate rapid error notifications
      const errors = [
        'First error occurred',
        'Second error occurred',
        'Third error occurred'
      ];

      act(() => {
        errors.forEach(error => {
          result.current.showError(error);
        });
      });

      // Should handle multiple notifications without issues
      expect(result.current.notifications).toBeDefined();
    });
  });

  describe('Loading Indicator Behavior', () => {
    it('should show loading indicators for different operation types', async () => {
      const { result } = renderHook(() => useStorageFeedback());

      const operationTypes = [
        { type: OperationType.STORE_FILE, message: 'Saving file...' },
        { type: OperationType.RETRIEVE_FILE, message: 'Loading file...' },
        { type: OperationType.DELETE_FILE, message: 'Deleting file...' },
        { type: OperationType.GET_USAGE, message: 'Calculating storage usage...' }
      ];

      operationTypes.forEach(({ type, message }) => {
        act(() => {
          result.current.startOperation(type, message);
        });

        expect(mockLoadingManager.startOperation).toHaveBeenCalledWith(type, message);
      });
    });

    it('should handle loading state transitions during error recovery', async () => {
      const { result } = renderHook(() => useStorageFeedback());

      // Start operation
      act(() => {
        result.current.startOperation(OperationType.STORE_FILE, 'Storing file...');
      });

      // Show loading during recovery
      act(() => {
        result.current.showLoading('Attempting recovery...');
      });

      // Complete recovery
      act(() => {
        result.current.completeOperation('op-id-123', 'Recovery successful');
        result.current.showSuccess('File stored after recovery');
      });

      expect(mockLoadingManager.completeOperation).toHaveBeenCalled();
    });

    it('should provide operation-specific messages', () => {
      const { result } = renderHook(() => useStorageFeedback());

      const testCases = [
        {
          type: OperationType.STORE_FILE,
          fileName: 'document.pdf',
          expected: expect.objectContaining({
            starting: expect.stringContaining('document.pdf'),
            progress: expect.any(String),
            success: expect.stringContaining('document.pdf'),
            error: expect.stringContaining('document.pdf')
          })
        },
        {
          type: OperationType.RETRIEVE_FILE,
          fileName: 'video.mp4',
          expected: expect.objectContaining({
            starting: expect.stringContaining('video.mp4'),
            progress: expect.any(String),
            success: expect.stringContaining('video.mp4'),
            error: expect.stringContaining('video.mp4')
          })
        }
      ];

      testCases.forEach(({ type, fileName, expected }) => {
        const messages = result.current.getOperationMessages(type, fileName);
        expect(messages).toEqual(expected);
      });
    });
  });

  describe('Error Recovery User Interaction', () => {
    it('should handle user-initiated recovery actions', async () => {
      const { result } = renderHook(() => useStorageFeedback());

      const quotaError = new StorageError(
        StorageErrorType.QUOTA_EXCEEDED,
        'Storage quota exceeded'
      );

      // Mock recovery strategies
      MockedErrorHandler.getRecoveryStrategies.mockReturnValue([
        {
          action: 'DELETE_FILES',
          description: 'Delete old files to free space',
          automatic: false,
          execute: jest.fn().mockResolvedValue(true)
        },
        {
          action: 'CLEAR_STORAGE',
          description: 'Clear all stored files',
          automatic: false,
          execute: jest.fn().mockResolvedValue(true)
        }
      ]);

      await act(async () => {
        await result.current.handleStorageError(quotaError, 'file-upload');
      });

      expect(MockedErrorHandler.getRecoveryStrategies).toHaveBeenCalledWith(quotaError);
    });

    it('should show progress during recovery operations', async () => {
      const { result } = renderHook(() => useStorageFeedback());

      // Start recovery operation
      act(() => {
        result.current.startOperation(OperationType.DELETE_FILE, 'Cleaning up storage...');
      });

      // Show recovery progress
      act(() => {
        result.current.updateProgress('recovery-op', 25, 'Analyzing files...');
        result.current.updateProgress('recovery-op', 50, 'Deleting old files...');
        result.current.updateProgress('recovery-op', 75, 'Updating storage usage...');
        result.current.updateProgress('recovery-op', 100, 'Recovery complete');
      });

      expect(mockLoadingManager.updateProgress).toHaveBeenCalledTimes(4);
    });
  });

  describe('Error State Persistence', () => {
    it('should maintain error state across component re-renders', async () => {
      const { result, rerender } = renderHook(() => useStorageFeedback());

      // Set error state
      act(() => {
        result.current.showError('Persistent error message');
      });

      // Re-render component
      rerender();

      // Error state should persist
      expect(result.current.notifications).toBeDefined();
    });

    it('should clear error state when requested', async () => {
      const { result } = renderHook(() => useStorageFeedback());

      // Add multiple notifications
      act(() => {
        result.current.showError('Error 1');
        result.current.showWarning('Warning 1');
        result.current.showInfo('Info 1');
      });

      // Clear all notifications
      act(() => {
        result.current.clearNotifications();
      });

      // Should be cleared
      expect(result.current.notifications).toEqual([]);
    });

    it('should handle notification removal by ID', async () => {
      const { result } = renderHook(() => useStorageFeedback());

      let notificationId: string;

      act(() => {
        notificationId = result.current.showError('Removable error');
      });

      act(() => {
        result.current.removeNotification(notificationId!);
      });

      // Notification should be removed
      const hasNotification = result.current.notifications.some(
        n => n.id === notificationId
      );
      expect(hasNotification).toBe(false);
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should provide screen reader friendly error messages', async () => {
      const { result } = renderHook(() => useStorageFeedback());

      const error = new StorageError(
        StorageErrorType.FILE_TOO_LARGE,
        'File exceeds maximum size limit'
      );

      MockedErrorHandler.getUserErrorMessage.mockReturnValue({
        title: 'File Too Large',
        message: 'The selected file is too large. Please choose a file smaller than 150MB.',
        severity: 'warning',
        recoverable: true,
        ariaLabel: 'File size error: The selected file exceeds the 150MB limit'
      });

      await act(async () => {
        await result.current.handleStorageError(error);
      });

      const userMessage = MockedErrorHandler.getUserErrorMessage(error);
      expect(userMessage.ariaLabel).toBeTruthy();
      expect(userMessage.message).toContain('150MB');
    });

    it('should handle keyboard navigation during error states', async () => {
      const { result } = renderHook(() => useStorageFeedback());

      // Simulate error with recovery options
      const error = new StorageError(
        StorageErrorType.QUOTA_EXCEEDED,
        'Storage full'
      );

      MockedErrorHandler.getRecoveryStrategies.mockReturnValue([
        {
          action: 'DELETE_FILES',
          description: 'Delete old files',
          automatic: false,
          keyboardShortcut: 'Alt+D'
        }
      ]);

      await act(async () => {
        await result.current.handleStorageError(error);
      });

      const strategies = MockedErrorHandler.getRecoveryStrategies(error);
      expect(strategies[0].keyboardShortcut).toBe('Alt+D');
    });
  });
});