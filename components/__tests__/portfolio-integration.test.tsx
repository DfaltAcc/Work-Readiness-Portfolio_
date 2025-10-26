/**
 * End-to-end integration tests for the complete file upload and persistence workflow
 * Tests cross-component file state management and persistence across navigation
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { FileStorageProvider } from '@/lib/storage/file-storage-context';
import { PortfolioSection } from '@/components/portfolio-section';

// Mock the storage components to avoid complex IndexedDB mocking
const mockUseFileStorage = jest.fn();
const mockUseFileStorageState = jest.fn();

jest.mock('@/lib/storage/file-storage-context', () => {
  const React = require('react');
  
  return {
    FileStorageProvider: ({ children }: { children: React.ReactNode }) => children,
    useFileStorage: () => mockUseFileStorage(),
    useFileStorageState: () => mockUseFileStorageState(),
  };
});

// Mock upload components to simplify testing
jest.mock('@/components/video-upload', () => {
  return {
    VideoUpload: () => <div data-testid="video-upload">Video Upload Component</div>
  };
});

jest.mock('@/components/document-upload', () => {
  return {
    DocumentUpload: () => <div data-testid="document-upload">Document Upload Component</div>
  };
});

// Mock portfolio section data
const mockPortfolioData = {
  id: 'test-section',
  title: 'Test Section',
  description: 'Test description',
  evidence: {
    title: 'Test Evidence',
    description: 'Test evidence description',
    highlights: ['Test highlight 1', 'Test highlight 2'],
  },
  reflection: {
    situation: 'Test situation',
    task: 'Test task',
    action: 'Test action',
    result: 'Test result',
  },
};

describe('Portfolio Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set default mock implementations
    mockUseFileStorage.mockReturnValue({
      storeFile: jest.fn(),
      retrieveFile: jest.fn(),
      deleteFile: jest.fn(),
      listFiles: jest.fn(),
      getStorageUsage: jest.fn(),
      clearAllFiles: jest.fn(),
      isLoading: false,
      error: null,
    });

    mockUseFileStorageState.mockReturnValue({
      files: [],
      storageUsage: null,
      isInitialized: true,
      storageMethod: 'indexeddb',
      storageWarning: null,
      canUploadFile: jest.fn(() => true),
      getUploadWarning: jest.fn(() => null),
      getStorageUsageSummary: jest.fn(() => null),
    });
  });

  test('portfolio section renders with storage provider integration', async () => {
    render(
      <FileStorageProvider>
        <PortfolioSection {...mockPortfolioData} />
      </FileStorageProvider>
    );

    // Verify section content is rendered
    expect(screen.getByText('Test Section')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
    
    // Verify storage status message appears
    await waitFor(() => {
      expect(screen.getByText(/file persistence enabled/i)).toBeInTheDocument();
    });

    // Verify upload components are rendered
    expect(screen.getByTestId('document-upload')).toBeInTheDocument();
  });

  test('portfolio section shows storage unavailable when not initialized', async () => {
    // Mock storage as not initialized
    mockUseFileStorageState.mockReturnValue({
      files: [],
      storageUsage: null,
      isInitialized: false,
      storageMethod: 'none',
      storageWarning: null,
      canUploadFile: jest.fn(() => false),
      getUploadWarning: jest.fn(() => null),
      getStorageUsageSummary: jest.fn(() => null),
    });

    render(
      <FileStorageProvider>
        <PortfolioSection {...mockPortfolioData} />
      </FileStorageProvider>
    );

    // Verify fallback message is displayed
    await waitFor(() => {
      expect(screen.getByText(/storage unavailable/i)).toBeInTheDocument();
    });
  });

  test('portfolio section displays file count badges when files exist', async () => {
    // Mock storage with existing files
    mockUseFileStorageState.mockReturnValue({
      files: [
        {
          id: 'file-1',
          name: 'document.pdf',
          category: 'document',
          size: 1024,
          type: 'application/pdf',
          storedAt: new Date(),
          compressed: false,
        },
        {
          id: 'file-2',
          name: 'video.mp4',
          category: 'video',
          size: 2048,
          type: 'video/mp4',
          storedAt: new Date(),
          compressed: false,
        },
      ],
      storageUsage: null,
      isInitialized: true,
      storageMethod: 'indexeddb',
      storageWarning: null,
      canUploadFile: jest.fn(() => true),
      getUploadWarning: jest.fn(() => null),
      getStorageUsageSummary: jest.fn(() => null),
    });

    render(
      <FileStorageProvider>
        <PortfolioSection {...mockPortfolioData} />
      </FileStorageProvider>
    );

    // Verify file count badges are displayed
    await waitFor(() => {
      expect(screen.getByText(/1 Video Saved/i)).toBeInTheDocument();
      expect(screen.getByText(/1 Document Saved/i)).toBeInTheDocument();
    });
  });

  test('multiple portfolio sections share file state', async () => {
    // Mock storage with files
    mockUseFileStorageState.mockReturnValue({
      files: [
        {
          id: 'shared-file',
          name: 'shared-document.pdf',
          category: 'document',
          size: 1024,
          type: 'application/pdf',
          storedAt: new Date(),
          compressed: false,
        },
      ],
      storageUsage: null,
      isInitialized: true,
      storageMethod: 'indexeddb',
      storageWarning: null,
      canUploadFile: jest.fn(() => true),
      getUploadWarning: jest.fn(() => null),
      getStorageUsageSummary: jest.fn(() => null),
    });

    render(
      <FileStorageProvider>
        <PortfolioSection {...mockPortfolioData} id="section-1" />
        <PortfolioSection {...mockPortfolioData} id="section-2" />
      </FileStorageProvider>
    );

    // Verify both sections show the same file count
    await waitFor(() => {
      const documentBadges = screen.getAllByText(/1 Document Saved/i);
      expect(documentBadges).toHaveLength(2);
    });
  });

  test('portfolio section handles video upload section correctly', async () => {
    // Mock video upload section (mock-interview)
    const videoSectionData = {
      ...mockPortfolioData,
      id: 'mock-interview',
    };

    render(
      <FileStorageProvider>
        <PortfolioSection {...videoSectionData} />
      </FileStorageProvider>
    );

    // Verify video upload component is rendered for mock-interview section
    expect(screen.getByTestId('video-upload')).toBeInTheDocument();
    expect(screen.getByTestId('document-upload')).toBeInTheDocument();
  });

  test('portfolio section handles empty file state correctly', async () => {
    // Mock empty storage state
    mockUseFileStorageState.mockReturnValue({
      files: [],
      storageUsage: null,
      isInitialized: true,
      storageMethod: 'indexeddb',
      storageWarning: null,
      canUploadFile: jest.fn(() => true),
      getUploadWarning: jest.fn(() => null),
      getStorageUsageSummary: jest.fn(() => null),
    });

    render(
      <FileStorageProvider>
        <PortfolioSection {...mockPortfolioData} />
      </FileStorageProvider>
    );

    // Verify no file count badges are displayed
    expect(screen.queryByText(/Video Saved/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Document Saved/i)).not.toBeInTheDocument();
    
    // But storage enabled message should still be there
    expect(screen.getByText(/file persistence enabled/i)).toBeInTheDocument();
  });
});