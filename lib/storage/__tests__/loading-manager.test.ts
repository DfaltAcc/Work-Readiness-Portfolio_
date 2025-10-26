/**
 * Unit tests for loading manager and user feedback utilities
 * Tests loading states, progress tracking, and user notifications
 */

import { 
  LoadingManager, 
  UserFeedbackManager, 
  FileProgressTracker,
  OperationType,
  LoadingState,
  StorageFeedbackMessages
} from '../loading-manager';

describe('LoadingManager', () => {
  let loadingManager: LoadingManager;

  beforeEach(() => {
    loadingManager = new LoadingManager();
  });

  describe('operation tracking', () => {
    it('should start and track operations', () => {
      const operationId = loadingManager.startOperation(
        OperationType.STORE_FILE,
        'Storing test file'
      );

      expect(operationId).toBeDefined();
      expect(operationId).toContain('store_file');

      const info = loadingManager.getOperationInfo(operationId);
      expect(info).toBeDefined();
      expect(info!.operationType).toBe(OperationType.STORE_FILE);
      expect(info!.state).toBe(LoadingState.LOADING);
      expect(info!.message).toBe('Storing test file');
    });

    it('should update operation progress', () => {
      const operationId = loadingManager.startOperation(OperationType.STORE_FILE);
      
      loadingManager.updateProgress(operationId, 50, 'Halfway done');

      const info = loadingManager.getOperationInfo(operationId);
      expect(info!.progress).toBe(50);
      expect(info!.message).toBe('Halfway done');
    });

    it('should complete operations successfully', () => {
      const operationId = loadingManager.startOperation(OperationType.STORE_FILE);
      
      loadingManager.completeOperation(operationId, 'File stored');

      const info = loadingManager.getOperationInfo(operationId);
      expect(info!.state).toBe(LoadingState.SUCCESS);
      expect(info!.progress).toBe(100);
      expect(info!.endTime).toBeDefined();
    });

    it('should handle operation failures', () => {
      const operationId = loadingManager.startOperation(OperationType.STORE_FILE);
      const error = new Error('Storage failed');
      
      loadingManager.failOperation(operationId, error, 'Failed to store');

      const info = loadingManager.getOperationInfo(operationId);
      expect(info!.state).toBe(LoadingState.ERROR);
      expect(info!.error).toBe(error);
      expect(info!.endTime).toBeDefined();
    });
  });

  describe('active operations', () => {
    it('should track active operations', () => {
      const op1 = loadingManager.startOperation(OperationType.STORE_FILE);
      const op2 = loadingManager.startOperation(OperationType.RETRIEVE_FILE);

      expect(loadingManager.hasActiveOperations()).toBe(true);
      expect(loadingManager.getActiveOperations()).toHaveLength(2);

      loadingManager.completeOperation(op1);
      expect(loadingManager.getActiveOperations()).toHaveLength(1);

      loadingManager.completeOperation(op2);
      expect(loadingManager.hasActiveOperations()).toBe(false);
    });

    it('should cancel operations', () => {
      const operationId = loadingManager.startOperation(OperationType.STORE_FILE);
      
      loadingManager.cancelOperation(operationId);

      const info = loadingManager.getOperationInfo(operationId);
      expect(info).toBeUndefined(); // Should be removed after cancellation
    });
  });

  describe('event emission', () => {
    it('should emit operation events', () => {
      const startListener = jest.fn();
      const progressListener = jest.fn();
      const completeListener = jest.fn();

      loadingManager.on('operation-start', startListener);
      loadingManager.on('operation-progress', progressListener);
      loadingManager.on('operation-complete', completeListener);

      const operationId = loadingManager.startOperation(OperationType.STORE_FILE);
      loadingManager.updateProgress(operationId, 50);
      loadingManager.completeOperation(operationId);

      expect(startListener).toHaveBeenCalledTimes(1);
      expect(progressListener).toHaveBeenCalledTimes(1);
      expect(completeListener).toHaveBeenCalledTimes(1);
    });
  });
});

describe('FileProgressTracker', () => {
  let loadingManager: LoadingManager;
  let progressTracker: FileProgressTracker;

  beforeEach(() => {
    loadingManager = new LoadingManager();
    progressTracker = new FileProgressTracker(
      loadingManager,
      OperationType.STORE_FILE,
      1000, // 1000 bytes total
      'Storing file'
    );
  });

  it('should track progress based on bytes processed', () => {
    const operationId = progressTracker.getOperationId();
    
    progressTracker.updateProgress(500); // 50% complete

    const info = loadingManager.getOperationInfo(operationId);
    expect(info!.progress).toBe(50);
  });

  it('should add to existing progress', () => {
    const operationId = progressTracker.getOperationId();
    
    progressTracker.updateProgress(300);
    progressTracker.addProgress(200); // Total 500 bytes

    const info = loadingManager.getOperationInfo(operationId);
    expect(info!.progress).toBe(50);
  });

  it('should handle completion', () => {
    const operationId = progressTracker.getOperationId();
    
    progressTracker.complete('File stored successfully');

    const info = loadingManager.getOperationInfo(operationId);
    expect(info!.state).toBe(LoadingState.SUCCESS);
    expect(info!.message).toBe('File stored successfully');
  });

  it('should handle failures', () => {
    const operationId = progressTracker.getOperationId();
    const error = new Error('Storage failed');
    
    progressTracker.fail(error, 'Failed to store file');

    const info = loadingManager.getOperationInfo(operationId);
    expect(info!.state).toBe(LoadingState.ERROR);
    expect(info!.error).toBe(error);
  });

  it('should not exceed 100% progress', () => {
    const operationId = progressTracker.getOperationId();
    
    progressTracker.updateProgress(1500); // More than total size

    const info = loadingManager.getOperationInfo(operationId);
    expect(info!.progress).toBe(100);
  });
});

describe('UserFeedbackManager', () => {
  let feedbackManager: UserFeedbackManager;

  beforeEach(() => {
    feedbackManager = new UserFeedbackManager();
  });

  describe('notification management', () => {
    it('should create success notifications', () => {
      const id = feedbackManager.showSuccess('Operation successful');

      const notifications = feedbackManager.getNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('success');
      expect(notifications[0].message).toBe('Operation successful');
      expect(notifications[0].id).toBe(id);
    });

    it('should create error notifications', () => {
      const id = feedbackManager.showError('Operation failed');

      const notifications = feedbackManager.getNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('error');
      expect(notifications[0].message).toBe('Operation failed');
    });

    it('should create loading notifications', () => {
      const id = feedbackManager.showLoading('Processing...');

      const notifications = feedbackManager.getNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('loading');
      expect(notifications[0].persistent).toBe(true);
    });

    it('should remove notifications', () => {
      const id = feedbackManager.showSuccess('Test message');
      
      feedbackManager.removeNotification(id);

      expect(feedbackManager.getNotifications()).toHaveLength(0);
    });

    it('should update existing notifications', () => {
      const id = feedbackManager.showLoading('Processing...');
      
      feedbackManager.updateNotification(id, {
        type: 'success',
        message: 'Completed!'
      });

      const notifications = feedbackManager.getNotifications();
      expect(notifications[0].type).toBe('success');
      expect(notifications[0].message).toBe('Completed!');
    });

    it('should limit number of notifications', () => {
      // Create more than the max limit (5)
      for (let i = 0; i < 7; i++) {
        feedbackManager.showInfo(`Message ${i}`);
      }

      const notifications = feedbackManager.getNotifications();
      expect(notifications).toHaveLength(5);
      expect(notifications[0].message).toBe('Message 2'); // First two should be removed
    });

    it('should clear all notifications', () => {
      feedbackManager.showSuccess('Message 1');
      feedbackManager.showError('Message 2');
      
      feedbackManager.clearAll();

      expect(feedbackManager.getNotifications()).toHaveLength(0);
    });
  });

  describe('auto-removal', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should auto-remove non-persistent notifications', () => {
      feedbackManager.showSuccess('Test message', 1000);

      expect(feedbackManager.getNotifications()).toHaveLength(1);

      jest.advanceTimersByTime(1000);

      expect(feedbackManager.getNotifications()).toHaveLength(0);
    });

    it('should not auto-remove persistent notifications', () => {
      feedbackManager.showLoading('Processing...');

      jest.advanceTimersByTime(5000);

      expect(feedbackManager.getNotifications()).toHaveLength(1);
    });
  });
});

describe('StorageFeedbackMessages', () => {
  it('should provide store file messages', () => {
    const messages = StorageFeedbackMessages.getStoreFileMessages('test.pdf');

    expect(messages.start).toContain('test.pdf');
    expect(messages.compressing).toContain('test.pdf');
    expect(messages.success).toContain('test.pdf');
    expect(messages.error).toContain('test.pdf');
  });

  it('should provide retrieve file messages', () => {
    const messages = StorageFeedbackMessages.getRetrieveFileMessages('document.docx');

    expect(messages.start).toContain('document.docx');
    expect(messages.success).toContain('document.docx');
    expect(messages.error).toContain('document.docx');
  });

  it('should provide delete file messages', () => {
    const messages = StorageFeedbackMessages.getDeleteFileMessages('video.mp4');

    expect(messages.start).toContain('video.mp4');
    expect(messages.success).toContain('video.mp4');
    expect(messages.error).toContain('video.mp4');
  });

  it('should provide storage usage messages', () => {
    const messages = StorageFeedbackMessages.getStorageUsageMessages();

    expect(messages.calculating).toBeDefined();
    expect(messages.success).toBeDefined();
    expect(messages.error).toBeDefined();
  });

  it('should provide clear storage messages', () => {
    const messages = StorageFeedbackMessages.getClearStorageMessages();

    expect(messages.start).toBeDefined();
    expect(messages.success).toBeDefined();
    expect(messages.error).toBeDefined();
  });
});