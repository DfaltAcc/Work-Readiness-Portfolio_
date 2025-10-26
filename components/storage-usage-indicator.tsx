"use client"

import React from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { HardDrive, AlertTriangle, Trash2, RefreshCw } from "lucide-react"
import { useFileStorageState, useFileStorage } from "@/lib/storage/file-storage-context"
import { StorageMethod } from "@/lib/storage/types"

interface StorageUsageIndicatorProps {
  showDetails?: boolean
  showManagement?: boolean
}

export function StorageUsageIndicator({ 
  showDetails = true, 
  showManagement = false 
}: StorageUsageIndicatorProps) {
  const { 
    storageUsage, 
    storageWarning, 
    storageMethod, 
    isInitialized,
    getStorageUsageSummary 
  } = useFileStorageState()
  
  const { clearAllFiles, getStorageUsage, isLoading } = useFileStorage()

  if (!isInitialized || !storageUsage) {
    return null
  }

  const summary = getStorageUsageSummary()
  const isWarning = storageUsage.percentage > 80
  const isCritical = storageUsage.percentage > 95

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStorageMethodLabel = (method: StorageMethod): string => {
    switch (method) {
      case StorageMethod.INDEXEDDB:
        return 'IndexedDB'
      case StorageMethod.LOCALSTORAGE:
        return 'localStorage'
      default:
        return 'None'
    }
  }

  const getStorageMethodColor = (method: StorageMethod): string => {
    switch (method) {
      case StorageMethod.INDEXEDDB:
        return 'bg-green-100 text-green-800'
      case StorageMethod.LOCALSTORAGE:
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleRefreshUsage = async () => {
    try {
      await getStorageUsage()
    } catch (error) {
      console.error('Failed to refresh storage usage:', error)
    }
  }

  const handleClearAll = async () => {
    if (confirm('Are you sure you want to delete all stored files? This action cannot be undone.')) {
      try {
        await clearAllFiles()
      } catch (error) {
        console.error('Failed to clear files:', error)
      }
    }
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4" />
            <span className="text-sm font-medium">Storage Usage</span>
            <Badge 
              variant="outline" 
              className={`text-xs ${getStorageMethodColor(storageMethod)}`}
            >
              {getStorageMethodLabel(storageMethod)}
            </Badge>
          </div>
          {showManagement && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefreshUsage}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress 
            value={storageUsage.percentage} 
            className={`w-full ${isCritical ? 'bg-red-100' : isWarning ? 'bg-yellow-100' : ''}`}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatBytes(storageUsage.used)} used</span>
            <span>{storageUsage.percentage.toFixed(1)}%</span>
            <span>{formatBytes(storageUsage.available)} available</span>
          </div>
        </div>

        {/* Warning Message */}
        {storageWarning && (
          <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <p className="text-xs text-amber-800">{storageWarning.message}</p>
          </div>
        )}

        {/* Detailed Information */}
        {showDetails && summary && (
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground">Videos:</span>
              <div className="font-medium">
                {summary.videoCount} files ({formatBytes(summary.videoSize)})
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Documents:</span>
              <div className="font-medium">
                {summary.documentCount} files ({formatBytes(summary.documentSize)})
              </div>
            </div>
          </div>
        )}

        {/* Management Actions */}
        {showManagement && (
          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              disabled={isLoading || storageUsage.used === 0}
              className="flex items-center gap-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
              Clear All Files
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}