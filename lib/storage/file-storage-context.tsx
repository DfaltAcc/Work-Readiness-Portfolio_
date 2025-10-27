/**
 * FileStorageContext - React Context for managing file storage state
 * Provides centralized file storage operations across the application
 */

'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect, ReactNode } from 'react';
import { FileStorageService } from './file-storage-service';
import { FileProcessor } from './file-processor';
import { StorageUsageTracker, StorageQuotaWarning } from './storage-usage-tracker';
import {
  FileStorageContextType,
  StoredFileInfo,
  StorageUsage,
  StorageError,
  StorageErrorType,
  StorageMethod
} from './types';

// Extended context type that includes state information
interface ExtendedFileStorageContextType extends FileStorageContextType {
  // Additional state information
  files: StoredFileInfo[];
  storageUsage: StorageUsage | null;
  isInitialized: boolean;
  storageMethod: StorageMethod;
  
  // Storage usage tracking
  storageWarning: StorageQuotaWarning | null;
  canUploadFile: (fileSize: number) => boolean;
  getUploadWarning: (fileSize: number) => StorageQuotaWarning | null;
  getStorageUsageSummary: () => ReturnType<StorageUsageTracker['getStorageUsageSummary']> | null;
}

// Context state interface
interface FileStorageState {
  files: StoredFileInfo[];
  storageUsage: StorageUsage | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  storageMethod: StorageMethod;
  storageWarning: StorageQuotaWarning | null;
}

// Action types for state management
type FileStorageAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_FILES'; payload: StoredFileInfo[] }
  | { type: 'ADD_FILE'; payload: StoredFileInfo }
  | { type: 'REMOVE_FILE'; payload: string }
  | { type: 'SET_STORAGE_USAGE'; payload: StorageUsage }
  | { type: 'SET_INITIALIZED'; payload: { initialized: boolean; method: StorageMethod } }
  | { type: 'SET_STORAGE_WARNING'; payload: StorageQuotaWarning | null }
  | { type: 'CLEAR_ALL_FILES' };

// Initial state
const initialState: FileStorageState = {
  files: [],
  storageUsage: null,
  isLoading: false,
  error: null,
  isInitialized: false,
  storageMethod: StorageMethod.NONE,
  storageWarning: null
};

// State reducer
function fileStorageReducer(state: FileStorageState, action: FileStorageAction): FileStorageState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'SET_FILES':
      return { ...state, files: action.payload };
    
    case 'ADD_FILE':
      return { 
        ...state, 
        files: [...state.files.filter(f => f.id !== action.payload.id), action.payload] 
      };
    
    case 'REMOVE_FILE':
      return { 
        ...state, 
        files: state.files.filter(f => f.id !== action.payload) 
      };
    
    case 'SET_STORAGE_USAGE':
      return { ...state, storageUsage: action.payload };
    
    case 'SET_INITIALIZED':
      return { 
        ...state, 
        isInitialized: action.payload.initialized,
        storageMethod: action.payload.method
      };
    
    case 'SET_STORAGE_WARNING':
      return { ...state, storageWarning: action.payload };
    
    case 'CLEAR_ALL_FILES':
      return { ...state, files: [] };
    
    default:
      return state;
  }
}

// Create the context
const FileStorageContext = createContext<ExtendedFileStorageContextType | null>(null);

// Provider props interface
interface FileStorageProviderProps {
  children: ReactNode;
}

// FileStorageProvider component
export function FileStorageProvider({ children }: FileStorageProviderProps) {
  const [state, dispatch] = useReducer(fileStorageReducer, initialState);
  
  // Initialize services
  const fileStorageService = React.useMemo(() => new FileStorageService(), []);
  const fileProcessor = React.useMemo(() => new FileProcessor(), []);
  const storageUsageTracker = React.useMemo(() => new StorageUsageTracker(), []);

  // Initialize storage on mount
  useEffect(() => {
    const initializeStorage = async () => {
      const maxRetries = 3;
      let retryCount = 0;
      
      while (retryCount < maxRetries) {
        try {
          console.log(`🔄 Starting storage initialization (attempt ${retryCount + 1}/${maxRetries})...`);
          dispatch({ type: 'SET_LOADING', payload: true });
          dispatch({ type: 'SET_ERROR', payload: null });
          
          const capability = await fileStorageService.initializeStorage();
          console.log('📦 Storage capability:', capability);
          
          dispatch({ 
            type: 'SET_INITIALIZED', 
            payload: { 
              initialized: capability.available, 
              method: capability.method 
            } 
          });
          
          if (capability.available) {
            console.log('✅ Storage initialized successfully with method:', capability.method);
            // Load existing files and storage usage
            try {
              await Promise.all([
                loadFiles(),
                updateStorageUsage()
              ]);
              console.log('✅ Files and storage usage loaded successfully');
            } catch (loadError) {
              console.warn('⚠️ Failed to load files/usage, but storage is available:', loadError);
              // Don't fail initialization if file loading fails
            }
            break; // Success, exit retry loop
          } else {
            console.error('❌ Storage initialization failed:', capability.error);
            if (retryCount === maxRetries - 1) {
              // Last attempt failed
              dispatch({ 
                type: 'SET_ERROR', 
                payload: capability.error || 'Storage initialization failed after multiple attempts' 
              });
            }
          }
        } catch (error) {
          console.error(`💥 Storage initialization error (attempt ${retryCount + 1}):`, error);
          if (retryCount === maxRetries - 1) {
            // Last attempt failed
            dispatch({ 
              type: 'SET_ERROR', 
              payload: error instanceof Error ? error.message : 'Storage initialization failed after multiple attempts' 
            });
          }
        }
        
        retryCount++;
        if (retryCount < maxRetries) {
          console.log(`⏳ Retrying in 1 second...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      dispatch({ type: 'SET_LOADING', payload: false });
    };

    initializeStorage();

    // Listen for storage fallback notifications
    const handleStorageFallback = (event: CustomEvent) => {
      console.info('Storage fallback detected:', event.detail);
      // Update storage method in state
      dispatch({ 
        type: 'SET_INITIALIZED', 
        payload: { 
          initialized: true, 
          method: event.detail.method 
        } 
      });
    };

    window.addEventListener('storage-fallback-notification', handleStorageFallback as EventListener);

    return () => {
      window.removeEventListener('storage-fallback-notification', handleStorageFallback as EventListener);
      fileStorageService.close();
    };
  }, [fileStorageService]);

  // Load files from storage
  const loadFiles = useCallback(async () => {
    try {
      console.log('📁 Loading files from storage...');
      const files = await fileStorageService.listFiles();
      console.log(`📁 Loaded ${files.length} files:`, files.map(f => f.name));
      dispatch({ type: 'SET_FILES', payload: files });
    } catch (error) {
      console.error('❌ Failed to load files:', error);
      // Don't throw error - just set empty files array
      dispatch({ type: 'SET_FILES', payload: [] });
    }
  }, [fileStorageService]);

  // Update storage usage
  const updateStorageUsage = useCallback(async () => {
    try {
      const usage = await fileStorageService.getStorageUsage();
      dispatch({ type: 'SET_STORAGE_USAGE', payload: usage });
      
      // Check for storage warnings
      const warning = storageUsageTracker.checkStorageUsage(usage);
      dispatch({ type: 'SET_STORAGE_WARNING', payload: warning });
    } catch (error) {
      console.error('Failed to get storage usage:', error);
      // Don't throw here as this is not critical
    }
  }, [fileStorageService, storageUsageTracker]);

  // Store a file
  const storeFile = useCallback(async (file: File, category: 'video' | 'document'): Promise<string> => {
    try {
      console.log('📁 Starting file storage:', { name: file.name, type: file.type, size: file.size, category });
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      // Check storage quota before processing
      if (state.storageUsage) {
        console.log('💾 Checking storage quota...');
        storageUsageTracker.validateFileStorage(file.size, state.storageUsage);
      }

      // Validate file
      console.log('✅ Validating file...');
      fileStorageService.validateFile(file, category);

      // Generate unique file ID
      const fileId = fileStorageService.generateFileId();
      console.log('🆔 Generated file ID:', fileId);

      // Process file (compression, etc.)
      console.log('⚙️ Processing file...');
      const processedData = await fileProcessor.processFile(file, category);
      console.log('✅ File processed:', { compressed: processedData.compressed, finalSize: processedData.finalSize });

      // Store file
      console.log('💾 Storing file in storage...');
      await fileStorageService.storeFile(fileId, file, category, processedData.processedFile as ArrayBuffer);
      console.log('✅ File stored successfully');

      // Create file info for state
      const fileInfo: StoredFileInfo = {
        id: fileId,
        name: file.name,
        size: processedData.finalSize,
        type: file.type,
        category,
        storedAt: new Date(),
        compressed: processedData.compressed
      };

      // Update state
      dispatch({ type: 'ADD_FILE', payload: fileInfo });
      
      // Update storage usage
      await updateStorageUsage();

      console.log('🎉 File storage completed successfully');
      return fileId;
    } catch (error) {
      const errorMessage = error instanceof StorageError 
        ? error.message 
        : 'Failed to store file';
      
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [fileStorageService, fileProcessor, updateStorageUsage, storageUsageTracker, state.storageUsage]);

  // Retrieve a file
  const retrieveFile = useCallback(async (fileId: string): Promise<File | null> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const file = await fileStorageService.retrieveFile(fileId);
      return file;
    } catch (error) {
      const errorMessage = error instanceof StorageError 
        ? error.message 
        : 'Failed to retrieve file';
      
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [fileStorageService]);

  // Delete a file
  const deleteFile = useCallback(async (fileId: string): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      await fileStorageService.deleteFile(fileId);
      
      // Update state
      dispatch({ type: 'REMOVE_FILE', payload: fileId });
      
      // Reset warning state after deletion
      storageUsageTracker.resetWarningState();
      
      // Update storage usage
      await updateStorageUsage();
    } catch (error) {
      const errorMessage = error instanceof StorageError 
        ? error.message 
        : 'Failed to delete file';
      
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [fileStorageService, updateStorageUsage, storageUsageTracker]);

  // List files
  const listFiles = useCallback(async (category?: 'video' | 'document'): Promise<StoredFileInfo[]> => {
    try {
      const files = await fileStorageService.listFiles(category);
      
      // Update state if no category filter (full list)
      if (!category) {
        dispatch({ type: 'SET_FILES', payload: files });
      }
      
      return files;
    } catch (error) {
      const errorMessage = error instanceof StorageError 
        ? error.message 
        : 'Failed to list files';
      
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  }, [fileStorageService]);

  // Get storage usage
  const getStorageUsage = useCallback(async (): Promise<StorageUsage> => {
    try {
      const usage = await fileStorageService.getStorageUsage();
      dispatch({ type: 'SET_STORAGE_USAGE', payload: usage });
      return usage;
    } catch (error) {
      const errorMessage = error instanceof StorageError 
        ? error.message 
        : 'Failed to get storage usage';
      
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  }, [fileStorageService]);

  // Clear all files
  const clearAllFiles = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      await fileStorageService.clearAllFiles();
      
      // Update state
      dispatch({ type: 'CLEAR_ALL_FILES' });
      
      // Reset warning state after clearing
      storageUsageTracker.resetWarningState();
      dispatch({ type: 'SET_STORAGE_WARNING', payload: null });
      
      // Update storage usage
      await updateStorageUsage();
    } catch (error) {
      const errorMessage = error instanceof StorageError 
        ? error.message 
        : 'Failed to clear files';
      
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [fileStorageService, updateStorageUsage, storageUsageTracker]);

  // Storage usage tracking functions
  const canUploadFile = useCallback((fileSize: number): boolean => {
    if (!state.storageUsage) return true;
    return storageUsageTracker.canStoreFile(fileSize, state.storageUsage);
  }, [state.storageUsage, storageUsageTracker]);

  const getUploadWarning = useCallback((fileSize: number): StorageQuotaWarning | null => {
    if (!state.storageUsage) return null;
    return storageUsageTracker.getUploadWarning(fileSize, state.storageUsage);
  }, [state.storageUsage, storageUsageTracker]);

  const getStorageUsageSummary = useCallback(() => {
    if (!state.storageUsage) return null;
    return storageUsageTracker.getStorageUsageSummary(state.storageUsage);
  }, [state.storageUsage, storageUsageTracker]);

  // Context value
  const contextValue: ExtendedFileStorageContextType = {
    // File operations
    storeFile,
    retrieveFile,
    deleteFile,
    listFiles,
    
    // Storage management
    getStorageUsage,
    clearAllFiles,
    
    // State
    isLoading: state.isLoading,
    error: state.error,
    
    // Additional state information
    files: state.files,
    storageUsage: state.storageUsage,
    isInitialized: state.isInitialized,
    storageMethod: state.storageMethod,
    
    // Storage usage tracking
    storageWarning: state.storageWarning,
    canUploadFile,
    getUploadWarning,
    getStorageUsageSummary
  };

  return (
    <FileStorageContext.Provider value={contextValue}>
      {children}
    </FileStorageContext.Provider>
  );
}

// Hook to use the file storage context
export function useFileStorage(): FileStorageContextType {
  const context = useContext(FileStorageContext);
  
  if (!context) {
    throw new Error('useFileStorage must be used within a FileStorageProvider');
  }
  
  return context;
}

// Hook to get additional storage state (files, usage, etc.)
export function useFileStorageState() {
  const context = useContext(FileStorageContext);
  
  if (!context) {
    throw new Error('useFileStorageState must be used within a FileStorageProvider');
  }
  
  return {
    files: context.files,
    storageUsage: context.storageUsage,
    isInitialized: context.isInitialized,
    storageMethod: context.storageMethod,
    storageWarning: context.storageWarning,
    canUploadFile: context.canUploadFile,
    getUploadWarning: context.getUploadWarning,
    getStorageUsageSummary: context.getStorageUsageSummary
  };
}

export { FileStorageContext };