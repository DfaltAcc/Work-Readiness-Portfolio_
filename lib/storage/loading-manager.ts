/**
 * Loading state management and user feedback utilities
 * Provides loading indicators and progress tracking for storage operations
 */

import { EventEmitter } from 'events';

// Loading state types
export enum LoadingState {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error'
}

// Operation types for tracking
export enum OperationType {
  STORE_FILE = 'store_file',
  RETRIEVE_FILE = 'retrieve_file',
  DELETE_FILE = 'delete_file',
  LIST_FILES = 'list_files',
  GET_USAGE = 'get_usage',
  CLEAR_FILES = 'clear_files',
  COMPRESS_FILE = 'compress_file',
  VALIDATE_FILE = 'validate_file'
}

// Progress information
export interface ProgressInfo {
  operationId: string;
  operationType: OperationType;
  state: LoadingState;
  progress?: number; // 0-100 percentage
  message?: string;
  startTime: Date;
  endTime?: Date;
  error?: Error;
}

// Loading manager events
export interface LoadingManagerEvents {
  'operation-start': (info: ProgressInfo) => void;
  'operation-progress': (info: ProgressInfo) => void;
  'operation-complete': (info: ProgressInfo) => void;
  'operation-error': (info: ProgressInfo) => void;
}

/**
 * Loading manager for tracking storage operations
 */
export class LoadingManager extends EventEmitter {
  private operations = new Map<string, ProgressInfo>();
  private operationCounter = 0;

  /**
   * Start tracking a new operation
   */
  startOperation(
    operationType: OperationType,
    message?: string
  ): string {
    const operationId = `${operationType}_${++this.operationCounter}_${Date.now()}`;
    
    const info: ProgressInfo = {
      operationId,
      operationType,
      state: LoadingState.LOADING,
      message: message || this.getDefaultMessage(operationType),
      startTime: new Date()
    };

    this.operations.set(operationId, info);
    this.emit('operation-start', info);
    
    return operationId;
  }

  /**
   * Update operation progress
   */
  updateProgress(
    operationId: string,
    progress: number,
    message?: string
  ): void {
    const info = this.operations.get(operationId);
    if (!info) return;

    info.progress = Math.max(0, Math.min(100, progress));
    if (message) {
      info.message = message;
    }

    this.emit('operation-progress', info);
  }

  /**
   * Complete an operation successfully
   */
  completeOperation(
    operationId: string,
    message?: string
  ): void {
    const info = this.operations.get(operationId);
    if (!info) return;

    info.state = LoadingState.SUCCESS;
    info.progress = 100;
    info.endTime = new Date();
    if (message) {
      info.message = message;
    }

    this.emit('operation-complete', info);
    
    // Clean up after a delay
    setTimeout(() => {
      this.operations.delete(operationId);
    }, 5000);
  }

  /**
   * Mark an operation as failed
   */
  failOperation(
    operationId: string,
    error: Error,
    message?: string
  ): void {
    const info = this.operations.get(operationId);
    if (!info) return;

    info.state = LoadingState.ERROR;
    info.error = error;
    info.endTime = new Date();
    if (message) {
      info.message = message;
    }

    this.emit('operation-error', info);
    
    // Clean up after a delay
    setTimeout(() => {
      this.operations.delete(operationId);
    }, 10000);
  } 
 /**
   * Get current operation info
   */
  getOperationInfo(operationId: string): ProgressInfo | undefined {
    return this.operations.get(operationId);
  }

  /**
   * Get all active operations
   */
  getActiveOperations(): ProgressInfo[] {
    return Array.from(this.operations.values()).filter(
      info => info.state === LoadingState.LOADING
    );
  }

  /**
   * Check if any operations are active
   */
  hasActiveOperations(): boolean {
    return this.getActiveOperations().length > 0;
  }

  /**
   * Cancel an operation
   */
  cancelOperation(operationId: string): void {
    const info = this.operations.get(operationId);
    if (!info) return;

    info.state = LoadingState.ERROR;
    info.error = new Error('Operation cancelled');
    info.endTime = new Date();
    info.message = 'Operation cancelled';

    this.emit('operation-error', info);
    this.operations.delete(operationId);
  }

  /**
   * Clear all operations
   */
  clearAllOperations(): void {
    this.operations.clear();
  }

  /**
   * Get default message for operation type
   */
  private getDefaultMessage(operationType: OperationType): string {
    const messages: Record<OperationType, string> = {
      [OperationType.STORE_FILE]: 'Storing file...',
      [OperationType.RETRIEVE_FILE]: 'Loading file...',
      [OperationType.DELETE_FILE]: 'Deleting file...',
      [OperationType.LIST_FILES]: 'Loading file list...',
      [OperationType.GET_USAGE]: 'Calculating storage usage...',
      [OperationType.CLEAR_FILES]: 'Clearing all files...',
      [OperationType.COMPRESS_FILE]: 'Compressing file...',
      [OperationType.VALIDATE_FILE]: 'Validating file...'
    };

    return messages[operationType] || 'Processing...';
  }
}

/**
 * Progress tracker for file operations with size-based progress
 */
export class FileProgressTracker {
  private readonly loadingManager: LoadingManager;
  private readonly operationId: string;
  private readonly totalSize: number;
  private processedSize = 0;

  constructor(
    loadingManager: LoadingManager,
    operationType: OperationType,
    totalSize: number,
    initialMessage?: string
  ) {
    this.loadingManager = loadingManager;
    this.totalSize = totalSize;
    this.operationId = loadingManager.startOperation(operationType, initialMessage);
  }

  /**
   * Update progress based on processed bytes
   */
  updateProgress(processedBytes: number, message?: string): void {
    this.processedSize = Math.min(processedBytes, this.totalSize);
    const progress = this.totalSize > 0 ? (this.processedSize / this.totalSize) * 100 : 0;
    
    this.loadingManager.updateProgress(this.operationId, progress, message);
  }

  /**
   * Add to processed bytes
   */
  addProgress(additionalBytes: number, message?: string): void {
    this.updateProgress(this.processedSize + additionalBytes, message);
  }

  /**
   * Complete the operation
   */
  complete(message?: string): void {
    this.loadingManager.completeOperation(this.operationId, message);
  }

  /**
   * Fail the operation
   */
  fail(error: Error, message?: string): void {
    this.loadingManager.failOperation(this.operationId, error, message);
  }

  /**
   * Get operation ID
   */
  getOperationId(): string {
    return this.operationId;
  }
}

/**
 * User feedback manager for displaying notifications and messages
 */
export class UserFeedbackManager {
  private notifications: NotificationInfo[] = [];
  private readonly maxNotifications = 5;

  /**
   * Show a success message
   */
  showSuccess(message: string, duration = 3000): string {
    return this.addNotification({
      id: this.generateId(),
      type: 'success',
      message,
      duration,
      timestamp: new Date()
    });
  }

  /**
   * Show an error message
   */
  showError(message: string, duration = 5000): string {
    return this.addNotification({
      id: this.generateId(),
      type: 'error',
      message,
      duration,
      timestamp: new Date()
    });
  }

  /**
   * Show a warning message
   */
  showWarning(message: string, duration = 4000): string {
    return this.addNotification({
      id: this.generateId(),
      type: 'warning',
      message,
      duration,
      timestamp: new Date()
    });
  }

  /**
   * Show an info message
   */
  showInfo(message: string, duration = 3000): string {
    return this.addNotification({
      id: this.generateId(),
      type: 'info',
      message,
      duration,
      timestamp: new Date()
    });
  }

  /**
   * Show a loading message
   */
  showLoading(message: string): string {
    return this.addNotification({
      id: this.generateId(),
      type: 'loading',
      message,
      persistent: true,
      timestamp: new Date()
    });
  }

  /**
   * Update an existing notification
   */
  updateNotification(id: string, updates: Partial<NotificationInfo>): void {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      Object.assign(notification, updates);
    }
  }

  /**
   * Remove a notification
   */
  removeNotification(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }

  /**
   * Get all notifications
   */
  getNotifications(): NotificationInfo[] {
    return [...this.notifications];
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    this.notifications = [];
  }

  /**
   * Add a notification
   */
  private addNotification(notification: NotificationInfo): string {
    // Remove oldest notifications if we exceed the limit
    while (this.notifications.length >= this.maxNotifications) {
      this.notifications.shift();
    }

    this.notifications.push(notification);

    // Auto-remove non-persistent notifications
    if (!notification.persistent && notification.duration) {
      setTimeout(() => {
        this.removeNotification(notification.id);
      }, notification.duration);
    }

    return notification.id;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Notification interface
export interface NotificationInfo {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'loading';
  message: string;
  duration?: number;
  persistent?: boolean;
  timestamp: Date;
  action?: {
    label: string;
    handler: () => void;
  };
}

/**
 * Storage operation feedback messages
 */
export class StorageFeedbackMessages {
  static getStoreFileMessages(fileName: string) {
    return {
      start: `Storing ${fileName}...`,
      compressing: `Compressing ${fileName}...`,
      saving: `Saving ${fileName} to storage...`,
      success: `${fileName} stored successfully`,
      error: `Failed to store ${fileName}`
    };
  }

  static getRetrieveFileMessages(fileName: string) {
    return {
      start: `Loading ${fileName}...`,
      reading: `Reading ${fileName} from storage...`,
      success: `${fileName} loaded successfully`,
      error: `Failed to load ${fileName}`
    };
  }

  static getDeleteFileMessages(fileName: string) {
    return {
      start: `Deleting ${fileName}...`,
      success: `${fileName} deleted successfully`,
      error: `Failed to delete ${fileName}`
    };
  }

  static getStorageUsageMessages() {
    return {
      calculating: 'Calculating storage usage...',
      success: 'Storage usage updated',
      error: 'Failed to calculate storage usage'
    };
  }

  static getClearStorageMessages() {
    return {
      start: 'Clearing all files...',
      success: 'All files cleared successfully',
      error: 'Failed to clear files'
    };
  }
}