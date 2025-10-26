/**
 * File processing utilities for compression, validation, and metadata extraction
 * Handles image compression using Canvas API and file validation
 */

import { StorageError, StorageErrorType, FileProcessingResult, StoredFileMetadata } from './types';

// Configuration for file processing
export interface FileProcessorConfig {
  compression: {
    enabled: boolean;
    quality: number;      // 0-1 for image compression quality
    maxWidth: number;     // Max width for image compression
    maxHeight: number;    // Max height for image compression
  };
  validation: {
    maxFileSize: {
      video: number;
      document: number;
    };
    allowedTypes: {
      video: string[];
      document: string[];
    };
  };
}

// Default configuration
const DEFAULT_CONFIG: FileProcessorConfig = {
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
      video: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
      document: ['application/pdf', 'text/plain', 'application/msword', 
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    }
  }
};

export class FileProcessor {
  private config: FileProcessorConfig;

  constructor(config: Partial<FileProcessorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Compresses an image file using Canvas API
   * @param file - The image file to compress
   * @returns Promise<ArrayBuffer> - Compressed image data
   */
  async compressImage(file: File): Promise<ArrayBuffer> {
    if (!this.config.compression.enabled) {
      return await file.arrayBuffer();
    }

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      throw new StorageError(
        StorageErrorType.COMPRESSION_FAILED,
        'File is not an image and cannot be compressed'
      );
    }

    try {
      return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new StorageError(
            StorageErrorType.COMPRESSION_FAILED,
            'Canvas context not available'
          ));
          return;
        }

        img.onload = () => {
          // Calculate new dimensions while maintaining aspect ratio
          const { width, height } = this.calculateCompressedDimensions(
            img.width,
            img.height,
            this.config.compression.maxWidth,
            this.config.compression.maxHeight
          );

          canvas.width = width;
          canvas.height = height;

          // Draw and compress the image
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            async (blob) => {
              if (!blob) {
                reject(new StorageError(
                  StorageErrorType.COMPRESSION_FAILED,
                  'Failed to compress image'
                ));
                return;
              }

              try {
                const arrayBuffer = await blob.arrayBuffer();
                resolve(arrayBuffer);
              } catch (error) {
                reject(new StorageError(
                  StorageErrorType.COMPRESSION_FAILED,
                  'Failed to convert compressed image to ArrayBuffer',
                  error as Error
                ));
              }
            },
            file.type,
            this.config.compression.quality
          );
        };

        img.onerror = () => {
          reject(new StorageError(
            StorageErrorType.COMPRESSION_FAILED,
            'Failed to load image for compression'
          ));
        };

        // Create object URL for the image
        const objectUrl = URL.createObjectURL(file);
        img.src = objectUrl;

        // Clean up object URL after loading
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          img.onload(); // Call the original onload
        };
      });
    } catch (error) {
      throw new StorageError(
        StorageErrorType.COMPRESSION_FAILED,
        'Image compression failed',
        error as Error
      );
    }
  }

  /**
   * Calculates compressed dimensions while maintaining aspect ratio
   * @param originalWidth - Original image width
   * @param originalHeight - Original image height
   * @param maxWidth - Maximum allowed width
   * @param maxHeight - Maximum allowed height
   * @returns Object with new width and height
   */
  private calculateCompressedDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    // If image is already within limits, return original dimensions
    if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
      return { width: originalWidth, height: originalHeight };
    }

    // Calculate aspect ratio
    const aspectRatio = originalWidth / originalHeight;

    let newWidth = originalWidth;
    let newHeight = originalHeight;

    // Scale down based on width constraint
    if (newWidth > maxWidth) {
      newWidth = maxWidth;
      newHeight = newWidth / aspectRatio;
    }

    // Scale down based on height constraint
    if (newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth = newHeight * aspectRatio;
    }

    return {
      width: Math.round(newWidth),
      height: Math.round(newHeight)
    };
  }

  /**
   * Processes a file with compression if applicable
   * @param file - The file to process
   * @param category - File category (video or document)
   * @returns Promise<FileProcessingResult> - Processing result with metadata
   */
  async processFile(file: File, category: 'video' | 'document'): Promise<FileProcessingResult> {
    const originalSize = file.size;
    let processedFile: ArrayBuffer;
    let compressed = false;

    try {
      // Compress images, leave other files as-is
      if (file.type.startsWith('image/') && this.config.compression.enabled) {
        processedFile = await this.compressImage(file);
        compressed = true;
      } else {
        processedFile = await file.arrayBuffer();
        compressed = false;
      }

      const finalSize = processedFile.byteLength;
      const checksum = await this.generateChecksum(processedFile);

      const metadata: StoredFileMetadata = {
        originalSize,
        compressed,
        storedAt: new Date(),
        checksum
      };

      return {
        processedFile,
        metadata,
        compressed,
        originalSize,
        finalSize
      };
    } catch (error) {
      throw new StorageError(
        StorageErrorType.COMPRESSION_FAILED,
        `Failed to process file: ${file.name}`,
        error as Error
      );
    }
  }

  /**
   * Validates a file against size and type constraints
   * @param file - The file to validate
   * @param category - File category (video or document)
   * @throws StorageError if validation fails
   */
  validateFile(file: File, category: 'video' | 'document'): void {
    // Check file size
    const maxSize = this.config.validation.maxFileSize[category];
    if (file.size > maxSize) {
      throw new StorageError(
        StorageErrorType.FILE_TOO_LARGE,
        `File size (${this.formatFileSize(file.size)}) exceeds maximum allowed size (${this.formatFileSize(maxSize)}) for ${category} files`
      );
    }

    // Check file type
    const allowedTypes = this.config.validation.allowedTypes[category];
    if (!allowedTypes.includes(file.type)) {
      throw new StorageError(
        StorageErrorType.INVALID_FILE_TYPE,
        `File type "${file.type}" is not allowed for ${category} files. Allowed types: ${allowedTypes.join(', ')}`
      );
    }

    // Additional validation for empty files
    if (file.size === 0) {
      throw new StorageError(
        StorageErrorType.VALIDATION_FAILED,
        'File is empty and cannot be stored'
      );
    }
  }

  /**
   * Extracts metadata from a file
   * @param file - The file to extract metadata from
   * @param category - File category (video or document)
   * @returns Object with extracted metadata
   */
  extractFileMetadata(file: File, category: 'video' | 'document') {
    return {
      name: file.name,
      size: file.size,
      type: file.type,
      category,
      lastModified: file.lastModified ? new Date(file.lastModified) : new Date(),
      extension: this.getFileExtension(file.name)
    };
  }

  /**
   * Generates a unique ID for a file
   * @param file - The file to generate ID for
   * @returns string - Unique file ID
   */
  generateFileId(file: File): string {
    // Create a unique ID based on file properties and timestamp
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const fileHash = this.simpleHash(file.name + file.size + file.type);
    
    return `file_${timestamp}_${fileHash}_${random}`;
  }

  /**
   * Validates file integrity using checksum
   * @param data - File data as ArrayBuffer
   * @param expectedChecksum - Expected checksum
   * @returns Promise<boolean> - True if file is valid
   */
  async validateFileIntegrity(data: ArrayBuffer, expectedChecksum: string): Promise<boolean> {
    try {
      const actualChecksum = await this.generateChecksum(data);
      return actualChecksum === expectedChecksum;
    } catch (error) {
      throw new StorageError(
        StorageErrorType.VALIDATION_FAILED,
        'Failed to validate file integrity',
        error as Error
      );
    }
  }

  /**
   * Formats file size in human-readable format
   * @param bytes - File size in bytes
   * @returns string - Formatted file size
   */
  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Gets file extension from filename
   * @param filename - The filename
   * @returns string - File extension (without dot)
   */
  private getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex > 0 ? filename.substring(lastDotIndex + 1).toLowerCase() : '';
  }

  /**
   * Creates a simple hash from a string
   * @param str - String to hash
   * @returns string - Simple hash
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Generates a checksum for file integrity validation
   * @param data - File data as ArrayBuffer
   * @returns Promise<string> - SHA-256 checksum as hex string
   */
  async generateChecksum(data: ArrayBuffer): Promise<string> {
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      throw new StorageError(
        StorageErrorType.VALIDATION_FAILED,
        'Failed to generate file checksum',
        error as Error
      );
    }
  }

  /**
   * Updates processor configuration
   * @param config - Partial configuration to update
   */
  updateConfig(config: Partial<FileProcessorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Gets current processor configuration
   * @returns FileProcessorConfig - Current configuration
   */
  getConfig(): FileProcessorConfig {
    return { ...this.config };
  }
}