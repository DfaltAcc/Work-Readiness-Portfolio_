/**
 * In-memory storage fallback
 * Stores files in memory for the current session only
 * Used when both IndexedDB and localStorage fail
 */

import { StoredFileInfo, StorageUsage } from './types';

export class MemoryStorage {
  private files: Map<string, { file: File; info: StoredFileInfo }> = new Map();
  private metadata: Map<string, any> = new Map();

  async initialize(): Promise<void> {
    console.log('🧠 Initializing memory storage (session-only)');
    // Memory storage is always available
  }

  async storeFile(
    fileId: string,
    file: File,
    category: 'video' | 'document',
    processedData?: ArrayBuffer
  ): Promise<void> {
    const fileInfo: StoredFileInfo = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      category,
      storedAt: new Date(),
      compressed: false
    };

    this.files.set(fileId, { file, info: fileInfo });
    console.log(`🧠 Stored file in memory: ${file.name}`);
  }

  async retrieveFile(fileId: string): Promise<File | null> {
    const stored = this.files.get(fileId);
    return stored ? stored.file : null;
  }

  async deleteFile(fileId: string): Promise<void> {
    this.files.delete(fileId);
  }

  async listFiles(category?: 'video' | 'document'): Promise<StoredFileInfo[]> {
    const allFiles = Array.from(this.files.values()).map(stored => stored.info);
    
    if (category) {
      return allFiles.filter(file => file.category === category);
    }
    
    return allFiles;
  }

  async getStorageUsage(): Promise<StorageUsage> {
    let totalSize = 0;
    this.files.forEach(stored => {
      totalSize += stored.file.size;
    });

    // Assume 100MB available for memory storage
    const available = 100 * 1024 * 1024;
    
    return {
      used: totalSize,
      available: available - totalSize,
      percentage: (totalSize / available) * 100
    };
  }

  async clearAllFiles(): Promise<void> {
    this.files.clear();
  }

  async storeMetadata(key: string, value: any): Promise<void> {
    this.metadata.set(key, value);
  }

  async retrieveMetadata(key: string): Promise<any | null> {
    return this.metadata.get(key) || null;
  }

  isReady(): boolean {
    return true;
  }

  close(): void {
    // Nothing to close for memory storage
  }

  getStorageCapacity(): number {
    return 100 * 1024 * 1024; // 100MB
  }

  fileExists(fileId: string): boolean {
    return this.files.has(fileId);
  }
}