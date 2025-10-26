/**
 * StorageUsageTracker - Monitors storage usage and provides quota warnings
 */

import { StorageUsage, StorageError, StorageErrorType } from './types';

export interface StorageQuotaWarning {
  type: 'warning' | 'error';
  message: string;
  percentage: number;
  usedBytes: number;
  availableBytes: number;
  recommendedAction: string;
}

export class StorageUsageTracker {
  private warningThreshold: number;
  private errorThreshold: number;
  private lastWarningPercentage: number = 0;
  private warningCallbacks: ((warning: StorageQuotaWarning) => void)[] = [];

  constructor(warningThreshold: number = 80, errorThreshold: number = 95) {
    this.warningThreshold = warningThreshold;
    this.errorThreshold = errorThreshold;
  }

  /**
   * Check storage usage and generate warnings if needed
   */
  checkStorageUsage(usage: StorageUsage): StorageQuotaWarning | null {
    const { percentage, used, available } = usage;

    // Only generate warnings if percentage has increased significantly
    if (percentage <= this.lastWarningPercentage) {
      return null;
    }

    let warning: StorageQuotaWarning | null = null;

    if (percentage >= this.errorThreshold) {
      warning = {
        type: 'error',
        message: `Storage is critically full (${percentage.toFixed(1)}%). New uploads may fail.`,
        percentage,
        usedBytes: used,
        availableBytes: available,
        recommendedAction: 'Delete some files immediately to free up space.'
      };
    } else if (percentage >= this.warningThreshold) {
      warning = {
        type: 'warning',
        message: `Storage is getting full (${percentage.toFixed(1)}%). Consider managing your files.`,
        percentage,
        usedBytes: used,
        availableBytes: available,
        recommendedAction: 'Delete unused files or compress large files to free up space.'
      };
    }

    if (warning) {
      this.lastWarningPercentage = percentage;
      this.notifyWarningCallbacks(warning);
    }

    return warning;
  }

  /**
   * Check if storage usage allows for a new file
   */
  canStoreFile(fileSize: number, currentUsage: StorageUsage): boolean {
    const projectedUsed = currentUsage.used + fileSize;
    const projectedPercentage = (projectedUsed / (currentUsage.used + currentUsage.available)) * 100;
    
    return projectedPercentage < this.errorThreshold;
  }

  /**
   * Get storage usage warning for a potential file upload
   */
  getUploadWarning(fileSize: number, currentUsage: StorageUsage): StorageQuotaWarning | null {
    const projectedUsed = currentUsage.used + fileSize;
    const totalStorage = currentUsage.used + currentUsage.available;
    const projectedPercentage = (projectedUsed / totalStorage) * 100;

    if (projectedPercentage >= this.errorThreshold) {
      return {
        type: 'error',
        message: `Cannot upload file. Would exceed storage limit (${projectedPercentage.toFixed(1)}%).`,
        percentage: projectedPercentage,
        usedBytes: projectedUsed,
        availableBytes: totalStorage - projectedUsed,
        recommendedAction: 'Delete some files before uploading this file.'
      };
    } else if (projectedPercentage >= this.warningThreshold) {
      return {
        type: 'warning',
        message: `Uploading this file will use ${projectedPercentage.toFixed(1)}% of storage.`,
        percentage: projectedPercentage,
        usedBytes: projectedUsed,
        availableBytes: totalStorage - projectedUsed,
        recommendedAction: 'Consider managing storage space after this upload.'
      };
    }

    return null;
  }

  /**
   * Format storage size for display
   */
  formatStorageSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  }

  /**
   * Get storage usage summary for display
   */
  getStorageUsageSummary(usage: StorageUsage): {
    usedFormatted: string;
    availableFormatted: string;
    totalFormatted: string;
    percentageFormatted: string;
    status: 'normal' | 'warning' | 'critical';
  } {
    const total = usage.used + usage.available;
    
    let status: 'normal' | 'warning' | 'critical' = 'normal';
    if (usage.percentage >= this.errorThreshold) {
      status = 'critical';
    } else if (usage.percentage >= this.warningThreshold) {
      status = 'warning';
    }

    return {
      usedFormatted: this.formatStorageSize(usage.used),
      availableFormatted: this.formatStorageSize(usage.available),
      totalFormatted: this.formatStorageSize(total),
      percentageFormatted: `${usage.percentage.toFixed(1)}%`,
      status
    };
  }

  /**
   * Register callback for storage warnings
   */
  onWarning(callback: (warning: StorageQuotaWarning) => void): () => void {
    this.warningCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.warningCallbacks.indexOf(callback);
      if (index > -1) {
        this.warningCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notify all warning callbacks
   */
  private notifyWarningCallbacks(warning: StorageQuotaWarning): void {
    this.warningCallbacks.forEach(callback => {
      try {
        callback(warning);
      } catch (error) {
        console.error('Error in storage warning callback:', error);
      }
    });
  }

  /**
   * Reset warning state (useful after files are deleted)
   */
  resetWarningState(): void {
    this.lastWarningPercentage = 0;
  }

  /**
   * Update thresholds
   */
  updateThresholds(warningThreshold: number, errorThreshold: number): void {
    this.warningThreshold = warningThreshold;
    this.errorThreshold = errorThreshold;
  }

  /**
   * Get current thresholds
   */
  getThresholds(): { warning: number; error: number } {
    return {
      warning: this.warningThreshold,
      error: this.errorThreshold
    };
  }

  /**
   * Validate if a file can be stored based on current usage
   */
  validateFileStorage(fileSize: number, currentUsage: StorageUsage): void {
    if (!this.canStoreFile(fileSize, currentUsage)) {
      const projectedUsed = currentUsage.used + fileSize;
      const totalStorage = currentUsage.used + currentUsage.available;
      const projectedPercentage = (projectedUsed / totalStorage) * 100;
      
      throw new StorageError(
        StorageErrorType.QUOTA_EXCEEDED,
        `Cannot store file. Would exceed storage quota (${projectedPercentage.toFixed(1)}%). ` +
        `Current usage: ${this.formatStorageSize(currentUsage.used)}, ` +
        `File size: ${this.formatStorageSize(fileSize)}, ` +
        `Available: ${this.formatStorageSize(currentUsage.available)}`
      );
    }
  }

  /**
   * Calculate storage efficiency (compression ratio)
   */
  calculateStorageEfficiency(originalSize: number, storedSize: number): {
    compressionRatio: number;
    spaceSaved: number;
    spaceSavedFormatted: string;
    efficiencyPercentage: number;
  } {
    const compressionRatio = originalSize > 0 ? storedSize / originalSize : 1;
    const spaceSaved = originalSize - storedSize;
    const efficiencyPercentage = originalSize > 0 ? (spaceSaved / originalSize) * 100 : 0;

    return {
      compressionRatio,
      spaceSaved,
      spaceSavedFormatted: this.formatStorageSize(spaceSaved),
      efficiencyPercentage
    };
  }
}