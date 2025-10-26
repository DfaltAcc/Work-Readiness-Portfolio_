/**
 * Integration tests for DocumentUpload component with persistent storage
 * Tests multiple file upload, storage persistence, and management functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentUpload } from '../document-upload';
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

// Create mock files
const createMockDocumentFile = (name = 'test-doc.pdf', type = 'application/pdf', size = 1024 * 1024) => {
  const file = new File(['mock document content'], name, {
    type,
    lastModified: Date.now(),
  });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

const createMockImageFile = (name = 'test-image.jpg', size = 512 * 1024) => {
  return createMockDocumentFile(name, 'image/jpeg', size);
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

describe('DocumentUpload Integration Tests', () => {
  let mockOnDocumentUpload: jest.Mock;
  let fileIdCounter = 0;

  beforeEach(() => {
    mockOnDocumentUpload = jest.fn();
    fileIdCounter = 0;
    
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
    
    mockStorageService.generateFileId.mockImplementation(() => `mock-file-id-${++fileIdCounter}`);
    mockStorageService.storeFile.mockImplementation(() => Promise.resolve(`mock-file-id-${fileIdCounter}`));
    mockStorageService.validateFile.mockReturnValue(undefined);
  });

  const renderDocumentUpload = (props = {}) => {
    return render(
      <FileStorageProvider>
        <DocumentUpload onDocumentUpload={mockOnDocumentUpload} {...props} />
      </FileStorageProvider>
    );
  };

  describe('Multiple File Upload and Storage', () => {
    it('should upload and store multiple document files successfully', async () => {
      const user = userEvent.setup();
      renderDocumentUpload();

      // Wait for storage initialization
      await waitFor(() => {
        expect(mockStorageService.initializeStorage).toHaveBeenCalled();
      });

      const fileInput = screen.getByRole('textbox', { hidden: true });

      // Upload first file
      const pdfFile = createMockDocumentFile('document1.pdf');
      await act(async () => {
        await user.upload(fileInput, pdfFile);
      });

      await waitFor(() => {
        expect(mockStorageService.storeFile).toHaveBeenCalledWith(
          'mock-file-id-1',
          pdfFile,
          'document',
          expect.any(ArrayBuffer)
        );
      });

      // Upload second file
      const imageFile = createMockImageFile('image1.jpg');
      await act(async () => {
        await user.upload(fileInput, imageFile);
      });

      await waitFor(() => {
        expect(mockStorageService.storeFile).toHaveBeenCalledWith(
          'mock-file-id-2',
          imageFile,
          'document',
          expect.any(ArrayBuffer)
        );
      });

      // Verify both files are displayed
      expect(screen.getByText('document1.pdf')).toBeInTheDocument();
      expect(screen.getByText('image1.jpg')).toBeInTheDocument();
      expect(screen.getAllByText('Saved')).toHaveLength(2);
      expect(mockOnDocumentUpload).toHaveBeenCalledTimes(2);
    });

    it('should handle mixed success and failure scenarios', async () => {
      const user = userEvent.setup();
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      
      // First file succeeds, second fails
      mockStorageService.storeFile
        .mockResolvedValueOnce('mock-file-id-1')
        .mockRejectedValueOnce(new Error('Storage failed'));

      renderDocumentUpload();

      await waitFor(() => {
        expect(mockStorageService.initializeStorage).toHaveBeenCalled();
      });

      const fileInput = screen.getByRole('textbox', { hidden: true });

      // Upload first file (success)
      const pdfFile = createMockDocumentFile('document1.pdf');
      await act(async () => {
        await user.upload(fileInput, pdfFile);
      });

      await waitFor(() => {
        expect(screen.getByText('document1.pdf')).toBeInTheDocument();
        expect(screen.getByText('Saved')).toBeInTheDocument();
      });

      // Upload second file (failure)
      const imageFile = createMockImageFile('image1.jpg');
      await act(async () => {
        await user.upload(fileInput, imageFile);
      });

      await waitFor(() => {
        expect(screen.getByText('image1.jpg')).toBeInTheDocument();
      });

      // Should show error for second file
      expect(alertSpy).toHaveBeenCalledWith(
        'Failed to save document. It will only be available for this session.'
      );

      alertSpy.mockRestore();
    });
  });

  describe('File Restoration', () => {
    it('should restore multiple previously uploaded documents on component mount', async () => {
      const mockStoredFiles = [
        {
          id: 'stored-file-1',
          name: 'restored-doc1.pdf',
          size: 1024 * 1024,
          type: 'application/pdf',
          category: 'document' as const,
          storedAt: new Date('2024-01-01'),
          compressed: false,
        },
        {
          id: 'stored-file-2',
          name: 'restored-image1.jpg',
          size: 512 * 1024,
          type: 'image/jpeg',
          category: 'document' as const,
          storedAt: new Date('2024-01-02'),
          compressed: true,
        },
      ];

      mockStorageService.listFiles.mockResolvedValue(mockStoredFiles);
      mockStorageService.retrieveFile
        .mockResolvedValueOnce(createMockDocumentFile('restored-doc1.pdf'))
        .mockResolvedValueOnce(createMockImageFile('restored-image1.jpg'));

      renderDocumentUpload();

      // Wait for restoration to complete
      await waitFor(() => {
        expect(mockStorageService.retrieveFile).toHaveBeenCalledWith('stored-file-1');
        expect(mockStorageService.retrieveFile).toHaveBeenCalledWith('stored-file-2');
      });

      // Verify restored files are displayed
      expect(screen.getByText('restored-doc1.pdf')).toBeInTheDocument();
      expect(screen.getByText('restored-image1.jpg')).toBeInTheDocument();
      expect(screen.getByText('2 Saved')).toBeInTheDocument();
      expect(screen.getByText('Compressed')).toBeInTheDocument();
      expect(mockOnDocumentUpload).toHaveBeenCalledTimes(2);
    });

    it('should handle partial restoration failures', async () => {
      const mockStoredFiles = [
        {
          id: 'stored-file-1',
          name: 'good-doc.pdf',
          size: 1024 * 1024,
          type: 'application/pdf',
          category: 'document' as const,
          storedAt: new Date(),
          compressed: false,
        },
        {
          id: 'stored-file-2',
          name: 'corrupted-doc.pdf',
          size: 1024 * 1024,
          type: 'application/pdf',
          category: 'document' as const,
          storedAt: new Date(),
          compressed: false,
        },
      ];

      mockStorageService.listFiles.mockResolvedValue(mockStoredFiles);
      mockStorageService.retrieveFile
        .mockResolvedValueOnce(createMockDocumentFile('good-doc.pdf'))
        .mockRejectedValueOnce(new Error('File corrupted'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      renderDocumentUpload();

      await waitFor(() => {
        expect(mockStorageService.retrieveFile).toHaveBeenCalledTimes(2);
      });

      // Should show only the successfully restored file
      expect(screen.getByText('good-doc.pdf')).toBeInTheDocument();
      expect(screen.queryByText('corrupted-doc.pdf')).not.toBeInTheDocument();
      expect(mockOnDocumentUpload).toHaveBeenCalledTimes(1);

      // Should log error
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to restore documents:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('File Management', () => {
    it('should delete individual files from storage and UI', async () => {
      const user = userEvent.setup();
      renderDocumentUpload();

      await waitFor(() => {
        expect(mockStorageService.initializeStorage).toHaveBeenCalled();
      });

      // Upload two files
      const fileInput = screen.getByRole('textbox', { hidden: true });
      
      const file1 = createMockDocumentFile('doc1.pdf');
      await act(async () => {
        await user.upload(fileInput, file1);
      });

      const file2 = createMockDocumentFile('doc2.pdf');
      await act(async () => {
        await user.upload(fileInput, file2);
      });

      await waitFor(() => {
        expect(screen.getByText('doc1.pdf')).toBeInTheDocument();
        expect(screen.getByText('doc2.pdf')).toBeInTheDocument();
      });

      // Delete first file
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      // Verify deletion was called
      expect(mockStorageService.deleteFile).toHaveBeenCalledWith('mock-file-id-1');

      // Verify first file is removed from UI
      await waitFor(() => {
        expect(screen.queryByText('doc1.pdf')).not.toBeInTheDocument();
        expect(screen.getByText('doc2.pdf')).toBeInTheDocument();
      });
    });

    it('should handle file preview and download actions', async () => {
      const user = userEvent.setup();
      renderDocumentUpload();

      await waitFor(() => {
        expect(mockStorageService.initializeStorage).toHaveBeenCalled();
      });

      // Upload a file
      const fileInput = screen.getByRole('textbox', { hidden: true });
      const mockFile = createMockDocumentFile('test-doc.pdf');

      await act(async () => {
        await user.upload(fileInput, mockFile);
      });

      await waitFor(() => {
        expect(screen.getByText('test-doc.pdf')).toBeInTheDocument();
      });

      // Mock window.open for preview
      const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

      // Test preview
      const previewButton = screen.getByRole('button', { name: /preview/i });
      await user.click(previewButton);

      expect(openSpy).toHaveBeenCalledWith('mock-url', '_blank');

      // Test download
      const downloadButton = screen.getByRole('button', { name: /download/i });
      
      // Mock document.createElement and appendChild for download
      const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue({
        href: '',
        download: '',
        click: jest.fn(),
      } as any);
      const appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(() => ({} as any));
      const removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation(() => ({} as any));

      await user.click(downloadButton);

      expect(createElementSpy).toHaveBeenCalledWith('a');

      // Cleanup
      openSpy.mockRestore();
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });
  });

  describe('Image Preview Functionality', () => {
    it('should display image preview for uploaded image files', async () => {
      const user = userEvent.setup();
      renderDocumentUpload();

      await waitFor(() => {
        expect(mockStorageService.initializeStorage).toHaveBeenCalled();
      });

      // Upload an image file
      const fileInput = screen.getByRole('textbox', { hidden: true });
      const imageFile = createMockImageFile('test-image.jpg');

      await act(async () => {
        await user.upload(fileInput, imageFile);
      });

      await waitFor(() => {
        expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
      });

      // Should show image preview section
      expect(screen.getByText('Image Preview')).toBeInTheDocument();
      
      // Should show the image element
      const imageElement = screen.getByAltText('test-image.jpg');
      expect(imageElement).toBeInTheDocument();
      expect(imageElement).toHaveAttribute('src', 'mock-url');
    });

    it('should not show image preview for non-image files', async () => {
      const user = userEvent.setup();
      renderDocumentUpload();

      await waitFor(() => {
        expect(mockStorageService.initializeStorage).toHaveBeenCalled();
      });

      // Upload a PDF file
      const fileInput = screen.getByRole('textbox', { hidden: true });
      const pdfFile = createMockDocumentFile('test-doc.pdf');

      await act(async () => {
        await user.upload(fileInput, pdfFile);
      });

      await waitFor(() => {
        expect(screen.getByText('test-doc.pdf')).toBeInTheDocument();
      });

      // Should not show image preview section
      expect(screen.queryByText('Image Preview')).not.toBeInTheDocument();
    });
  });

  describe('Storage Integration', () => {
    it('should show storage usage indicator when storage is initialized', async () => {
      renderDocumentUpload();

      await waitFor(() => {
        expect(mockStorageService.initializeStorage).toHaveBeenCalled();
      });

      // Should show storage usage indicator
      expect(screen.getByText('Storage Usage')).toBeInTheDocument();
    });

    it('should validate file types according to accepted formats', async () => {
      const user = userEvent.setup();
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      
      renderDocumentUpload({ acceptedFormats: ['pdf', 'jpg'] });

      const fileInput = screen.getByRole('textbox', { hidden: true });
      
      // Try to upload unsupported file type
      const unsupportedFile = createMockDocumentFile('test.txt', 'text/plain');

      await act(async () => {
        await user.upload(fileInput, unsupportedFile);
      });

      expect(alertSpy).toHaveBeenCalledWith(
        'Please upload a supported file (pdf, jpg)'
      );
      expect(mockStorageService.storeFile).not.toHaveBeenCalled();

      alertSpy.mockRestore();
    });

    it('should handle storage quota warnings', async () => {
      const user = userEvent.setup();
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      // Mock storage nearly full
      mockStorageService.getStorageUsage.mockResolvedValue({
        used: 95 * 1024 * 1024,
        available: 100 * 1024 * 1024,
        percentage: 95,
      });

      renderDocumentUpload();

      await waitFor(() => {
        expect(mockStorageService.initializeStorage).toHaveBeenCalled();
      });

      const fileInput = screen.getByRole('textbox', { hidden: true });
      const mockFile = createMockDocumentFile('large-doc.pdf', 'application/pdf', 10 * 1024 * 1024);

      await act(async () => {
        await user.upload(fileInput, mockFile);
      });

      expect(alertSpy).toHaveBeenCalledWith(
        'Not enough storage space available. Please delete some files first.'
      );

      alertSpy.mockRestore();
    });
  });
});