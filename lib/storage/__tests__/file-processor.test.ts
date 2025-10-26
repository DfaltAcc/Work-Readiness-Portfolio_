/**
 * Unit tests for FileProcessor
 * Tests image compression, file validation, and metadata extraction
 */

import { FileProcessor, FileProcessorConfig } from '../file-processor';
import { StorageError, StorageErrorType } from '../types';

// Mock Canvas API for testing
const mockCanvas = {
  width: 0,
  height: 0,
  getContext: jest.fn(),
  toBlob: jest.fn()
};

const mockContext = {
  drawImage: jest.fn()
};

// Mock Image constructor
const mockImage = {
  width: 1920,
  height: 1080,
  onload: null as (() => void) | null,
  onerror: null as (() => void) | null,
  src: ''
};

// Mock URL.createObjectURL and revokeObjectURL
const mockCreateObjectURL = jest.fn().mockReturnValue('blob:mock-url');
const mockRevokeObjectURL = jest.fn();

// Mock crypto.subtle.digest
const mockDigest = jest.fn();

// Setup global mocks
beforeAll(() => {
  global.document = {
    createElement: jest.fn().mockReturnValue(mockCanvas)
  } as any;

  global.Image = jest.fn().mockImplementation(() => mockImage) as any;
  
  global.URL = {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL
  } as any;

  global.crypto = {
    subtle: {
      digest: mockDigest
    }
  } as any;
});

describe('FileProcessor', () => {
  let processor: FileProcessor;
  let testConfig: Partial<FileProcessorConfig>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    testConfig = {
      compression: {
        enabled: true,
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1080
      },
      validation: {
        maxFileSize: {
          video: 150 * 1024 * 1024, // 150MB
          document: 10 * 1024 * 1024  // 10MB
        },
        allowedTypes: {
          video: ['video/mp4', 'video/webm'],
          document: ['application/pdf', 'text/plain']
        }
      }
    };

    processor = new FileProcessor(testConfig);

    // Setup canvas mock
    mockCanvas.getContext.mockReturnValue(mockContext);
    mockCanvas.toBlob.mockImplementation((callback) => {
      const mockBlob = new Blob(['compressed-data'], { type: 'image/jpeg' });
      callback(mockBlob);
    });

    // Setup crypto mock
    mockDigest.mockResolvedValue(new ArrayBuffer(32));
  });

  describe('File Validation', () => {
    test('should validate valid video file', () => {
      const file = new File(['video data'], 'test.mp4', { 
        type: 'video/mp4' 
      });

      expect(() => processor.validateFile(file, 'video')).not.toThrow();
    });

    test('should validate valid document file', () => {
      const file = new File(['document data'], 'test.pdf', { 
        type: 'application/pdf' 
      });

      expect(() => processor.validateFile(file, 'document')).not.toThrow();
    });

    test('should reject file that is too large', () => {
      const largeData = new Array(200 * 1024 * 1024).fill('x').join(''); // 200MB
      const file = new File([largeData], 'large.mp4', { 
        type: 'video/mp4' 
      });

      expect(() => processor.validateFile(file, 'video')).toThrow(StorageError);
      expect(() => processor.validateFile(file, 'video')).toThrow(/exceeds maximum allowed size/);
    });

    test('should reject invalid file type', () => {
      const file = new File(['data'], 'test.txt', { 
        type: 'text/plain' 
      });

      expect(() => processor.validateFile(file, 'video')).toThrow(StorageError);
      expect(() => processor.validateFile(file, 'video')).toThrow(/not allowed for video files/);
    });

    test('should reject empty file', () => {
      const file = new File([], 'empty.pdf', { 
        type: 'application/pdf' 
      });

      expect(() => processor.validateFile(file, 'document')).toThrow(StorageError);
      expect(() => processor.validateFile(file, 'document')).toThrow(/File is empty/);
    });
  });

  describe('Metadata Extraction', () => {
    test('should extract file metadata correctly', () => {
      const file = new File(['test data'], 'test-document.pdf', { 
        type: 'application/pdf',
        lastModified: 1640995200000 // 2022-01-01
      });

      const metadata = processor.extractFileMetadata(file, 'document');

      expect(metadata).toEqual({
        name: 'test-document.pdf',
        size: 9, // 'test data' length
        type: 'application/pdf',
        category: 'document',
        lastModified: new Date(1640995200000),
        extension: 'pdf'
      });
    });

    test('should handle file without extension', () => {
      const file = new File(['data'], 'noextension', { 
        type: 'text/plain' 
      });

      const metadata = processor.extractFileMetadata(file, 'document');
      expect(metadata.extension).toBe('');
    });
  });

  describe('File ID Generation', () => {
    test('should generate unique file IDs', () => {
      const file = new File(['data'], 'test.pdf', { type: 'application/pdf' });

      const id1 = processor.generateFileId(file);
      const id2 = processor.generateFileId(file);

      expect(id1).toMatch(/^file_\d+_[a-z0-9]+_[a-z0-9]+$/);
      expect(id2).toMatch(/^file_\d+_[a-z0-9]+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('Checksum Generation', () => {
    test('should generate checksum for file data', async () => {
      const data = new ArrayBuffer(8);
      const view = new Uint8Array(data);
      view.set([1, 2, 3, 4, 5, 6, 7, 8]);

      const checksum = await processor.generateChecksum(data);

      expect(mockDigest).toHaveBeenCalledWith('SHA-256', data);
      expect(typeof checksum).toBe('string');
      expect(checksum.length).toBeGreaterThan(0);
    });

    test('should handle checksum generation error', async () => {
      mockDigest.mockRejectedValue(new Error('Crypto error'));
      const data = new ArrayBuffer(8);

      await expect(processor.generateChecksum(data)).rejects.toThrow(StorageError);
    });
  });

  describe('File Integrity Validation', () => {
    test('should validate file integrity with correct checksum', async () => {
      const data = new ArrayBuffer(8);
      const expectedChecksum = 'test-checksum';
      
      // Mock generateChecksum to return expected checksum
      jest.spyOn(processor, 'generateChecksum').mockResolvedValue(expectedChecksum);

      const isValid = await processor.validateFileIntegrity(data, expectedChecksum);
      expect(isValid).toBe(true);
    });

    test('should detect corrupted file with incorrect checksum', async () => {
      const data = new ArrayBuffer(8);
      const expectedChecksum = 'expected-checksum';
      const actualChecksum = 'different-checksum';
      
      jest.spyOn(processor, 'generateChecksum').mockResolvedValue(actualChecksum);

      const isValid = await processor.validateFileIntegrity(data, expectedChecksum);
      expect(isValid).toBe(false);
    });
  });

  describe('Image Compression', () => {
    test('should compress image file', async () => {
      const imageFile = new File(['image data'], 'test.jpg', { 
        type: 'image/jpeg' 
      });

      // Mock successful image loading
      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.onload();
        }
      }, 0);

      const result = await processor.compressImage(imageFile);

      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
      expect(mockContext.drawImage).toHaveBeenCalled();
    });

    test('should handle non-image file compression', async () => {
      const textFile = new File(['text data'], 'test.txt', { 
        type: 'text/plain' 
      });

      await expect(processor.compressImage(textFile)).rejects.toThrow(StorageError);
      await expect(processor.compressImage(textFile)).rejects.toThrow(/not an image/);
    });

    test('should return original data when compression disabled', async () => {
      const disabledProcessor = new FileProcessor({
        compression: { enabled: false, quality: 0.8, maxWidth: 1920, maxHeight: 1080 }
      });

      const imageFile = new File(['image data'], 'test.jpg', { 
        type: 'image/jpeg' 
      });

      const result = await disabledProcessor.compressImage(imageFile);
      expect(result).toBeInstanceOf(ArrayBuffer);
    });
  });

  describe('File Processing', () => {
    test('should process image file with compression', async () => {
      const imageFile = new File(['image data'], 'test.jpg', { 
        type: 'image/jpeg' 
      });

      // Mock image compression
      jest.spyOn(processor, 'compressImage').mockResolvedValue(new ArrayBuffer(5));
      jest.spyOn(processor, 'generateChecksum').mockResolvedValue('test-checksum');

      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.onload();
        }
      }, 0);

      const result = await processor.processFile(imageFile, 'document');

      expect(result.compressed).toBe(true);
      expect(result.originalSize).toBe(10); // 'image data' length
      expect(result.finalSize).toBe(5);
      expect(result.metadata.checksum).toBe('test-checksum');
    });

    test('should process non-image file without compression', async () => {
      const pdfFile = new File(['pdf data'], 'test.pdf', { 
        type: 'application/pdf' 
      });

      jest.spyOn(processor, 'generateChecksum').mockResolvedValue('pdf-checksum');

      const result = await processor.processFile(pdfFile, 'document');

      expect(result.compressed).toBe(false);
      expect(result.originalSize).toBe(8); // 'pdf data' length
      expect(result.finalSize).toBe(8);
      expect(result.metadata.checksum).toBe('pdf-checksum');
    });
  });

  describe('Configuration Management', () => {
    test('should update configuration', () => {
      const newConfig = {
        compression: {
          enabled: false,
          quality: 0.5,
          maxWidth: 1024,
          maxHeight: 768
        }
      };

      processor.updateConfig(newConfig);
      const config = processor.getConfig();

      expect(config.compression.enabled).toBe(false);
      expect(config.compression.quality).toBe(0.5);
    });

    test('should return current configuration', () => {
      const config = processor.getConfig();

      expect(config).toHaveProperty('compression');
      expect(config).toHaveProperty('validation');
      expect(config.compression.enabled).toBe(true);
    });
  });
});