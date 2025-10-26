/**
 * Error handling utilities for the file storage system
 * Provides error classification, user-friendly messages, and recovery mechanisms
 */

import { StorageError, StorageErrorType } from './types';

// User-friendly error messages
export interface UserErrorMessage {
  title: string;
  message: string;
  action?: string;
  recoverable: boolean;
  severity: 'error' | 'warning' | 'info';
}

// Recovery action types
export enum RecoveryAction {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  CLEAR_STORAGE = 'clear_storage',
  DELETE_FILES = 'delete_files',
  REFRESH_PAGE = 'refresh_page',
  NONE = 'none'
}

// Recovery strategy interface
export interface RecoveryStrategy {
  action: RecoveryAction;
  description: string;
  automatic: boolean;
  maxRetries?: number;
}

/**
 * Error classification and message generation utility
 */
export class ErrorHandler {
  private static readonly ERROR_MESSAGES: Record<StorageErrorType, UserErrorMessage> = {
    [StorageErrorType.QUOTA_EXCEEDED]: {
      title: 'Storage Full',
      message: 'Your browser storage is full. Please delete some files to free up space.',
      action: 'Delete old files or clear storage',
      recoverable: true,
      severity: 'error'
    },
    [StorageErrorType.INDEXEDDB_UNAVAILABLE]: {
      title: 'Storage Unavailable',
      message: 'Advanced storage is not available. Using limited storage mode.',
      action: 'Continue with reduced storage capacity',
      recoverable: true,
      severity: 'warning'
    },
    [StorageErrorType.FILE_NOT_FOUND]: {
      title: 'File Not Found',
      message: 'The requested file could not be found in storage.',
      action: 'Try uploading the file again',
      recoverable: true,
      severity: 'error'
    },
    [StorageErrorType.FILE_CORRUPTED]: {
      title: 'File Corrupted',
      message: 'The file appears to be corrupted and cannot be opened.',
      action: 'Delete the corrupted file and upload again',
      recoverable: true,
      severity: 'error'
    },
    [StorageErrorType.INVALID_FILE_TYPE]: {
      title: 'Invalid File Type',
      message: 'This file type is not supported.',
      action: 'Please select a supported file format',
      recoverable: false,
      severity: 'error'
    },
    [StorageErrorType.FILE_TOO_LARGE]: {
      title: 'File Too Large',
      message: 'The selected file exceeds the maximum allowed size.',
      action: 'Choose a smaller file or compress it first',
      recoverable: false,
      severity: 'error'
    },
    [StorageErrorType.STORAGE_UNAVAILABLE]: {
      title: 'Storage Unavailable',
      message: 'File storage is not available in your browser.',
      action: 'Try refreshing the page or use a different browser',
      recoverable: true,
      severity: 'error'
    },
    [StorageErrorType.COMPRESSION_FAILED]: {
      title: 'Compression Failed',
      message: 'Failed to compress the file for storage.',
      action: 'Try uploading the file without compression',
      recoverable: true,
      severity: 'warning'
    },
    [StorageErrorType.VALIDATION_FAILED]: {
      title: 'File Validation Failed',
      message: 'The file failed validation checks.',
      action: 'Ensure the file is not corrupted and try again',
      recoverable: true,
      severity: 'error'
    }
  };

  private static readonly RECOVERY_STRATEGIES: Record<StorageErrorType, RecoveryStrategy[]> = {
    [StorageErrorType.QUOTA_EXCEEDED]: [
      {
        action: RecoveryAction.DELETE_FILES,
        description: 'Delete old files to free up space',
        automatic: false
      },
      {
        action: RecoveryAction.CLEAR_STORAGE,
        description: 'Clear all stored files',
        automatic: false
      }
    ],
    [StorageErrorType.INDEXEDDB_UNAVAILABLE]: [
      {
        action: RecoveryAction.FALLBACK,
        description: 'Switch to localStorage fallback',
        automatic: true
      }
    ],
    [StorageErrorType.FILE_NOT_FOUND]: [
      {
        action: RecoveryAction.RETRY,
        description: 'Retry file retrieval',
        automatic: true,
        maxRetries: 2
      }
    ],
    [StorageErrorType.FILE_CORRUPTED]: [
      {
        action: RecoveryAction.DELETE_FILES,
        description: 'Remove corrupted file',
        automatic: true
      }
    ],
    [StorageErrorType.INVALID_FILE_TYPE]: [
      {
        action: RecoveryAction.NONE,
        description: 'No recovery possible - user must select valid file',
        automatic: false
      }
    ],
    [StorageErrorType.FILE_TOO_LARGE]: [
      {
        action: RecoveryAction.NONE,
        description: 'No recovery possible - user must select smaller file',
        automatic: false
      }
    ],
    [StorageErrorType.STORAGE_UNAVAILABLE]: [
      {
        action: RecoveryAction.REFRESH_PAGE,
        description: 'Refresh page to reinitialize storage',
        automatic: false
      },
      {
        action: RecoveryAction.FALLBACK,
        description: 'Try alternative storage method',
        automatic: true
      }
    ],
    [StorageErrorType.COMPRESSION_FAILED]: [
      {
        action: RecoveryAction.RETRY,
        description: 'Retry without compression',
        automatic: true,
        maxRetries: 1
      }
    ],
    [StorageErrorType.VALIDATION_FAILED]: [
      {
        action: RecoveryAction.RETRY,
        description: 'Retry file validation',
        automatic: true,
        maxRetries: 2
      }
    ]
  };

  /**
   * Get user-friendly error message for a storage error
   */
  static getUserErrorMessage(error: Error): UserErrorMessage {
    if (error instanceof StorageError) {
      return this.ERROR_MESSAGES[error.type] || {
        title: 'Storage Error',
        message: error.message,
        recoverable: true,
        severity: 'error'
      };
    }

    // Handle generic errors
    return {
      title: 'Unexpected Error',
      message: error.message || 'An unexpected error occurred',
      action: 'Try again or refresh the page',
      recoverable: true,
      severity: 'error'
    };
  }

  /**
   * Get recovery strategies for a storage error
   */
  static getRecoveryStrategies(error: Error): RecoveryStrategy[] {
    if (error instanceof StorageError) {
      return this.RECOVERY_STRATEGIES[error.type] || [];
    }

    // Default recovery for generic errors
    return [
      {
        action: RecoveryAction.RETRY,
        description: 'Retry the operation',
        automatic: false,
        maxRetries: 3
      },
      {
        action: RecoveryAction.REFRESH_PAGE,
        description: 'Refresh the page',
        automatic: false
      }
    ];
  }

  /**
   * Check if an error is recoverable
   */
  static isRecoverable(error: Error): boolean {
    const userMessage = this.getUserErrorMessage(error);
    return userMessage.recoverable;
  }

  /**
   * Get automatic recovery strategies (those that can be executed without user intervention)
   */
  static getAutomaticRecoveryStrategies(error: Error): RecoveryStrategy[] {
    return this.getRecoveryStrategies(error).filter(strategy => strategy.automatic);
  }

  /**
   * Get manual recovery strategies (those that require user action)
   */
  static getManualRecoveryStrategies(error: Error): RecoveryStrategy[] {
    return this.getRecoveryStrategies(error).filter(strategy => !strategy.automatic);
  }

  /**
   * Format error for logging
   */
  static formatErrorForLogging(error: Error, context?: string): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` [${context}]` : '';
    
    if (error instanceof StorageError) {
      return `${timestamp}${contextStr} StorageError(${error.type}): ${error.message}${
        error.originalError ? ` | Original: ${error.originalError.message}` : ''
      }`;
    }

    return `${timestamp}${contextStr} Error: ${error.message}${
      error.stack ? ` | Stack: ${error.stack}` : ''
    }`;
  }
}

/**
 * Retry mechanism with exponential backoff
 */
export class RetryManager {
  private retryAttempts = new Map<string, number>();
  private readonly maxRetries: number;
  private readonly baseDelay: number;
  private readonly maxDelay: number;

  constructor(maxRetries = 3, baseDelay = 1000, maxDelay = 10000) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;
  }

  /**
   * Execute an operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationId: string,
    customMaxRetries?: number
  ): Promise<T> {
    const maxRetries = customMaxRetries ?? this.maxRetries;
    const currentAttempts = this.retryAttempts.get(operationId) || 0;

    try {
      const result = await operation();
      // Success - reset retry count
      this.retryAttempts.delete(operationId);
      return result;
    } catch (error) {
      if (currentAttempts >= maxRetries) {
        // Max retries exceeded
        this.retryAttempts.delete(operationId);
        throw error;
      }

      // Check if error is retryable
      if (!this.isRetryableError(error)) {
        this.retryAttempts.delete(operationId);
        throw error;
      }

      // Increment retry count
      this.retryAttempts.set(operationId, currentAttempts + 1);

      // Calculate delay with exponential backoff
      const delay = Math.min(
        this.baseDelay * Math.pow(2, currentAttempts),
        this.maxDelay
      );

      console.warn(
        `Operation ${operationId} failed (attempt ${currentAttempts + 1}/${maxRetries + 1}). Retrying in ${delay}ms...`,
        error
      );

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));

      // Retry the operation
      return this.executeWithRetry(operation, operationId, customMaxRetries);
    }
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof StorageError) {
      // Some errors are not worth retrying
      const nonRetryableTypes = [
        StorageErrorType.INVALID_FILE_TYPE,
        StorageErrorType.FILE_TOO_LARGE
      ];
      
      return !nonRetryableTypes.includes(error.type);
    }

    // Generic errors are generally retryable
    return true;
  }

  /**
   * Reset retry count for an operation
   */
  resetRetryCount(operationId: string): void {
    this.retryAttempts.delete(operationId);
  }

  /**
   * Get current retry count for an operation
   */
  getRetryCount(operationId: string): number {
    return this.retryAttempts.get(operationId) || 0;
  }

  /**
   * Clear all retry counts
   */
  clearAllRetryCounts(): void {
    this.retryAttempts.clear();
  }
}

/**
 * Recovery executor for handling automatic recovery actions
 */
export class RecoveryExecutor {
  /**
   * Execute automatic recovery strategies
   */
  static async executeAutomaticRecovery(
    error: Error,
    context: {
      fileStorageService?: any;
      fileId?: string;
      retryManager?: RetryManager;
    }
  ): Promise<boolean> {
    const strategies = ErrorHandler.getAutomaticRecoveryStrategies(error);
    
    for (const strategy of strategies) {
      try {
        const success = await this.executeRecoveryAction(strategy, error, context);
        if (success) {
          console.info(`Automatic recovery successful: ${strategy.description}`);
          return true;
        }
      } catch (recoveryError) {
        console.warn(`Automatic recovery failed: ${strategy.description}`, recoveryError);
      }
    }

    return false;
  }

  /**
   * Execute a specific recovery action
   */
  private static async executeRecoveryAction(
    strategy: RecoveryStrategy,
    originalError: Error,
    context: {
      fileStorageService?: any;
      fileId?: string;
      retryManager?: RetryManager;
    }
  ): Promise<boolean> {
    switch (strategy.action) {
      case RecoveryAction.FALLBACK:
        // Fallback is handled by the storage service itself
        return true;

      case RecoveryAction.DELETE_FILES:
        if (context.fileStorageService && context.fileId) {
          try {
            await context.fileStorageService.deleteFile(context.fileId);
            return true;
          } catch {
            return false;
          }
        }
        return false;

      case RecoveryAction.RETRY:
        // Retry is handled by the RetryManager
        return true;

      case RecoveryAction.CLEAR_STORAGE:
        if (context.fileStorageService) {
          try {
            await context.fileStorageService.clearAllFiles();
            return true;
          } catch {
            return false;
          }
        }
        return false;

      case RecoveryAction.REFRESH_PAGE:
        // This should be handled by the UI layer
        return false;

      case RecoveryAction.NONE:
      default:
        return false;
    }
  }
}