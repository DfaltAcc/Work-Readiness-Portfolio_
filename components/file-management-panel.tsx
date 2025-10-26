"use client"

import React, { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  FileText, 
  Video, 
  Image, 
  Trash2, 
  Download, 
  Eye, 
  Calendar,
  HardDrive,
  RefreshCw
} from "lucide-react"
import { useFileStorage, useFileStorageState } from "@/lib/storage/file-storage-context"
import { StoredFileInfo } from "@/lib/storage/types"

interface FileManagementPanelProps {
  className?: string
}

export function FileManagementPanel({ className }: FileManagementPanelProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'video' | 'document'>('all')
  const { deleteFile, retrieveFile, listFiles, isLoading } = useFileStorage()
  const { files } = useFileStorageState()

  const getFileIcon = (file: StoredFileInfo) => {
    if (file.category === 'video') {
      return <Video className="w-4 h-4 text-blue-600" />
    }
    
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      return <Image className="w-4 h-4 text-green-600" />
    }
    
    return <FileText className="w-4 h-4 text-gray-600" />
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date))
  }

  const handleDeleteFile = async (fileId: string) => {
    if (confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
      try {
        await deleteFile(fileId)
      } catch (error) {
        console.error('Failed to delete file:', error)
      }
    }
  }

  const handleDownloadFile = async (file: StoredFileInfo) => {
    try {
      const retrievedFile = await retrieveFile(file.id)
      if (retrievedFile) {
        const url = URL.createObjectURL(retrievedFile)
        const link = document.createElement('a')
        link.href = url
        link.download = file.name
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to download file:', error)
    }
  }

  const handlePreviewFile = async (file: StoredFileInfo) => {
    try {
      const retrievedFile = await retrieveFile(file.id)
      if (retrievedFile) {
        const url = URL.createObjectURL(retrievedFile)
        window.open(url, '_blank')
      }
    } catch (error) {
      console.error('Failed to preview file:', error)
    }
  }

  const getFilteredFiles = () => {
    switch (activeTab) {
      case 'video':
        return files.filter(file => file.category === 'video')
      case 'document':
        return files.filter(file => file.category === 'document')
      default:
        return files
    }
  }

  const filteredFiles = getFilteredFiles()
  const videoCount = files.filter(f => f.category === 'video').length
  const documentCount = files.filter(f => f.category === 'document').length

  if (files.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center space-y-2">
          <HardDrive className="w-8 h-8 text-muted-foreground mx-auto" />
          <h3 className="text-sm font-medium">No Files Stored</h3>
          <p className="text-xs text-muted-foreground">
            Upload some files to see them here
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Stored Files</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => listFiles()}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" className="text-xs">
              All ({files.length})
            </TabsTrigger>
            <TabsTrigger value="video" className="text-xs">
              Videos ({videoCount})
            </TabsTrigger>
            <TabsTrigger value="document" className="text-xs">
              Docs ({documentCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-2 mt-4">
            {filteredFiles.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground">
                  No {activeTab === 'all' ? '' : activeTab} files found
                </p>
              </div>
            ) : (
              filteredFiles
                .sort((a, b) => new Date(b.storedAt).getTime() - new Date(a.storedAt).getTime())
                .map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {getFileIcon(file)}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatBytes(file.size)}</span>
                          <span>•</span>
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(file.storedAt)}</span>
                          {file.compressed && (
                            <>
                              <span>•</span>
                              <Badge variant="outline" className="text-xs px-1 py-0">
                                Compressed
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreviewFile(file)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadFile(file)}
                        className="h-8 w-8 p-0"
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteFile(file.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  )
}