// Jest setup file for IndexedDB storage tests
import '@testing-library/jest-dom';

// Mock global objects that might not be available in test environment
global.File = class MockFile {
  constructor(chunks, filename, options = {}) {
    this.name = filename;
    this.size = chunks.reduce((size, chunk) => size + chunk.length, 0);
    this.type = options.type || '';
    this.lastModified = options.lastModified || Date.now();
  }
};

global.FileReader = class MockFileReader {
  constructor() {
    this.result = null;
    this.error = null;
    this.onload = null;
    this.onerror = null;
  }

  readAsArrayBuffer(file) {
    setTimeout(() => {
      this.result = new ArrayBuffer(file.size || 0);
      if (this.onload) {
        this.onload({ target: this });
      }
    }, 0);
  }
};

// Mock crypto.subtle for checksum calculations
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: jest.fn().mockImplementation(() => {
        return Promise.resolve(new ArrayBuffer(32));
      })
    }
  },
  writable: true
});

// Mock DOMException for quota errors
global.DOMException = class MockDOMException extends Error {
  constructor(message, name) {
    super(message);
    this.name = name;
  }
};