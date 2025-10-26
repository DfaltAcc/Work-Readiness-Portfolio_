/**
 * Integration tests for VideoUpload component with persistent storage
 * Tests file upload, storage persistence, and restoration functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VideoUpload } from '../video-upload';
import { FileStorageProvider } from '@/lib/storage/file-storage-context';

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock IndexedDB
const mockIndexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
};

Object.defineProperty(global, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
});

// Create a mock video file
const createMockVideoFile = (name = 'test-video.mp4', size = 1024 * 1024) => {
  const file = new File(['mock video content'], name, {
    type: 'video/mp4',
    lastModified: Date.now(),
  });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

// Mock storage implementation
const mockStorageService = {
  initializeStorage: jest.fn(),
  storeFile: jest.fn(),
  retrieveFile: jest.fn(),
  deleteFile: jest.fn(),
  listFiles: jest.fn(),
  getStorageUsage: jest.fn(),
  clearAllFiles: jest.fn(),
  validateFile: jest.fn(),
  generateFileId: jest.fn(),
  close: jest.fn(),
};

// Mock the storage service module
jest.mock('@/lib/storage/file-storage-service', () => ({
  FileStorageService: jest.fn(() => mockStorageService),
}));

describe('VideoUpload Integration Tests', () => {
  let mockOnVideoUpload: jest.Mock;

  beforeEach(() => {
    mockOnVideoUpload = jest.fn();
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockStorageService.initializeStorage.mockResolvedValue({
      available: true,
      method: 'indexeddb',
    });
    
    mockStorageService.listFiles.mockResolvedValue([]);
    
    mockStorageService.getStorageUsage.mockResolvedValue({
      used: 1024 * 1024,
      available: 100 * 1024 * 1024,
      percentage: 1,
    });
    
    mockStorageService.generateFileId.mockReturnValue('mock-file-id');
    mockStorageService.storeFile.mockResolvedValue('mock-file-id');
    mockStorageService.validateFile.mockReturnValue(undefined);
  });

  const renderVideoUpload = (props = {}) => {
    return render(
      <FileStorageProvider>
        <VideoUpload onVideoUpload={mockOnVideoUpload} {...props} />
      </FileStorageProvider>
    );
  };

  describe('File Upload and Storage', () => {
    it('should upload and store a video file successfully', async () => {
      const user = userEvent.setup();
      renderVideoUpload();

      // Wait for storage initialization
      await waitFor(() => {
        expect(mockStorageService.initializeStorage).toHaveBeenCalled();
      });

      const fileInput = screen.getByRole('textbox', { hidden: true });
      const mockFile = createMockVideoFile();

      await act(async () => {
        await user.upload(fileInput, mockFile);
      });

      // Verify file storage was called
      await waitFor(() => {
        expect(mockStorageService.storeFile).toHaveBeenCalledWith(
          'mock-file-id',
          mockFile,
          'video',
          expect.any(ArrayBuffer)
        );
      });

      // Verify callback was called
      expect(mockOnVideoUpload).toHaveBeenCalledWith(mockFile);

      // Verify UI shows uploaded file
      expect(screen.getByText('test-video.mp4')).toBeInTheDocument();
      expect(screen.getByText('Saved')).toBeInTheDocument();
    });

    it('should handle storage errors gracefully', async () => {
      const user = userEvent.setup();
      mockStorageService.storeFile.mockRejectedValue(new Error('Storage failed'));
      
      // Mock alert to prevent actual alert dialogs
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      
      renderVideoUpload();

      await waitFor(() => {
        expect(mockStorageService.initializeStorage).toHaveBeenCalled();
      });

      const fileInput = screen.getByRole('textbox', { hidden: true });
      const mockFile = createMockVideoFile();

      await act(async () => {
        await user.upload(fileInput, mockFile);
      });

      // Should still show the file (session-only storage)
      await waitFor(() => {
        expect(screen.getByText('test-video.mp4')).toBeInTheDocument();
      });

      // Should show error message
      expect(alertSpy).toHaveBeenCalledWith(
        'Failed to save video. It will only be available for this session.'
      );

      alertSpy.mockRestore();
    });

    it('should validate file size and show error for oversized files', async () => {
      const user = userEvent.setup();
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      
      renderVideoUpload({ maxSizeMB: 1 }); // 1MB limit

      const fileInput = screen.getByRole('textbox', { hidden: true });
      const oversizedFile = createMockVideoFile('large-video.mp4', 2 * 1024 * 1024); // 2MB

      await act(async () => {
        await user.upload(fileInput, oversizedFile);
      });

      expect(alertSpy).toHaveBeenCalledWith('File size must be less than 1MB');
      expect(mockStorageService.storeFile).not.toHaveBeenCalled();

      alertSpy.mockRestore();
    });
  });

  describe('File Restoration', () => {
    it('should restore previously uploaded video on component mount', async () => {
      const mockStoredFile = {
        id: 'stored-file-id',
        name: 'restored-video.mp4',
        size: 1024 * 1024,
        type: 'video/mp4',
        category: 'video' as const,
        storedAt: new Date(),
        compressed: false,
      };

      mockStorageService.listFiles.mockResolvedValue([mockStoredFile]);
      mockStorageService.retrieveFile.mockResolvedValue(
        createMockVideoFile('restored-video.mp4')
      );

      renderVideoUpload();

      // Wait for restoration to complete
      await waitFor(() => {
        expect(mockStorageService.retrieveFile).toHaveBeenCalledWith('stored-file-id');
      });

      // Verify restored file is displayed
      expect(screen.getByText('restored-video.mp4')).toBeInTheDocument();
      expect(screen.getByText('Saved')).toBeInTheDocument();
      expect(mockOnVideoUpload).toHaveBeenCalled();
    });

    it('should handle restoration errors gracefully', async () => {
      const mockStoredFile = {
        id: 'stored-file-id',
        name: 'corrupted-video.mp4',
        size: 1024 * 1024,
        type: 'video/mp4',
        category: 'video' as const,
        storedAt: new Date(),
        compressed: false,
      };

      mockStorageService.listFiles.mockResolvedValue([mockStoredFile]);
      mockStorageService.retrieveFile.mockRejectedValue(new Error('File corrupted'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      renderVideoUpload();

      await waitFor(() => {
        expect(mockStorageService.retrieveFile).toHaveBeenCalledWith('stored-file-id');
      });

      // Should log error but not crash
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to restore video:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('File Deletion', () => {
    it('should delete stored file when remove button is clicked', async () => {
      const user = userEvent.setup();
      renderVideoUpload();

      await waitFor(() => {
        expect(mockStorageService.initializeStorage).toHaveBeenCalled();
      });

      // Upload a file first
      const fileInput = screen.getByRole('textbox', { hidden: true });
      const mockFile = createMockVideoFile();

      await act(async () => {
        await user.upload(fileInput, mockFile);
      });

      await waitFor(() => {
        expect(screen.getByText('test-video.mp4')).toBeInTheDocument();
      });

      // Click remove button
      const removeButton = screen.getByRole('button', { name: /remove/i });
      await user.click(removeButton);

      // Verify deletion was called
      expect(mockStorageService.deleteFile).toHaveBeenCalledWith('mock-file-id');

      // Verify file is removed from UI
      await waitFor(() => {
        expect(screen.queryByText('test-video.mp4')).not.toBeInTheDocument();
      });
    });

    it('should handle deletion errors gracefully', async () => {
      const user = userEvent.setup();
      mockStorageService.deleteFile.mockRejectedValue(new Error('Delete failed'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      renderVideoUpload();

      await waitFor(() => {
        expect(mockStorageService.initializeStorage).toHaveBeenCalled();
      });

      // Upload a file first
      const fileInput = screen.getByRole('textbox', { hidden: true });
      const mockFile = createMockVideoFile();

      await act(async () => {
        await user.upload(fileInput, mockFile);
      });

      // Click remove button
      const removeButton = screen.getByRole('button', { name: /remove/i });
      await user.click(removeButton);

      // Should log error but still remove from UI
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to delete video from storage:',
        expect.any(Error)
      );

      await waitFor(() => {
        expect(screen.queryByText('test-video.mp4')).not.toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Storage Quota Management', () => {
    it('should show warning when storage is nearly full', async () => {
      mockStorageService.getStorageUsage.mockResolvedValue({
        used: 90 * 1024 * 1024,
        available: 100 * 1024 * 1024,
        percentage: 90,
      });

      renderVideoUpload();

      await waitFor(() => {
        expect(mockStorageService.initializeStorage).toHaveBeenCalled();
      });

      // Should show storage usage indicator
      expect(screen.getByText('Storage Usage')).toBeInTheDocument();
    });

    it('should prevent upload when storage is full', async () => {
      const user = userEvent.setup();
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      // Mock canUploadFile to return false (storage full)
      mockStorageService.getStorageUsage.mockResolvedValue({
        used: 99 * 1024 * 1024,
        available: 100 * 1024 * 1024,
        percentage: 99,
      });

      renderVideoUpload();

      await waitFor(() => {
        expect(mockStorageService.initializeStorage).toHaveBeenCalled();
      });

      const fileInput = screen.getByRole('textbox', { hidden: true });
      const mockFile = createMockVideoFile();

      await act(async () => {
        await user.upload(fileInput, mockFile);
      });

      expect(alertSpy).toHaveBeenCalledWith(
        'Not enough storage space available. Please delete some files first.'
      );
      expect(mockStorageService.storeFile).not.toHaveBeenCalled();

      alertSpy.mockRestore();
    });
  });

  describe('Fallback Storage', () => {
    it('should work without persistent storage', async () => {
      const user = userEvent.setup();
      mockStorageService.initializeStorage.mockResolvedValue({
        available: false,
        method: 'none',
        error: 'Storage unavailable',
      });

      renderVideoUpload();

      await waitFor(() => {
        expect(screen.getByText(/storage unavailable/i)).toBeInTheDocument();
      });

      // Should still allow file upload
      const fileInput = screen.getByRole('textbox', { hidden: true });
      const mockFile = createMockVideoFile();

      await act(async () => {
        await user.upload(fileInput, mockFile);
      });

      // Should show file without storage
      expect(screen.getByText('test-video.mp4')).toBeInTheDocument();
      expect(screen.queryByText('Saved')).not.toBeInTheDocument();
      expect(mockStorageService.storeFile).not.toHaveBeenCalled();
    });
  });
});