/**
 * React hook for managing storage operation feedback and loading states
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  LoadingManager, 
  UserFeedbackManager, 
  FileProgressTracker,
  OperationType,
  LoadingState,
  ProgressInfo,
  NotificationInfo,
  StorageFeedbackMessages
} from './loading-manager';
import { ErrorHandler, RecoveryExecutor, RetryManager } from './error-handler';
import { StorageError } from './types';

// Hook return type
export interface StorageFeedbackHook {
  // Loading states
  isLoading: boolean;
  activeOperations: ProgressInfo[];
  
  // Notifications
  notifications: NotificationInfo[];
  
  // Operation tracking
  startOperation: (type: OperationType, message?: string) => string;
  updateProgress: (operationId: string, progress: number, message?: string) => void;
  completeOperation: (operationId: string, message?: string) => void;
  failOperation: (operationId: string, error: Error, message?: string) => void;
  
  // File progress tracking
  createFileProgressTracker: (
    operationType: OperationType,
    totalSize: number,
    initialMessage?: string
  ) => FileProgressTracker;
  
  // User feedback
  showSuccess: (message: string, duration?: number) => string;
  showError: (message: string, duration?: number) => string;
  showWarning: (message: string, duration?: number) => string;
  showInfo: (message: string, duration?: number) => string;
  showLoading: (message: string) => string;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Error handling
  handleStorageError: (error: Error, context?: string) => Promise<boolean>;
  
  // Utility functions
  getOperationMessages: (operationType: OperationType, fileName?: string) => any;
}

/**
 * Custom hook for storage feedback management
 */
export function useStorageFeedback(): StorageFeedbackHook {
  const [isLoading, setIsLoading] = useState(false);
  const [activeOperations, setActiveOperations] = useState<ProgressInfo[]>([]);
  const [notifications, setNotifications] = useState<NotificationInfo[]>([]);
  
  // Managers
  const loadingManagerRef = useRef<LoadingManager>();
  const feedbackManagerRef = useRef<UserFeedbackManager>();
  const retryManagerRef = useRef<RetryManager>();
  
  // Initialize managers
  if (!loadingManagerRef.current) {
    loadingManagerRef.current = new LoadingManager();
  }
  if (!feedbackManagerRef.current) {
    feedbackManagerRef.current = new UserFeedbackManager();
  }
  if (!retryManagerRef.current) {
    retryManagerRef.current = new RetryManager();
  }
  
  const loadingManager = loadingManagerRef.current;
  const feedbackManager = feedbackManagerRef.current;
  const retryManager = retryManagerRef.current;

  // Set up event listeners
  useEffect(() => {
    const updateActiveOperations = () => {
      const operations = loadingManager.getActiveOperations() || [];
      setActiveOperations(operations);
      setIsLoading(operations.length > 0);
    };

    const updateNotifications = () => {
      const currentNotifications = feedbackManager.getNotifications() || [];
      setNotifications(currentNotifications);
    };

    // Loading manager events
    const handleOperationStart = () => {
      updateActiveOperations();
    };

    const handleOperationProgress = () => {
      updateActiveOperations();
    };

    const handleOperationComplete = () => {
      updateActiveOperations();
    };

    const handleOperationError = () => {
      updateActiveOperations();
    };

    // Set up listeners
    loadingManager.on('operation-start', handleOperationStart);
    loadingManager.on('operation-progress', handleOperationProgress);
    loadingManager.on('operation-complete', handleOperationComplete);
    loadingManager.on('operation-error', handleOperationError);

    // Initial state update
    updateActiveOperations();
    updateNotifications();

    // Periodic notification updates (for auto-removal)
    const notificationInterval = setInterval(updateNotifications, 1000);

    return () => {
      loadingManager.removeListener('operation-start', handleOperationStart);
      loadingManager.removeListener('operation-progress', handleOperationProgress);
      loadingManager.removeListener('operation-complete', handleOperationComplete);
      loadingManager.removeListener('operation-error', handleOperationError);
      clearInterval(notificationInterval);
    };
  }, [loadingManager, feedbackManager]);

  // Operation tracking functions
  const startOperation = useCallback((type: OperationType, message?: string): string => {
    return loadingManager.startOperation(type, message);
  }, [loadingManager]);

  const updateProgress = useCallback((operationId: string, progress: number, message?: string) => {
    loadingManager.updateProgress(operationId, progress, message);
  }, [loadingManager]);

  const completeOperation = useCallback((operationId: string, message?: string) => {
    loadingManager.completeOperation(operationId, message);
  }, [loadingManager]);

  const failOperation = useCallback((operationId: string, error: Error, message?: string) => {
    loadingManager.failOperation(operationId, error, message);
  }, [loadingManager]);

  // File progress tracker
  const createFileProgressTracker = useCallback((
    operationType: OperationType,
    totalSize: number,
    initialMessage?: string
  ): FileProgressTracker => {
    return new FileProgressTracker(loadingManager, operationType, totalSize, initialMessage);
  }, [loadingManager]);

  // User feedback functions
  const showSuccess = useCallback((message: string, duration?: number): string => {
    const id = feedbackManager.showSuccess(message, duration);
    setNotifications(feedbackManager.getNotifications());
    return id;
  }, [feedbackManager]);

  const showError = useCallback((message: string, duration?: number): string => {
    const id = feedbackManager.showError(message, duration);
    setNotifications(feedbackManager.getNotifications());
    return id;
  }, [feedbackManager]);

  const showWarning = useCallback((message: string, duration?: number): string => {
    const id = feedbackManager.showWarning(message, duration);
    setNotifications(feedbackManager.getNotifications());
    return id;
  }, [feedbackManager]);

  const showInfo = useCallback((message: string, duration?: number): string => {
    const id = feedbackManager.showInfo(message, duration);
    setNotifications(feedbackManager.getNotifications());
    return id;
  }, [feedbackManager]);

  const showLoading = useCallback((message: string): string => {
    const id = feedbackManager.showLoading(message);
    setNotifications(feedbackManager.getNotifications());
    return id;
  }, [feedbackManager]);

  const removeNotification = useCallback((id: string) => {
    feedbackManager.removeNotification(id);
    setNotifications(feedbackManager.getNotifications());
  }, [feedbackManager]);

  const clearNotifications = useCallback(() => {
    feedbackManager.clearAll();
    setNotifications([]);
  }, [feedbackManager]);

  // Error handling
  const handleStorageError = useCallback(async (error: Error, context?: string): Promise<boolean> => {
    console.error(ErrorHandler.formatErrorForLogging(error, context));
    
    // Get user-friendly error message
    const userMessage = ErrorHandler.getUserErrorMessage(error);
    
    // Show error notification
    showError(userMessage.message, userMessage.severity === 'error' ? 5000 : 3000);
    
    // Attempt automatic recovery
    try {
      const recovered = await RecoveryExecutor.executeAutomaticRecovery(error, {
        retryManager
      });
      
      if (recovered) {
        showSuccess('Issue resolved automatically');
        return true;
      }
    } catch (recoveryError) {
      console.error('Automatic recovery failed:', recoveryError);
    }
    
    // Show manual recovery options if available
    const manualStrategies = ErrorHandler.getManualRecoveryStrategies(error);
    if (manualStrategies.length > 0) {
      const strategy = manualStrategies[0]; // Show first manual strategy
      showWarning(`${userMessage.action || strategy.description}`, 7000);
    }
    
    return false;
  }, [showError, showSuccess, showWarning, retryManager]);

  // Utility function to get operation messages
  const getOperationMessages = useCallback((operationType: OperationType, fileName?: string) => {
    switch (operationType) {
      case OperationType.STORE_FILE:
        return fileName ? StorageFeedbackMessages.getStoreFileMessages(fileName) : null;
      case OperationType.RETRIEVE_FILE:
        return fileName ? StorageFeedbackMessages.getRetrieveFileMessages(fileName) : null;
      case OperationType.DELETE_FILE:
        return fileName ? StorageFeedbackMessages.getDeleteFileMessages(fileName) : null;
      case OperationType.GET_USAGE:
        return StorageFeedbackMessages.getStorageUsageMessages();
      case OperationType.CLEAR_FILES:
        return StorageFeedbackMessages.getClearStorageMessages();
      default:
        return null;
    }
  }, []);

  return {
    // Loading states
    isLoading,
    activeOperations,
    
    // Notifications
    notifications,
    
    // Operation tracking
    startOperation,
    updateProgress,
    completeOperation,
    failOperation,
    
    // File progress tracking
    createFileProgressTracker,
    
    // User feedback
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    removeNotification,
    clearNotifications,
    
    // Error handling
    handleStorageError,
    
    // Utility functions
    getOperationMessages
  };
}